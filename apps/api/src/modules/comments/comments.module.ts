import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Dream } from '../dreams/entities/dream.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { DreamComment } from './entities/dream-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DreamComment, Dream]), NotificationsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
