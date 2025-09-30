import { Injectable, Logger, forwardRef, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { InternalNote } from './entities/internal-note.entity';
import { WhatsappService, SimplifiedMessage } from '../whatsapp/whatsapp.service';
import { ChatGateway } from './chat.gateway';
import { UserService } from '../user/user.service';
import { ConversationFlowService } from '../conversation-flow/conversation-flow.service';
import { RedisStateStore } from '../conversation-flow/redis-state-store';
import { ConversationStep } from '../conversation-flow/conversation-state.enum';
import { ChatStatus } from '../common/enums/chat-status.enum';
import { MessageSender } from '../common/enums/message-sender.enum';
import { PresenceService } from './presence.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { lookup } from 'mime-types';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly autoResponderTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private readonly agentResponseTimeouts: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
    @InjectRepository(InternalNote) private readonly noteRepo: Repository<InternalNote>,
    @Inject(forwardRef(() => WhatsappService)) private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly userService: UserService,
    private readonly presenceService: PresenceService,
    private readonly conversationFlow: ConversationFlowService,
    private readonly configService: ConfigService,
    private readonly redisStore: RedisStateStore,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('whatsapp.message')
  async handleIncomingMessage(message: SimplifiedMessage) {
    const contactNumber = message.from.split('@')[0];
    const now = new Date();

    // --- LÓGICA CLAVE DE CHAT PERSISTENTE ---
    // Busca si ALGUNA VEZ ha existido un chat con este número.
    let chat = await this.chatRepo.findOne({ where: { contactNumber }, relations: ['assignedTo'] });

    if (chat) {
      // SI EL CHAT YA EXISTE, LO REACTIVAMOS
      this.logger.log(`Continuando chat existente #${chat.id} para el número ${contactNumber}`);
      chat.status = ChatStatus.AUTO_RESPONDER; // Lo devolvemos al bot
      chat.assignedTo = null; // Nos aseguramos de que no tenga un agente asignado
      chat.updatedAt = now;
      
    } else {
      // SI EL CHAT NO EXISTE, LO CREAMOS POR PRIMERA Y ÚNICA VEZ
      this.logger.log(`Creando nuevo chat persistente para el número ${contactNumber}`);
      chat = this.chatRepo.create({
        contactNumber,
        customerName: null, // El nombre empieza VACÍO para que el bot lo pregunte.
        status: ChatStatus.AUTO_RESPONDER,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // Guardamos los cambios (ya sea la reactivación o la creación del chat)
    await this.chatRepo.save(chat);

    // El resto del flujo continúa normalmente...
    await this.saveCustomerMessage(chat, message);

    if (!this.whatsappService.isReady) {
      this.logger.warn(`WhatsApp no está conectado. Asignando chat #${chat.id} directamente a un asesor.`);
      await this.createSystemMessage(chat, 'El mensaje fue recibido mientras WhatsApp estaba desconectado. Asignando a un asesor.');
      chat.status = ChatStatus.PENDING_ASSIGNMENT;
      await this.chatRepo.save(chat);
      await this.autoAssignChat(chat);
      return;
    }
    
    // Si el chat está con un agente, no hacemos nada más.
    if (chat.status === ChatStatus.ACTIVE || chat.status === ChatStatus.PENDING_ASSIGNMENT) {
        return;
    }

    // El bot solo responde si el chat está en modo AUTO_RESPONDER y no es un archivo multimedia
    if (chat.status === ChatStatus.AUTO_RESPONDER && !message.hasMedia) {
      this.startAutoResponderTimer(chat.id);
      // El `conversationFlow` recibirá un chat que ya tiene el nombre (si se guardó antes)
      // o un chat con el nombre vacío (si es la primera vez que escribe).
      const response = await this.conversationFlow.handleIncomingMessage(chat, message.body);

      if (response.includes('|__ACTIVATE_CHAT_WITH_ADVISOR__')) {
        const parts = response.split('|');
        const fallbackMessage = parts[0];
        await this.sendBotMessage(chat, fallbackMessage);
        await this.activateChatWithAdvisor(chat);
      } else if (response === '__ACTIVATE_CHAT_WITH_ADVISOR__') {
        await this.activateChatWithAdvisor(chat);
      } else if (response) {
        await this.sendBotMessage(chat, response);
      }
    }
  }

  private async activateChatWithAdvisor(chat: Chat) {
    chat.status = ChatStatus.ACTIVE;
    await this.chatRepo.save(chat);
 
    const handoffMessage = await this.conversationFlow.getHumanHandoffMessage({ userName: chat.customerName });
    await this.sendBotMessage(chat, handoffMessage);
 
    this.chatGateway.notifyNewChat(chat);
    await this.createSystemMessage(chat, 'El cliente solicitó hablar con un asesor. Mensaje de espera enviado.');
 
    await this.autoAssignChat(chat);
  }
 
  private async autoAssignChat(chat: Chat) {
    const connectedAgents = this.presenceService.getConnectedAgents();
    const availableAgentIds = connectedAgents
      .filter(user => user.role === 'agent')
      .map(agent => agent.id);
 
    if (availableAgentIds.length === 0) {
      this.logger.warn(`No hay agentes disponibles. El chat #${chat.id} se pondrá en cola de espera.`);
      chat.status = ChatStatus.PENDING_ASSIGNMENT;
      await this.chatRepo.save(chat);
      await this.redisStore.addChatToWaitingQueue(chat.id);
      await this.createSystemMessage(chat, 'No hay asesores disponibles. El chat ha sido puesto en la cola de espera.');
      this.chatGateway.notifyNewChat(chat);
      return;
    }
 
    const bestAgent = await this.userService.findAgentWithFewerChats(availableAgentIds);
    if (bestAgent) {
      await this.assignChat(chat.id, bestAgent.id, true);
    } else {
      this.logger.warn(`No se encontró un agente disponible (de entre los conectados) para asignar el chat #${chat.id}`);
    }
  }
 
  public async getNextChatInQueue(): Promise<number | null> {
    return this.redisStore.getNextChatInQueue();
  }
 
  public async assignChat(chatId: number, agentId: number, isAutoAssignment = false) {
    const chat = await this.chatRepo.findOne({ where: { id: chatId } });
    if (!chat) throw new Error('Chat no existe');
    const agent = await this.userService.findById(agentId);
    if (!agent) throw new Error('Agente no encontrado');
 
    chat.assignedTo = agent;
    chat.status = ChatStatus.ACTIVE;
    await this.chatRepo.save(chat);
 
    const completeUpdatedChat = await this.findOne(chatId);
 
    this.chatGateway.notifyAssignedChat(completeUpdatedChat);
    this.chatGateway.notifyAssignmentToAgent(agentId, completeUpdatedChat);
 
    const assignmentType = isAutoAssignment ? 'automáticamente' : 'manualmente';
    await this.createSystemMessage(completeUpdatedChat, `Chat asignado ${assignmentType} al agente: ${agent.firstName || agent.email}.`);
 
    this.startAgentResponseTimer(chat.id, agent.id);
    return completeUpdatedChat;
  }
 
  async sendAgentMessage(chatId: number, userId: number, content: string) {
    this.cancelAgentResponseTimer(chatId);
    const chat = await this.chatRepo.findOne({ where: { id: chatId }, relations: ['assignedTo'] });
    if (!chat || chat.assignedTo?.id !== userId) {
      throw new Error('No tienes este chat asignado o no existe.');
    }
    const agentDisplayName = chat.assignedTo.firstName ? `${chat.assignedTo.firstName} ${chat.assignedTo.lastName || ''}`.trim() : `Agente (${chat.assignedTo.email || 'Desconocido'})`;
    const newMsg = this.messageRepo.create({ chat, sender: MessageSender.AGENT, senderId: userId, senderName: agentDisplayName, content });
    await this.messageRepo.save(newMsg);
    this.chatGateway.sendNewMessage({ chatId, message: newMsg, senderId: userId });
    await this.whatsappService.sendMessage(chat.contactNumber, content);
    return newMsg;
  }
 
  async releaseChat(chatId: number, sendSurvey = true) {
    this.cancelAgentResponseTimer(chatId);
    const chat = await this.chatRepo.findOne({ where: { id: chatId }, relations: ['assignedTo'] });
    if (!chat) throw new Error('Chat no existe');
    const agentName = chat.assignedTo ? chat.assignedTo.firstName : 'un agente';
    chat.status = ChatStatus.AUTO_RESPONDER;
    chat.assignedTo = null;
    await this.chatRepo.save(chat);
 
    const completeUpdatedChat = await this.findOne(chatId);
 
    this.chatGateway.notifyReleasedChat(completeUpdatedChat);
    await this.createSystemMessage(completeUpdatedChat, `El chat fue liberado por ${agentName} y regresó al bot.`);
 
    if (sendSurvey) {
      const surveyQuestion = 'Antes de que se vaya, ¿podría ayudarme con algo? 🧡\n\n¿Cómo calificaría la atención que recibió hoy?\n1️⃣ Mala 😞\n2️⃣ Regular 😐\n3️⃣ ¡Excelente! 😄\n\nPor favor, escriba el número de su respuesta o cualquier otro comentario que tenga.';
      await this.sendBotMessage(chat, surveyQuestion);
      const userState = await this.redisStore.getUserState(chat.contactNumber);
      userState.step = ConversationStep.SURVEY;
      await this.redisStore.setUserState(chat.contactNumber, userState);
    }
    return completeUpdatedChat;
  }
 
  async unassignChat(chatId: number) {
    this.cancelAgentResponseTimer(chatId);
    const chat = await this.chatRepo.findOne({ where: { id: chatId }, relations: ['assignedTo'] });
    if (!chat) throw new Error('Chat no existe');
    const previousAgentName = chat.assignedTo ? chat.assignedTo.firstName : 'un agente';
    chat.status = ChatStatus.AUTO_RESPONDER;
    chat.assignedTo = null;
    await this.chatRepo.save(chat);
 
    const completeUpdatedChat = await this.findOne(chatId);
 
    await this.redisStore.resetUserState(completeUpdatedChat.contactNumber);
    this.chatGateway.notifyReleasedChat(completeUpdatedChat);
    await this.createSystemMessage(completeUpdatedChat, `La asignación fue removida de ${previousAgentName} y la conversación fue finalizada.`);
    const farewellMessage = 'Hemos finalizado por ahora. Si necesitas algo más, no dudes en escribir. ¡Hasta pronto! 👋';
    await this.sendBotMessage(completeUpdatedChat, farewellMessage);
    return completeUpdatedChat;
  }
 
  private startAgentResponseTimer(chatId: number, agentId: number) {
    this.cancelAgentResponseTimer(chatId);
    const timeoutMs = this.configService.get<number>('AGENT_RESPONSE_TIMEOUT_MS', 300000);
    const timer = setTimeout(() => {
      this.reassignUnansweredChat(chatId, agentId);
    }, timeoutMs);
    this.agentResponseTimeouts.set(chatId, timer);
  }
 
  private cancelAgentResponseTimer(chatId: number) {
    if (this.agentResponseTimeouts.has(chatId)) {
      clearTimeout(this.agentResponseTimeouts.get(chatId));
      this.agentResponseTimeouts.delete(chatId);
    }
  }
 
  private async reassignUnansweredChat(chatId: number, unresponsiveAgentId: number) {
    const chat = await this.chatRepo.findOne({ where: { id: chatId }, relations: ['assignedTo'] });
    if (!chat || chat.status !== ChatStatus.ACTIVE || chat.assignedTo?.id !== unresponsiveAgentId) {
      return;
    }
    const connectedAgents = this.presenceService.getConnectedAgents();
    const availableAgentIds = connectedAgents.filter(u => u.role === 'agent').map(agent => agent.id);
    const nextBestAgent = await this.userService.findAgentWithFewerChats(availableAgentIds, unresponsiveAgentId);
    if (nextBestAgent) {
      await this.assignChat(chat.id, nextBestAgent.id, true);
    } else {
      await this.releaseChat(chatId, false);
    }
  }
 
  private startAutoResponderTimer(chatId: number) {
    if (this.autoResponderTimeouts.has(chatId)) {
      clearTimeout(this.autoResponderTimeouts.get(chatId));
    }
    const timeoutMs = this.configService.get<number>('AUTO_RESPONDER_TIMEOUT_MS', 1800000);
    const timer = setTimeout(async () => {
      const chat = await this.chatRepo.findOneBy({ id: chatId });
      if (chat && chat.status === ChatStatus.AUTO_RESPONDER) {
        const currentState = await this.redisStore.getUserState(chat.contactNumber);
        if (currentState.step === ConversationStep.START) {
          this.autoResponderTimeouts.delete(chatId);
          return;
        }
        await this.sendBotMessage(chat, 'La sesión ha caducado por inactividad.');
        await this.redisStore.resetUserState(chat.contactNumber);
      }
      this.autoResponderTimeouts.delete(chatId);
    }, timeoutMs);
    this.autoResponderTimeouts.set(chatId, timer);
  }
 
  private async createSystemMessage(chat: Chat, content: string) {
    const systemMsg = this.messageRepo.create({ chat, sender: MessageSender.SYSTEM, content });
    await this.messageRepo.save(systemMsg);
    this.chatGateway.sendNewMessage({ chatId: chat.id, message: systemMsg });
  }
 
  private async saveCustomerMessage(chat: Chat, message: SimplifiedMessage) {
    const messageData: Partial<Message> = {
      chat,
      sender: MessageSender.CUSTOMER,
      senderName: chat.customerName || chat.contactNumber,
      content: message.body,
      timestamp: new Date(),
    };
 
    if (message.hasMedia && message.media) {
      const randomName = crypto.randomBytes(16).toString('hex');
      const extension = lookup(message.media.mimetype);
      const filename = `${randomName}.${extension || 'bin'}`;
      const uploadsDir = path.join('./uploads');
      const filePath = path.join(uploadsDir, filename);
 
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.writeFile(filePath, message.media.data);
        messageData.mediaUrl = `/uploads/${filename}`;
        messageData.mimeType = message.media.mimetype;
        if (!messageData.content) {
          messageData.content = 'Archivo adjunto';
        }
      } catch (error) {
        this.logger.error(`Error al guardar archivo de media para ${chat.contactNumber}:`, error);
      }
    }
 
    const newMsg = this.messageRepo.create(messageData);
    await this.messageRepo.save(newMsg);
    await this.chatRepo.save(chat);
    this.chatGateway.sendNewMessage({ chatId: chat.id, message: newMsg });
  }
 
  private async sendBotMessage(chat: Chat, text: string) {
    await this.whatsappService.sendMessage(chat.contactNumber, text);
    const botMsg = this.messageRepo.create({ chat, sender: MessageSender.BOT, senderName: 'Kika', content: text });
    await this.messageRepo.save(botMsg);
    this.chatGateway.sendNewMessage({ chatId: chat.id, message: botMsg });
  }
 
  async sendMediaMessage(chatId: number, userId: number, file: Express.Multer.File, caption?: string) {
    const chat = await this.chatRepo.findOne({ where: { id: chatId }, relations: ['assignedTo'] });
    const agent = await this.userService.findById(userId);
    if (!chat || !agent || chat.assignedTo?.id !== userId) {
      throw new Error('No tienes este chat asignado o no existe.');
    }
    try {
      await this.whatsappService.sendMedia(chat.contactNumber, file.path, caption);
      const messageContent = caption || file.originalname;
      const agentDisplayName = agent.firstName ? `${agent.firstName} ${agent.lastName || ''}`.trim() : `Agente (${agent.email})`;
      const newMsg = this.messageRepo.create({
        chat, sender: MessageSender.AGENT, senderId: userId, senderName: agentDisplayName,
        content: messageContent, mediaUrl: `/uploads/${file.filename}`, mimeType: file.mimetype,
      });
      const savedMsg = await this.messageRepo.save(newMsg);
      this.chatGateway.sendNewMessage({ chatId, message: savedMsg, senderId: userId });
      return savedMsg;
    } finally { }
  }
 
  async createInternalNote(chatId: number, authorId: number, content: string): Promise<InternalNote> {
    const chat = await this.chatRepo.findOneBy({ id: chatId });
    if (!chat) throw new Error('Chat no encontrado');
 
    const author = await this.userService.findById(authorId);
    if (!author) throw new Error('Autor no encontrado');
 
    const note = this.noteRepo.create({ content, chat, author });
    const savedNote = await this.noteRepo.save(note);
 
    this.chatGateway.broadcastNewInternalNote(chatId, savedNote);
    return savedNote;
  }
 
  async markMessagesAsRead(chatId: number) {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const chat = await transactionalEntityManager.findOne(Chat, {
        where: { id: chatId },
        relations: ['messages'],
      });
 
      if (!chat) {
        throw new NotFoundException('Chat no encontrado');
      }
 
      const unreadMessages = chat.messages.filter(
        (m) => m.sender === MessageSender.CUSTOMER && m.readAt === null,
      );
 
      if (unreadMessages.length === 0) {
        return this.findOne(chatId);
      }
 
      for (const message of unreadMessages) {
        message.readAt = new Date();
      }
 
      await transactionalEntityManager.save(Message, unreadMessages);
 
      await transactionalEntityManager.update(Chat, chatId, {
        updatedAt: new Date(),
      });
 
      this.logger.log(`Marcados ${unreadMessages.length} mensajes como leídos para el chat #${chatId}.`);
 
      return this.findOne(chatId);
    });
  }
 
  async findAll() {
    const chats = await this.chatRepo
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.assignedTo', 'assignedTo')
      .loadRelationCountAndMap(
        'chat.unreadCount',
        'chat.messages',
        'message',
        (qb) =>
          qb.where('message.sender = :sender AND message.readAt IS NULL', {
            sender: MessageSender.CUSTOMER,
          }),
      )
      .orderBy('chat.updatedAt', 'DESC')
      .getMany();
    return chats;
  }
 
  async findOne(chatId: number) {
    const chat = await this.chatRepo
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.assignedTo', 'assignedTo')
      .leftJoinAndSelect('chat.messages', 'messages')
      .leftJoinAndSelect('chat.notes', 'notes')
      .leftJoinAndSelect('notes.author', 'author')
      .loadRelationCountAndMap(
        'chat.unreadCount',
        'chat.messages',
        'message',
        (qb) =>
          qb.where('message.sender = :sender AND message.readAt IS NULL', {
            sender: MessageSender.CUSTOMER,
          }),
      )
      .where('chat.id = :chatId', { chatId })
      .orderBy({
        'messages.id': 'ASC',
        'notes.createdAt': 'ASC',
      })
      .getOne();
 
    return chat;
  }
 
  @Cron(process.env.RELEASE_INACTIVE_CHATS_CRON_SCHEDULE)
  async releaseLongActiveChats() {
    this.logger.log('Buscando chats con más de 24 horas en estado ACTIVE...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldActiveChats = await this.chatRepo.find({ where: { status: ChatStatus.ACTIVE, updatedAt: LessThan(twentyFourHoursAgo) } });
    if (!oldActiveChats.length) return;
    this.logger.log(`Se liberarán ${oldActiveChats.length} chat(s).`);
    for (const c of oldActiveChats) {
      try {
        await this.releaseChat(c.id, false);
      } catch (error) {
        this.logger.error(`Error liberando chat #${c.id}:`, error);
      }
    }
  }
}