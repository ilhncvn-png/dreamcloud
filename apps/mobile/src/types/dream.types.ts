export type DreamCategory = 'lucid' | 'beautiful' | 'nightmare' | 'normal';
export type DreamVisibility = 'public' | 'private' | 'followers' | 'friends_only';

export interface DreamAuthor {
  id: string;
  username: string;
  email: string;
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

export interface ToggleLikeResult {
  isLiked: boolean;
  likeCount: number;
}

export interface ToggleSaveResult {
  isSaved: boolean;
  saveCount: number;
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

export interface CreateDreamDto {
  title?: string;
  content: string;
  category: DreamCategory;
  visibility: DreamVisibility;
  tags?: string[];
}

export interface UpdateDreamDto {
  title?: string;
  content?: string;
  category?: DreamCategory;
  visibility?: DreamVisibility;
  tags?: string[];
}
