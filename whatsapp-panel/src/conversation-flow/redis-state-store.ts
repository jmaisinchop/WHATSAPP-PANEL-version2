import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConversationStep } from './conversation-state.enum';
import { UserState } from './conversation-flow.interface';

@Injectable()
export class RedisStateStore {
  private logger = new Logger(RedisStateStore.name);
  private redisClient: RedisClientType;
  // ✅ Clave para nuestra cola de espera en Redis
  private readonly WAITING_CHATS_QUEUE_KEY = 'waiting_chats_queue';

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.redisClient = createClient({
      url: redisUrl,
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`🔌 Conectado exitosamente a Redis en ${redisUrl}`);
    });

    this.redisClient.connect();
  }

  private getKey(contactNumber: string): string {
    return `conversation_state:${contactNumber}`;
  }

  public async getUserState(contactNumber: string): Promise<UserState> {
    const raw = await this.redisClient.get(this.getKey(contactNumber));
    if (!raw) {
      const newState: UserState = { step: ConversationStep.START };
      await this.setUserState(contactNumber, newState);
      return newState;
    }
    return JSON.parse(raw);
  }

  public async setUserState(contactNumber: string, state: UserState) {
    const str = JSON.stringify(state);
    await this.redisClient.set(this.getKey(contactNumber), str);
  }

  public async resetUserState(contactNumber: string) {
    await this.redisClient.del(this.getKey(contactNumber));
  }

  // ======================================================
  // ✅ NUEVAS FUNCIONES PARA LA COLA DE ESPERA DE CHATS
  // ======================================================

  /**
   * Añade el ID de un chat al final de la cola de espera (primero en entrar).
   * LPUSH añade un elemento al "frente" de la lista.
   * @param chatId El ID del chat que necesita un agente.
   */
  public async addChatToWaitingQueue(chatId: number): Promise<void> {
    await this.redisClient.lPush(this.WAITING_CHATS_QUEUE_KEY, String(chatId));
    this.logger.log(`Chat #${chatId} añadido a la cola de espera.`);
  }

  /**
   * Obtiene y elimina el ID del chat más antiguo de la cola (el que más tiempo lleva esperando).
   * RPOP saca un elemento del "final" de la lista (el primero que entró).
   * @returns El ID del chat, o null si la cola está vacía.
   */
  public async getNextChatInQueue(): Promise<number | null> {
    const chatIdString = await this.redisClient.rPop(this.WAITING_CHATS_QUEUE_KEY);
    if (chatIdString) {
      this.logger.log(`Chat #${chatIdString} obtenido de la cola para ser asignado.`);
      return parseInt(chatIdString, 10);
    }
    return null;
  }
}