import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getUserProfileByUsername, toggleFollow } from '@/api/users.api';
import { getUserDreams } from '@/api/dreams.api';
import { useAuthStore } from '@/store/auth';
import Avatar from '@/components/Avatar';
import DreamCard from '@/components/DreamCard';
import { useEffect, useRef, useCallback } from 'react';
import type { Dream } from '@/types';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const sentinel = useRef<HTMLDivElement>(null);

  const profileKey = ['profile', username];
  const {
    data: profile,
    status: profileStatus,
    error: profileError,
  } = useQuery({
    queryKey: profileKey,
    queryFn: () => getUserProfileByUsername(username!),
    enabled: !!username,
  });

  const dreamsKey = ['profile-dreams', profile?.id];
  const {
    data: dreamsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: dreamsStatus,
  } = useInfiniteQuery({
    queryKey: dreamsKey,
    queryFn: ({ pageParam }) => getUserDreams(profile!.id, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
    enabled: !!profile?.id,
  });

  const seenIds = new Set<string>();
  const dreams: Dream[] = [];
  if (dreamsData) {
    for (const page of dreamsData.pages) {
      for (const d of page.items) {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          dreams.push(d);
        }
      }
    }
  }

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleIntersect, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleIntersect]);

  const followMut = useMutation({
    mutationFn: () => toggleFollow(profile!.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: profileKey }),
  });

  const isOwnProfile = profile?.id === user?.sub;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>
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
          transition: 'color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        ← Geri
      </button>

      {profileStatus === 'pending' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
            <div
              className="skeleton"
              style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }}
            />
            <div
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}
            >
              <div className="skeleton" style={{ width: '40%', height: 20 }} />
              <div className="skeleton" style={{ width: '30%', height: 14 }} />
              <div className="skeleton" style={{ width: '65%', height: 13, marginTop: 4 }} />
            </div>
          </div>
        </div>
      )}

      {profileStatus === 'error' && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>◎</div>
          <p>{(profileError as Error)?.message ?? `@${username} bulunamadı.`}</p>
        </div>
      )}

      {profile && (
        <>
          {/* Profile header */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(123,111,255,0.13)',
              borderRadius: 'var(--r-xl)',
              padding: '28px 28px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
              <Avatar url={profile.avatarUrl} username={profile.username} size={76} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 4,
                  }}
                >
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: 'var(--text-1)',
                    }}
                  >
                    {profile.displayName ?? profile.username}
                  </h1>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 10 }}>
                  @{profile.username}
                </p>
                {profile.bio && (
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text-2)',
                      lineHeight: 1.65,
                      marginBottom: 16,
                      maxWidth: 440,
                    }}
                  >
                    {profile.bio}
                  </p>
                )}

                {/* Stats */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { value: profile.totalDreams ?? 0, label: 'Rüya' },
                    { value: profile.followerCount, label: 'Takipçi' },
                    { value: profile.followingCount, label: 'Takip' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                        {value.toLocaleString('tr-TR')}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 5 }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow / edit buttons */}
              <div style={{ flexShrink: 0 }}>
                {isOwnProfile ? (
                  <button className="dc-btn dc-btn-ghost dc-btn-sm" style={{ fontSize: 13 }}>
                    Profili Düzenle
                  </button>
                ) : (
                  <button
                    className={`dc-btn ${profile.isFollowing ? 'dc-btn-ghost' : 'dc-btn-primary'} dc-btn-sm`}
                    onClick={() => followMut.mutate()}
                    disabled={followMut.isPending}
                    style={{ minWidth: 100 }}
                  >
                    {followMut.isPending ? (
                      <span className="dc-spinner" style={{ width: 14, height: 14 }} />
                    ) : profile.isFollowing ? (
                      'Takip Ediliyor'
                    ) : (
                      'Takip Et'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dreams section */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>
              Rüyalar
              {dreams.length > 0 && (
                <span
                  style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 14, marginLeft: 8 }}
                >
                  ({profile.totalDreams ?? dreams.length})
                </span>
              )}
            </h2>

            {dreamsStatus === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(123,111,255,0.1)',
                      borderRadius: 'var(--r-lg)',
                      padding: '20px 22px',
                    }}
                  >
                    <div
                      className="skeleton"
                      style={{ width: '70%', height: 16, marginBottom: 10 }}
                    />
                    <div
                      className="skeleton"
                      style={{ width: '100%', height: 12, marginBottom: 6 }}
                    />
                    <div className="skeleton" style={{ width: '85%', height: 12 }} />
                  </div>
                ))}
              </div>
            )}

            {dreamsStatus === 'success' && dreams.length === 0 && (
              <div className="dc-empty">
                <div className="dc-empty-icon">◈</div>
                <p>Henüz paylaşılan rüya yok.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dreams.map((dream) => (
                <DreamCard key={dream.id} dream={dream} queryKey={dreamsKey} />
              ))}
            </div>

            <div
              ref={sentinel}
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 12,
              }}
            >
              {isFetchingNextPage && (
                <div className="dc-spinner" style={{ width: 16, height: 16 }} />
              )}
              {!hasNextPage && dreams.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>✦ Tüm rüyalar yüklendi</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
