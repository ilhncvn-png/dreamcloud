export interface CommentAuthor {
  id: string;
  username: string;
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

export interface CreateCommentDto {
  content: string;
}
