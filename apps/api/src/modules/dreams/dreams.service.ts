import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DreamVisibility, NotificationType } from '../../common/enums/database.enums';
import { AnalysisService } from '../analysis/analysis.service';
import { DreamMentionsService } from '../mentions/mentions.service';
import { DreamNotificationService } from '../notifications/dream-notification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlacesExtractionService } from '../places/places-extraction.service';
import { CreateDreamDto } from './dto/create-dream.dto';
import { DreamSort, type DreamQueryDto, type Paginated } from './dto/dream-query.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';
import { DreamLike } from './entities/dream-like.entity';
import { DreamSave } from './entities/dream-save.entity';
import { Dream } from './entities/dream.entity';

export interface ToggleResult {
  active: boolean;
  count: number;
}

@Injectable()
export class DreamsService {
  constructor(
    @InjectRepository(Dream)
    private readonly dreamRepo: Repository<Dream>,
    @InjectRepository(DreamLike)
    private readonly likeRepo: Repository<DreamLike>,
    @InjectRepository(DreamSave)
    private readonly saveRepo: Repository<DreamSave>,
    private readonly notificationsService: NotificationsService,
    private readonly analysisService: AnalysisService,
    private readonly dreamNotif: DreamNotificationService,
    private readonly dreamMentions: DreamMentionsService,
    private readonly placesExtraction: PlacesExtractionService,
  ) {}

  async create(userId: string, dto: CreateDreamDto): Promise<Dream> {
    const dream = new Dream();
    dream.userId = userId;
    dream.title = dto.title ?? null;
    dream.content = dto.content;
    if (dto.category) dream.category = dto.category;
    if (dto.visibility) dream.visibility = dto.visibility;
    dream.isDraft = dto.isDraft ?? false;
    dream.tags = dto.tags ?? [];
    dream.dreamedAt = dto.dreamedAt ? new Date(dto.dreamedAt) : new Date();
    const saved = await this.dreamRepo.save(dream);

    // Fire-and-forget: non-draft dreams are queued for analysis immediately
    if (!saved.isDraft) {
      void this.analysisService.enqueue(saved.id);

      // Count published dreams to check for milestones
      const dreamCount = await this.dreamRepo.count({
        where: { userId, isDraft: false },
      });
      void this.dreamNotif.notifyMilestone(userId, dreamCount);
      void this.dreamMentions.detectAndSave(saved.id, userId, saved.title, saved.content);
      void this.placesExtraction.extractAndSave(saved.id, userId, saved.title, saved.content);
    }

    return saved;
  }

