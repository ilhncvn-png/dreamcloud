import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPublicFeed } from '@/api/dreams.api';
import DreamCard from '@/components/DreamCard';
import type { Dream } from '@/types';

const FEED_KEY = ['feed'];

// Skeleton card placeholder
function DreamSkeleton() {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(123,111,255,0.1)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          className="skeleton"
          style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ width: '40%', height: 13 }} />
          <div className="skeleton" style={{ width: '25%', height: 11 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: '85%', height: 18, marginBottom: 10 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <div className="skeleton" style={{ width: '100%', height: 13 }} />
        <div className="skeleton" style={{ width: '92%', height: 13 }} />
        <div className="skeleton" style={{ width: '75%', height: 13 }} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const sentinel = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error, refetch } =
    useInfiniteQuery({
      queryKey: FEED_KEY,
      queryFn: ({ pageParam }) => getPublicFeed(pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
      staleTime: 2 * 60 * 1000,
    });

  // Dedup across pages using a Set of IDs
  const seenIds = new Set<string>();
  const dreams: Dream[] = [];
  if (data) {
    for (const page of data.pages) {
      for (const d of page.items) {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          dreams.push(d);
        }
      }
    }
  }

  // IntersectionObserver for infinite scroll
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
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

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 16px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text-1)',
            marginBottom: 4,
          }}
        >
          Kolektif Rüya Akışı
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Platformun en güncel rüyaları</p>
      </div>

      {/* Loading state */}
      {status === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <DreamSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'rgba(255,74,94,0.05)',
            border: '1px solid rgba(255,74,94,0.15)',
            borderRadius: 'var(--r-lg)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>⚠</div>
          <p style={{ fontSize: 14, color: 'rgba(255,100,120,0.8)', marginBottom: 16 }}>
            {(error as Error)?.message ?? 'Akış yüklenemedi'}
          </p>
          <button className="dc-btn dc-btn-ghost dc-btn-sm" onClick={() => void refetch()}>
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Empty state */}
      {status === 'success' && dreams.length === 0 && (
        <div className="dc-empty">
          <div className="dc-empty-icon">◈</div>
          <p>
            Henüz paylaşılan rüya yok.
            <br />
            İlk rüyayı kaydetmek için uygulamayı kullan.
          </p>
        </div>
      )}

      {/* Dream feed */}
      {dreams.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dreams.map((dream) => (
            <div key={dream.id} className="anim-fade-in">
              <DreamCard dream={dream} queryKey={FEED_KEY} />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div
        ref={sentinel}
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 16,
        }}
      >
        {isFetchingNextPage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--text-3)',
              fontSize: 13,
            }}
          >
            <div className="dc-spinner" style={{ width: 16, height: 16 }} />
            Daha fazla yükleniyor…
          </div>
        )}
        {!hasNextPage && dreams.length > 0 && (
          <p
            style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}
          >
            ✦ Tüm rüyalar yüklendi
          </p>
        )}
      </div>
    </div>
  );
}
