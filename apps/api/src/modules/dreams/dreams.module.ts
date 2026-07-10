import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisModule } from '../analysis/analysis.module';
import { MentionsModule } from '../mentions/mentions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlacesModule } from '../places/places.module';
import { DreamsController } from './dreams.controller';
import { DreamsService } from './dreams.service';
import { DreamLike } from './entities/dream-like.entity';
import { DreamSave } from './entities/dream-save.entity';
import { Dream } from './entities/dream.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dream, DreamLike, DreamSave]), NotificationsModule, AnalysisModule, MentionsModule, PlacesModule],
  controllers: [DreamsController],
  providers: [DreamsService],
  exports: [DreamsService],
})
export class DreamsModule {}
