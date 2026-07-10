import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchOverview, fetchCommunityHealth, fetchActivity, fetchOperationalAlerts,
  fetchLiveStream, fetchAISignals, fetchCollectiveConsciousness,
} from '../api/admin.api';

/* ── Types ───────────────────────────────────────────────────────────── */

export type LiveEventCategory =
  | 'dream' | 'emotion' | 'symbol' | 'resonance'
  | 'ai' | 'risk' | 'system' | 'archetype';

export interface LiveEvent {
  id:       string;
  category: LiveEventCategory;
  icon:     string;
  message:  string;
  detail?:  string;
  color:    string;
  ts:       number;
}

interface LiveSystemState {
  events:      LiveEvent[];
  heartbeat:   number;
  latestEvent: LiveEvent | null;
  systemPulse: number; // 0-100 vitality score
}

const CTX = createContext<LiveSystemState>({
  events:      [],
  heartbeat:   0,
  latestEvent: null,
  systemPulse: 75,
});

export function useLiveSystem() { return useContext(CTX); }

/* ── Static fallbacks & config ───────────────────────────────────────── */

const FALLBACK_SYMBOLS    = ['ay','su','ateş','kapı','ayna','gölge','yıldız','uçuş','orman','labirent'];
const FALLBACK_THEMES     = ['kayıp','dönüşüm','kimlik','korku','özgürlük','bağlantı','hafıza'];
const FALLBACK_ARCHETYPES = ['Kahraman','Gölge','Anima','Hile Bağı','Bilge','Ana','Çocuk','Savaşçı'];
const USERNAMES           = ['dreamer_7','lunatic_ink','void_walker','cosmos_eye','echo_mind','starmap_3','nocturne_x','myth_keeper','signal_9','ether_drift'];

export const CAT_CONFIG: Record<LiveEventCategory, { icon: string; color: string }> = {
  dream:     { icon: '◈', color: '#CC80FF' },
  emotion:   { icon: '◉', color: '#38D68A' },
  symbol:    { icon: '✦', color: '#FFB800' },
  resonance: { icon: '◎', color: '#00CFFF' },
  ai:        { icon: '◆', color: '#7B6FFF' },
  risk:      { icon: '⚑', color: '#FF4A5E' },
  system:    { icon: '◐', color: '#5A5A84' },
  archetype: { icon: '◉', color: '#FF8CF7' },
};

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uid(): string { return Math.random().toString(36).slice(2, 8); }

/* ── Platform snapshot for data-driven templates ─────────────────────── */

interface PlatformSnapshot {
  symbols:        string[];
  themes:         string[];
  archetypes:     string[];
  lucidRatio:     number;
  nightmareRatio: number;
  positivity:     number;
  anxiety:        number;
  resonanceCount: number;
  coherenceLevel: string;
  alignmentScore: number;
  dominantEmotion: string;
}

type SyntheticTemplate = (p: PlatformSnapshot) => Omit<LiveEvent, 'id' | 'ts'>;

const TEMPLATES: SyntheticTemplate[] = [
  (p) => ({ category: 'dream', color: '#CC80FF', icon: '◈',
    message: `@${rand(USERNAMES)} yeni bir rüya kaydetti`,
    detail:  `Sembol: "${rand(p.symbols)}" · tema: ${rand(p.themes)}` }),

  (p) => ({ category: 'symbol', color: '#FFB800', icon: '✦',
    message: `Kolektif sembol frekansı arttı`,
    detail:  `"${rand(p.symbols)}" · ${Math.floor(Math.random() * 80 + 20)} rüyada eşzamanlı` }),

  (p) => ({ category: 'resonance', color: '#00CFFF', icon: '◎',
    message: `Rezonans sinyali — ${p.coherenceLevel}`,
    detail:  `${p.alignmentScore}% senkronizasyon · ${p.resonanceCount.toLocaleString('tr-TR')} bağlantı` }),

  (p) => ({ category: 'emotion', color: '#38D68A', icon: '◉',
    message: `Duygu dalgası: ${p.dominantEmotion.toUpperCase()}`,
    detail:  `Pozitivite ${p.positivity}% · Anksiyete ${p.anxiety}%` }),

  (p) => ({ category: 'archetype', color: '#FF8CF7', icon: '◉',
    message: `Arketip aktivasyonu algılandı`,
    detail:  `${rand(p.archetypes)} · ${Math.floor(Math.random() * 15 + 5)}% aktivasyon artışı` }),

  (p) => ({ category: 'dream', color: '#CC80FF', icon: '◈',
    message: `Lucid aktivite: %${p.lucidRatio}`,
    detail:  p.lucidRatio >= 15
      ? `Yüksek lucid oran — bilinç seviyesi yükseliyor`
      : p.lucidRatio >= 8 ? `Normal lucid frekansı — platform stabil`
      : `Düşük lucid oran — derin uyku döngüsü hâkim` }),

  (p) => ({ category: 'emotion', color: p.nightmareRatio > 35 ? '#FF4A5E' : '#FF8C00', icon: '◉',
    message: `Kabus aktivitesi: %${p.nightmareRatio}`,
    detail:  p.nightmareRatio > 35
      ? `Yüksek kabus yoğunluğu — gölge materyali işleniyor`
      : `Kabus oranı normal · "${rand(p.themes)}" teması ön planda` }),

  (p) => ({ category: 'resonance', color: '#00CFFF', icon: '◎',
    message: `Kolektif bilinç: ${p.coherenceLevel}`,
    detail:  `${p.alignmentScore}% uyum · tema: "${rand(p.themes)}"` }),

  (p) => ({ category: 'ai', color: '#7B6FFF', icon: '◆',
    message: `AI analiz tamamlandı`,
    detail:  `Sembol haritası güncellendi · "${rand(p.symbols)}" baskın` }),

  (p) => ({ category: 'symbol', color: '#FFB800', icon: '✦',
    message: `Tema yoğunluğu: "${rand(p.themes)}"`,
    detail:  `Kolektif bilinçte yükselen sinyal · ${p.alignmentScore}% rezonans` }),

  () => ({ category: 'system', color: '#5A5A84', icon: '◐',
    message: `Platform nabzı alındı`,
    detail:  `Tüm sistemler nominal · ${new Date().toLocaleTimeString('tr-TR')}` }),
];

