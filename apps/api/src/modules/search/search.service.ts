import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DreamVisibility } from '../../common/enums/database.enums';
import { Dream } from '../dreams/entities/dream.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/entities/user.entity';

export interface DreamSearchResult {
  id: string;
  title: string | null;
  content: string;
  category: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  author: { id: string; username: string } | null;
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface TagSearchResult {
  tag: string;
  count: number;
}

export interface SearchResults {
  dreams: DreamSearchResult[];
  users: UserSearchResult[];
  tags: TagSearchResult[];
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Dream)
    private readonly dreamRepo: Repository<Dream>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  async searchDreams(q: string, limit = 15): Promise<DreamSearchResult[]> {
    const term = `%${q}%`;
    const dreams = await this.dreamRepo
      .createQueryBuilder('dream')
      .leftJoinAndSelect('dream.user', 'user')
      .where('dream.visibility = :vis', { vis: DreamVisibility.PUBLIC })
      .andWhere('dream.isDraft = FALSE')
      .andWhere('dream.isHidden = FALSE')
      .andWhere('dream.deletedAt IS NULL')
      .andWhere(
        '(dream.title ILIKE :term OR dream.content ILIKE :term OR :rawTerm = ANY(dream.tags))',
        { term, rawTerm: q },
      )
      .orderBy('dream.likeCount', 'DESC')
      .take(limit)
      .getMany();

    return dreams.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content.slice(0, 120),
      category: d.category,
      likeCount: d.likeCount,
      commentCount: d.commentCount,
      createdAt: d.createdAt,
      author: d.user ? { id: d.user.id, username: d.user.username } : null,
    }));
  }

  async searchUsers(q: string, limit = 15): Promise<UserSearchResult[]> {
    const term = `%${q}%`;
    const users = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.isActive = TRUE')
      .andWhere('user.deletedAt IS NULL')
      .andWhere(
        '(user.username ILIKE :term OR profile.displayName ILIKE :term)',
        { term },
      )
      .orderBy('user.username', 'ASC')
      .take(limit)
      .getMany();

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.profile?.displayName ?? null,
      avatarUrl: u.profile?.avatarUrl ?? null,
      bio: u.profile?.bio ?? null,
    }));
  }

  async searchTags(q: string, limit = 20): Promise<TagSearchResult[]> {
    const rows = await this.dreamRepo.query<{ tag: string; count: string }[]>(
      `SELECT tag, COUNT(*) as count
       FROM dreams, unnest(tags) as tag
       WHERE tag ILIKE $1
         AND visibility = 'public'
         AND is_draft = FALSE
         AND deleted_at IS NULL
       GROUP BY tag
       ORDER BY count DESC
       LIMIT $2`,
      [`%${q}%`, limit],
    );
    return rows.map((r) => ({ tag: r.tag, count: Number(r.count) }));
  }

  async searchAll(q: string): Promise<SearchResults> {
    const [dreams, users, tags] = await Promise.all([
      this.searchDreams(q, 10),
      this.searchUsers(q, 10),
      this.searchTags(q, 10),
    ]);
    return { dreams, users, tags };
  }
}
