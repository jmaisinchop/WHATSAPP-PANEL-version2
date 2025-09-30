// src/ai/ai.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';

@Module({
  imports: [ConfigModule], // Importamos ConfigModule para que AiService pueda usar las variables de entorno.
  providers: [AiService],
  exports: [AiService], // Exportamos AiService para que otros módulos (como ConversationFlow) puedan inyectarlo.
})
export class AiModule {}