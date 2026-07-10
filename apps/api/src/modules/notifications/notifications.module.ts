import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DreamMatch } from '../matches/entities/dream-match.entity';
import { User } from '../users/entities/user.entity';
import { DreamNotificationService } from './dream-notification.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      User,
      DreamMatch,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, DreamNotificationService],
  exports: [NotificationsService, DreamNotificationService],
})
export class NotificationsModule {}
