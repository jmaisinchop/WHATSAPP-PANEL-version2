// src/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { SurveyResponse, SurveyRating } from '../chat/entities/survey-response.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly surveyResponseRepo: Repository<SurveyResponse>,
  ) {}

  async getSurveyAnalytics() {

    const counts = await this.surveyResponseRepo
      .createQueryBuilder('survey')
      .select('survey.rating', 'rating')
      .addSelect('COUNT(survey.id)', 'count')
      .groupBy('survey.rating')
      .getRawMany();

    const surveyCounts = {
      [SurveyRating.EXCELENTE]: 0,
      [SurveyRating.REGULAR]: 0,
      [SurveyRating.MALA]: 0,
    };

    counts.forEach(item => {
      surveyCounts[item.rating] = parseInt(item.count, 10);
    });


    const recentComments = await this.surveyResponseRepo.find({
      where: { comment: Not(IsNull()) },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['chat'],
    });

    return {
      counts: surveyCounts,
      comments: recentComments,
    };
  }
}