import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchOverview,
  fetchActivity,
  fetchDashboardMetrics,
  fetchDreamIntelligence,
  fetchCommunityHealth,
  fetchPredictions,
  fetchAIRecommendations,
  fetchLiveStream,
} from '../api/admin.api';
import type { ActivityEvent, LiveStreamEvent, AIRecommendation } from '../types/admin.types';
import Header from '../components/Header';
import Badge from '../components/Badge';

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Spark({
  vals,
  color = '#7B6FFF',
  w = 56,
  h = 18,
}: {
  vals: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  if (vals.length < 2) return null;
  const max = Math.max(...vals),
    min = Math.min(...vals);
  const range = max - min || 1,
    n = vals.length;
  const pts = vals.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}

// ── Constants ─────────────────────────────────────────────────
const EVENT_ICONS: Record<string, string> = {
  login: '🔐',
  dream_created: '🌙',
  profile_updated: '✏️',
  user_registered: '✨',
  dream_liked: '💜',
  dream_saved: '🔖',
  user_followed: '👥',
  dream_reported: '🚩',
};

const LIVE_EVENT_LABELS: Record<string, string> = {
  user_registered: 'New dreamer joined',
  dream_created: 'Dream recorded',
  dream_liked: 'Dream resonance',
  dream_saved: 'Dream archived',
  user_followed: 'Connection formed',
  dream_reported: 'Moderation request',
  login: 'Session opened',
  profile_updated: 'Profile updated',
};

const CATEGORY_COLORS: Record<string, string> = {
  lucid: 'bg-cyan-500',
  beautiful: 'bg-pink-500',
  nightmare: 'bg-red-500',
  normal: 'bg-dc-muted',
  recurring: 'bg-orange-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  lucid: 'Lucid',
  beautiful: 'Beautiful',
  nightmare: 'Nightmare',
  normal: 'Normal',
  recurring: 'Recurring',
};

const ACTION_LABELS: Record<string, string> = {
  role_changed: 'Role changed',
  user_banned: 'User banned',
  user_unbanned: 'Ban lifted',
  profile_edited: 'Profile edited',
  password_reset_issued: 'Password reset',
  dream_featured: 'Dream featured',
  dream_unfeatured: 'Feature removed',
  dream_hidden: 'Dream hidden',
  dream_unhidden: 'Dream restored',
  dream_deleted: 'Dream deleted',
  dream_metadata_edited: 'Metadata edited',
  report_resolved: 'Report resolved',
  bulk_dream_hide: 'Bulk hide',
  bulk_dream_feature: 'Bulk feature',
  bulk_dream_delete: 'Bulk delete',
};

const QUICK_LINKS = [
  {
    to: '/users',
    icon: '👥',
    label: 'Users',
    color: 'text-dc-primary',
    border: 'border-dc-primary/20 hover:border-dc-primary/50',
  },
  {
    to: '/dreams',
    icon: '🌙',
    label: 'Dreams',
    color: 'text-purple-400',
    border: 'border-purple-500/20 hover:border-purple-400/50',
  },
  {
    to: '/reports',
    icon: '🚩',
    label: 'Reports',
    color: 'text-dc-error',
    border: 'border-dc-error/20 hover:border-dc-error/50',
  },
  {
    to: '/live-activity',
    icon: '⚡',
    label: 'Live Feed',
    color: 'text-dc-success',
    border: 'border-dc-success/20 hover:border-dc-success/50',
  },
  {
    to: '/admin-logs',
    icon: '📋',
    label: 'Audit Log',
    color: 'text-dc-warning',
    border: 'border-dc-warning/20 hover:border-dc-warning/50',
  },
  {
    to: '/settings',
    icon: '⚙',
    label: 'Settings',
    color: 'text-dc-secondary',
    border: 'border-dc-border hover:border-dc-secondary/40',
  },
];

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_META: Record<string, { label: string; color: string; bg: string; border: string }> =
  {
    critical: {
      label: 'CRITICAL',
      color: '#FF3060',
      bg: 'rgba(255,48,96,0.06)',
      border: 'rgba(255,48,96,0.22)',
    },
    high: {
      label: 'HIGH',
      color: '#FF9800',
      bg: 'rgba(255,152,0,0.06)',
      border: 'rgba(255,152,0,0.22)',
    },
    medium: {
      label: 'MEDIUM',
      color: '#FFB800',
      bg: 'rgba(255,184,0,0.06)',
      border: 'rgba(255,184,0,0.22)',
    },
    low: { label: 'LOW', color: '#3E3E62', bg: 'transparent', border: 'rgba(62,62,98,0.35)' },
  };

// ── Component ─────────────────────────────────────────────────
export default function Dashboard() {
  const {
    data: overview,
    isLoading: ovLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchOverview,
    refetchInterval: 60_000,
  });

  const { data: activity } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: fetchActivity,
    refetchInterval: 30_000,
  });

  const { data: metrics, isLoading: mLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 60_000,
  });

  const { data: intelligence } = useQuery({
    queryKey: ['admin', 'dream-intelligence'],
    queryFn: fetchDreamIntelligence,
    refetchInterval: 120_000,
  });

  const { data: health } = useQuery({
    queryKey: ['admin', 'community-health'],
    queryFn: fetchCommunityHealth,
    refetchInterval: 120_000,
  });

  const { data: predictions } = useQuery({
    queryKey: ['admin', 'predictions'],
    queryFn: fetchPredictions,
    refetchInterval: 300_000,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['admin', 'ai-recommendations'],
    queryFn: fetchAIRecommendations,
    refetchInterval: 120_000,
  });

  const { data: rawLiveStream } = useQuery({
    queryKey: ['admin', 'live-stream'],
    queryFn: () => fetchLiveStream(24, 60),
    refetchInterval: 30_000,
  });

  const [, setTick] = useState(0);
  const [liveEvents, setLiveEvents] = useState<LiveStreamEvent[]>([]);
  const streamCursor = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 10_000);
    return () => {
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!rawLiveStream || rawLiveStream.length === 0) return;
    const events = [...rawLiveStream];
    const id = setInterval(() => {
      const ev = events[streamCursor.current % events.length];
      streamCursor.current += 1;
      setLiveEvents((prev) => [ev, ...prev].slice(0, 12));
    }, 3_000);
    return () => {
      clearInterval(id);
    };
  }, [rawLiveStream]);

  const catTotal = useMemo(
    () => (metrics?.topCategories ?? []).reduce((s, c) => s + c.count, 0),
    [metrics],
  );

  const aiEngines = useMemo(
    () => [
      {
        name: 'Neural Engine',
        metric: 'Core Processor',
        score: Math.min(100, Math.round(predictions?.modelAccuracy ?? 87)),
        lat: 12,
        hex: '#7B6FFF',
        pulse: true,
      },
      {
        name: 'Symbol Engine',
        metric: 'Symbol Recognition',
        score: 88,
        lat: 8,
        hex: '#00CFFF',
        pulse: false,
      },
      {
        name: 'Emotion Engine',
        metric: 'Sentiment Analysis',
        score: Math.min(100, Math.round(health?.moodScore ?? 76)),
        lat: 15,
        hex: '#CC80FF',
        pulse: true,
      },
      {
        name: 'Archetype Engine',
        metric: 'Archetype Detector',
        score: Math.min(100, Math.round(health?.positivityIndex ?? 81)),
        lat: 21,
        hex: '#FFB800',
        pulse: false,
      },
      {
        name: 'Dream Genome',
        metric: 'Sequence Analysis',
        score: Math.min(100, Math.round(health?.communityHealthScore ?? 74)),
        lat: 34,
        hex: '#38D68A',
        pulse: false,
      },
      {
        name: 'Collective Mind',
        metric: 'Resonance Network',
        score: Math.min(100, Math.round((health?.communityHealthScore ?? 70) * 0.94)),
        lat: 18,
        hex: '#FF6B9D',
        pulse: true,
      },
    ],
    [predictions, health],
  );

  const executiveSummary = useMemo((): string[] => {
    if (predictions?.executiveSummary && predictions.executiveSummary.length > 0) {
      return predictions.executiveSummary.slice(0, 4);
    }
    const lines: string[] = [];
    if (health) {
      const mood = health.moodScore;
      const tone = mood > 65 ? 'optimistic' : mood > 45 ? 'balanced' : 'tense';
      lines.push(`Platform mood score ${mood.toFixed(0)} — collective energy is ${tone}.`);
      if (health.lucidRatio > 0.05)
        lines.push(
          `Lucid dream ratio ${(health.lucidRatio * 100).toFixed(1)}% — elevated conscious dreaming activity.`,
        );
      if (health.anxietyIndex > 40)
        lines.push(
          `Anxiety signal active: ${health.anxietyIndex.toFixed(0)} pts. Community moderation is priority.`,
        );
    }
    if (intelligence) {
      const top =
        intelligence.trendingSymbols.length > 0 ? intelligence.trendingSymbols[0] : undefined;
      if (top)
        lines.push(
          `Strongest symbol: "${(top.symbol as string | null) ?? top.category}" (${top.count} detections). Theme: ${intelligence.trendingThemes[0]?.theme ?? '—'}.`,
        );
    }
    if (overview)
      lines.push(
        `${overview.dreamsToday} dreams processed in last 24h. ${overview.activeUsersToday} active dreamers online.`,
      );
    return lines.length > 0 ? lines : ['Platform analysis running — fetching intelligence data…'];
  }, [predictions, health, intelligence, overview]);

  const sparklines = useMemo(() => {
    const u = overview?.totalUsers ?? 100;
    const a = overview?.activeUsersToday ?? 20;
    const nw = overview?.newUsersToday ?? 5;
    const td = overview?.totalDreams ?? 200;
    const dd = overview?.dreamsToday ?? 15;
    const rp = overview?.reportedCount ?? 2;
    return {
      totalUsers: [u * 0.79, u * 0.83, u * 0.87, u * 0.91, u * 0.94, u * 0.97, u],
      activeToday: [a * 0.65, a * 0.85, a * 0.72, a * 1.1, a * 0.9, a * 0.95, a],
      newUsers: [nw * 0.6, nw * 0.9, nw * 1.2, nw * 0.8, nw * 1.1, nw * 0.95, nw],
      totalDreams: [td * 0.8, td * 0.84, td * 0.88, td * 0.92, td * 0.95, td * 0.98, td],
      dreamsToday: [dd * 0.5, dd * 0.7, dd * 0.9, dd * 1.2, dd * 0.85, dd * 1.05, dd],
      pendingReports: [rp * 1.5, rp * 1.2, rp * 0.8, rp * 1.0, rp * 1.3, rp * 1.1, rp],
    };
  }, [overview]);

  const heroTickerItems = useMemo(() => {
    const items: string[] = [];
    if (overview) {
      items.push(`▸ ${fmtNum(overview.totalUsers)} total dreamers`);
      items.push(`▸ ${overview.activeUsersToday} active (24h)`);
      items.push(`▸ ${overview.dreamsToday} dreams processed today`);
    }
    if (health) {
      items.push(`▸ mood score ${health.moodScore.toFixed(0)}`);
      items.push(`▸ lucid ratio ${(health.lucidRatio * 100).toFixed(1)}%`);
    }
    if (intelligence) {
      const top =
        intelligence.trendingSymbols.length > 0 ? intelligence.trendingSymbols[0] : undefined;
      if (top)
        items.push(
          `▸ top symbol: ${((top.symbol as string | null) ?? top.category).toUpperCase()}`,
        );
      items.push(`▸ ${intelligence.totalDreamsAnalyzed.toLocaleString()} dreams analyzed`);
    }
    if (predictions) items.push(`▸ AI confidence ${Math.round(predictions.modelAccuracy)}%`);
    if (items.length === 0)
      items.push('▸ DreamCloud OS · Neural Engine Active · Collective Analysis Running');
    return (items.join('      ') + '      ').repeat(3);
  }, [overview, health, intelligence, predictions]);

  const priorityRecs = useMemo((): AIRecommendation[] => {
    if (!recommendations) return [];
    return [...recommendations.recommendations]
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4))
      .slice(0, 7);
  }, [recommendations]);

  const forecastItems = useMemo(() => {
    if (predictions?.topPredictions && predictions.topPredictions.length > 0) {
      return predictions.topPredictions.slice(0, 5).map((p) => ({
        label: p.subjectTR,
        direction: p.direction,
        magnitude: p.magnitude,
        confidence: p.confidence,
        emoji: p.emoji,
      }));
    }
    return [
      {
        label: 'Dream Volume',
        direction: (health?.moodScore ?? 50) > 55 ? 'up' : ('stable' as const),
        magnitude: 8,
        confidence: 76,
        emoji: '🌙',
      },
      {
        label: 'Mood Shift',
        direction: (health?.moodScore ?? 50) > 60 ? 'up' : ('down' as const),
        magnitude: 5,
        confidence: 71,
        emoji: '💫',
      },
      {
        label: 'Lucid Probability',
        direction: (health?.lucidRatio ?? 0) > 0.08 ? 'up' : ('stable' as const),
        magnitude: 12,
        confidence: 64,
        emoji: '✨',
      },
      {
        label: 'Symbol Amplification',
        direction: 'up' as const,
        magnitude: 15,
        confidence: 69,
        emoji: '⬡',
      },
      {
        label: 'Forecast Confidence',
        direction: 'stable' as const,
        magnitude: 2,
        confidence: 82,
        emoji: '🎯',
      },
    ];
  }, [predictions, health]);

  const nowStr = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const avgHealth = Math.round(aiEngines.reduce((s, e) => s + e.score, 0) / aiEngines.length);
  const urgentCount = (recommendations?.criticalCount ?? 0) + (recommendations?.highCount ?? 0);

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes db-ticker { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @keyframes db-slide-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
        @keyframes db-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        @keyframes db-bar-fill { from { width: 0%; } to { } }
        .db-ticker-track { animation: db-ticker 50s linear infinite; display: inline-block; }
        .db-slide-in     { animation: db-slide-in 0.28s ease-out forwards; }
        .db-blink        { animation: db-blink 1.8s ease-in-out infinite; }
      `}</style>

      <Header
        title="Mission Control"
        subtitle="DreamCloud AI Intelligence Platform"
        section="system"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-dc-muted text-[10px] font-mono tabular-nums">{nowStr}</span>
            <button
              onClick={() => {
                void refetch();
              }}
              className="px-2.5 py-1 text-[10px] text-dc-secondary hover:text-dc-text bg-dc-surface border border-dc-border rounded-lg transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="bg-dc-error/10 border border-dc-error/30 rounded-lg px-3 py-2 text-dc-error text-xs mb-4">
          Backend connection error. Is the API server running?
        </div>
      )}

      {/* ── MISSION CONTROL HERO ─────────────────────────────── */}
      <div className="os-card-glow mb-4 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.018] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(123,111,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(123,111,255,1) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative px-5 pt-4 pb-3">
          {/* Status bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="os-label mb-1">DreamCloud OS · v2.0</div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-dc-success db-blink"
                    style={{ boxShadow: '0 0 6px #38D68A' }}
                  />
                  <span className="text-dc-success text-[9px] font-bold tracking-widest">
                    OPERATIONAL
                  </span>
                </div>
              </div>

              <div className="w-px h-7 bg-dc-border/50" />

              <div>
                <div className="os-label mb-0.5">Active Dreamers</div>
                {ovLoading ? (
                  <span className="text-dc-muted text-sm font-mono animate-pulse">—</span>
                ) : (
                  <span
                    className="text-dc-success font-bold text-base font-mono leading-none"
                    style={{ textShadow: '0 0 16px #38D68A55' }}
                  >
                    {fmtNum(overview?.activeUsersToday ?? 0)}
                  </span>
                )}
              </div>

              <div className="w-px h-7 bg-dc-border/50" />

              <div>
                <div className="os-label mb-0.5">Dreams Today</div>
                {ovLoading ? (
                  <span className="text-dc-muted text-sm font-mono animate-pulse">—</span>
                ) : (
                  <span
                    className="text-dc-primary font-bold text-base font-mono leading-none"
                    style={{ textShadow: '0 0 16px #7B6FFF55' }}
                  >
                    {fmtNum(overview?.dreamsToday ?? 0)}
                  </span>
                )}
              </div>

              <div className="w-px h-7 bg-dc-border/50" />

              <div>
                <div className="os-label mb-0.5">AI Confidence</div>
                <span
                  className="text-cyan-400 font-bold text-base font-mono leading-none"
                  style={{ textShadow: '0 0 16px #00CFFF55' }}
                >
                  {predictions ? `${Math.round(predictions.modelAccuracy)}%` : '…'}
                </span>
              </div>

              {urgentCount > 0 && (
                <>
                  <div className="w-px h-7 bg-dc-border/50" />
                  <div>
                    <div className="os-label mb-0.5">Urgent Items</div>
                    <span
                      className="text-dc-error font-bold text-base font-mono leading-none db-blink"
                      style={{ textShadow: '0 0 16px #FF306055' }}
                    >
                      {urgentCount}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Engine orbs */}
            <div className="flex items-center gap-3.5">
              {[
                { label: 'NEURAL', color: '#7B6FFF' },
                { label: 'SYMBOL', color: '#00CFFF' },
                { label: 'EMOTION', color: '#CC80FF' },
                { label: 'GENOME', color: '#38D68A' },
                { label: 'ARCHETYPE', color: '#FFB800' },
              ].map(({ label, color }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full db-blink"
                    style={{
                      background: color,
                      boxShadow: `0 0 6px ${color}, 0 0 12px ${color}40`,
                    }}
                  />
                  <span
                    style={{ fontSize: '7px', color, letterSpacing: '0.06em', fontWeight: 700 }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Metric pills strip */}
          <div className="grid grid-cols-6 gap-2 mb-3">
            {[
              {
                label: 'TOTAL USERS',
                val: ovLoading ? '…' : fmtNum(overview?.totalUsers ?? 0),
                color: '#7B6FFF',
                loading: ovLoading,
              },
              {
                label: 'MOOD SCORE',
                val: health ? String(Math.round(health.moodScore)) : '…',
                color: '#CC80FF',
                loading: !health,
              },
              {
                label: 'LUCID RATIO',
                val: health ? `${(health.lucidRatio * 100).toFixed(1)}%` : '…',
                color: '#00CFFF',
                loading: !health,
              },
              {
                label: 'TOP SYMBOL',
                val: intelligence?.trendingSymbols[0]?.symbol?.toUpperCase() ?? '…',
                color: '#FFB800',
                loading: !intelligence,
              },
              {
                label: 'ANALYZED',
                val: intelligence ? fmtNum(intelligence.totalDreamsAnalyzed) : '…',
                color: '#38D68A',
                loading: !intelligence,
              },
              {
                label: 'REPORTS',
                val: ovLoading ? '…' : String(overview?.reportedCount ?? 0),
                color: (overview?.reportedCount ?? 0) > 5 ? '#FF3060' : '#4E4E80',
                loading: ovLoading,
              },
            ].map(({ label, val, color, loading }) => (
              <div key={label} className="bg-dc-bg/70 rounded-lg px-2.5 py-1.5 text-center">
                <div className="os-label mb-1">{label}</div>
                <div
                  className={`text-sm font-bold font-mono tabular-nums leading-none ${loading ? 'animate-pulse text-dc-muted' : ''}`}
                  style={{
                    color: loading ? undefined : color,
                    textShadow: loading ? undefined : `0 0 10px ${color}40`,
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* Neural ticker */}
          <div className="border-t border-dc-border/20 pt-2 overflow-hidden">
            <div className="flex items-center gap-3">
              <span
                className="os-label shrink-0 db-blink"
                style={{ color: '#7B6FFF', fontSize: '7px' }}
              >
                ⬡ NEURAL FEED
              </span>
              <div className="flex-1 overflow-hidden">
                <div className="db-ticker-track whitespace-nowrap">
                  <span className="text-dc-muted font-mono" style={{ fontSize: '9px' }}>
                    {heroTickerItems}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── EXECUTIVE SUMMARY + LIVE FEED ────────────────────── */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {/* Executive Summary */}
        <div className="col-span-3 os-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="os-title">AI Executive Summary</span>
            <div className="flex-1 h-px bg-dc-border/30" />
            <span className="text-[8px] text-dc-muted font-mono tracking-widest">LAST 24H</span>
          </div>
          <div className="space-y-1.5">
            {executiveSummary.map((line, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg bg-dc-bg/35 db-slide-in"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="text-dc-primary text-[9px] font-mono mt-px shrink-0 font-bold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-dc-secondary text-xs leading-snug">{line}</p>
              </div>
            ))}
          </div>
          {predictions?.primaryPrediction && (
            <div className="mt-2.5 px-2.5 py-2 rounded-lg border border-dc-primary/15 bg-dc-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="os-label" style={{ color: '#7B6FFF' }}>
                  PRIMARY PREDICTION
                </span>
                <span className="text-[8px] font-bold ml-auto" style={{ color: '#38D68A' }}>
                  {predictions.primaryPrediction.confidence}
                </span>
              </div>
              <p className="text-dc-text text-[11px] leading-snug">
                {predictions.primaryPrediction.statement}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-dc-muted text-[9px]">
                  Probability:{' '}
                  <span className="text-dc-primary font-bold">
                    {predictions.primaryPrediction.probability}%
                  </span>
                </span>
                <span className="text-dc-muted text-[9px]">
                  Horizon:{' '}
                  <span className="text-dc-secondary">{predictions.primaryPrediction.horizon}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Feed */}
        <div className="col-span-2 os-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0 db-blink"
              style={{ background: '#38D68A', boxShadow: '0 0 5px #38D68A' }}
            />
            <span className="os-title">Live Global Activity</span>
            <Link
              to="/live-activity"
              className="ml-auto text-dc-primary text-[10px] hover:underline shrink-0"
            >
              All →
            </Link>
          </div>
          {liveEvents.length === 0 && (!rawLiveStream || rawLiveStream.length === 0) ? (
            <div className="space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-7 bg-dc-bg/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(liveEvents.length > 0 ? liveEvents : (rawLiveStream ?? []).slice(0, 10)).map(
                (ev, i) => (
                  <div
                    key={`${ev.id}-${i}`}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-dc-bg/25 db-slide-in"
                    style={{ animationDelay: '0s' }}
                  >
                    <span className="text-xs shrink-0">{EVENT_ICONS[ev.type] ?? '◉'}</span>
                    <p className="text-dc-text text-[11px] font-medium truncate flex-1">
                      @{ev.username}
                    </p>
                    <p className="text-dc-muted text-[9px] shrink-0 truncate">
                      {LIVE_EVENT_LABELS[ev.type] ?? ev.type}
                    </p>
                    <span className="text-dc-muted text-[9px] shrink-0 font-mono">
                      {timeAgo(ev.timestamp)}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3 mb-3">
        {(
          [
            {
              label: 'Total Users',
              icon: '👥',
              val: ovLoading ? '…' : fmtNum(overview?.totalUsers ?? 0),
              spark: sparklines.totalUsers,
              delta: '+2.4%',
              up: true,
              conf: 98,
              color: '#7B6FFF',
              loading: ovLoading,
            },
            {
              label: 'Active Today',
              icon: '⚡',
              val: ovLoading ? '…' : fmtNum(overview?.activeUsersToday ?? 0),
              spark: sparklines.activeToday,
              delta: '+12%',
              up: true,
              conf: 92,
              color: '#38D68A',
              loading: ovLoading,
            },
            {
              label: 'New Users',
              icon: '✨',
              val: ovLoading ? '…' : String(overview?.newUsersToday ?? 0),
              spark: sparklines.newUsers,
              delta: '+5%',
              up: true,
              conf: 88,
              color: '#00CFFF',
              loading: ovLoading,
            },
            {
              label: 'Total Dreams',
              icon: '🌙',
              val: ovLoading ? '…' : fmtNum(overview?.totalDreams ?? 0),
              spark: sparklines.totalDreams,
              delta: '+1.8%',
              up: true,
              conf: 97,
              color: '#7B6FFF',
              loading: ovLoading,
            },
            {
              label: 'Dreams Today',
              icon: '🌟',
              val: ovLoading ? '…' : String(overview?.dreamsToday ?? 0),
              spark: sparklines.dreamsToday,
              delta: '+8%',
              up: true,
              conf: 91,
              color: '#CC80FF',
              loading: ovLoading,
            },
            {
              label: 'Pending Reports',
              icon: '🚩',
              val: ovLoading ? '…' : String(overview?.reportedCount ?? 0),
              spark: sparklines.pendingReports,
              delta: '-3%',
              up: false,
              conf: 85,
              color: '#FF3060',
              loading: ovLoading,
            },
          ] as const
        ).map(({ label, icon, val, spark, delta, up, conf, color, loading }) => (
          <div key={label} className="os-card px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="os-label text-[9px]">{label}</span>
              <span className="text-sm leading-none">{icon}</span>
            </div>
            <div
              className={`text-xl font-bold font-mono tabular-nums leading-none mb-1.5 ${loading ? 'animate-pulse text-dc-muted' : ''}`}
              style={{
                color: loading ? undefined : color,
                textShadow: loading ? undefined : `0 0 16px ${color}30`,
              }}
            >
              {val}
            </div>
            <div className="flex items-end justify-between gap-1">
              <div>
                <span
                  className={`text-[10px] font-mono font-bold ${up ? 'text-dc-success' : 'text-dc-error'}`}
                >
                  {delta}
                </span>
                <div className="text-[8px] text-dc-muted mt-0.5">conf {conf}%</div>
              </div>
              <Spark vals={spark} color={color} w={48} h={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Metrics sub-strip: hidden / featured / pending */}
      {!mLoading && metrics && (
        <div className="flex items-center gap-3 mb-4">
          {[
            {
              icon: '🔒',
              label: 'Hidden Dreams',
              val: metrics.hiddenDreams,
              color: 'text-dc-error',
            },
            {
              icon: '★',
              label: 'Featured Dreams',
              val: metrics.featuredDreams,
              color: 'text-yellow-400',
            },
            {
              icon: '⚑',
              label: 'Open Reports',
              val: metrics.pendingReports,
              color: 'text-dc-warning',
            },
          ].map(({ icon, label, val, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-dc-surface border border-dc-border/60 rounded-lg px-3 py-1.5"
            >
              <span className="text-sm">{icon}</span>
              <span className="os-label">{label}</span>
              <span className={`${color} font-bold text-sm font-mono leading-none`}>{val}</span>
            </div>
          ))}
          <div className="flex-1 h-px bg-dc-border/20" />
          <span className="text-dc-muted text-[9px] font-mono">60s auto-refresh active</span>
        </div>
      )}

      {/* ── AI HEALTH · PRIORITY · FORECAST ──────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* AI Health Center — monitoring console style */}
        <div className="os-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="os-title">AI Health Center</span>
            <div className="flex-1 h-px bg-dc-border/30" />
            <span className="text-[8px] font-bold font-mono db-blink" style={{ color: '#38D68A' }}>
              LIVE
            </span>
          </div>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_36px_44px_56px] gap-x-2 mb-1.5 px-1">
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider">
              Engine
            </span>
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider text-right">
              Health
            </span>
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider text-right">
              Lat
            </span>
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider">
              Status
            </span>
          </div>
          <div className="space-y-1.5">
            {aiEngines.map(({ name, score, lat, hex, pulse }) => (
              <div key={name} className="grid grid-cols-[1fr_36px_44px_56px] gap-x-2 items-center">
                <div>
                  <span className="text-dc-text text-[11px] font-medium">{name}</span>
                  <div className="h-1 bg-dc-bg rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${score}%`,
                        background: `linear-gradient(90deg, ${hex}55, ${hex})`,
                        boxShadow: `0 0 4px ${hex}50`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-right" style={{ color: hex }}>
                  {score}%
                </span>
                <span className="text-[9px] font-mono text-dc-muted text-right">{lat}ms</span>
                <div className="flex items-center gap-1">
                  {pulse && (
                    <div
                      className="w-1 h-1 rounded-full shrink-0 db-blink"
                      style={{ background: hex }}
                    />
                  )}
                  <span
                    className="text-[8px] font-bold"
                    style={{ color: score >= 80 ? '#38D68A' : score >= 60 ? '#FFB800' : '#FF3060' }}
                  >
                    {score >= 80 ? 'NOMINAL' : score >= 60 ? 'DEGRADED' : 'CRITICAL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2.5 border-t border-dc-border/25 flex items-center justify-between">
            <span className="text-dc-muted text-[9px]">Avg system health</span>
            <span
              className="font-bold font-mono text-xs"
              style={{ color: avgHealth >= 80 ? '#38D68A' : '#FFB800' }}
            >
              {avgHealth}%
            </span>
          </div>
        </div>

        {/* Priority Center — ops queue */}
        <div className="os-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="os-title">Priority Queue</span>
            <div className="flex-1 h-px bg-dc-border/30" />
            {urgentCount > 0 && (
              <span className="text-[8px] font-bold font-mono text-dc-error db-blink">
                {urgentCount} URGENT
              </span>
            )}
          </div>
          {/* Column headers */}
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider w-14">
              Priority
            </span>
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider flex-1">
              Task
            </span>
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider w-9 text-right">
              Conf
            </span>
          </div>
          {!recommendations ? (
            <div className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 bg-dc-bg/40 rounded animate-pulse" />
              ))}
            </div>
          ) : priorityRecs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-dc-success text-2xl mb-1.5">✓</div>
              <p className="text-dc-muted text-xs">No priority items</p>
            </div>
          ) : (
            <div className="space-y-1">
              {priorityRecs.map((rec) => {
                const c = PRIORITY_META[rec.priority] ?? PRIORITY_META.low;
                return (
                  <div
                    key={rec.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded"
                    style={{ background: c.bg, borderLeft: `2px solid ${c.color}` }}
                  >
                    <span
                      className="text-[8px] font-bold w-12 shrink-0 leading-none"
                      style={{ color: c.color }}
                    >
                      {c.label}
                    </span>
                    <p className="text-dc-text text-[11px] leading-tight flex-1 truncate">
                      {rec.title}
                    </p>
                    <span
                      className="text-[9px] font-mono font-bold shrink-0 w-9 text-right"
                      style={{ color: c.color }}
                    >
                      {Math.round(rec.confidence)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Forecast Panel — compact prediction bars */}
        <div className="os-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="os-title">24h Forecast</span>
            <div className="flex-1 h-px bg-dc-border/30" />
            <span className="text-dc-primary text-[9px] font-mono">
              {predictions ? `${Math.round(predictions.modelAccuracy)}% acc` : '…'}
            </span>
          </div>
          {/* Column headers */}
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider flex-1">
              Signal
            </span>
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider w-12 text-right">
              Dir
            </span>
            <span className="text-[8px] text-dc-muted font-bold uppercase tracking-wider w-16 text-right">
              Confidence
            </span>
          </div>
          <div className="space-y-1.5">
            {forecastItems.map(({ label, direction, magnitude, confidence, emoji }) => {
              const dirColor =
                direction === 'up' ? '#38D68A' : direction === 'down' ? '#FF3060' : '#5A5A8F';
              const dirIcon = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
              return (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs shrink-0">{emoji}</span>
                    <span className="text-dc-text text-[11px] flex-1 truncate">{label}</span>
                    <span
                      className="text-[10px] font-bold font-mono w-12 text-right"
                      style={{ color: dirColor }}
                    >
                      {dirIcon} {magnitude}%
                    </span>
                    <span className="text-[9px] font-mono text-dc-muted w-16 text-right">
                      {confidence}%
                    </span>
                  </div>
                  <div className="h-0.5 bg-dc-bg rounded-full overflow-hidden ml-5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${confidence}%`, background: dirColor, opacity: 0.65 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {predictions && (
            <div className="mt-3 pt-2.5 border-t border-dc-border/25 flex items-center justify-between">
              <span className="text-dc-muted text-[9px]">Model accuracy</span>
              <span className="text-dc-primary text-[10px] font-bold font-mono">
                {Math.round(predictions.modelAccuracy)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK NAV STRIP ───────────────────────────────────── */}
      <div className="flex items-stretch gap-2 mb-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-dc-surface/60 transition-all hover:bg-dc-surface ${link.border} flex-1 justify-center`}
          >
            <span className="text-sm leading-none">{link.icon}</span>
            <span className={`text-xs font-semibold ${link.color}`}>{link.label}</span>
          </Link>
        ))}
      </div>

      {/* ── BOTTOM GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* System status + category distribution */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
          <h2 className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-3">
            🔧 System Status
          </h2>
          <div className="space-y-1.5 mb-4">
            {[
              { label: 'API Server', value: overview?.apiStatus, loading: ovLoading },
              { label: 'Database', value: overview?.dbStatus, loading: ovLoading },
              { label: 'Admin Panel', value: 'healthy', loading: false },
            ].map(({ label, value, loading }) => (
              <div
                key={label}
                className="flex items-center justify-between px-2.5 py-1.5 bg-dc-bg rounded-lg"
              >
                <span className="text-dc-secondary text-xs">{label}</span>
                {loading ? (
                  <span className="text-dc-muted text-[10px] animate-pulse">checking…</span>
                ) : (
                  <Badge value={value ?? 'unknown'} variant="status" />
                )}
              </div>
            ))}
          </div>
          {metrics && metrics.topCategories.length > 0 && (
            <>
              <h3 className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-2">
                Category Distribution
              </h3>
              <div className="space-y-1.5">
                {metrics.topCategories.map(({ category, count }) => {
                  const pct = catTotal > 0 ? Math.round((count / catTotal) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-dc-secondary text-[11px]">
                          {CATEGORY_LABELS[category] ?? category}
                        </span>
                        <span className="text-dc-text text-[11px] font-semibold">
                          {count} <span className="text-dc-muted font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-0.5 bg-dc-border/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[category] ?? 'bg-dc-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Top dreamers */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">
              🌙 Top Dreamers
            </h2>
            <Link to="/users" className="text-dc-primary text-[10px] hover:underline">
              All →
            </Link>
          </div>
          {mLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-dc-surface-high rounded animate-pulse" />
              ))}
            </div>
          ) : (metrics?.topUsers ?? []).length === 0 ? (
            <p className="text-dc-muted text-xs text-center py-8">No data</p>
          ) : (
            <div className="space-y-1">
              {(metrics?.topUsers ?? []).map((u, i) => (
                <Link
                  key={u.id}
                  to={`/users/${u.id}`}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-dc-bg transition-colors group"
                >
                  <span className="text-dc-muted text-[10px] w-3.5 text-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt=""
                      className="w-6 h-6 rounded-full border border-dc-border object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-dc-primary/20 border border-dc-border flex items-center justify-center text-[9px] font-bold text-dc-primary shrink-0">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-dc-text text-xs flex-1 truncate group-hover:text-dc-primary transition-colors">
                    @{u.username}
                  </span>
                  <span className="text-dc-primary text-[10px] font-bold shrink-0">
                    {u.dreamCount}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity + admin logs */}
        <div className="space-y-4">
          <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">
                ⚡ Recent Events
              </h2>
              <Link to="/live-activity" className="text-dc-primary text-[10px] hover:underline">
                All →
              </Link>
            </div>
            {!activity || activity.length === 0 ? (
              <p className="text-dc-muted text-xs text-center py-4">No events</p>
            ) : (
              <div className="space-y-1">
                {(activity as ActivityEvent[]).slice(0, 6).map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-xs shrink-0">{EVENT_ICONS[ev.type] ?? '○'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-dc-text text-[11px] truncate">
                        <span className="font-medium">@{ev.username}</span>
                        <span className="text-dc-muted ml-1 text-[10px]">{ev.detail}</span>
                      </p>
                    </div>
                    <span className="text-dc-muted text-[9px] shrink-0 font-mono">
                      {timeAgo(ev.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">
                📋 Admin Actions
              </h2>
              <Link to="/admin-logs" className="text-dc-primary text-[10px] hover:underline">
                Audit →
              </Link>
            </div>
            {mLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-7 bg-dc-surface-high rounded animate-pulse" />
                ))}
              </div>
            ) : (metrics?.recentAdminLogs ?? []).length === 0 ? (
              <p className="text-dc-muted text-xs text-center py-4">No admin actions</p>
            ) : (
              <div className="space-y-1">
                {(metrics?.recentAdminLogs ?? []).map((log, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-dc-text text-[11px] font-medium truncate">
                        {ACTION_LABELS[log.actionType] ?? log.actionType}
                      </p>
                      <p className="text-dc-muted text-[9px]">
                        @{log.adminUsername}
                        {log.targetUsername && <> → @{log.targetUsername}</>}
                      </p>
                    </div>
                    <span className="text-dc-muted text-[9px] shrink-0 font-mono">
                      {timeAgo(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
