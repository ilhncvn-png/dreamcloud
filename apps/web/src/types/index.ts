// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  sub: string;
  email: string;
  username?: string;
  role: string;
  exp?: number;
  iat?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

// ── Dream ─────────────────────────────────────────────────────────────────────
export type DreamCategory =
  | 'lucid'
  | 'beautiful'
  | 'nightmare'
  | 'normal'
  | 'adventure'
  | 'recurring'
  | 'prophetic'
  | 'fantasy'
  | 'mundane'
  | 'surreal';
export type DreamVisibility = 'public' | 'private' | 'followers';
export type DreamMood =
  | 'joyful'
  | 'fearful'
  | 'confused'
  | 'peaceful'
  | 'anxious'
  | 'melancholic'
  | 'excited'
  | 'neutral';

export interface DreamAuthor {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl: string | null;
}

export interface Dream {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  category: DreamCategory;
  visibility: DreamVisibility;
  tags: string[];
  moodScore: number | null;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  author: DreamAuthor | null;
  createdAt: string;
  updatedAt: string;
}

export interface DreamsPageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DreamsPage {
  items: Dream[];
  meta: DreamsPageMeta;
}

export interface ToggleLikeResult {
  isLiked: boolean;
  likeCount: number;
}

export interface ToggleSaveResult {
  isSaved: boolean;
  saveCount: number;
}

// ── Comments ──────────────────────────────────────────────────────────────────
export interface CommentAuthor {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface Comment {
  id: string;
  dreamId: string;
  userId: string;
  author: CommentAuthor;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

export interface CommentsPage {
  items: Comment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  totalDreams: number;
  createdAt: string;
}

export interface MyProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface ToggleFollowResult {
  isFollowing: boolean;
}
