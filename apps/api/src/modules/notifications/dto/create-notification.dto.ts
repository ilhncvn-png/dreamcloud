import { NotificationType } from '../../../common/enums/database.enums';

export interface CreateNotificationDto {
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  dreamId?: string;
  commentId?: string;
  matchId?: string;
  title: string;
  body: string;
}
