import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../../common/enums/database.enums';
import { DreamMatch } from '../matches/entities/dream-match.entity';
import { User } from '../users/entities/user.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationsService } from './notifications.service';

const DREAM_MILESTONES = new Set([1, 5, 10, 25, 50, 100, 250, 500]);

const MILESTONE_BODY: Record<number, string> = {
  1:   'İlk rüyanızı paylaştınız! Rüya yolculuğunuza hoş geldiniz.',
  5:   '5. rüyanızı paylaştınız. Kolektif bilinçaltına katkınız büyüyor.',
  10:  '10. rüyanızı paylaştınız. Artık bir rüya kaşifisiniz.',
  25:  '25. rüyanızı paylaştınız. Rüya arşiviniz derinleşiyor.',
  50:  '50. rüyanızı paylaştınız. Derin bir rüyacı oluyorsunuz.',
  100: '100. rüyanızı paylaştınız. DreamCloud\'un en derin rüyacılarından birisiniz.',
  250: '250. rüyanızı paylaştınız. Efsanevi bir rüya yorumcususunuz.',
  500: '500. rüyanızı paylaştınız. Siz artık bir rüya ustasısınız.',
};

@Injectable()
export class DreamNotificationService {
  constructor(
    private readonly notificationsService: NotificationsService,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(DreamMatch)
    private readonly matchRepo: Repository<DreamMatch>,

    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,
  ) {}

  // Fetches preferences; returns all-enabled defaults if no row exists
  private async prefs(userId: string): Promise<NotificationPreference> {
    return (
      (await this.prefRepo.findOne({ where: { userId } })) ??
      Object.assign(new NotificationPreference(), {
        userId,
        dreamMatch: true, dreamConnection: true, sharedSymbol: true,
        highResonance: true, signalTrending: true, dreamMilestone: true,
        dreamMention: true, social: true,
      })
    );
  }

  async notifyNewMatch(params: {
    matchId: string;
    userIdA: string; dreamIdA: string;
    userIdB: string; dreamIdB: string;
    resonanceLevel: string;
    matchScore: number;
    sharedSymbols: string[];
    sharedLocations: string[];
  }): Promise<void> {
    const {
      matchId, userIdA, dreamIdA, userIdB, dreamIdB,
      resonanceLevel, matchScore, sharedSymbols, sharedLocations,
    } = params;

    const [userA, userB] = await Promise.all([
      this.userRepo.findOne({ where: { id: userIdA }, select: ['id', 'username'] }),
      this.userRepo.findOne({ where: { id: userIdB }, select: ['id', 'username'] }),
    ]);
    if (!userA || !userB) return;

    const [prefA, prefB] = await Promise.all([this.prefs(userIdA), this.prefs(userIdB)]);

    // Count all matches between these two users (after the upsert, so count ≥ 1)
    const connectionCount = await this.matchRepo.count({
      where: [
        { userIdA, userIdB },
        { userIdA: userIdB, userIdB: userIdA },
      ],
    });
    const isFirstConnection = connectionCount === 1;

    const isHighResonance = resonanceLevel === 'deep' || resonanceLevel === 'mirror';

    type Side = [string, string, string, NotificationPreference];
    const sides: Side[] = [
      [userIdA, dreamIdA, userB.username, prefA],
      [userIdB, dreamIdB, userA.username, prefB],
    ];

    for (const [recipientId, dreamId, otherUsername, pref] of sides) {
      const actorId = recipientId === userIdA ? userIdB : userIdA;

      if (pref.dreamMatch) {
        await this.notificationsService.create({
          recipientId, actorId, matchId, dreamId,
          type:  NotificationType.DREAM_MATCH,
          title: 'Yeni Rüya Eşleşmesi 🌙',
          body:  `@${otherUsername} ile aynı rüya enerjisini paylaşıyorsunuz.`,
        });
      }

      if (isFirstConnection && pref.dreamConnection) {
        await this.notificationsService.create({
          recipientId, actorId, matchId, dreamId,
          type:  NotificationType.DREAM_CONNECTION,
          title: 'Yeni Rüya Bağlantısı 🌙',
          body:  `@${otherUsername} ile bir rüya bağlantısı kuruldu!`,
        });
      }

      if (isHighResonance && pref.highResonance) {
        await this.notificationsService.create({
          recipientId, actorId, matchId, dreamId,
          type:  NotificationType.HIGH_RESONANCE,
          title: 'Güçlü Rezonans Keşfedildi ✨',
          body:  `@${otherUsername} ile güçlü bir rüya rezonansı. Uyum: %${matchScore}`,
        });
      }

      if (sharedSymbols.length > 0 && pref.sharedSymbol) {
        await this.notificationsService.create({
          recipientId, actorId, matchId, dreamId,
          type:  NotificationType.SHARED_SYMBOL,
          title: 'Ortak Rüya Sembolü 💭',
          body:  `@${otherUsername} ile aynı sembolü paylaştınız: ${sharedSymbols[0]}`,
        });
      }

      if (sharedLocations.length > 0 && pref.dreamMatch) {
        await this.notificationsService.create({
          recipientId, actorId, matchId, dreamId,
          type:  NotificationType.SHARED_LOCATION,
          title: 'Ortak Rüya Mekanı 🏙',
          body:  `@${otherUsername} ile aynı mekanda rüya gördünüz: ${sharedLocations[0]}`,
        });
      }
    }
  }

  async notifyMention(params: {
    dreamId: string;
    dreamerId: string;
    mentionedUserId: string;
    matchedName: string;
  }): Promise<void> {
    const { dreamId, dreamerId, mentionedUserId, matchedName } = params;
    if (dreamerId === mentionedUserId) return;

    const [dreamer, pref] = await Promise.all([
      this.userRepo.findOne({ where: { id: dreamerId }, select: ['id', 'username'] }),
      this.prefs(mentionedUserId),
    ]);
    if (!dreamer || !pref.dreamMention) return;

    await this.notificationsService.create({
      recipientId: mentionedUserId,
      actorId:     dreamerId,
      dreamId,
      type:  NotificationType.DREAM_MENTION,
      title: 'Rüyanda Göründün 🌙',
      body:  `@${dreamer.username} seni dün gece rüyasında gördü.`,
    });
  }

  async notifyMilestone(userId: string, dreamCount: number): Promise<void> {
    if (!DREAM_MILESTONES.has(dreamCount)) return;
    const pref = await this.prefs(userId);
    if (!pref.dreamMilestone) return;

    await this.notificationsService.create({
      recipientId: userId,
      actorId:     null,
      type:        NotificationType.DREAM_MILESTONE,
      title:       'Rüya Kilometre Taşı 🌙',
      body:        MILESTONE_BODY[dreamCount] ?? `${dreamCount}. rüyanızı paylaştınız.`,
    });
  }
}
