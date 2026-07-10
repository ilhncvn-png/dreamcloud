import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ANALYSIS_JOB, ANALYSIS_QUEUE } from './constants';
import { AnalysisService } from './analysis.service';

@Processor(ANALYSIS_QUEUE)
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @Process(ANALYSIS_JOB)
  async handleAnalysis(job: Job<{ dreamId: string }>): Promise<void> {
    this.logger.debug(`Processing dream analysis job ${job.id} for dream ${job.data.dreamId}`);
    await this.analysisService.analyze(job.data.dreamId);
  }
}
