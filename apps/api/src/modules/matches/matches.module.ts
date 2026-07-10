import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Dream } from '../dreams/entities/dream.entity';
import { DreamAnalysis } from '../analysis/entities/dream-analysis.entity';
import { DreamTheme } from '../analysis/entities/dream-theme.entity';
import { DreamEmotion } from '../analysis/entities/dream-emotion.entity';
import { DreamSymbol } from '../analysis/entities/dream-symbol.entity';
import { DreamLocation } from '../analysis/entities/dream-location.entity';
import { DreamFigure } from '../analysis/entities/dream-figure.entity';
import { DreamMatch } from './entities/dream-match.entity';
import { MatchEngineService } from './match-engine.service';
import { MatchingService } from './matching.service';
import { MatchesController } from './matches.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dream,
      DreamAnalysis,
      DreamTheme,
      DreamEmotion,
      DreamSymbol,
      DreamLocation,
      DreamFigure,
      DreamMatch,
    ]),
    NotificationsModule,
  ],
  providers: [MatchEngineService, MatchingService],
  controllers: [MatchesController],
  exports: [MatchingService],
})
export class MatchesModule {}
