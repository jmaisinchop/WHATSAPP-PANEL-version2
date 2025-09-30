import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  WAMessage,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as pino from 'pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import { lookup } from 'mime-types';
import * as qrcode from 'qrcode-terminal';
import * as path from 'path';

// Interfaz para unificar el formato de los mensajes recibidos
export interface SimplifiedMessage {
  from: string;
  body: string; // El texto o el pie de foto del archivo
  hasMedia: boolean;
  media?: {
    mimetype: string;
    data: Buffer;
  };
}

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: any;
  public isReady = false;

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit() {
    this.connectToWhatsApp();
  }

  private async connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    const { version } = await fetchLatestBaileysVersion();
    this.logger.log(`⚡️ Usando Baileys v${version.join('.')}`);

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      printQRInTerminal: false, // Lo manejamos nosotros para mostrarlo en la consola
      logger: pino({ level: 'silent' }),
      browser: ['KIKA-Panel', 'Chrome', '1.0.0'], // Nombre personalizado para el dispositivo
    });

    // Listener principal para el estado de la conexión
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.log('QR Code generado. Escanéalo con tu teléfono.');
        qrcode.generate(qr, { small: true }); // Muestra el QR en la terminal
      }

      if (connection === 'close') {
        this.isReady = false;
        const statusCode = (lastDisconnect.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.logger.error(
          `🔌 Conexión cerrada. Razón: ${statusCode}. Reconectando: ${shouldReconnect}`,
        );
        
        // Si el error es 401 (Logout), borra la sesión y reinicia la conexión
        if (statusCode === DisconnectReason.loggedOut) {
          this.logger.warn('🚫 Sesión cerrada desde el teléfono. Eliminando credenciales...');
          try {
            await fs.rm('baileys_auth_info', { recursive: true, force: true });
            // Inicia una nueva conexión para generar un nuevo QR
            this.connectToWhatsApp(); 
          } catch (error) {
            this.logger.error('Error eliminando la carpeta de sesión', error);
          }
        } else if (shouldReconnect) {
          // Para otros errores, intenta reconectar después de 5 segundos
          setTimeout(() => this.connectToWhatsApp(), 5000);
        }
      } else if (connection === 'open') {
        this.logger.log('✅ ¡Conexión con WhatsApp establecida!');
        this.isReady = true;
        this.eventEmitter.emit('whatsapp.ready');
      }
    });

    // Guarda las credenciales cada vez que se actualizan
    this.sock.ev.on('creds.update', saveCreds);

    // Listener para mensajes nuevos
    this.sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      // Ignora mensajes propios, notificaciones de estado o de grupos
      if (!msg.message || msg.key.fromMe || !msg.key.remoteJid.endsWith('@s.whatsapp.net')) {
        return;
      }
      
      const from = msg.key.remoteJid;
      const messageContent = msg.message;
      const messageType = Object.keys(messageContent)[0];
      const body = messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '';

      const hasMedia = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'].includes(messageType);
      
      const simplifiedMessage: SimplifiedMessage = { from, body, hasMedia };

      if (hasMedia) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', { }, { logger: pino({ level: 'silent' }), reuploadRequest: this.sock.reuploadFile });
          simplifiedMessage.media = {
            mimetype: messageContent[messageType]?.mimetype || 'application/octet-stream',
            data: buffer as Buffer,
          };
        } catch (error) {
          this.logger.error(`❌ Error al descargar media de ${from}:`, error);
          simplifiedMessage.hasMedia = false;
        }
      }
      
      // Emite el mensaje unificado para que otros servicios lo procesen
      this.eventEmitter.emit('whatsapp.message', simplifiedMessage);
    });
  }

  // Función de utilidad para asegurar el formato correcto del ID de WhatsApp
  private toJid(number: string): string {
    return number.includes('@') ? number : `${number.replace('+', '')}@s.whatsapp.net`;
  }
  
  // --- FUNCIONES PÚBLICAS ---

  async sendMessage(to: string, text: string) {
    if (!this.isReady) throw new Error('WhatsApp no está conectado.');
    const jid = this.toJid(to);
    await this.sock.sendMessage(jid, { text });
    this.logger.log(`✉️ Mensaje de texto enviado a ${jid}`);
  }

  async sendMedia(to: string, filePath: string, caption?: string) {
    if (!this.isReady) throw new Error('WhatsApp no está conectado.');
    const jid = this.toJid(to);
    const mimeType = lookup(filePath);

    if (!mimeType) throw new Error('No se pudo determinar el tipo de archivo.');

    let messageOptions: any = { caption: caption || '' };
    if (mimeType.startsWith('image/')) {
      messageOptions.image = { url: filePath };
    } else if (mimeType.startsWith('video/')) {
      messageOptions.video = { url: filePath };
    } else if (mimeType.startsWith('audio/')) {
      messageOptions.audio = { url: filePath };
      messageOptions.mimetype = mimeType;
    } else {
      messageOptions.document = { url: filePath };
      messageOptions.mimetype = mimeType;
      messageOptions.fileName = path.basename(filePath);
    }

    await this.sock.sendMessage(jid, messageOptions);
    this.logger.log(`🖼️ Media enviada a ${jid}`);
  }

  async getContactInfo(contactId: string) {
    if (!this.isReady) throw new Error('WhatsApp no está conectado.');
    const jid = this.toJid(contactId);

    try {
      const profilePicUrl = await this.sock.profilePictureUrl(jid, 'image');
      const [metadata] = await this.sock.onWhatsApp(jid);
      
      if (!metadata?.exists) {
        throw new NotFoundException(`El contacto ${contactId} no existe en WhatsApp.`);
      }

      return {
        id: metadata.jid,
        pushname: 'Desconocido', // Baileys no provee esta información directamente
        number: metadata.jid.split('@')[0],
        profilePicUrl: profilePicUrl,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo info de ${contactId}:`, error);
      return { id: jid, number: jid.split('@')[0], profilePicUrl: null, name: 'No disponible' };
    }
  }

  async getBotProfile() {
    if (!this.isReady || !this.sock.user) {
      throw new Error('El cliente de WhatsApp no está listo.');
    }
    const botId = this.sock.user.id;
    let profilePicUrl = null;

    try {
      profilePicUrl = await this.sock.profilePictureUrl(botId, 'image');
    } catch (error) {
      this.logger.warn(`No se pudo obtener la foto de perfil del bot: ${error.message}. Probablemente no tiene una establecida.`);
    }

    return {
      name: this.sock.user.name,
      number: botId.split(':')[0].split('@')[0],
      profilePicUrl,
    };
  }

  async setProfilePicture(filePath: string) {
    if (!this.isReady) throw new Error('WhatsApp no está conectado.');
    const imageBuffer = await fs.readFile(filePath);
    await this.sock.updateProfilePicture(this.sock.user.id, imageBuffer);
    this.logger.log('📸 Foto de perfil del bot actualizada.');
  }

  async setBotStatus(newStatus: string) {
    if (!this.isReady) throw new Error('WhatsApp no está conectado.');
    await this.sock.updateProfileStatus(newStatus);
    this.logger.log(`ℹ️ Estado/Info del bot actualizado a: "${newStatus}"`);
  }
}