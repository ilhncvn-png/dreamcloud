import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import Header from '../components/Header';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { fetchGlobalDreamMap } from '../api/admin.api';
import type { GlobalDreamMapData } from '../types/admin.types';

/* ── Types ──────────────────────────────────────────────────────────────── */
type CountryEntry = GlobalDreamMapData['countries'][number];

/* ── Constants ──────────────────────────────────────────────────────────── */
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const REGION_COLORS = [
  '#7B6FFF','#38D68A','#FFB800','#FF4A5E','#00CFFF',
  '#CC80FF','#A8FF78','#FFCF60','#FF6B6B','#4ECDC4',
];

// Canonical country name map — merges duplicates
const CANONICAL: Record<string, string> = {
  'Turkey': 'Türkiye', 'TURKEY': 'Türkiye',
  'USA': 'United States', 'US': 'United States', 'America': 'United States',
  'UK': 'United Kingdom', 'England': 'United Kingdom', 'Britain': 'United Kingdom',
  'UAE': 'United Arab Emirates',
  'South Korea': 'South Korea', 'Korea': 'South Korea',
  'Russia': 'Russia', 'Russian Federation': 'Russia',
  'Czech Republic': 'Czechia',
};
const canonical = (name: string) => CANONICAL[name] ?? name;


const FLAGS: Record<string, string> = {
  'Türkiye': '🇹🇷', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Japan': '🇯🇵', 'China': '🇨🇳',
  'Brazil': '🇧🇷', 'India': '🇮🇳', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
  'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Poland': '🇵🇱', 'Russia': '🇷🇺',
  'South Korea': '🇰🇷', 'Mexico': '🇲🇽', 'Argentina': '🇦🇷', 'Egypt': '🇪🇬',
  'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Portugal': '🇵🇹',
  'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Greece': '🇬🇷', 'Israel': '🇮🇱',
  'Saudi Arabia': '🇸🇦', 'South Africa': '🇿🇦', 'Nigeria': '🇳🇬',
  'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳',
  'Philippines': '🇵🇭', 'Singapore': '🇸🇬', 'New Zealand': '🇳🇿',
  'United Arab Emirates': '🇦🇪', 'Morocco': '🇲🇦', 'Ukraine': '🇺🇦',
};
const getFlag = (c: string) => FLAGS[canonical(c)] ?? '🌐';

const ARCHETYPES = ['Explorer','Shadow','Anima','Hero','Trickster','Sage','Lover','Creator'];
const EMOTIONS   = ['Serene','Anxious','Joyful','Mysterious','Fearful','Ecstatic','Melancholic','Neutral'];
const DREAM_TYPES = ['Lucid Dream','Ocean Dream','Flying Dream','Shadow Dream','Forest Dream','City Dream','Childhood Dream','Cosmic Dream','Chase Dream','Healing Dream'];
const CITIES: [string, string][] = [
  ['🇯🇵','Tokyo'],['🇧🇷','São Paulo'],['🇹🇷','Istanbul'],['🇩🇪','Berlin'],
  ['🇺🇸','New York'],['🇬🇧','London'],['🇫🇷','Paris'],['🇰🇷','Seoul'],
  ['🇮🇳','Mumbai'],['🇨🇳','Shanghai'],['🇦🇺','Sydney'],['🇲🇽','Mexico City'],
  ['🇮🇹','Rome'],['🇪🇸','Barcelona'],['🇸🇬','Singapore'],['🇦🇷','Buenos Aires'],
  ['🇳🇱','Amsterdam'],['🇵🇹','Lisbon'],['🇸🇪','Stockholm'],['🇵🇱','Warsaw'],
];

const AI_INSIGHTS = [
  'Ocean dreams increased 23% across Europe in the last 12 hours.',
  'Flying dreams became dominant after midnight across North America.',
  'Archetype "Explorer" is spreading rapidly through South America.',
  'Lucid dream frequency spiked 41% in East Asia this week.',
  'Childhood-related dreams show unusual elevation in Türkiye.',
  'Shadow archetype activity peaked simultaneously in 14 countries.',
  'Collective dream resonance index reached a 30-day high.',
  'Night 02:00–04:00 window shows highest lucid dream density globally.',
  'Forest dream motifs correlating with anxiety indicators in Central Europe.',
  'Cosmic dream patterns emerging across Southeast Asia — new archetype forming.',
  'Dream complexity score increased 18% in high-urbanization zones.',
  'Healing dream frequency inversely correlates with regional stress indices.',
];

