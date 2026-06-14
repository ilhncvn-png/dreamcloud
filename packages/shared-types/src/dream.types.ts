import type { DreamCategory, DreamMood, DreamVisibility, ModerationStatus } from './enums';

export interface Dream {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: DreamCategory;
  mood: DreamMood;
  visibility: DreamVisibility;
  isLucid: boolean;
  isRecurring: boolean;
  tags: string[];
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  matchCount: number;
  viewCount: number;
  moderationStatus: ModerationStatus;
  dreamDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DreamWithAuthor extends Dream {
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  isLiked: boolean;
  isSaved: boolean;
}

export interface DreamMatch {
  dream: DreamWithAuthor;
  similarityScore: number;
  rank: number;
  sharedThemes: string[];
}
