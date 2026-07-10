import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useLiveSystem } from '../contexts/LiveSystemContext';
import {
  fetchOverview, fetchOperationalAlerts, fetchCommunityHealth,
  fetchModerationSummary, fetchAIOperators, fetchActivity,
  fetchConsciousnessMap, fetchCollectiveConsciousness, fetchEmotionMap,
} from '../api/admin.api';
import type { CoherenceLevel } from '../types/admin.types';

/* ── Large radial gauge ──────────────────────────────────────────────── */

function CommandGauge({
  value, max = 100, label, sublabel, color, size = 200,
}: {
  value: number; max?: number; label: string; sublabel: string; color: string; size?: number;
}) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct     = clamped / max;
  const R       = size * 0.38;
  const cx      = size / 2;
  const cy      = size / 2;
  const FULL    = 2 * Math.PI * R;
  const ARC     = FULL * 0.75; // 270-degree arc
  const gap     = FULL * 0.25;
  const fill    = ARC * pct;

  // Tick marks at 0/25/50/75/100
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const angle = -225 * (Math.PI / 180) + t * 270 * (Math.PI / 180);
    return {
      x1: cx + (R - 10) * Math.cos(angle), y1: cy + (R - 10) * Math.sin(angle),
      x2: cx + R        * Math.cos(angle), y2: cy + R        * Math.sin(angle),
    };
  });

  const tier = pct >= 0.8 ? 'TRANSCENDENT' : pct >= 0.6 ? 'LUCID' : pct >= 0.4 ? 'ACTIVE' : pct >= 0.2 ? 'PASSIVE' : 'DORMANT';

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Outer atmosphere */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `radial-gradient(circle, ${color}08 30%, transparent 70%)`,
        }} />
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
          <defs>
            <filter id={`gauge-glow-${label.replace(/\s/g,'')}`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke="rgba(255,255,255,0.04)" strokeWidth="10"
            strokeDasharray={`${ARC} ${gap}`}
            strokeDashoffset={-gap / 2}
            strokeLinecap="round"
            transform={`rotate(-225 ${cx} ${cy})`} />

          {/* Glow track */}
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke={color} strokeWidth="10" strokeOpacity="0.12"
            strokeDasharray={`${ARC} ${gap}`}
            strokeDashoffset={-gap / 2}
            strokeLinecap="round"
            transform={`rotate(-225 ${cx} ${cy})`}
            filter={`url(#gauge-glow-${label.replace(/\s/g,'')})`} />

          {/* Fill arc */}
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${fill} ${FULL - fill}`}
            strokeDashoffset={-gap / 2}
            strokeLinecap="round"
            transform={`rotate(-225 ${cx} ${cy})`}
            filter={`url(#gauge-glow-${label.replace(/\s/g,'')})`}
            style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.22,1,0.36,1)' }} />

          {/* Tick marks */}
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          ))}

          {/* Needle dot at tip */}
          {(() => {
            const angle = -225 * (Math.PI / 180) + pct * 270 * (Math.PI / 180);
            const nx    = cx + R * Math.cos(angle);
            const ny    = cy + R * Math.sin(angle);
            return <circle cx={nx} cy={ny} r="5" fill={color}
              style={{ filter: `drop-shadow(0 0 8px ${color})` }} />;
          })()}

          {/* Value text */}
          <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
            fill={color} fontFamily="monospace" fontWeight="900"
            fontSize={size * 0.18}
            style={{ filter: `drop-shadow(0 0 12px ${color}80)` }}>
            {Math.round(clamped)}
          </text>
          <text x={cx} y={cy + size * 0.11} textAnchor="middle"
            fill="rgba(255,255,255,0.2)" fontFamily="monospace" fontSize={size * 0.055}>
            /{max}
          </text>
          <text x={cx} y={cy + size * 0.2} textAnchor="middle"
            fill={color} fontFamily="monospace" fontWeight="700"
            fontSize={size * 0.063}
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}>
            {tier}
          </text>
        </svg>
      </div>
      <div className="text-center">
        <p className="font-bold text-sm" style={{ color: 'rgba(232,232,255,0.9)' }}>{label}</p>
        <p className="os-label mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

/* ── Emotional weather strip ─────────────────────────────────────────── */

