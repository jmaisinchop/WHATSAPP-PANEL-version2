// src/dashboard/dashboard.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SurveyResponse } from '../chat/entities/survey-response.entity';

@Module({
  imports: [
    // Importamos la entidad para que el servicio pueda usar su repositorio
    TypeOrmModule.forFeature([SurveyResponse]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}