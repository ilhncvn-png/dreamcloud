import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectionsModule } from '../connections/connections.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DreamMention } from './entities/dream-mention.entity';
import { MentionsController } from './mentions.controller';
import { DreamMentionsService } from './mentions.service';

@Module({
  imports: [TypeOrmModule.forFeature([DreamMention]), NotificationsModule, ConnectionsModule],
  controllers: [MentionsController],
  providers: [DreamMentionsService],
  exports: [DreamMentionsService],
})
export class MentionsModule {}
