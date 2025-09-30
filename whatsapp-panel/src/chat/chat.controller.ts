import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '@nestjs/passport';
import { ChatGateway } from './chat.gateway';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Roles } from 'src/auth/guards/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('chats')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) { }

  @Get()
  findAll() {
    return this.chatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.findOne(id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) chatId: number, @Request() req) {
    const userId = req.user.userId;
    const updatedChat = await this.chatService.markMessagesAsRead(chatId);
    this.chatGateway.notifyMessagesRead(chatId, userId);
    return updatedChat;
  }

  @Post(':id/message')
  async sendMsg(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() body: { content: string },
  ) {
    const userId = req.user.userId;
    return this.chatService.sendAgentMessage(id, userId, body.content);
  }

  @Post(':id/media')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads', // Asegúrate de que esta carpeta exista en la raíz de tu proyecto de backend
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        const extension = file.originalname.split('.').pop();
        cb(null, `${randomName}.${extension}`);
      },
    }),
  }))
  async sendMedia(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { caption?: string },
  ) {
    const userId = req.user.userId;
    return this.chatService.sendMediaMessage(id, userId, file, body.caption);
  }

  @Patch(':id/release')
  async release(@Param('id', ParseIntPipe) id: number) {
    // La llamada aquí es simple. No pasamos 'false'.
    // Así, la función del servicio usará el valor por defecto 'sendSurvey = true'.
    const chat = await this.chatService.releaseChat(id);
    this.chatGateway.notifyReleasedChat(chat);
    return chat;
  }

  // En src/chat/chat.controller.ts

  @Patch(':id/assign')
  async assignChat(
    @Param('id', ParseIntPipe) chatId: number,
    @Request() req,
    @Body() body: { agentId?: number },
  ) {
    const loggedInUser = req.user;

    // ✅ LÓGICA DE PERMISOS MEJORADA
    // Si se está intentando asignar a otro agente (body.agentId existe y es diferente al del usuario logueado),
    // se verifica que el que hace la petición sea un 'admin'.
    if (body.agentId && body.agentId !== loggedInUser.userId && loggedInUser.role !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden asignar chats a otros agentes.');
    }

    // ✅ LÓGICA DE ASIGNACIÓN FLEXIBLE
    // Si el 'agentId' viene en el cuerpo, se usa ese. Si no, se usa el ID del usuario
    // que hace la petición (para que los agentes puedan auto-asignarse).
    const agentIdToAssign = body.agentId ?? loggedInUser.userId;

    return this.chatService.assignChat(chatId, agentIdToAssign);
  }
  @Patch(':id/unassign')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async unassign(@Param('id', ParseIntPipe) id: number) {
    const chat = await this.chatService.unassignChat(id);
    return chat;
  }

  @Post(':id/notes')
  async createNote(
    @Param('id', ParseIntPipe) chatId: number,
    @Request() req,
    @Body() body: { content: string },
  ) {
    const authorId = req.user.userId;
    return this.chatService.createInternalNote(chatId, authorId, body.content);
  }
}