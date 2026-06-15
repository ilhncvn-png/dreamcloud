import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DreamVisibility } from '../../common/enums/database.enums';
import { CreateDreamDto } from './dto/create-dream.dto';
import { type DreamQueryDto, type Paginated } from './dto/dream-query.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';
import { Dream } from './entities/dream.entity';

@Injectable()
export class DreamsService {
  constructor(
    @InjectRepository(Dream)
    private readonly dreamRepo: Repository<Dream>,
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
    return this.dreamRepo.save(dream);
  }

  async findPublic(query: DreamQueryDto): Promise<Paginated<Dream>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.dreamRepo
      .createQueryBuilder('dream')
      .where('dream.visibility = :vis', { vis: DreamVisibility.PUBLIC })
      .andWhere('dream.is_hidden = FALSE')
      .andWhere('dream.is_draft = FALSE')
      .andWhere('dream.deleted_at IS NULL')
      .orderBy('dream.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.category) {
      qb.andWhere('dream.category = :cat', { cat: query.category });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findMyDreams(userId: string, query: DreamQueryDto): Promise<Paginated<Dream>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.dreamRepo
      .createQueryBuilder('dream')
      .where('dream.user_id = :userId', { userId })
      .andWhere('dream.deleted_at IS NULL')
      .orderBy('dream.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.category) {
      qb.andWhere('dream.category = :cat', { cat: query.category });
    }
    if (query.visibility) {
      qb.andWhere('dream.visibility = :vis', { vis: query.visibility });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, userId: string): Promise<Dream> {
    const dream = await this.dreamRepo.findOne({
      where: { id },
      withDeleted: false,
    });

    if (!dream) throw new NotFoundException('Dream not found');

    const isOwner = dream.userId === userId;

    if (!isOwner && (dream.isHidden || dream.visibility === DreamVisibility.PRIVATE)) {
      throw new NotFoundException('Dream not found');
    }

    return dream;
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

    return this.dreamRepo.save(dream);
  }

  async remove(id: string, userId: string): Promise<void> {
    const dream = await this.findOwned(id, userId);
    await this.dreamRepo.softDelete(dream.id);
  }

  private async findOwned(id: string, userId: string): Promise<Dream> {
    const dream = await this.dreamRepo.findOne({ where: { id } });
    if (!dream) throw new NotFoundException('Dream not found');
    if (dream.userId !== userId) throw new ForbiddenException('Not your dream');
    return dream;
  }
}
