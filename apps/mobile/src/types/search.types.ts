export interface DreamSearchResult {
  id: string;
  title: string | null;
  content: string;
  category: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
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