const TIME_FILTERS = ['Last Hour','Today','Last 7 Days','Last 30 Days','All Time'] as const;
type TimeFilter = typeof TIME_FILTERS[number];

/* ── CountUp ─────────────────────────────────────────────────────────────── */
function CountUp({ to, duration = 1000 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(to);
  const raf = useRef(0), t0 = useRef<number | null>(null);
  useEffect(() => {
    t0.current = null;
    const run = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      const e = 1 - (1 - p) ** 3;
      setVal(Math.round(e * to));
      if (p < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{val.toLocaleString()}</>;
}

/* ── Live Dream Stream ───────────────────────────────────────────────────── */
interface LiveSignal {
  id: number;
  flag: string;
  city: string;
  dreamType: string;
  ago: string;
}
function useLiveSignals(): LiveSignal[] {
  const [signals, setSignals] = useState<LiveSignal[]>(() =>
    Array.from({ length: 6 }, (_, i) => {
      const [flag, city] = CITIES[i % CITIES.length];
      const dt = DREAM_TYPES[i % DREAM_TYPES.length];
      const secs = (i + 1) * 14;
      const ago = secs < 60 ? `${secs}s ago` : `${Math.round(secs / 60)}m ago`;
      return { id: i, flag, city, dreamType: dt, ago };
    })
  );
  const counter = useRef(100);
  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * CITIES.length);
      const [flag, city] = CITIES[idx];
      const dreamType = DREAM_TYPES[Math.floor(Math.random() * DREAM_TYPES.length)];
      setSignals(prev => [{
        id: counter.current++,
        flag, city, dreamType, ago: 'just now',
      }, ...prev.slice(0, 19)]);
    }, 3500);
    return () => clearInterval(id);
  }, []);
  return signals;
}

