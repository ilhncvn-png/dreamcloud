import { Module } from '@nestjs/common';
import { DreamAnalysisService } from './dream-analysis.service';

@Module({
  providers: [DreamAnalysisService],
  exports:   [DreamAnalysisService],
})
export class DreamAnalysisModule {}
