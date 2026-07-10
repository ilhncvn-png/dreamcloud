import type { Comment, CommentsPage } from '@/types/comment.types';
import { apiClient } from './client';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getComments(dreamId: string, page = 1): Promise<CommentsPage> {
  return extract(
    await apiClient.get<{ data: CommentsPage }>(`/dreams/${dreamId}/comments`, {
      params: { page, limit: 20 },
    }),
  );
}

export async function createComment(dreamId: string, content: string): Promise<Comment> {
  return extract(
    await apiClient.post<{ data: Comment }>(`/dreams/${dreamId}/comments`, { content }),
  );
}

export async function deleteComment(dreamId: string, commentId: string): Promise<void> {
  await apiClient.delete(`/dreams/${dreamId}/comments/${commentId}`);
}
