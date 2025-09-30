// src/dashboard/dashboard.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt')) // Protegemos el endpoint, solo usuarios logueados pueden acceder
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('survey-analytics')
  getSurveyAnalytics() {
    return this.dashboardService.getSurveyAnalytics();
  }
}