import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../../common/enums/database.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { Dream } from '../dreams/entities/dream.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { DreamComment } from './entities/dream-comment.entity';

export interface CommentAuthor {
  id: string;
  username: string;
}

export interface CommentResult {
  id: string;
  dreamId: string;
  userId: string;
  author: CommentAuthor;
  content: string;
  createdAt: Date;
  isOwn: boolean;
}

export interface PaginatedComments {
  items: CommentResult[];
  meta: { total: number; page: number; limit: number; pages: number };
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(DreamComment)
    private readonly commentRepo: Repository<DreamComment>,
    @InjectRepository(Dream)
    private readonly dreamRepo: Repository<Dream>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listComments(
    dreamId: string,
    requesterId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedComments> {
    const dream = await this.dreamRepo.findOne({ where: { id: dreamId } });
    if (!dream) throw new NotFoundException('Dream not found');

    const [comments, total] = await this.commentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'user')
      .where('c.dreamId = :dreamId', { dreamId })
      .andWhere('c.deletedAt IS NULL')
      .orderBy('c.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = comments.map((c) => ({
      id: c.id,
      dreamId: c.dreamId,
      userId: c.userId,
      author: { id: c.user.id, username: c.user.username },
      content: c.content,
      createdAt: c.createdAt,
      isOwn: c.userId === requesterId,
    }));

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async createComment(
    dreamId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResult> {
    const dream = await this.dreamRepo.findOne({
      where: { id: dreamId },
      relations: { user: true },
    });
    if (!dream) throw new NotFoundException('Dream not found');

    const comment = await this.commentRepo.save(
      this.commentRepo.create({ dreamId, userId, content: dto.content }),
    );

    await this.dreamRepo.increment({ id: dreamId }, 'commentCount', 1);

    void this.notificationsService.create({
      recipientId: dream.userId,
      actorId: userId,
      type: NotificationType.COMMENT,
      dreamId,
      commentId: comment.id,
      title: 'Rüyana yorum yapıldı',
      body: `"${dream.title ?? 'Rüyan'}" rüyana yorum yaptı.`,
    });

    const saved = await this.commentRepo.findOne({
      where: { id: comment.id },
      relations: { user: true },
    });
    if (!saved) throw new NotFoundException('Comment not found after save');

    return {
      id: saved.id,
      dreamId: saved.dreamId,
      userId: saved.userId,
      author: { id: saved.user.id, username: saved.user.username },
      content: saved.content,
      createdAt: saved.createdAt,
      isOwn: true,
    };
  }

  async deleteComment(
    dreamId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, dreamId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    await this.commentRepo.softDelete(commentId);
    await this.dreamRepo.decrement({ id: dreamId }, 'commentCount', 1);

    // clamp to zero
    await this.dreamRepo.query(
      `UPDATE dreams SET comment_count = GREATEST(comment_count, 0) WHERE id = $1`,
      [dreamId],
    );
  }
}