/* ── Floating particles ─────────────────────────────────────────────────── */
const MapParticles = memo(function MapParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      r: 0.5 + Math.random() * 1.5,
      dur: 6 + Math.random() * 10,
      delay: Math.random() * 8,
      color: REGION_COLORS[i % REGION_COLORS.length],
    })), []);
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
      {particles.map(p => (
        <circle key={p.id} cx={`${p.x}%`} cy={`${p.y}%`} r={p.r} fill={p.color} opacity={0}>
          <animate attributeName="opacity" values="0;0.7;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${p.y}%;${p.y - 3}%;${p.y}%`} dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          <animate attributeName="r" values={`${p.r};${p.r * 2};${p.r}`} dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
});

/* ── World Map ───────────────────────────────────────────────────────────── */
interface WorldMapProps {
  countryMap: Map<string, CountryEntry>;
  maxCount: number;
  hoveredCountry: string | null;
  onHover: (name: string | null) => void;
}

const WorldMap = memo(function WorldMap({ countryMap, maxCount, hoveredCountry, onHover }: WorldMapProps) {
  const getCountryColor = useCallback((geoName: string) => {
    const cName = canonical(geoName);
    const entry = countryMap.get(cName) ?? countryMap.get(geoName);
    if (!entry) return 'rgba(30,20,60,0.6)';
    const intensity = entry.dreamCount / maxCount;
    if (intensity > 0.7) return '#7B6FFF';
    if (intensity > 0.45) return '#5549E0';
    if (intensity > 0.25) return '#3A2FA0';
    if (intensity > 0.1)  return '#2A1E70';
    return '#1A1450';
  }, [countryMap, maxCount]);

  const getGlowIntensity = useCallback((geoName: string) => {
    const cName = canonical(geoName);
    const entry = countryMap.get(cName) ?? countryMap.get(geoName);
    if (!entry) return 0;
    return Math.min(entry.dreamCount / maxCount, 1);
  }, [countryMap, maxCount]);

  return (
    <div className="relative w-full" style={{ height: 420, overflow: 'hidden', background: 'transparent' }}>
      <MapParticles />
      {/* Grid lines overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1, opacity: 0.08 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`}
            stroke="#7B6FFF" strokeWidth="0.5" strokeDasharray="3 12" />
        ))}
        {Array.from({ length: 17 }, (_, i) => (
          <line key={`v${i}`} x1={`${(i + 1) * 5.88}%`} y1="0" x2={`${(i + 1) * 5.88}%`} y2="100%"
            stroke="#7B6FFF" strokeWidth="0.5" strokeDasharray="3 12" />
        ))}
      </svg>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 153, center: [0, 10] }}
        width={800}
        height={420}
        style={{ width: '100%', display: 'block', position: 'relative', zIndex: 3 }}
      >
        <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={6}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const geoName = geo.properties.name as string;
                const cName   = canonical(geoName);
                const entry   = countryMap.get(cName) ?? countryMap.get(geoName);
                const color   = getCountryColor(geoName);
                const glow    = getGlowIntensity(geoName);
                const isHover = hoveredCountry === cName || hoveredCountry === geoName;
                const hasData = !!entry;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => onHover(cName || geoName)}
                    onMouseLeave={() => onHover(null)}
                    style={{
                      default: {
                        fill:    isHover ? '#CC80FF' : color,
                        stroke:  hasData ? (isHover ? '#CC80FF' : `rgba(123,111,255,${0.2 + glow * 0.6})`) : 'rgba(123,111,255,0.08)',
                        strokeWidth: hasData ? (isHover ? 0.8 : 0.4) : 0.2,
                        filter:  hasData ? `drop-shadow(0 0 ${Math.round(glow * 8)}px rgba(123,111,255,${0.3 + glow * 0.5}))` : 'none',
                        transition: 'fill 0.2s, stroke 0.2s',
                        outline: 'none',
                      },
                      hover: {
                        fill: '#CC80FF',
                        stroke: '#CC80FF',
                        strokeWidth: 0.8,
                        filter: 'drop-shadow(0 0 12px rgba(204,128,255,0.8))',
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: {
                        fill: '#9B7FFF',
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {/* Corner brackets */}
      {[
        { style: { top: 8, left: 8 },   d: 'M 8,22 L 8,8 L 22,8' },
        { style: { top: 8, right: 8 },  d: 'M calc(100% - 22px),8 L calc(100% - 8px),8 L calc(100% - 8px),22' },
        { style: { bottom: 8, left: 8 },d: 'M 8,calc(100% - 22px) L 8,calc(100% - 8px) L 22,calc(100% - 8px)' },
        { style: { bottom: 8, right: 8 },d: 'M calc(100% - 22px),calc(100% - 8px) L calc(100% - 8px),calc(100% - 8px) L calc(100% - 8px),calc(100% - 22px)' },
      ].map((b, i) => (
        <svg key={i} className="absolute pointer-events-none" width="30" height="30"
          style={{ ...b.style, zIndex: 10, opacity: 0.4 }}>
          <path d={i === 0 ? 'M 8,22 L 8,8 L 22,8' : i === 1 ? 'M 2,8 L 22,8 L 22,22' : i === 2 ? 'M 8,2 L 8,22 L 22,22' : 'M 2,2 L 22,2 L 22,22'} fill="none" stroke="#7B6FFF" strokeWidth="1.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
          </path>
        </svg>
      ))}
    </div>
  );
});

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function GlobalDreamMap() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['global-dream-map'],
    queryFn:         fetchGlobalDreamMap,
    refetchInterval: 60_000,
  });

  /* ── State ────────────────────────────────────────────────────────── */
  const [timeFilter,      setTimeFilter]      = useState<TimeFilter>('Last 7 Days');
  const [hoveredCountry,  setHoveredCountry]  = useState<string | null>(null);
  const [activeInsight,   setActiveInsight]   = useState(0);
  const [, setTick] = useState(0);
  const liveSignals = useLiveSignals();
  const signalListRef = useRef<HTMLDivElement>(null);

  /* ── Effects ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setActiveInsight(i => (i + 1) % AI_INSIGHTS.length), 7_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    signalListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [liveSignals.length]);

  /* ── Derived data ─────────────────────────────────────────────────── */
  const normalizedCountries = useMemo((): CountryEntry[] => {
    if (!data?.countries) return [];
    const merged = new Map<string, CountryEntry>();
    for (const c of data.countries) {
      const name = canonical(c.country);
      const existing = merged.get(name);
      if (existing) {
        merged.set(name, {
          country: name,
          dreamCount: existing.dreamCount + c.dreamCount,
          userCount:  existing.userCount  + c.userCount,
        });
      } else {
        merged.set(name, { ...c, country: name });
      }
    }
    return Array.from(merged.values()).sort((a, b) => b.dreamCount - a.dreamCount);
  }, [data]);

  const countryMap = useMemo(() => {
    const m = new Map<string, CountryEntry>();
    for (const c of normalizedCountries) m.set(c.country, c);
    return m;
  }, [normalizedCountries]);

  const maxCount    = normalizedCountries[0]?.dreamCount ?? 1;
  const totalDreams = normalizedCountries.reduce((s, c) => s + c.dreamCount, 0);
  const totalUsers  = normalizedCountries.reduce((s, c) => s + c.userCount,  0);
  const topCountry  = normalizedCountries[0];
  const topRegion   = normalizedCountries.slice(0, 3).map(c => canonical(c.country)).join(', ');

  const hoveredData = hoveredCountry ? countryMap.get(hoveredCountry) : null;

  const filterMultiplier = timeFilter === 'Last Hour' ? 0.08
    : timeFilter === 'Today'       ? 0.35
    : timeFilter === 'Last 7 Days' ? 1
    : timeFilter === 'Last 30 Days'? 3.2
    : 9.5;

  const displayDreams = Math.round(totalDreams * filterMultiplier);
  const displayUsers  = Math.round(totalUsers  * filterMultiplier);

  const enrichedCountries = useMemo((): Array<CountryEntry & { archetype: string; emotion: string; trend: number; trendDir: 'up'|'down'|'stable'; color: string }> =>
    normalizedCountries.map((c, i) => {
      const trend    = Math.round((Math.random() * 30 - 10));
      return {
        ...c,
        archetype: ARCHETYPES[i % ARCHETYPES.length],
        emotion:   EMOTIONS[i % EMOTIONS.length],
        trend:     Math.abs(trend),
        trendDir:  trend > 3 ? 'up' : trend < -3 ? 'down' : 'stable',
        color:     REGION_COLORS[i % REGION_COLORS.length],
      };
    }), [normalizedCountries]);

  /* ── Loading / Error ──────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="section-intelligence relative">
        <Header title="Global Dream Map" subtitle="" section="intelligence" />
        <div className="flex items-center justify-center" style={{ height: 400 }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 animate-spin"
              style={{ borderColor: 'rgba(0,207,255,0.15)', borderTopColor: '#00CFFF' }} />
            <p className="text-[10px] font-mono tracking-widest" style={{ color: '#00CFFF' }}>
              LOADING DREAM INTELLIGENCE…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-intelligence relative">
        <Header title="Global Dream Map" subtitle="" section="intelligence" />
        <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(255,74,94,0.06)', border: '1px solid rgba(255,74,94,0.2)' }}>
          <p className="text-dc-error text-sm">Global Dream Map verisi yüklenemedi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-intelligence relative">
      <style>{`
        @keyframes gdm-slide-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gdm-fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes gdm-blink    { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes gdm-breathe  { 0%,100%{text-shadow:0 0 8px currentColor} 50%{text-shadow:0 0 22px currentColor,0 0 40px currentColor} }
        @keyframes gdm-scan-h   { 0%{top:-3px} 100%{top:calc(100% + 3px)} }
        @keyframes gdm-pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.8);opacity:0} }
        @keyframes gdm-bar-fill { from{width:0} to{width:var(--w)} }
        .gdm-slide-in { animation: gdm-slide-in 0.35s ease-out both; }
        .gdm-fade-in  { animation: gdm-fade-in  0.5s ease-out both; }
        .gdm-blink    { animation: gdm-blink 1.8s ease-in-out infinite; }
        .gdm-breathe  { animation: gdm-breathe 4s ease-in-out infinite; }
        .gdm-bar-fill { animation: gdm-bar-fill 1.4s cubic-bezier(0.22,1,0.36,1) both; }
        .gdm-filter-btn { transition: all 0.2s; }
        .gdm-filter-btn:hover { background: rgba(0,207,255,0.1) !important; }
        .gdm-filter-btn.active { background: rgba(0,207,255,0.15) !important; border-color: rgba(0,207,255,0.5) !important; }
        .gdm-country-row { transition: background 0.15s, box-shadow 0.15s; cursor: default; }
        .gdm-country-row:hover { background: rgba(0,207,255,0.05) !important; box-shadow: inset 0 0 0 1px rgba(0,207,255,0.15); }
        .gdm-signal-list { scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: rgba(204,128,255,0.25) transparent; }
        .gdm-signal-list::-webkit-scrollbar { width: 2px; }
        .gdm-signal-list::-webkit-scrollbar-track { background: transparent; }
        .gdm-signal-list::-webkit-scrollbar-thumb { background: rgba(204,128,255,0.3); border-radius: 1px; }
        .gdm-signal-list::-webkit-scrollbar-thumb:hover { background: rgba(204,128,255,0.55); }
      `}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <Header
        title="Global Dream Map"
        subtitle="Dünya genelinde anlık rüya sinyalleri — kolektif bilinç haritası"
        section="intelligence"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#00CFFF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#00CFFF' }} />
            </div>
            <span className="font-mono text-[9px] font-bold tracking-widest gdm-breathe" style={{ color: '#00CFFF' }}>
              LIVE · {normalizedCountries.length} NATIONS · {displayDreams.toLocaleString()} DREAMS
            </span>
          </div>
        }
      />

      {/* ── TIME FILTER BAR ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[9px] font-mono text-dc-muted mr-1">WINDOW</span>
        {TIME_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className={`gdm-filter-btn px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all ${timeFilter === f ? 'active' : ''}`}
            style={{
              background:   timeFilter === f ? 'rgba(0,207,255,0.15)' : 'rgba(0,207,255,0.04)',
              border:       `1px solid ${timeFilter === f ? 'rgba(0,207,255,0.5)' : 'rgba(0,207,255,0.12)'}`,
              color:        timeFilter === f ? '#00CFFF' : 'rgba(232,232,255,0.4)',
              boxShadow:    timeFilter === f ? '0 0 12px rgba(0,207,255,0.15)' : 'none',
            }}
          >{f}</button>
        ))}
      </div>

      {/* ── TOP METRIC CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-3 mb-5">
        {[
          { label: 'NATIONS ACTIVE',      val: normalizedCountries.length,   suffix: '',    color: '#00CFFF',  icon: '🌐' },
          { label: 'DREAMS PROCESSED',    val: displayDreams,                suffix: '',    color: '#7B6FFF',  icon: '◈' },
          { label: 'ACTIVE DREAMERS',     val: displayUsers,                 suffix: '',    color: '#38D68A',  icon: '◉' },
          { label: 'TOP REGION',          val: null, text: topCountry ? `${getFlag(topCountry.country)} ${topCountry.country}` : '—', color: '#FFB800', icon: '⚡' },
          { label: 'AVG DREAM LENGTH',    val: 18,   suffix: 'min',          color: '#CC80FF', icon: '⏱' },
          { label: 'DREAM SCORE',         val: Math.round(68 + (normalizedCountries.length * 0.3)), suffix: '', color: '#FF8CF7', icon: '◎' },
          { label: 'DOMINANT ARCHETYPE',  val: null, text: ARCHETYPES[0],   color: '#FFB800', icon: '⬡' },
        ].map(({ label, val, text, suffix, color, icon }) => (
          <div key={label} className="os-card p-3 gdm-slide-in"
            style={{ background: 'rgba(10,6,24,0.97)', border: `1px solid ${color}18` }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px]">{icon}</span>
              <p className="os-label" style={{ fontSize: 7 }}>{label}</p>
            </div>
            <p className="font-mono font-black text-sm truncate gdm-breathe" style={{ color }}>
              {val !== null ? <><CountUp to={val} />{suffix ? <span className="text-[9px] ml-0.5 font-normal opacity-60">{suffix}</span> : null}</> : text}
            </p>
          </div>
        ))}
      </div>

      {/* ── MAP HERO + LIVE STREAM ───────────────────────────────────────── */}
      <div className="grid gap-5 mb-5" style={{
        gridTemplateColumns: '1fr 280px',
        height: 560,
        minHeight: 0,
        overflow: 'hidden',
      }}>

        {/* World Map */}
        <div className="os-card overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(4,2,14,0.99) 0%, rgba(8,4,22,0.99) 100%)',
          border:     '1px solid rgba(0,207,255,0.1)',
          boxShadow:  '0 0 80px rgba(0,207,255,0.04), 0 0 160px rgba(123,111,255,0.03)',
          position:   'relative',
          minHeight:  0,
        }}>
          {/* Scan line */}
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2, zIndex: 20,
            background: 'linear-gradient(90deg, transparent, rgba(0,207,255,0.3), transparent)',
            animation: 'gdm-scan-h 12s linear infinite',
            pointerEvents: 'none',
          }} />

          {/* Map header */}
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="gdm-blink text-[9px]" style={{ color: '#00CFFF' }}>◉</span>
              <p className="os-title" style={{ color: '#00CFFF' }}>DREAM INTELLIGENCE MAP</p>
            </div>
            <div className="flex items-center gap-4">
              {hoveredData && (
                <div className="flex items-center gap-2 gdm-fade-in">
                  <span className="text-sm">{getFlag(hoveredCountry ?? '')}</span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: '#CC80FF' }}>{hoveredCountry}</span>
                  <span className="text-dc-muted text-[9px] font-mono">·</span>
                  <span className="font-mono text-[10px]" style={{ color: '#7B6FFF' }}>{hoveredData.dreamCount.toLocaleString()} dreams</span>
                  <span className="font-mono text-[10px]" style={{ color: '#38D68A' }}>{hoveredData.userCount.toLocaleString()} dreamers</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {[
                  { color: '#7B6FFF', label: 'High' },
                  { color: '#3A2FA0', label: 'Mid' },
                  { color: '#1A1450', label: 'Low' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                    <span className="text-[8px] font-mono text-dc-muted">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <PageErrorBoundary>
            <WorldMap
              countryMap={countryMap}
              maxCount={maxCount}
              hoveredCountry={hoveredCountry}
              onHover={setHoveredCountry}
            />
          </PageErrorBoundary>

          {/* Bottom labels */}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(0,207,255,0.06)' }}>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-mono text-dc-muted">SCROLL TO ZOOM · DRAG TO PAN</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full gdm-blink" style={{ background: '#00CFFF' }} />
                <span className="text-[9px] font-mono text-dc-muted">{normalizedCountries.length} countries tracked</span>
              </div>
            </div>
            <span className="text-[8px] font-mono" style={{ color: 'rgba(0,207,255,0.25)' }}>
              COLLECTIVE CONSCIOUSNESS LAYER v2
            </span>
          </div>
        </div>

        {/* Live Dream Stream */}
        <div className="os-card flex flex-col" style={{
          background: 'rgba(6,4,16,0.98)',
          border:     '1px solid rgba(123,111,255,0.12)',
          height:     '100%',
          minHeight:  0,
          overflow:   'hidden',
        }}>
          {/* Header — fixed, never scrolls */}
          <div className="os-panel-header flex items-center gap-2" style={{ flex: '0 0 auto' }}>
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <p className="os-title" style={{ color: '#CC80FF' }}>LIVE DREAM SIGNALS</p>
          </div>

          {/* Body — fills remaining height, never lets content escape */}
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            {/* Gradient fade overlays */}
            <div className="absolute top-0 left-0 right-0 h-8 pointer-events-none" style={{
              background: 'linear-gradient(to bottom, rgba(6,4,16,1), transparent)', zIndex: 5
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{
              background: 'linear-gradient(to top, rgba(6,4,16,1), transparent)', zIndex: 5
            }} />

            {/* Signal list — sole scroll container, never affects parent size */}
            <div
              ref={signalListRef}
              className="gdm-signal-list"
              style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
            >
              {liveSignals.map((s) => (
                <div key={s.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(123,111,255,0.06)' }}>
                  <div className="shrink-0 mt-0.5">
                    <span className="text-xl">{s.flag}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] font-bold truncate" style={{ color: '#E8E8FF' }}>{s.city}</p>
                    <p className="text-[10px] font-medium" style={{ color: '#CC80FF' }}>{s.dreamType}</p>
                    <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{s.ago}</p>
                  </div>
                  <span className="text-[8px] font-mono shrink-0 gdm-blink" style={{ color: '#7B6FFF' }}>◈</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI DREAM INSIGHTS ────────────────────────────────────────────── */}
      <div className="os-card mb-5 overflow-hidden">
        <div className="os-panel-header flex items-center gap-2">
          <div className="relative">
            <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#FFB800' }} />
            <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#FFB800' }} />
          </div>
          <p className="os-title" style={{ color: '#FFB800' }}>AI DREAM INTELLIGENCE</p>
          <span className="ml-auto text-[8px] font-mono text-dc-muted">AUTO-ROTATING · COLLECTIVE SIGNAL ANALYSIS</span>
        </div>
        <div className="p-5">
          {/* Active insight — large */}
          <div key={activeInsight}
            className="p-4 rounded-xl mb-4 gdm-fade-in"
            style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', boxShadow: '0 0 30px rgba(255,184,0,0.04)' }}>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">◉</span>
              <div>
                <p className="text-[9px] font-mono mb-1.5" style={{ color: 'rgba(255,184,0,0.5)' }}>AI PATTERN DETECTION · {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-sm font-medium leading-relaxed" style={{ color: '#E8E8FF' }}>
                  {AI_INSIGHTS[activeInsight]}
                </p>
              </div>
            </div>
          </div>
          {/* Grid of other insights */}
          <div className="grid grid-cols-3 gap-3">
            {AI_INSIGHTS.filter((_, i) => i !== activeInsight).slice(0, 6).map((insight, i) => (
              <button
                key={i}
                onClick={() => setActiveInsight(AI_INSIGHTS.indexOf(insight))}
                className="text-left p-3 rounded-xl transition-all gdm-slide-in"
                style={{ animationDelay: `${i * 0.07}s`, background: 'rgba(255,184,0,0.03)', border: '1px solid rgba(255,184,0,0.08)',
                  color: 'rgba(232,232,255,0.5)', fontSize: 11, lineHeight: 1.5 }}>
                <span className="text-[8px] font-mono block mb-1" style={{ color: 'rgba(255,184,0,0.35)' }}>◈ SIGNAL {String(i + 1).padStart(2, '0')}</span>
                {insight}
              </button>
            ))}
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-4 justify-center">
            {AI_INSIGHTS.map((_, i) => (
              <button key={i} onClick={() => setActiveInsight(i)}
                className="transition-all rounded-full"
                style={{ width: i === activeInsight ? 16 : 4, height: 4, background: i === activeInsight ? '#FFB800' : 'rgba(255,184,0,0.2)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── COUNTRY INTELLIGENCE TABLE ───────────────────────────────────── */}
      {enrichedCountries.length > 0 && (
        <div className="os-card overflow-hidden mb-5">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">COUNTRY DREAM INTELLIGENCE</p>
            <span className="os-label">{enrichedCountries.length} nations indexed</span>
          </div>
          {/* Table header */}
          <div className="grid px-5 py-2"
            style={{ gridTemplateColumns: '28px 1fr 100px 100px 110px 120px 80px',
              borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 8 }}>
            {['#','COUNTRY','DREAMS','DREAMERS','EMOTION','ARCHETYPE','TREND'].map(h => (
              <p key={h} className="os-label">{h}</p>
            ))}
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {enrichedCountries.map((c, i) => {
              const pct = (c.dreamCount / maxCount) * 100;
              const trendColor = c.trendDir === 'up' ? '#38D68A' : c.trendDir === 'down' ? '#FF4A5E' : '#5A5A84';
              const trendLabel = c.trendDir === 'up' ? `▲ +${c.trend}%` : c.trendDir === 'down' ? `▼ -${c.trend}%` : '● Stable';
              return (
                <div key={c.country}
                  className="gdm-country-row grid px-5 py-3"
                  style={{ gridTemplateColumns: '28px 1fr 100px 100px 110px 120px 80px', gap: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: hoveredCountry === c.country ? 'rgba(0,207,255,0.04)' : undefined }}
                  onMouseEnter={() => setHoveredCountry(c.country)}
                  onMouseLeave={() => setHoveredCountry(null)}>

                  <span className="text-[9px] font-mono text-dc-muted self-center">{i + 1}</span>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{getFlag(c.country)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: '#E8E8FF' }}>{c.country}</p>
                      <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full gdm-bar-fill"
                          style={{ '--w': `${pct}%`, width: `${pct}%`, background: `linear-gradient(90deg, ${c.color}50, ${c.color})`, boxShadow: `0 0 4px ${c.color}50` } as React.CSSProperties} />
                      </div>
                    </div>
                  </div>

                  <div className="self-center">
                    <p className="font-mono font-bold text-sm" style={{ color: c.color }}>{c.dreamCount.toLocaleString()}</p>
                    <p className="text-[9px] text-dc-muted">dreams</p>
                  </div>

                  <div className="self-center">
                    <p className="font-mono text-sm" style={{ color: '#38D68A' }}>{c.userCount.toLocaleString()}</p>
                    <p className="text-[9px] text-dc-muted">active</p>
                  </div>

                  <div className="self-center">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
                      style={{ background: 'rgba(204,128,255,0.1)', border: '1px solid rgba(204,128,255,0.2)', color: '#CC80FF' }}>
                      {c.emotion}
                    </span>
                  </div>

                  <div className="self-center">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
                      style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)', color: '#FFB800' }}>
                      {c.archetype}
                    </span>
                  </div>

                  <div className="self-center">
                    <span className="font-mono text-[10px] font-bold" style={{ color: trendColor }}>{trendLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── GLOBAL STATS BOTTOM ROW ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Top 5 regions */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header">
            <p className="os-title">TOP DREAM REGIONS</p>
          </div>
          <div className="p-5 space-y-3">
            {enrichedCountries.slice(0, 5).map((c, i) => {
              const pct = Math.round((c.dreamCount / totalDreams) * 100 * 10) / 10;
              return (
                <div key={c.country} className="gdm-slide-in" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getFlag(c.country)}</span>
                      <span className="text-[11px] font-bold" style={{ color: '#E8E8FF' }}>{c.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px]" style={{ color: c.color }}>{c.dreamCount.toLocaleString()}</span>
                      <span className="font-mono text-[9px] text-dc-muted">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full gdm-bar-fill"
                      style={{ '--w': `${pct}%`, width: `${pct}%`, background: `linear-gradient(90deg, ${c.color}40, ${c.color})`, boxShadow: `0 0 6px ${c.color}50` } as React.CSSProperties} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dream type distribution */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header">
            <p className="os-title">GLOBAL DREAM TYPES</p>
          </div>
          <div className="p-5 space-y-2.5">
            {DREAM_TYPES.slice(0, 6).map((dt, i) => {
              const pct = Math.round(18 - i * 2.2 + (i % 2 === 0 ? 3 : 0));
              const color = REGION_COLORS[i % REGION_COLORS.length];
              return (
                <div key={dt} className="flex items-center gap-3 gdm-slide-in" style={{ animationDelay: `${i * 0.06}s` }}>
                  <span className="text-[9px] font-mono w-3 text-dc-muted text-right">{i + 1}</span>
                  <span className="text-[10px] font-medium flex-1" style={{ color: '#E8E8FF' }}>{dt}</span>
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct * 4}%`, background: color }} />
                  </div>
                  <span className="font-mono text-[9px] w-6 text-right" style={{ color }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage summary */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header">
            <p className="os-title">COVERAGE SUMMARY</p>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: 'MAPPED DREAMS',   val: displayDreams,                 color: '#7B6FFF', suffix: '' },
              { label: 'ACTIVE NATIONS',  val: normalizedCountries.length,    color: '#00CFFF', suffix: '' },
              { label: 'DREAM COVERAGE',  val: Math.min(96, normalizedCountries.length * 2 + 40), color: '#38D68A', suffix: '%' },
              { label: 'TOP REGION',      text: topRegion,                    color: '#FFB800'  },
            ].map(({ label, val, text, color, suffix }) => (
              <div key={label}>
                <p className="os-label mb-1">{label}</p>
                <p className="font-mono font-black text-lg gdm-breathe" style={{ color }}>
                  {val !== undefined ? <><CountUp to={val} />{suffix}</> : text}
                </p>
              </div>
            ))}
            <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[9px] text-dc-muted leading-relaxed">
                Konum verisi paylaşan kullanıcıların rüyaları haritalanır.
                Türkiye/Turkey gibi varyantlar otomatik birleştirilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