const WEATHER_STATES = [
  { min: 75, icon: '☀',  label: 'GÜNEŞLI',  desc: 'Kolektif alan ışıl ışıl — yüksek enerji ve yaratıcılık',  color: '#FFD700', atmo: 'rgba(48,36,0,0.6)'  },
  { min: 60, icon: '🌤', label: 'AÇIK',     desc: 'Pozitif enerji baskın — yaratıcılık ve netlik hâkim',     color: '#80E8FF', atmo: 'rgba(0,18,32,0.6)'  },
  { min: 45, icon: '🌫', label: 'BULUTLU',  desc: 'Duygusal geçiş — yeni döngüler filizleniyor',             color: '#A0B4CC', atmo: 'rgba(6,18,32,0.6)'  },
  { min: 30, icon: '🌩', label: 'DALGALI',  desc: 'Kolektif gerilim yükseliyor — gölge döngüsü aktif',       color: '#FF8C00', atmo: 'rgba(36,18,0,0.6)'  },
  { min:  0, icon: '⛈', label: 'FIRTINALI',desc: 'Gölge materyali yüzeye çıkıyor — derin işleme aktif',     color: '#FF4A5E', atmo: 'rgba(48,0,12,0.6)'  },
];

/* ── Resonance ring ──────────────────────────────────────────────────── */

function ResonanceRing({ level, score }: { level: CoherenceLevel; score: number }) {
  const colors: Record<CoherenceLevel, string> = {
    UNIFIED:    '#FFD700',
    RESONANT:   '#CC80FF',
    FRAGMENTED: '#00CFFF',
    DISPERSED:  '#5A5A84',
  };
  const hex = colors[level];
  const R   = 40, C = 2 * Math.PI * R;
  const pct = score / 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 96 96" style={{ width: 96, height: 96 }}>
        <defs>
          <filter id="resGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
        <circle cx="48" cy="48" r={R} fill="none" stroke={hex} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
          strokeDashoffset={C * 0.25}
          transform="rotate(-90 48 48)"
          filter="url(#resGlow)" />
        {/* Pulsing outer ring */}
        <circle cx="48" cy="48" r={R + 6} fill="none" stroke={hex} strokeWidth="0.8" opacity="0">
          <animate attributeName="opacity" values="0.5;0" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="r" values={`${R + 4};${R + 18}`} dur="2.5s" repeatCount="indefinite" />
        </circle>
        <text x="48" y="48" textAnchor="middle" dominantBaseline="middle"
          fill={hex} fontSize="16" fontFamily="monospace" fontWeight="900">
          {score}
        </text>
      </svg>
      <p className="text-[8px] font-mono font-black tracking-widest" style={{ color: hex }}>{level}</p>
    </div>
  );
}

/* ── System node ─────────────────────────────────────────────────────── */