/* ── Provider ─────────────────────────────────────────────────────────── */

export function LiveSystemProvider({ children }: { children: ReactNode }) {
  const [events,    setEvents]    = useState<LiveEvent[]>([]);
  const [heartbeat, setHeartbeat] = useState(0);
  const hbRef = useRef(0);

  const { data: overview } = useQuery({
    queryKey: ['overview'], queryFn: fetchOverview, refetchInterval: 30_000, staleTime: 20_000,
  });
  const { data: health } = useQuery({
    queryKey: ['com-health'], queryFn: fetchCommunityHealth, refetchInterval: 60_000, staleTime: 50_000,
  });
  const { data: collective } = useQuery({
    queryKey: ['collective-consciousness'], queryFn: fetchCollectiveConsciousness,
    refetchInterval: 90_000, staleTime: 80_000,
  });
  const { data: activity } = useQuery({
    queryKey: ['activity'], queryFn: fetchActivity, refetchInterval: 12_000, staleTime: 10_000,
  });
  const { data: alerts } = useQuery({
    queryKey: ['alerts'], queryFn: fetchOperationalAlerts, refetchInterval: 15_000, staleTime: 12_000,
  });
  const { data: liveStream } = useQuery({
    queryKey: ['live-stream'], queryFn: () => fetchLiveStream(24, 30),
    refetchInterval: 8_000, staleTime: 6_000,
  });
  const { data: aiSignals } = useQuery({
    queryKey: ['ai-signals'], queryFn: () => fetchAISignals(10),
    refetchInterval: 30_000, staleTime: 25_000,
  });

  // ── Seed from real live stream (primary source) ──────────────────────────
  useEffect(() => {
    if (!liveStream?.length) return;
    const TYPE_TO_CAT: Record<string, LiveEventCategory> = {
      user_registered: 'system',
      dream_created:   'dream',
      dream_liked:     'emotion',
      dream_saved:     'resonance',
      user_followed:   'resonance',
      dream_reported:  'risk',
    };
    const TYPE_MSG: Record<string, (u: string, d: string | null) => string> = {
      user_registered: (u)    => `@${u} platforma katıldı`,
      dream_created:   (u, d) => `@${u} yeni rüya: ${d ?? '—'}`,
      dream_liked:     (u)    => `@${u} bir rüyayı beğendi`,
      dream_saved:     (u)    => `@${u} rüya kaydetdi`,
      user_followed:   (u)    => `@${u} yeni bir kullanıcı takip etti`,
      dream_reported:  (u, d) => `@${u} rüya bildirdi: ${d ?? '—'}`,
    };
    const real = liveStream.slice(0, 15).map(e => {
      const cat  = TYPE_TO_CAT[e.type] ?? 'system';
      const cfg  = CAT_CONFIG[cat];
      const msgFn = TYPE_MSG[e.type] ?? ((u: string) => `@${u} platform aktivitesi`);
      return {
        id:       uid(),
        category: cat,
        icon:     cfg.icon,
        color:    cfg.color,
        message:  msgFn(e.username, e.detail),
        detail:   e.detail ?? undefined,
        ts:       new Date(e.timestamp).getTime(),
      } satisfies LiveEvent;
    });
    setEvents(prev => {
      const seen = new Set(prev.map(e => e.message));
      const fresh = real.filter(e => !seen.has(e.message));
      return [...fresh, ...prev].slice(0, 40);
    });
  }, [liveStream]);

  // ── Seed AI signals from backend ─────────────────────────────────────────
  useEffect(() => {
    if (!aiSignals?.length) return;
    const SIG_TO_CAT: Record<string, LiveEventCategory> = {
      emotion: 'emotion', symbol: 'symbol', risk: 'risk',
      resonance: 'resonance', system: 'system', ai: 'ai',
    };
    const sigEvents = aiSignals.slice(0, 3).map(s => {
      const cat = SIG_TO_CAT[s.category] ?? 'ai';
      const cfg = CAT_CONFIG[cat];
      return {
        id:       uid(),
        category: cat,
        icon:     cfg.icon,
        color:    s.severity === 'critical' ? '#FF3060' : s.severity === 'warning' ? '#FF8C00' : cfg.color,
        message:  s.message,
        detail:   s.detail ?? undefined,
        ts:       new Date(s.createdAt).getTime(),
      } satisfies LiveEvent;
    });
    setEvents(prev => {
      const seen = new Set(prev.map(e => e.message));
      const fresh = sigEvents.filter(e => !seen.has(e.message));
      return [...fresh, ...prev].slice(0, 40);
    });
  }, [aiSignals]);

  // ── Fallback: seed from simple activity if live stream not yet available ─
  useEffect(() => {
    if (liveStream?.length || !activity?.length) return;
    const real = activity.slice(0, 5).map(a => {
      const cat: LiveEventCategory = a.type === 'dream_created' ? 'dream' : a.type === 'login' ? 'system' : 'ai';
      const cfg = CAT_CONFIG[cat];
      return {
        id:       uid(),
        category: cat,
        icon:     cfg.icon,
        color:    cfg.color,
        message:  a.type === 'dream_created' ? `@${a.username} yeni rüya` : `@${a.username} sisteme giriş`,
        detail:   a.detail,
        ts:       new Date(a.timestamp).getTime(),
      } satisfies LiveEvent;
    });
    setEvents(real);
  }, [activity, liveStream]);

  // Seed risk events from alerts
  useEffect(() => {
    if (!alerts?.alerts?.length) return;
    const riskEvents = alerts.alerts.slice(0, 2).map(a => ({
      id:       uid(),
      category: 'risk' as LiveEventCategory,
      icon:     '⚑',
      color:    '#FF4A5E',
      message:  a.title,
      detail:   a.description,
      ts:       Date.now() - Math.floor(Math.random() * 60_000),
    }));
    setEvents(prev => {
      const ids = new Set(prev.map(e => e.message));
      const fresh = riskEvents.filter(e => !ids.has(e.message));
      return [...fresh, ...prev].slice(0, 40);
    });
  }, [alerts]);

  // Synthetic event generator — data-driven from platform snapshot
  useEffect(() => {
    // Build platform snapshot from real API data
    const snapshot: PlatformSnapshot = {
      symbols:        collective?.sharedSymbols?.filter(s => s.symbol && s.symbol.length < 25).map(s => s.symbol) ?? FALLBACK_SYMBOLS,
      themes:         collective?.collectiveThemes?.map(t => t.theme) ?? FALLBACK_THEMES,
      archetypes:     FALLBACK_ARCHETYPES,
      lucidRatio:     health?.lucidRatio     ?? 10,
      nightmareRatio: health?.nightmareRatio ?? 20,
      positivity:     health?.positivityIndex ?? 50,
      anxiety:        health?.anxietyIndex    ?? 30,
      resonanceCount: collective?.resonanceCount ?? 0,
      coherenceLevel: collective?.coherenceLevel ?? 'RESONANT',
      alignmentScore: collective?.alignmentScore ?? 50,
      dominantEmotion: collective?.collectiveEmotion ?? 'nötr',
    };
    if (!snapshot.symbols.length)   snapshot.symbols   = FALLBACK_SYMBOLS;
    if (!snapshot.themes.length)    snapshot.themes    = FALLBACK_THEMES;

    const pushEvent = () => {
      const alertCount = alerts?.alerts?.filter(a => a.severity === 'critical').length ?? 0;
      const isRisk = alertCount > 0 && Math.random() < 0.2;

      const evtBase: Omit<LiveEvent, 'id' | 'ts'> = isRisk
        ? { category: 'risk', color: '#FF4A5E', icon: '⚑',
            message: 'Kritik uyarı aktif',
            detail:  `${alertCount} kritik sinyal · ${overview?.reportedCount ?? 0} rapor bekliyor` }
        : TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)](snapshot);

      setEvents(prev => [{ ...evtBase, id: uid(), ts: Date.now() }, ...prev].slice(0, 40));
      hbRef.current += 1;
      setHeartbeat(hbRef.current);
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeoutId = setTimeout(() => { pushEvent(); schedule(); }, 4_000 + Math.random() * 5_000);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, [overview, health, alerts, collective]);

  // System pulse — health-driven, with lucid consciousness bonus and report penalty.
  // Health dominates so pulse stays close to community health score.
  const lucidBonus     = Math.min(15, Math.round((health?.lucidRatio ?? 0) * 0.8));
  const reportPenalty  = Math.min(30, (overview?.reportedCount ?? 0) * 3);
  const systemPulse    = Math.min(100, Math.max(0, Math.round(
    (health?.communityHealthScore ?? 50) + lucidBonus - reportPenalty,
  )));

  return (
    <CTX.Provider value={{ events, heartbeat, latestEvent: events[0] ?? null, systemPulse }}>
      {children}
    </CTX.Provider>
  );
}
