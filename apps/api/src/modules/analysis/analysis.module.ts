import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dream } from '../dreams/entities/dream.entity';
import { StubAnalyzerService } from './ai/stub-analyzer.service';
import { DREAM_ANALYZER } from './ai/ai-analysis.interface';
import { AnalysisProcessor } from './analysis.processor';
import { AnalysisService } from './analysis.service';
import { ANALYSIS_QUEUE } from './constants';
import { DreamAnalysis } from './entities/dream-analysis.entity';
import { DreamEmotion } from './entities/dream-emotion.entity';
import { DreamFigure } from './entities/dream-figure.entity';
import { DreamLocation } from './entities/dream-location.entity';
import { DreamObject } from './entities/dream-object.entity';
import { DreamSymbol } from './entities/dream-symbol.entity';
import { DreamTheme } from './entities/dream-theme.entity';

@Module({
  imports: [
    ConfigModule,

    BullModule.registerQueueAsync({
      name: ANALYSIS_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('redis.url', 'redis://localhost:6379'),
        prefix: config.get<string>('redis.queuePrefix', 'dreamcloud:queue'),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),

    TypeOrmModule.forFeature([
      Dream,
      DreamAnalysis,
      DreamTheme,
      DreamEmotion,
      DreamFigure,
      DreamLocation,
      DreamSymbol,
      DreamObject,
    ]),
  ],
  providers: [
    AnalysisService,
    AnalysisProcessor,
    {
      provide:  DREAM_ANALYZER,
      useClass: StubAnalyzerService,
    },
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