  async findPublic(
    query: DreamQueryDto,
    userId?: string | null,
  ): Promise<Paginated<Dream & { isLiked: boolean; isSaved: boolean }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.dreamRepo
      .createQueryBuilder('dream')
      .leftJoinAndSelect('dream.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('dream.visibility = :vis', { vis: DreamVisibility.PUBLIC })
      .andWhere('dream.isHidden = FALSE')
      .andWhere('dream.isDraft = FALSE')
      .andWhere('dream.deletedAt IS NULL')
      .skip((page - 1) * limit)
      .take(limit);

    switch (query.sort) {
      case DreamSort.MOST_LIKED:
        qb.orderBy('dream.likeCount', 'DESC').addOrderBy('dream.createdAt', 'DESC');
        break;
      case DreamSort.MOST_SAVED:
        qb.orderBy('dream.saveCount', 'DESC').addOrderBy('dream.createdAt', 'DESC');
        break;
      case DreamSort.MOST_COMMENTED:
        qb.orderBy('dream.commentCount', 'DESC').addOrderBy('dream.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('dream.createdAt', 'DESC');
    }

    if (query.category) {
      qb.andWhere('dream.category = :cat', { cat: query.category });
    }
    if (query.userId) {
      qb.andWhere('dream.userId = :uid', { uid: query.userId });
    }

    const [dreams, total] = await qb.getManyAndCount();
    const context = userId
      ? await this.buildUserContext(userId, dreams.map((d) => d.id))
      : { likedIds: new Set<string>(), savedIds: new Set<string>() };

    const items = dreams.map((d) => Object.assign(d, {
      isLiked: context.likedIds.has(d.id),
      isSaved: context.savedIds.has(d.id),
    }));

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findMyDreams(
    userId: string,
    query: DreamQueryDto,
  ): Promise<Paginated<Dream & { isLiked: boolean; isSaved: boolean }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.dreamRepo
      .createQueryBuilder('dream')
      .leftJoinAndSelect('dream.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('dream.userId = :userId', { userId })
      .andWhere('dream.deletedAt IS NULL')
      .orderBy('dream.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.category) {
      qb.andWhere('dream.category = :cat', { cat: query.category });
    }
    if (query.visibility) {
      qb.andWhere('dream.visibility = :vis', { vis: query.visibility });
    }

    const [dreams, total] = await qb.getManyAndCount();
    const context = await this.buildUserContext(userId, dreams.map((d) => d.id));

    const items = dreams.map((d) => Object.assign(d, {
      isLiked: context.likedIds.has(d.id),
      isSaved: context.savedIds.has(d.id),
    }));

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<Dream & { isLiked: boolean; isSaved: boolean }> {
    const dream = await this.dreamRepo.findOne({
      where: { id },
      relations: { user: { profile: true } },
      withDeleted: false,
    });

    if (!dream) throw new NotFoundException('Dream not found');

    const isOwner = dream.userId === userId;
    if (!isOwner && (dream.isHidden || dream.visibility === DreamVisibility.PRIVATE)) {
      throw new NotFoundException('Dream not found');
    }

    const context = await this.buildUserContext(userId, [id]);
    return Object.assign(dream, {
      isLiked: context.likedIds.has(id),
      isSaved: context.savedIds.has(id),
    });
  }

  async update(id: string, userId: string, dto: UpdateDreamDto): Promise<Dream> {
    const dream = await this.findOwned(id, userId);

    if (dto.title !== undefined) dream.title = dto.title ?? null;
    if (dto.content !== undefined) dream.content = dto.content;
    if (dto.category !== undefined) dream.category = dto.category;
    if (dto.visibility !== undefined) dream.visibility = dto.visibility;
    if (dto.isDraft !== undefined) dream.isDraft = dto.isDraft;
    if (dto.tags !== undefined) dream.tags = dto.tags;
    if (dto.dreamedAt !== undefined) dream.dreamedAt = new Date(dto.dreamedAt);

    const saved = await this.dreamRepo.save(dream);

    // Re-analyse + re-detect mentions when content changes
    const contentChanged = dto.content !== undefined || dto.title !== undefined || dto.isDraft === false;
    if (!saved.isDraft && contentChanged) {
      void this.analysisService.enqueue(saved.id);
      void this.dreamMentions.detectAndSave(saved.id, saved.userId, saved.title, saved.content, true);
      void this.placesExtraction.extractAndSave(saved.id, saved.userId, saved.title, saved.content, true);
    }

    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const dream = await this.findOwned(id, userId);
    await this.dreamRepo.softDelete(dream.id);
  }

  async toggleLike(userId: string, dreamId: string): Promise<ToggleResult> {
    const dream = await this.dreamRepo.findOne({ where: { id: dreamId } });
    if (!dream) throw new NotFoundException('Dream not found');

    const existing = await this.likeRepo.findOne({ where: { userId, dreamId } });

    if (existing) {
      await this.likeRepo.remove(existing);
      const count = Math.max(0, dream.likeCount - 1);
      await this.dreamRepo.update(dreamId, { likeCount: count });
      return { active: false, count };
    }

    try {
      await this.likeRepo.save(this.likeRepo.create({ userId, dreamId }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        throw new ConflictException('Already liked');
      }
      throw err;
    }

    const count = dream.likeCount + 1;
    await this.dreamRepo.update(dreamId, { likeCount: count });

    void this.notificationsService.create({
      recipientId: dream.userId,
      actorId: userId,
      type: NotificationType.LIKE,
      dreamId,
      title: 'Rüyanı beğendiler',
      body: `"${dream.title ?? 'Rüyan'}" rüyanı beğendi.`,
    });

    return { active: true, count };
  }

  async toggleSave(userId: string, dreamId: string): Promise<ToggleResult> {
    const dream = await this.dreamRepo.findOne({ where: { id: dreamId } });
    if (!dream) throw new NotFoundException('Dream not found');

    const existing = await this.saveRepo.findOne({ where: { userId, dreamId } });

    if (existing) {
      await this.saveRepo.remove(existing);
      const count = Math.max(0, dream.saveCount - 1);
      await this.dreamRepo.update(dreamId, { saveCount: count });
      return { active: false, count };
    }

    try {
      await this.saveRepo.save(this.saveRepo.create({ userId, dreamId }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        throw new ConflictException('Already saved');
      }
      throw err;
    }

    const count = dream.saveCount + 1;
    await this.dreamRepo.update(dreamId, { saveCount: count });

    void this.notificationsService.create({
      recipientId: dream.userId,
      actorId: userId,
      type: NotificationType.SAVE,
      dreamId,
      title: 'Rüyanı kaydettiler',
      body: `"${dream.title ?? 'Rüyan'}" rüyanı kaydetti.`,
    });

    return { active: true, count };
  }

  async findSavedDreams(
    userId: string,
    query: DreamQueryDto,
  ): Promise<Paginated<Dream & { isLiked: boolean; isSaved: boolean }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.saveRepo
      .createQueryBuilder('save')
      .innerJoinAndSelect('save.dream', 'dream')
      .leftJoinAndSelect('dream.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('save.userId = :userId', { userId })
      .andWhere('dream.deletedAt IS NULL')
      .andWhere('dream.isDraft = FALSE')
      .orderBy('save.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [saves, total] = await qb.getManyAndCount();
    const dreams = saves.map((s) => s.dream);
    const dreamIds = dreams.map((d) => d.id);
    const context = await this.buildUserContext(userId, dreamIds);

    const items = dreams.map((d) =>
      Object.assign(d, {
        isLiked: context.likedIds.has(d.id),
        isSaved: true,
      }),
    );

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  private async buildUserContext(
    userId: string,
    dreamIds: string[],
  ): Promise<{ likedIds: Set<string>; savedIds: Set<string> }> {
    if (dreamIds.length === 0) return { likedIds: new Set(), savedIds: new Set() };

    const [likes, saves] = await Promise.all([
      this.likeRepo.find({ where: { userId, dreamId: In(dreamIds) } }),
      this.saveRepo.find({ where: { userId, dreamId: In(dreamIds) } }),
    ]);

    return {
      likedIds: new Set(likes.map((l) => l.dreamId)),
      savedIds: new Set(saves.map((s) => s.dreamId)),
    };
  }

  private async findOwned(id: string, userId: string): Promise<Dream> {
    const dream = await this.dreamRepo.findOne({ where: { id } });
    if (!dream) throw new NotFoundException('Dream not found');
    if (dream.userId !== userId) throw new ForbiddenException('Not your dream');
    return dream;
  }
}
