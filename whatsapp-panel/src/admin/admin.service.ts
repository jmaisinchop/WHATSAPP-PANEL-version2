import { Injectable } from '@nestjs/common';
// Ya no se importa nada de 'whatsapp-web.js'
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AdminService {
  constructor(private readonly whatsappService: WhatsappService) { }

  async getBotProfile() {
    return this.whatsappService.getBotProfile();
  }

  async updateProfilePicture(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo.');
    }

    // CAMBIO CLAVE: Ahora pasamos directamente la ruta del archivo que nos da Multer.
    // El servicio de WhatsApp se encarga del resto.
    await this.whatsappService.setProfilePicture(file.path);

    return { message: 'Foto de perfil actualizada con éxito.' };
  }

  async updateBotStatus(newStatus: string) {
    await this.whatsappService.setBotStatus(newStatus);
    return { message: 'Estado/Info del perfil actualizado con éxito.' };
  }
}