function SystemNode({ label, ok, value, color }: {
  label: string; ok: boolean; value?: string | number; color?: string;
}) {
  const c = ok ? '#38D68A' : '#FF4A5E';
  return (
    <div className="p-3 rounded-xl flex items-center gap-3"
      style={{ background: `${c}06`, border: `1px solid ${c}18` }}>
      <div className="relative shrink-0">
        <span className="w-2 h-2 rounded-full block" style={{ background: c }} />
        {ok && <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: c }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-mono font-bold tracking-widest" style={{ color: c }}>{label}</p>
        {value !== undefined && (
          <p className="font-mono font-black text-sm mt-0.5" style={{ color: color ?? c }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        )}
      </div>
      <span className="text-[8px] font-mono font-black shrink-0"
        style={{ color: ok ? '#38D68A' : '#FF4A5E' }}>
        {ok ? 'NOMINAL' : 'FAULT'}
      </span>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────── */

export default function ExecutiveDashboard() {
  const ov  = useQuery({ queryKey: ['overview'],              queryFn: fetchOverview,               refetchInterval: 30_000 });
  const al  = useQuery({ queryKey: ['alerts'],                queryFn: fetchOperationalAlerts,       refetchInterval: 15_000 });
  const ch  = useQuery({ queryKey: ['com-health'],            queryFn: fetchCommunityHealth,         refetchInterval: 60_000 });
  const ms  = useQuery({ queryKey: ['mod-summary'],           queryFn: fetchModerationSummary,       refetchInterval: 60_000 });
  const ops = useQuery({ queryKey: ['ai-operators'],          queryFn: fetchAIOperators,             refetchInterval: 30_000 });
  const act = useQuery({ queryKey: ['activity'],              queryFn: fetchActivity,                refetchInterval: 12_000 });
  const cm  = useQuery({ queryKey: ['consciousness-map'],     queryFn: fetchConsciousnessMap,        refetchInterval: 60_000 });
  const cc  = useQuery({ queryKey: ['collective-consciousness'], queryFn: fetchCollectiveConsciousness, refetchInterval: 60_000 });
  const em  = useQuery({ queryKey: ['emotion-map'],           queryFn: fetchEmotionMap,              refetchInterval: 60_000 });

  const { events, systemPulse } = useLiveSystem();

  const data       = ov.data;
  const alerts     = al.data?.alerts ?? [];
  const health     = ch.data;
  const mod        = ms.data;
  const opData     = ops.data;
  const actEvents  = act.data ?? [];
  const cMap       = cm.data;
  const collective = cc.data;
  const emotionMap = em.data;

  const critCount = alerts.filter(a => a.severity === 'critical').length;
  const apiOk     = ['ok','healthy','operational'].includes(data?.apiStatus ?? '');
  const dbOk      = ['ok','healthy','operational'].includes(data?.dbStatus ?? '');

  // Climate score: positivity(35%) + calm(25%) + lucid(20%) + no-nightmare(15%) + alignment(5%)
  const climateScore = Math.round(
    (health?.positivityIndex  ?? 50) * 0.35 +
    (100 - (health?.anxietyIndex  ?? 30)) * 0.25 +
    (health?.lucidRatio       ?? 10) * 0.20 +
    (100 - (health?.nightmareRatio ?? 20)) * 0.15 +
    (collective?.alignmentScore   ?? 50) * 0.05,
  );
  const weather    = WEATHER_STATES.find(w => climateScore >= w.min) ?? WEATHER_STATES[WEATHER_STATES.length - 1];
  const domEmotion = emotionMap?.dominantEmotion ?? collective?.collectiveEmotion ?? '—';

  /* ── Consciousness score from tier ─────────────────────────────────── */
  const cScore = cMap?.overallScore ?? 0;
  // alignmentScore = % of moods aligning to the dominant type — the real sync metric.
  // consciousnessSynchrony saturates at 100 from match density; alignmentScore tracks health.
  const resonanceScore = collective?.alignmentScore ?? 0;

  return (
    <div className="section-executive relative">
      <Header
        title="Command Center"
        subtitle="DreamCloud OS — Platform bilinç kontrol merkezi"
        section="executive"
        actions={
          <div className="flex items-center gap-3">
            {critCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-pulse"
                style={{ background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-dc-error" />
                <span className="text-dc-error text-[9px] font-bold tracking-widest">{critCount} KRİTİK</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <span className="w-1.5 h-1.5 rounded-full bg-dc-success block" />
                <span className="absolute inset-0 rounded-full bg-dc-success animate-status-ping" />
              </div>
              <span className="text-[9px] text-dc-success font-mono tracking-widest">LIVE · PULSE {systemPulse}</span>
            </div>
          </div>
        }
      />

      {/* ── HERO: 3 command gauges ────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5" style={{
        background: 'linear-gradient(160deg, rgba(14,10,30,0.99) 0%, rgba(8,6,20,0.99) 100%)',
        border:     '1px solid rgba(255,184,0,0.1)',
        boxShadow:  '0 0 80px rgba(255,184,0,0.04), 0 8px 40px rgba(0,0,0,0.8)',
        minHeight:  320,
      }}>
        {/* Consciousness grid */}
        <div className="consciousness-grid absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />

        <div className="relative flex items-center" style={{ zIndex: 1 }}>
          {/* Gauge 1: Platform Consciousness */}
          <div className="flex-1 flex items-center justify-center p-8">
            <CommandGauge
              value={cScore}
              label="Platform Consciousness"
              sublabel={cMap?.tier ?? 'COMPUTING'}
              color="#FFB800"
              size={220}
            />
          </div>

          <div className="w-px self-stretch my-6" style={{ background: 'rgba(255,255,255,0.05)' }} />

          {/* Center: Emotional weather + key stats */}
          <div className="flex-1 p-8 flex flex-col gap-5">
            {/* Emotional weather */}
            <div className="p-5 rounded-xl flex items-center gap-4" style={{
              background: weather.atmo,
              border:     `1px solid ${weather.color}20`,
              boxShadow:  `0 0 30px ${weather.color}08`,
            }}>
              <div className="text-5xl" style={{ filter: `drop-shadow(0 0 12px ${weather.color}60)` }}>
                {weather.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[9px] font-mono font-black tracking-[0.2em]" style={{ color: `${weather.color}80` }}>
                    DUYGUSAL HAVA
                  </p>
                  <div className="relative">
                    <span className="w-1 h-1 rounded-full block" style={{ background: weather.color }} />
                    <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: weather.color }} />
                  </div>
                </div>
                <p className="font-black text-xl mb-1" style={{ color: weather.color, textShadow: `0 0 20px ${weather.color}60` }}>
                  {domEmotion.toUpperCase()} · {weather.label}
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(232,232,255,0.55)' }}>{weather.desc}</p>
              </div>
            </div>

            {/* Platform vitals grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'TOPLAM KULLANICI',  value: data?.totalUsers       ?? 0, color: '#E8E8FF', sub: 'tüm zamanlar' },
                { label: 'BUGÜN AKTİF',       value: data?.activeUsersToday ?? 0, color: '#38D68A', sub: 'aktif kullanıcı', live: true },
                { label: 'TOPLAM RÜYA',       value: data?.totalDreams      ?? 0, color: '#CC80FF', sub: 'tüm zamanlar' },
                { label: 'BUGÜN RÜYA',        value: data?.dreamsToday      ?? 0, color: '#7B6FFF', sub: 'rüya kaydı', live: true },
              ].map(({ label, value, color, sub, live }) => (
                <div key={label} className="p-3 rounded-xl" style={{
                  background: `${color}06`, border: `1px solid ${color}12`,
                }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {live && (
                      <div className="relative shrink-0">
                        <span className="w-1 h-1 rounded-full block" style={{ background: color }} />
                        <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: color }} />
                      </div>
                    )}
                    <p className="os-label">{label}</p>
                  </div>
                  <p className="font-mono font-black text-2xl" style={{ color }}>{value.toLocaleString()}</p>
                  <p className="text-[8px] font-mono mt-0.5" style={{ color: `${color}60` }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-px self-stretch my-6" style={{ background: 'rgba(255,255,255,0.05)' }} />

          {/* Gauge 2: Community Resonance */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-6">
              <CommandGauge
                value={health?.communityHealthScore ?? 0}
                label="Community Health"
                sublabel="MOOD · POSITIVITY · SYNC"
                color="#38D68A"
                size={200}
              />
              {collective && (
                <ResonanceRing level={collective.coherenceLevel} score={resonanceScore} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SYSTEM MATRIX ─────────────────────────────────────────────── */}
      <div className="os-card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <p className="os-title">SİSTEM MATRİKS</p>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full animate-glow-breathe" style={{ background: '#38D68A' }} />
            <span className="text-[9px] font-mono" style={{ color: 'rgba(56,214,138,0.6)' }}>TÜM SİSTEMLER İZLENİYOR</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <SystemNode label="API SERVER"      ok={apiOk}   value={apiOk ? 'ONLINE' : 'FAULT'}   />
          <SystemNode label="DATABASE"        ok={dbOk}    value={dbOk ? 'ONLINE' : 'FAULT'}    />
          <SystemNode label="AI CORE"         ok={(opData?.systemHealth ?? 0) > 50}
            value={`${opData?.systemHealth ?? 0}%`} color="#7B6FFF" />
          <SystemNode label="ACTIVE OPS"
            ok={(opData?.operators?.filter(o => o.status === 'active').length ?? 0) > 0}
            value={`${opData?.operators?.filter(o => o.status === 'active').length ?? 0}/${opData?.operators?.length ?? 0}`}
            color="#00CFFF" />
          <SystemNode label="ACTIVE USERS"    ok={(data?.activeUsersToday ?? 0) > 0}
            value={data?.activeUsersToday ?? 0} color="#38D68A" />
          <SystemNode label="DREAMS TODAY"    ok={(data?.dreamsToday ?? 0) > 0}
            value={data?.dreamsToday ?? 0} color="#CC80FF" />
          <SystemNode label="PENDING REPORTS" ok={(data?.reportedCount ?? 0) === 0}
            value={data?.reportedCount ?? 0} color={(data?.reportedCount ?? 0) > 0 ? '#FF4A5E' : '#38D68A'} />
          <SystemNode label="SYSTEM PULSE"    ok={systemPulse > 50}
            value={`${systemPulse}/100`} color="#FFB800" />
        </div>
      </div>

      {/* ── PRIMARY: Live signal stream + alerts + community pulse ─────── */}
      <div className="grid grid-cols-12 gap-5 mb-5">

        {/* Live signal stream (5 cols) */}
        <div className="col-span-5 os-card overflow-hidden" style={{ minHeight: 380 }}>
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
                <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
              </div>
              <p className="os-title">CANLI SİNYAL AKIŞI</p>
            </div>
            <Link to="/live-activity" className="text-[9px] font-bold font-mono tracking-widest"
              style={{ color: '#CC80FF', opacity: 0.6 }}>
              TAM FEED →
            </Link>
          </div>
          <div className="divide-y overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.03)', maxHeight: 340 }}>
            {events.slice(0, 16).map((e, i) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 data-row transition-all"
                style={{ opacity: i === 0 ? 1 : 1 - i * 0.045 }}>
                <span className="text-[11px] mt-0.5 shrink-0" style={{ color: e.color }}>{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono" style={{ color: 'rgba(232,232,255,0.85)' }}>{e.message}</p>
                  {e.detail && <p className="text-[9px] font-mono" style={{ color: 'rgba(232,232,255,0.35)' }}>{e.detail}</p>}
                </div>
                <p className="text-[8px] font-mono shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {new Date(e.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            ))}
            {events.length === 0 && (
              <div className="p-8 flex items-center justify-center text-dc-muted text-xs animate-pulse">
                Sinyal bekleniyor…
              </div>
            )}
          </div>
        </div>

        {/* Active alerts (4 cols) */}
        <div className="col-span-4 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              {critCount > 0 && (
                <div className="relative">
                  <span className="w-1.5 h-1.5 rounded-full bg-dc-error block" />
                  <span className="absolute inset-0 rounded-full bg-dc-error animate-status-ping" />
                </div>
              )}
              <p className="os-title">AKTİF SİNYALLER</p>
            </div>
            <Link to="/moderation-war-room" className="text-[9px] font-bold font-mono tracking-widest"
              style={{ color: '#FF8C00', opacity: 0.6 }}>
              WAR ROOM →
            </Link>
          </div>
          <div className="divide-y overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.03)', maxHeight: 340 }}>
            {/* Backend operational alerts — shown first when present */}
            {alerts.map((a, i) => {
              const dot = a.severity === 'critical' ? '#FF4A5E' : a.severity === 'high' ? '#FF8C00' : a.severity === 'medium' ? '#FFB800' : '#5A5A84';
              return (
                <div key={`alert-${i}`} className="flex items-start gap-3 px-4 py-3.5 data-row">
                  <div className="relative mt-1 shrink-0">
                    <span className="w-2 h-2 rounded-full block" style={{ background: dot }} />
                    {(a.severity === 'critical' || a.severity === 'high') && (
                      <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: dot }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[8px] font-bold tracking-widest font-mono" style={{ color: dot }}>
                        {a.severity.toUpperCase()}
                      </span>
                      <span className="text-dc-text text-xs font-semibold">{a.title}</span>
                    </div>
                    <p className="text-dc-muted text-[10px] truncate">{a.description}</p>
                  </div>
                </div>
              );
            })}
            {/* Collective intelligence signals — always rendered */}
            {(() => {
              const lucidR    = health?.lucidRatio    ?? 0;
              const nightR    = health?.nightmareRatio ?? 0;
              const topSymbol = collective?.sharedSymbols?.find(s => s.symbol);
              const sigs = [
                topSymbol && {
                  icon: '✦', color: '#FFB800',
                  title: `Baskın Sembol: "${topSymbol.symbol}"`,
                  detail: `${topSymbol.dreamCount} rüyada görüldü · %${topSymbol.pct.toFixed(1)}`,
                },
                {
                  icon: '◎', color: '#00CFFF',
                  title: `Rezonans: ${collective?.coherenceLevel ?? 'RESONANT'}`,
                  detail: `${resonanceScore}% uyum · ${(collective?.resonanceCount ?? 0).toLocaleString('tr-TR')} bağlantı`,
                },
                {
                  icon: '◈', color: '#CC80FF',
                  title: `Lucid Aktivite: %${lucidR.toFixed(1)}`,
                  detail: lucidR >= 15 ? 'Yüksek lucid oran — bilinç yükseliyor'
                        : lucidR >= 8  ? 'Normal lucid frekansı — platform stabil'
                        :               'Düşük lucid oran — derin uyku döngüsü',
                },
                (emotionMap?.dominantEmotion || collective?.collectiveEmotion) && {
                  icon: '◉', color: '#38D68A',
                  title: `Kolektif Duygu: ${(domEmotion).toUpperCase()}`,
                  detail: `Pozitivite ${(health?.positivityIndex ?? 0).toFixed(0)}% · Anksiyete ${(health?.anxietyIndex ?? 0).toFixed(0)}%`,
                },
                nightR > 20 && {
                  icon: '◉', color: nightR > 35 ? '#FF4A5E' : '#FF8C00',
                  title: `Kabus Aktivitesi: %${nightR.toFixed(1)}`,
                  detail: nightR > 35 ? 'Yüksek kabus yoğunluğu — gölge materyali işleniyor' : 'Kabus oranı izlemede',
                },
              ].filter(Boolean) as { icon: string; color: string; title: string; detail: string }[];

              return sigs.map((s, i) => (
                <div key={`sig-${i}`} className="flex items-start gap-3 px-4 py-3.5 data-row">
                  <span className="text-[11px] mt-0.5 shrink-0" style={{ color: s.color }}>{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono font-semibold" style={{ color: 'rgba(232,232,255,0.85)' }}>{s.title}</p>
                    <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(232,232,255,0.35)' }}>{s.detail}</p>
                  </div>
                  <div className="relative mt-0.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full block" style={{ background: s.color }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Community pulse (3 cols) */}
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header">
            <p className="os-title">COMMUNITY PULSE</p>
          </div>
          <div className="p-5">
            {health ? (
              <div className="space-y-3">
                {[
                  { label: 'POZITIVITE',  value: health.positivityIndex, color: '#38D68A' },
                  { label: 'MOD SKORU',   value: health.moodScore,       color: '#FFB800' },
                  { label: 'ANKSİYETE',   value: health.anxietyIndex,    color: '#FF4A5E' },
                  { label: 'LUCID ORAN',  value: health.lucidRatio,      color: '#CC80FF' },
                  { label: 'KABUS ORANI', value: health.nightmareRatio,  color: '#FF8C00' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="os-label">{label}</span>
                      <span className="font-mono font-bold text-[11px]" style={{ color }}>{value.toFixed(1)}%</span>
                    </div>
                    <div className="signal-bar" style={{ height: 4 }}>
                      <div className="signal-bar-fill" style={{
                        width: `${value}%`,
                        background: `linear-gradient(90deg, ${color}40, ${color})`,
                        boxShadow: `0 0 5px ${color}60`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-dc-muted text-xs animate-pulse">
                Yükleniyor…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECONDARY: Activity + Moderation + AI Operators ───────────── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Live activity */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">PLATFORM AKTİVİTESİ</p>
            <Link to="/live-activity" className="text-[9px] font-bold font-mono tracking-widest text-dc-primary">
              FEED →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)', maxHeight: 260, overflowY: 'auto' }}>
            {actEvents.slice(0, 10).map((e, i) => {
              const cfg = e.type === 'dream_created'
                ? { icon: '◈', color: '#CC80FF' }
                : e.type === 'login'
                ? { icon: '◉', color: '#00CFFF' }
                : { icon: '◎', color: '#38D68A' };
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 data-row">
                  <span className="text-[11px] shrink-0" style={{ color: cfg.color }}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-dc-text text-[11px] font-semibold truncate">@{e.username}</p>
                    <p className="text-dc-muted text-[9px]">{e.detail}</p>
                  </div>
                  <p className="os-label shrink-0">
                    {new Date(e.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              );
            })}
            {actEvents.length === 0 && (
              <div className="p-6 text-center text-dc-muted text-xs animate-pulse">Bekleniyor…</div>
            )}
          </div>
        </div>

        {/* Moderation */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">MODERASYON</p>
            <Link to="/moderation-war-room" className="text-[9px] font-bold font-mono tracking-widest"
              style={{ color: '#FF8C00' }}>
              WAR ROOM →
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {mod ? (
              <>
                {(() => {
                  const safetyScore = Math.max(0, Math.round(
                    100 - (data?.reportedCount ?? 0) * 5 - (health?.nightmareRatio ?? 0) * 0.2,
                  ));
                  const safetyColor = safetyScore >= 80 ? '#38D68A' : safetyScore >= 50 ? '#FFB800' : '#FF4A5E';
                  return (
                    <>
                      <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <div>
                          <span className="os-label block">GÜVENLİK SKORU</span>
                          <div className="signal-bar mt-1.5" style={{ height: 3, width: 80 }}>
                            <div className="signal-bar-fill" style={{
                              width: `${safetyScore}%`,
                              background: `linear-gradient(90deg, ${safetyColor}40, ${safetyColor})`,
                            }} />
                          </div>
                        </div>
                        <span className="font-mono font-black text-lg" style={{ color: safetyColor }}>{safetyScore}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <span className="os-label">BUGÜN TARANDΙ</span>
                        <span className="font-mono font-black text-lg" style={{ color: '#7B6FFF' }}>{data?.dreamsToday ?? 0}</span>
                      </div>
                    </>
                  );
                })()}
                {[
                  { label: 'BEKLEYEN', value: mod.pendingReports,  color: (mod.pendingReports ?? 0) > 10 ? '#FF4A5E' : '#E8E8FF' },
                  { label: 'ÇÖZÜLDÜ',  value: mod.resolvedToday,   color: '#38D68A' },
                  { label: 'GİZLİ',    value: mod.hiddenContent,   color: '#FF8C00' },
                  { label: 'BANLANDI', value: mod.totalBanned,     color: (mod.totalBanned ?? 0) > 0 ? '#FF4A5E' : '#5A5A84' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="os-label">{label}</span>
                    <span className="font-mono font-black text-lg" style={{ color }}>{value}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-dc-muted text-xs animate-pulse">Yükleniyor…</div>
            )}
          </div>
        </div>

        {/* AI Operators */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">AI OPERATÖRLER</p>
            <Link to="/operators" className="text-[9px] font-bold font-mono tracking-widest text-os-cyan">
              FULL VIEW →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)', maxHeight: 260, overflowY: 'auto' }}>
            {(opData?.operators ?? []).slice(0, 7).map(op => {
              const sc = op.status === 'active' ? '#38D68A' : op.status === 'processing' ? '#FFB800' : op.status === 'error' ? '#FF4A5E' : '#3E3E62';
              const relTime = (() => {
                if (!op.lastExecution) return null;
                const diff = Date.now() - new Date(op.lastExecution).getTime();
                const mins = Math.floor(diff / 60_000);
                const hrs  = Math.floor(mins / 60);
                return hrs > 0 ? `${hrs}sa önce` : mins > 0 ? `${mins}dk önce` : 'az önce';
              })();
              return (
                <div key={op.id} className="flex items-center gap-3 px-4 py-3 data-row">
                  <span className="text-base shrink-0">{op.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-dc-text text-[11px] font-semibold truncate">{op.name}</p>
                      <span className="text-[8px] font-mono font-bold px-1 rounded shrink-0"
                        style={{ background: 'rgba(123,111,255,0.15)', color: '#7B6FFF' }}>
                        {op.confidenceScore}%
                      </span>
                    </div>
                    {op.findings?.[0] && (
                      <p className="text-[9px] font-mono truncate mt-0.5" style={{ color: 'rgba(232,232,255,0.38)' }}>
                        {op.findings[0]}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 signal-bar" style={{ height: 3 }}>
                        <div className="signal-bar-fill" style={{
                          width: `${op.health}%`,
                          background: `linear-gradient(90deg, ${sc}40, ${sc})`,
                        }} />
                      </div>
                      <span className="font-mono text-[9px]" style={{ color: sc }}>{op.health}%</span>
                    </div>
                    {relTime && (
                      <p className="text-[8px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{relTime}</p>
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full block" style={{ background: sc }} />
                    {op.status === 'active' && (
                      <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: sc }} />
                    )}
                  </div>
                </div>
              );
            })}
            {(opData?.operators ?? []).length === 0 && (
              <div className="p-6 text-center text-dc-muted text-xs animate-pulse">Yükleniyor…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
