import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getDream, toggleLike, toggleSave } from '@/api/dreams.api';
import { getComments, createComment, deleteComment } from '@/api/comments.api';
import { useAuthStore } from '@/store/auth';
import Avatar from '@/components/Avatar';
import type { Comment } from '@/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m}d önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const CAT_COLORS: Record<string, string> = {
  lucid: '#7B6FFF',
  nightmare: '#FF4A5E',
  beautiful: '#38D68A',
  adventure: '#FFB800',
  recurring: '#00CFFF',
  prophetic: '#CC80FF',
  fantasy: '#FF8CF7',
  mundane: '#5A5A84',
  surreal: '#FF8C00',
  normal: '#7B6FFF',
};
const CAT_LABELS: Record<string, string> = {
  lucid: 'Lucid',
  nightmare: 'Kabus',
  beautiful: 'Güzel',
  adventure: 'Macera',
  recurring: 'Tekrarlayan',
  prophetic: 'Kehanet',
  fantasy: 'Fantezi',
  mundane: 'Sıradan',
  surreal: 'Tuhaf',
  normal: 'Normal',
};

export default function DreamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dreamKey = ['dream', id];
  const {
    data: dream,
    status: dreamStatus,
    error: dreamError,
  } = useQuery({
    queryKey: dreamKey,
    queryFn: () => getDream(id!),
    enabled: !!id,
  });

  const commentsKey = ['comments', id];
  const {
    data: commentsData,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: loadingMoreComments,
    status: commentsStatus,
  } = useInfiniteQuery({
    queryKey: commentsKey,
    queryFn: ({ pageParam }) => getComments(id!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
    enabled: !!id,
  });

  const allComments: Comment[] = commentsData?.pages.flatMap((p) => p.items) ?? [];

  // Optimistic like
  const [localLiked, setLocalLiked] = useState<boolean | null>(null);
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null);
  const isLiked = localLiked ?? dream?.isLiked ?? false;
  const likeCount = localLikeCount ?? dream?.likeCount ?? 0;

  const likeMut = useMutation({
    mutationFn: () => toggleLike(id!),
    onMutate: () => {
      setLocalLiked((p) => !(p ?? dream?.isLiked ?? false));
      setLocalLikeCount((p) => (p ?? dream?.likeCount ?? 0) + (isLiked ? -1 : 1));
    },
    onError: () => {
      setLocalLiked(null);
      setLocalLikeCount(null);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: dreamKey }),
  });

  // Optimistic save
  const [localSaved, setLocalSaved] = useState<boolean | null>(null);
  const [localSaveCount, setLocalSaveCount] = useState<number | null>(null);
  const isSaved = localSaved ?? dream?.isSaved ?? false;
  const saveCount = localSaveCount ?? dream?.saveCount ?? 0;

  const saveMut = useMutation({
    mutationFn: () => toggleSave(id!),
    onMutate: () => {
      setLocalSaved((p) => !(p ?? dream?.isSaved ?? false));
      setLocalSaveCount((p) => (p ?? dream?.saveCount ?? 0) + (isSaved ? -1 : 1));
    },
    onError: () => {
      setLocalSaved(null);
      setLocalSaveCount(null);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: dreamKey }),
  });

  const deleteMut = useMutation({
    mutationFn: ({ commentId }: { commentId: string }) => deleteComment(id!, commentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: commentsKey }),
  });

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await createComment(id!, commentText.trim());
      setCommentText('');
      void qc.invalidateQueries({ queryKey: commentsKey });
      void qc.invalidateQueries({ queryKey: dreamKey });
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 24,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontSize: 14,
          padding: '6px 0',
          transition: 'color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        ← Geri
      </button>

      {/* Loading */}
      {dreamStatus === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ width: '70%', height: 28 }} />
          <div className="skeleton" style={{ width: '40%', height: 14 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: `${90 - i * 8}%`, height: 14 }} />
          ))}
        </div>
      )}

      {/* Error */}
      {dreamStatus === 'error' && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
          <p>{(dreamError as Error)?.message ?? 'Rüya bulunamadı.'}</p>
        </div>
      )}

      {/* Dream content */}
      {dream && (
        <>
          {/* Author + meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() =>
                dream.author?.username && navigate(`/profile/${dream.author.username}`)
              }
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: dream.author?.username ? 'pointer' : 'default',
              }}
            >
              <Avatar url={dream.author?.avatarUrl} username={dream.author?.username} size={44} />
            </button>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-1)' }}>
                {dream.author?.username ?? 'Anonim'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {timeAgo(dream.createdAt)}
                {' · '}
                <span style={{ color: CAT_COLORS[dream.category] ?? 'var(--primary)' }}>
                  {CAT_LABELS[dream.category] ?? dream.category}
                </span>
              </p>
            </div>
          </div>

          {/* Title */}
          {dream.title && (
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'var(--text-1)',
                lineHeight: 1.25,
                marginBottom: 20,
              }}
            >
              {dream.title}
            </h1>
          )}

          {/* Content */}
          <div
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: 'rgba(232,232,255,0.78)',
              whiteSpace: 'pre-wrap',
              marginBottom: 24,
              borderLeft: '3px solid rgba(123,111,255,0.2)',
              paddingLeft: 20,
            }}
          >
            {dream.content}
          </div>

          {/* Tags */}
          {dream.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {dream.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    padding: '4px 11px',
                    borderRadius: 100,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-3)',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '16px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 32,
            }}
          >
            {[
              {
                icon: isLiked ? '♥' : '♡',
                count: likeCount,
                active: isLiked,
                activeColor: '#FF4A5E',
                label: 'Beğen',
                onClick: () => likeMut.mutate(),
                disabled: likeMut.isPending,
              },
              {
                icon: isSaved ? '◆' : '◇',
                count: saveCount,
                active: isSaved,
                activeColor: '#FFB800',
                label: 'Kaydet',
                onClick: () => saveMut.mutate(),
                disabled: saveMut.isPending,
              },
            ].map(({ icon, count, active, activeColor, label, onClick, disabled }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: active ? `${activeColor}14` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? `${activeColor}30` : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 'var(--r-md)',
                  padding: '9px 16px',
                  cursor: 'pointer',
                  color: active ? activeColor : 'var(--text-2)',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
              >
                {icon} <span style={{ fontSize: 13 }}>{count}</span>{' '}
                <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-3)',
              }}
            >
              <span>◎</span>
              <span>{dream.commentCount} yorum</span>
            </div>
          </div>

          {/* Comment form */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 14 }}>
              Yorumlar{' '}
              {allComments.length > 0 && (
                <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                  ({dream.commentCount})
                </span>
              )}
            </h3>
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <Avatar url={null} username={user?.email} size={34} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  className="dc-input"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Rüya hakkında düşüncelerini paylaş…"
                  rows={2}
                  style={{ resize: 'vertical', minHeight: 72 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="dc-btn dc-btn-primary dc-btn-sm"
                    type="submit"
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? (
                      <span className="dc-spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      'Yorum Yap'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Comments list */}
          {commentsStatus === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div
                    className="skeleton"
                    style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      className="skeleton"
                      style={{ width: '30%', height: 12, marginBottom: 6 }}
                    />
                    <div className="skeleton" style={{ width: '80%', height: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {allComments.length === 0 && commentsStatus === 'success' && (
            <div className="dc-empty">
              <div className="dc-empty-icon">◎</div>
              <p>İlk yorumu sen yap.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {allComments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                canDelete={comment.isOwn || comment.userId === user?.sub}
                onDelete={() => deleteMut.mutate({ commentId: comment.id })}
              />
            ))}
          </div>

          {hasMoreComments && (
            <button
              className="dc-btn dc-btn-ghost dc-btn-sm"
              onClick={() => void fetchMoreComments()}
              disabled={loadingMoreComments}
              style={{ marginTop: 16, width: '100%' }}
            >
              {loadingMoreComments ? (
                <span className="dc-spinner" style={{ width: 14, height: 14 }} />
              ) : (
                'Daha fazla yorum yükle'
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: Comment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <Avatar
        url={comment.author?.avatarUrl ?? null}
        username={comment.author?.username}
        size={32}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <button
            onClick={() =>
              comment.author?.username && navigate(`/profile/${comment.author.username}`)
            }
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-1)',
            }}
          >
            {comment.author?.username ?? 'Kullanıcı'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {new Date(comment.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          {canDelete && (
            <button
              onClick={onDelete}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--text-3)',
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              Sil
            </button>
          )}
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(232,232,255,0.7)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {comment.content}
        </p>
      </div>
    </div>
  );
}
