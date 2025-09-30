import { Controller, Get, Post, Patch, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { AdminService } from './admin.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PresenceService } from '../chat/presence.service'; // ✅ 1. IMPORTAR

@Controller('admin')
export class AdminController {
  // ✅ 2. INYECTAR EL PRESENCESERVICE EN EL CONSTRUCTOR
  constructor(
    private readonly adminService: AdminService,
    private readonly presenceService: PresenceService,
  ) {}

  @Get('bot-profile')
  @UseGuards(AuthGuard('jwt'))
  async getBotProfile() {
    return this.adminService.getBotProfile();
  }

  @Post('profile-picture')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('Solo se permiten archivos de imagen.'), false);
      }
      cb(null, true);
    },
  }))
  async uploadProfilePicture(@UploadedFile() file: Express.Multer.File) {
    return this.adminService.updateProfilePicture(file);
  }

  @Patch('bot-status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async updateDisplayName(@Body() updateStatusDto: UpdateStatusDto) {
    return this.adminService.updateBotStatus(updateStatusDto.status);
  }

  // ✅ 3. NUEVO ENDPOINT PARA VER AGENTES CONECTADOS
  @Get('connected-agents')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin') // Solo los administradores pueden acceder a esta ruta
  getConnectedAgents() {
    return this.presenceService.getConnectedAgents();
  }
}