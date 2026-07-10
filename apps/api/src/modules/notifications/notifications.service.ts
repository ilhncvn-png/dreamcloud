import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';

export interface NotificationResult {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  dreamId: string | null;
  commentId: string | null;
  matchId: string | null;
  actor: { id: string; username: string; avatarUrl: string | null } | null;
  createdAt: Date;
}

export interface NotificationsPage {
  items: NotificationResult[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface NotificationPreferenceResult {
  dreamMatch: boolean;
  dreamConnection: boolean;
  sharedSymbol: boolean;
  highResonance: boolean;
  signalTrending: boolean;
  dreamMilestone: boolean;
  dreamMention: boolean;
  social: boolean;
}

const DEFAULT_PREFS: NotificationPreferenceResult = {
  dreamMatch: true,
  dreamConnection: true,
  sharedSymbol: true,
  highResonance: true,
  signalTrending: true,
  dreamMilestone: true,
  dreamMention: true,
  social: true,
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,

    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<void> {
    // Skip non-system self-notifications
    if (dto.actorId && dto.recipientId === dto.actorId) return;

    await this.notifRepo.save(
      this.notifRepo.create({
        recipientId: dto.recipientId,
        actorId:     dto.actorId ?? null,
        type:        dto.type,
        dreamId:     dto.dreamId ?? null,
        commentId:   dto.commentId ?? null,
        matchId:     dto.matchId ?? null,
        title:       dto.title,
        body:        dto.body,
      }),
    );
  }

  async list(userId: string, page = 1, limit = 20): Promise<NotificationsPage> {
    const [notifs, total] = await this.notifRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.actor', 'actor')
      .leftJoinAndSelect('actor.profile', 'actorProfile')
      .where('n.recipientId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = notifs.map((n) => ({
      id:        n.id,
      type:      n.type,
      title:     n.title,
      body:      n.body,
      isRead:    n.isRead,
      dreamId:   n.dreamId,
      commentId: n.commentId,
      matchId:   n.matchId,
      actor: n.actor
        ? {
            id:        n.actor.id,
            username:  n.actor.username,
            avatarUrl: n.actor.profile?.avatarUrl ?? null,
          }
        : null,
      createdAt: n.createdAt,
    }));

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { recipientId: userId, isRead: false } });
  }

  async markRead(notifId: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id: notifId, recipientId: userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update({ recipientId: userId, isRead: false }, { isRead: true });
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceResult> {
    const pref = await this.prefRepo.findOne({ where: { userId } });
    if (!pref) return { ...DEFAULT_PREFS };
    return {
      dreamMatch:      pref.dreamMatch,
      dreamConnection: pref.dreamConnection,
      sharedSymbol:    pref.sharedSymbol,
      highResonance:   pref.highResonance,
      signalTrending:  pref.signalTrending,
      dreamMilestone:  pref.dreamMilestone,
      dreamMention:    pref.dreamMention,
      social:          pref.social,
    };
  }

  async upsertPreferences(
    userId: string,
    dto: Partial<NotificationPreferenceResult>,
  ): Promise<NotificationPreferenceResult> {
    await this.prefRepo.upsert(
      { userId, ...dto },
      { conflictPaths: ['userId'] },
    );
    return this.getPreferences(userId);
  }

  // Used by DreamNotificationService to check preferences without a DB round-trip per-field
  async getRawPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.prefRepo.findOne({ where: { userId } });
  }
}
