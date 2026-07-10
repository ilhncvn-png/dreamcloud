import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DreamVisibility, NotificationType } from '../../common/enums/database.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { Dream } from '../dreams/entities/dream.entity';
import { UserFollow } from '../users/entities/user-follow.entity';
import { User } from '../users/entities/user.entity';

export interface UserProfileResult {
  id: string;
  username: string;
  createdAt: Date;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  totalDreams: number;
}

export interface ToggleFollowResult {
  isFollowing: boolean;
  followerCount: number;
}

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserFollow)
    private readonly followRepo: Repository<UserFollow>,
    @InjectRepository(Dream)
    private readonly dreamRepo: Repository<Dream>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getUserProfile(targetId: string, requesterId: string): Promise<UserProfileResult> {
    const user = await this.userRepo.findOne({
      where: { id: targetId, isActive: true },
      relations: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const [followerCount, followingCount, followRecord, totalDreams] = await Promise.all([
      this.followRepo.count({ where: { followingId: targetId } }),
      this.followRepo.count({ where: { followerId: targetId } }),
      this.followRepo.findOne({ where: { followerId: requesterId, followingId: targetId } }),
      this.dreamRepo.count({
        where: { userId: targetId, visibility: DreamVisibility.PUBLIC, isDraft: false, isHidden: false },
        withDeleted: false,
      }),
    ]);

    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      displayName: user.profile?.displayName ?? null,
      bio: user.profile?.bio ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      followerCount,
      followingCount,
      isFollowing: !!followRecord,
      totalDreams,
    };
  }

  async toggleFollow(followerId: string, followingId: string): Promise<ToggleFollowResult> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const target = await this.userRepo.findOne({ where: { id: followingId, isActive: true } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.followRepo.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      await this.followRepo.remove(existing);
    } else {
      await this.followRepo.save(this.followRepo.create({ followerId, followingId }));

      const follower = await this.userRepo.findOne({ where: { id: followerId } });
      void this.notificationsService.create({
        recipientId: followingId,
        actorId: followerId,
        type: NotificationType.FOLLOW,
        title: 'Yeni takipçi',
        body: `@${follower?.username ?? 'Biri'} sizi takip etmeye başladı.`,
      });
    }

    const followerCount = await this.followRepo.count({ where: { followingId } });
    return { isFollowing: !existing, followerCount };
  }
}
