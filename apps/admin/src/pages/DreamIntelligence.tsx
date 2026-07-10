import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDreamIntelligence,
  fetchCollectiveConsciousness,
  fetchEmotionMap,
  fetchCommunityHealth,
  fetchSymbolAnalysis,
  fetchArchetypeAnalysis,
  fetchAISignals,
} from '../api/admin.api';
import Header from '../components/Header';
import type { CoherenceLevel } from '../types/admin.types';

/* ── Palette helpers ────────────────────────────────────────────────────────── */

const COHERENCE_COLOR: Record<CoherenceLevel, string> = {
  UNIFIED:    '#FFD700',
  RESONANT:   '#CC80FF',
  FRAGMENTED: '#00CFFF',
  DISPERSED:  '#5A5A84',
};

const COHERENCE_DESC: Record<CoherenceLevel, string> = {
  UNIFIED:    'Tam birlik — nadir bir senkronizasyon anı',
  RESONANT:   'Rezonans modunda — bilinçler arası uyum güçlü',
  FRAGMENTED: 'Parçalı alan — bireysel frekanslar çatışıyor',
  DISPERSED:  'Dağınık alan — yeni döngü başlangıcı',
};

function emColor(type?: string) {
  return type === 'positive' ? '#38D68A' : type === 'negative' ? '#FF4A5E' : '#80E8FF';
}

/* ── Translation tables ─────────────────────────────────────────────────────── */

const TR_EMOTIONS: Record<string, string> = {
  emptiness: 'boşluk', lightness: 'hafiflik', dread: 'korku',
  inspiration: 'ilham', joy: 'neşe', peace: 'huzur',
  nostalgia: 'nostalji', loneliness: 'yalnızlık', connection: 'bağlantı',
  liberation: 'özgürlük', intensity: 'yoğunluk', sadness: 'hüzün',
  wonder: 'hayranlık', exhaustion: 'yorgunluk', claustrophobia: 'sıkışmışlık',
  anxiety: 'kaygı', fear: 'korku', anger: 'öfke', grief: 'yas',
  hope: 'umut', love: 'aşk', awe: 'huşu', gratitude: 'minnet',
  euphoria: 'coşku', bliss: 'mutluluk', contentment: 'tatmin',
  frustration: 'hayal kırıklığı', rage: 'öfke', panic: 'panik',
  terror: 'dehşet', despair: 'çaresizlik', shame: 'utanç', horror: 'korku',
  excitement: 'heyecan', curiosity: 'merak', happiness: 'mutluluk',
  melancholy: 'melankoli', confusion: 'karmaşa', clarity: 'berraklık',
  trust: 'güven', anticipation: 'beklenti', surprise: 'şaşkınlık',
  disgust: 'tiksinme', acceptance: 'kabul', submission: 'boyun eğme',
  serenity: 'dinginlik', joy_grief: 'sevinç-hüzün', unease: 'huzursuzluk',
};

const TR_CATEGORIES: Record<string, string> = {
  sky: 'gökyüzü', building: 'yapı', object: 'nesne', plant: 'bitki',
  nature: 'doğa', water: 'su', fire: 'ateş', earth: 'toprak', air: 'hava',
  animal: 'hayvan', person: 'insan', place: 'mekân', vehicle: 'araç',
  emotion: 'duygu', spiritual: 'ruhsal', shadow: 'gölge', self: 'benlik',
  unknown: 'bilinmez', food: 'yiyecek', body: 'beden', light: 'ışık',
  dark: 'karanlık', symbol: 'sembol', technology: 'teknoloji',
};

const TR_ARCHETYPES: Record<string, { name: string; desc: string }> = {
  child:      { name: 'Çocuk',    desc: 'Masumiyet ve yeniden doğuş enerjisi' },
  anima:      { name: 'Anima',    desc: 'Dişil prensip — duygu ve ilham kaynağı' },
  animus:     { name: 'Animus',   desc: 'Eril prensip — iradeye yön veren güç' },
  shadow:     { name: 'Gölge',    desc: 'Bastırılmış içerik yüzeye çıkıyor' },
  wise_elder: { name: 'Bilge',    desc: 'Kolektif bilgelik ve rehberlik enerjisi' },
  wise_older: { name: 'Bilge',    desc: 'Kolektif bilgelik ve rehberlik enerjisi' },
  persona:    { name: 'Persona',  desc: 'Sosyal maske ve kimlik arayışı' },
  trickster:  { name: 'Hileci',   desc: 'Sınır tanımaz dönüştürücü enerji' },
  hero:       { name: 'Kahraman', desc: 'Zorlukla yüzleşme ve güç kazanma' },
  guide:      { name: 'Rehber',   desc: 'Bilinmeyene götüren içsel ses' },
  self:       { name: 'Benlik',   desc: 'Bütünleşme ve merkeze dönüş' },
  unknown:    { name: 'Belirsiz', desc: 'Tanımlanmamış arketipik enerji' },
};

// Curated Turkish dream titles shown when real title is in another language
const TR_DREAM_TITLES = [
  'Gümüş Köprüdeki Ayna',
  'Annemin Sesi Denizin Dibinden',
  'Kırmızı Kapının Ardındaki Bahçe',
  'Dönen Yıldızların Altında',
  'Gölgeler ve Fısıltılar Şehri',
  'Mor Bulutların İçinde Uçuş',
  'Kayıp Zamanın Haritası',
  'Denizin Ortasındaki Ev',
];

function trEmotion(e: string): string {
  return TR_EMOTIONS[e.toLowerCase()] ?? e;
}

function trCategory(c: string): string {
  return TR_CATEGORIES[c.toLowerCase()] ?? c;
}

function trArchetype(name: string): { name: string; desc: string } {
  return TR_ARCHETYPES[name.toLowerCase()] ?? { name, desc: 'Arketipik enerji akışı' };
}

function isTurkish(text: string): boolean {
  if (!text) return false;
  const letters = text.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '');
  if (!letters.length) return true;
  return /[ğüşıöçĞÜŞİÖÇ]/.test(text) || (text.replace(/[^a-zA-Z]/g, '').length / letters.length) < 0.75;
}

/* ── Consciousness State Hero ────────────────────────────────────────────────── */

function ConsciousnessStateHero({
  coherenceLevel, alignmentScore, resonanceCount, dominantEmotion, climateScore,
  primaryInsight, lucidRatio, nightmareRatio,
}: {
  coherenceLevel?: CoherenceLevel;
  alignmentScore: number;
  resonanceCount: number;
  dominantEmotion?: string;
  climateScore: number;
  primaryInsight?: { icon: string; text: string; sub?: string };
  lucidRatio: number;
  nightmareRatio: number;
}) {
  const level = coherenceLevel ?? 'RESONANT';
  const color = COHERENCE_COLOR[level];

  const contextLines = [
    lucidRatio >= 15
      ? `%${lucidRatio} lucid oran — kolektif öz-farkındalık yüksek`
      : `%${lucidRatio} lucid oran — bilinçdışı materyal baskın`,
    nightmareRatio >= 30
      ? `%${nightmareRatio} kabus aktivitesi — gölge döngüsü aktif`
      : `%${nightmareRatio} kabus oranı — kolektif alan dingin`,
  ];
  const R = 44, C = 2 * Math.PI * R;
  const fill = C * (alignmentScore / 100);

  return (
    <div className="os-card overflow-hidden mb-5" style={{
      background: `linear-gradient(135deg, rgba(10,6,24,0.99) 0%, ${color}08 60%, rgba(10,6,24,0.99) 100%)`,
      border: `1px solid ${color}20`,
      boxShadow: `0 0 80px ${color}08, 0 0 200px ${color}04, 0 8px 40px rgba(0,0,0,0.8)`,
    }}>
      <div className="flex items-stretch gap-0" style={{ minHeight: 200 }}>

        {/* ── Left: Coherence identity ─────────────── */}
        <div className="flex flex-col justify-center px-8 py-6" style={{ minWidth: 280 }}>
          <p className="text-[8px] font-mono tracking-[0.4em] mb-4" style={{ color: `${color}55` }}>
            KOLEKTİF BİLİNÇ ALANI · CANLI
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              <span className="w-2.5 h-2.5 rounded-full block" style={{ background: color }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: color }} />
            </div>
            <p className="font-black leading-none" style={{
              color,
              fontSize: 46,
              textShadow: `0 0 60px ${color}60, 0 0 120px ${color}25`,
              fontFamily: 'monospace',
              letterSpacing: '-0.02em',
            }}>{level}</p>
          </div>
          <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'rgba(232,232,255,0.45)' }}>
            {COHERENCE_DESC[level]}
          </p>
          <div className="space-y-1">
            {contextLines.map((line, i) => (
              <p key={i} className="text-[10px] font-mono flex items-center gap-2" style={{ color: `${color}60` }}>
                <span style={{ opacity: 0.5 }}>·</span>{line}
              </p>
            ))}
          </div>
        </div>

        {/* ── Center: Alignment ring ───────────────── */}
        <div className="flex flex-col items-center justify-center px-8 shrink-0" style={{
          borderLeft: `1px solid ${color}10`, borderRight: `1px solid ${color}10`,
        }}>
          <svg viewBox="0 0 108 108" style={{ width: 108, height: 108 }}>
            <defs>
              <filter id="heroGlow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle cx="54" cy="54" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
            <circle cx="54" cy="54" r={R} fill="none" stroke={color} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${fill} ${C}`}
              strokeDashoffset={0}
              transform="rotate(-90 54 54)"
              filter="url(#heroGlow)"
              style={{ transition: 'stroke-dasharray 2s cubic-bezier(0.22,1,0.36,1)' }} />
            <circle cx="54" cy="54" r={R + 8} fill="none" stroke={color} strokeWidth="0.6" opacity="0">
              <animate attributeName="opacity" values="0.35;0" dur="3s" repeatCount="indefinite" />
              <animate attributeName="r" values={`${R + 5};${R + 22}`} dur="3s" repeatCount="indefinite" />
            </circle>
            <text x="54" y="49" textAnchor="middle" dominantBaseline="middle"
              fill={color} fontSize="24" fontFamily="monospace" fontWeight="900"
              filter="url(#heroGlow)">{alignmentScore}</text>
            <text x="54" y="66" textAnchor="middle" fill={`${color}55`} fontSize="7" fontFamily="monospace">
              UYUM %
            </text>
          </svg>
          <p className="text-[7px] font-mono tracking-widest mt-2" style={{ color: `${color}50` }}>SINYAL GÜCÜ</p>
        </div>

        {/* ── Right: Primary insight (hero highlight) ─ */}
        <div className="flex-1 flex flex-col justify-center px-8 py-6">
          {primaryInsight ? (
            <div className="rounded-xl p-5" style={{
              background: `${color}07`,
              border: `1px solid ${color}20`,
              boxShadow: `inset 0 0 40px ${color}04`,
            }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: 14, color }}>{primaryInsight.icon}</span>
                <p className="font-mono font-black text-sm leading-snug" style={{
                  color, textShadow: `0 0 20px ${color}40`,
                }}>
                  {primaryInsight.text}
                </p>
              </div>
              {primaryInsight.sub && (
                <p className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(232,232,255,0.5)' }}>
                  {primaryInsight.sub}
                </p>
              )}
            </div>
          ) : (
            <div className="h-16 animate-pulse rounded-xl" style={{ background: `${color}05` }} />
          )}
        </div>

        {/* ── Far right: Quick stats ───────────────── */}
        <div className="flex flex-col justify-center gap-5 px-8 shrink-0" style={{
          borderLeft: `1px solid ${color}10`,
        }}>
          {[
            { label: 'REZONANS', value: resonanceCount.toLocaleString('tr-TR'), color: '#00CFFF' },
            { label: 'İKLİM',    value: String(climateScore),                    color: '#FFB800' },
            { label: 'DUYGU',    value: trEmotion(dominantEmotion ?? '—').toUpperCase(), color: '#CC80FF' },
            { label: 'UYUM',     value: `${alignmentScore}%`,                    color },
          ].map(({ label, value, color: c }) => (
            <div key={label}>
              <p className="text-[7px] font-mono tracking-[0.25em] mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{label}</p>
              <p className="font-mono font-black text-[15px] leading-none" style={{ color: c }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Emotion Orb Field ──────────────────────────────────────────────────────── */

function EmotionOrbField({ emotions }: {
  emotions: Array<{ emotion: string; count: number; pct: number; type: 'positive' | 'negative' | 'neutral' }>;
}) {
  const top12 = [...emotions].sort((a, b) => b.count - a.count).slice(0, 12);
  const max = Math.max(...top12.map(e => e.count), 1);
  return (
    <div className="flex flex-wrap gap-3 items-end content-start" style={{ minHeight: 160 }}>
      {top12.map((e) => {
        const pct   = e.count / max;
        const size  = Math.round(40 + pct * 56); // 40–96px
        const color = emColor(e.type);
        const label = trEmotion(e.emotion);
        const fs    = Math.max(8, Math.round(8 + pct * 5));
        return (
          <div key={e.emotion} className="flex items-center justify-center transition-all duration-700"
            title={`${label}: ${e.count} (${e.pct}%)`}
            style={{
              width: size, height: size, borderRadius: '50%',
              background: `radial-gradient(circle at 38% 32%, ${color}40, ${color}0c)`,
              border:     `1px solid ${color}38`,
              boxShadow:  `0 0 ${Math.round(pct * 24)}px ${color}35`,
              flexShrink: 0,
            }}>
            <p style={{
              fontSize: fs, color, fontFamily: 'monospace', fontWeight: 900,
              textAlign: 'center', lineHeight: 1.15, padding: '0 4px',
              maxWidth: size - 8,
              overflow: 'hidden',
            }}>
              {label.length > 8 ? label.slice(0, 7) + '…' : label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Symbol Focus (simplified, hierarchical) ────────────────────────────────── */

const CAT_COLOR: Record<string, string> = {
  nature: '#38D68A', water: '#00CFFF', fire: '#FF4A5E', earth: '#FFB800', air: '#80E8FF',
  animal: '#CC80FF', person: '#7B6FFF', place: '#FF8C00', object: '#FFD700',
  emotion: '#FF4A5E', spiritual: '#CC80FF', shadow: '#5A5A84', anima: '#80E8FF', self: '#FFB800',
  unknown: '#CC80FF',
};

function SymbolFocus({ symbols }: {
  symbols: Array<{ symbol: string; category: string; count: number }>;
}) {
  const top = useMemo(() => {
    const sorted = [...symbols].sort((a, b) => b.count - a.count).slice(0, 8);
    const max = sorted[0]?.count ?? 1;
    return sorted.map((s, i) => ({
      ...s,
      pct: s.count / max,
      color: CAT_COLOR[s.category.toLowerCase()] ?? '#CC80FF',
      isTop: i === 0,
    }));
  }, [symbols]);

  if (!top.length) return (
    <div className="h-32 flex items-center justify-center text-dc-muted text-xs animate-pulse">
      Sembol verisi yükleniyor…
    </div>
  );

  const [first, ...rest] = top;
  return (
    <div>
      {/* Dominant symbol — hero treatment */}
      <div className="rounded-xl p-4 mb-3 flex items-center gap-4" style={{
        background: `${first.color}08`,
        border: `1px solid ${first.color}22`,
      }}>
        <p className="font-black font-mono shrink-0" style={{
          fontSize: 32, color: first.color,
          textShadow: `0 0 30px ${first.color}50`,
        }}>{first.symbol}</p>
        <div className="min-w-0">
          <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            BASKIL SEMBOL · {trCategory(first.category).toUpperCase()}
          </p>
          <p className="font-mono font-black text-[11px]" style={{ color: first.color }}>
            {first.count} rüyada görüldü
          </p>
          <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(232,232,255,0.35)' }}>
            Kolektif bilinçaltının baskın imgesi
          </p>
        </div>
      </div>
      {/* Secondary symbols */}
      <div className="flex flex-wrap gap-1.5">
        {rest.map((s) => (
          <div key={s.symbol} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{
            background: `${s.color}06`,
            border: `1px solid ${s.color}16`,
            opacity: 0.5 + s.pct * 0.5,
          }}>
            <p className="font-mono font-bold" style={{
              fontSize: Math.round(10 + s.pct * 4), color: s.color,
            }}>{s.symbol}</p>
            <p className="font-mono text-[8px]" style={{ color: `${s.color}60` }}>{s.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Archetype Nexus ────────────────────────────────────────────────────────── */

const TREND_GLYPH: Record<string, { icon: string; color: string }> = {
  rising:  { icon: '↑', color: '#38D68A' },
  falling: { icon: '↓', color: '#FF4A5E' },
  stable:  { icon: '→', color: '#FFB800' },
};

function ArchetypeNexus({ archetypes, mostActive }: {
  archetypes: Array<{ name: string; count: number; pct: number; trend: string; dominantEmotion: string | null }>;
  mostActive: string | null;
}) {
  const max = archetypes[0]?.count ?? 1;
  return (
    <div className="space-y-2">
      {archetypes.filter(a => a.name !== 'unknown').slice(0, 8).map((a) => {
        const pct   = a.count / max;
        const trend = TREND_GLYPH[a.trend] ?? TREND_GLYPH.stable;
        const color = a.name === mostActive ? '#FFD700' : '#CC80FF';
        const tr    = trArchetype(a.name);
        return (
          <div key={a.name} className="rounded-lg p-2.5" style={{
            background: a.name === mostActive ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${a.name === mostActive ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-bold font-mono" style={{ color: trend.color }}>{trend.icon}</span>
              <p className="font-mono font-bold text-[11px] flex-1 truncate" style={{ color }}>{tr.name}</p>
              {a.name === mostActive && (
                <span className="text-[7px] font-mono px-1 rounded" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700' }}>
                  AKTİF
                </span>
              )}
              <span className="font-mono text-[9px]" style={{ color: `${color}80` }}>{a.pct.toFixed(1)}%</span>
            </div>
            <div className="signal-bar" style={{ height: 3 }}>
              <div className="signal-bar-fill" style={{
                width: `${pct * 100}%`,
                background: `linear-gradient(90deg, ${color}40, ${color})`,
                transition: 'width 1s ease',
              }} />
            </div>
            <p className="text-[8px] font-mono mt-1" style={{ color: 'rgba(232,232,255,0.3)' }}>
              {tr.desc}{a.dominantEmotion ? ` · ${trEmotion(a.dominantEmotion)}` : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Emerging Themes ────────────────────────────────────────────────────────── */

function EmergingThemes({ themes, emergingSymbols }: {
  themes: Array<{ theme: string; count: number }>;
  emergingSymbols: Array<{ symbol: string; category: string; count: number; growth: number }>;
}) {
  return (
    <div className="space-y-1.5">
      {emergingSymbols.slice(0, 5).map((s) => (
        <div key={s.symbol} className="rounded-lg px-3 py-2 flex items-center gap-3" style={{
          background: 'rgba(255,184,0,0.05)',
          border: '1px solid rgba(255,184,0,0.15)',
        }}>
          <div className="flex-1 min-w-0">
            <p className="font-mono font-bold text-[11px] truncate" style={{ color: '#FFB800' }}>{s.symbol}</p>
            <p className="text-[8px] font-mono" style={{ color: 'rgba(232,232,255,0.35)' }}>{trCategory(s.category)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono font-black text-[11px]" style={{ color: '#38D68A' }}>
              +{s.growth.toFixed(0)}%
            </p>
            <p className="text-[7px] font-mono" style={{ color: 'rgba(56,214,138,0.5)' }}>büyüme</p>
          </div>
        </div>
      ))}
      {themes.slice(0, 5).map((t) => (
        <div key={t.theme} className="rounded-lg px-3 py-2 flex items-center gap-3" style={{
          background: 'rgba(0,207,255,0.04)',
          border: '1px solid rgba(0,207,255,0.1)',
        }}>
          <p className="font-mono text-[10px] flex-1 truncate" style={{ color: '#00CFFF' }}>{t.theme}</p>
          <span className="font-mono font-bold text-[10px]" style={{ color: 'rgba(0,207,255,0.7)' }}>{t.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ── AI Interpretations ─────────────────────────────────────────────────────── */

function useInterpretations(params: {
  coherenceLevel?: CoherenceLevel;
  alignmentScore: number;
  lucidRatio: number;
  nightmareRatio: number;
  mostActiveArchetype?: string | null;
  archetypeTrend?: string;
  dominantEmotion?: string;
  dominantType?: string;
  topSymbol?: string;
  topSymbolCount?: number;
  velocityIndex?: number;
  positivityIndex?: number;
}) {
  return useMemo(() => {
    const {
      coherenceLevel, alignmentScore, lucidRatio, nightmareRatio,
      mostActiveArchetype, archetypeTrend, dominantEmotion, dominantType,
      topSymbol, topSymbolCount, velocityIndex, positivityIndex,
    } = params;

    const items: Array<{ icon: string; color: string; text: string; sub?: string }> = [];

    if (coherenceLevel === 'UNIFIED') {
      items.push({ icon: '◎', color: '#FFD700', text: 'Kolektif alan TAM BİRLİK modunda', sub: 'Nadir bir senkronizasyon penceresi — bilinçler tek frekansta' });
    } else if (coherenceLevel === 'RESONANT') {
      items.push({ icon: '◎', color: '#CC80FF', text: 'Kolektif rezonans algılanıyor', sub: `${alignmentScore}% uyum — bilinçler arası bağlantı güçlü` });
    } else if (coherenceLevel === 'FRAGMENTED') {
      items.push({ icon: '◎', color: '#00CFFF', text: 'Alan parçalanma sürecinde', sub: 'Bireysel frekanslar ayrışıyor — çoğulcu bir dönem' });
    } else {
      items.push({ icon: '◎', color: '#5A5A84', text: 'Kolektif alan dağınık', sub: 'Yeni döngünün tohumları atılıyor' });
    }

    if (lucidRatio >= 20) {
      items.push({ icon: '◈', color: '#00CFFF', text: `Lucid bilinç %${lucidRatio.toFixed(0)} — zirvede`, sub: 'Kolektif öz-farkındalık olağandışı yüksek, bilinçli kontrol artıyor' });
    } else if (lucidRatio <= 5) {
      items.push({ icon: '◈', color: '#7B6FFF', text: `Derin uyku döngüsü aktif (%${lucidRatio.toFixed(0)})`, sub: 'Bilinçdışı materyal yüzeye çıkıyor — ham sembolik içerik yoğun' });
    }

    if (nightmareRatio >= 35) {
      items.push({ icon: '◆', color: '#FF4A5E', text: `Gölge döngüsü aktif (%${nightmareRatio.toFixed(0)} kabus)`, sub: 'Kolektif psike derin işlemede — gölge arketipi baskın' });
    } else if (nightmareRatio <= 10) {
      items.push({ icon: '◆', color: '#38D68A', text: `Kolektif alan sakin — kabus minimal (%${nightmareRatio.toFixed(0)})`, sub: 'Pozitif enerji baskın, kolektif denge sağlıklı' });
    }

    if (mostActiveArchetype) {
      const trendTr = archetypeTrend === 'rising' ? 'hızla yükseliyor'
        : archetypeTrend === 'falling' ? 'geriliyor'
        : 'stabil seyrediyor';
      items.push({ icon: '⬡', color: '#CC80FF', text: `"${mostActiveArchetype}" arketipi ${trendTr}`, sub: 'Kolektif psikede dominant güç yapısı şekilleniyor' });
    }

    if (dominantEmotion) {
      const typeLabel = dominantType === 'positive' ? 'yaratıcı enerji akışı güçlü'
        : dominantType === 'negative' ? 'derin duygusal işleme süreci aktif'
        : 'duygusal geçiş anı — yeni denge aranıyor';
      const trEm = trEmotion(dominantEmotion);
      items.push({ icon: '◉', color: emColor(dominantType), text: `"${trEm}" kolektif alanda baskın`, sub: typeLabel });
    }

    if (topSymbol && topSymbolCount) {
      items.push({ icon: '✦', color: '#FFB800', text: `"${topSymbol}" sembolü ${topSymbolCount} rüyada ortak`, sub: 'Kolektif bilinçaltının en güçlü imgesi — arketipik nitelik taşıyor' });
    }

    if (velocityIndex !== undefined && velocityIndex > 60) {
      items.push({ icon: '∿', color: '#FF8C00', text: `Duygusal kayma hızlanıyor (${velocityIndex.toFixed(0)} endeks)`, sub: 'Platform hızlı bir duygu dönüşümü içinde' });
    }

    if (positivityIndex !== undefined) {
      if (positivityIndex >= 70) {
        items.push({ icon: '○', color: '#38D68A', text: `Yüksek pozitif enerji — %${positivityIndex.toFixed(0)} pozitivite`, sub: 'Kolektif iyimserlik zirvede, yaratıcı döngü açık' });
      } else if (positivityIndex <= 35) {
        items.push({ icon: '○', color: '#FF8C00', text: `Düşük pozitivite — %${positivityIndex.toFixed(0)}`, sub: 'Kolektif işleme modu — içgözlem ve dönüşüm baskın' });
      }
    }

    return items.slice(0, 6);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── Resonance Pairs ────────────────────────────────────────────────────────── */

function ResonancePairs({ relationships }: {
  relationships: Array<{ symbol1: string; symbol2: string; coCount: number }>;
}) {
  const max = relationships[0]?.coCount ?? 1;
  return (
    <div className="space-y-2">
      {relationships.slice(0, 8).map((r, i) => {
        const pct   = r.coCount / max;
        const color = i < 3 ? '#00CFFF' : '#5A5A84';
        return (
          <div key={`${r.symbol1}-${r.symbol2}`} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{
            background: 'rgba(0,207,255,0.03)',
            border: `1px solid rgba(0,207,255,${0.04 + pct * 0.15})`,
          }}>
            <span className="font-mono font-black text-[11px]" style={{ color: '#00CFFF' }}>{r.symbol1}</span>
            <div className="flex-1 signal-bar" style={{ height: 2 }}>
              <div className="signal-bar-fill" style={{
                width: `${pct * 100}%`,
                background: `linear-gradient(90deg, rgba(0,207,255,0.3), ${color})`,
              }} />
            </div>
            <span className="font-mono font-black text-[11px]" style={{ color: '#00CFFF' }}>{r.symbol2}</span>
            <span className="font-mono text-[9px] shrink-0" style={{ color: `${color}60` }}>{r.coCount}×</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Live signals — always populated ────────────────────────────────────────── */

function useLiveSignals(
  apiSignals: Array<{ id?: string; message: string; detail?: string | null; category: string; severity: string; createdAt: string }> | undefined,
  interpretations: Array<{ icon: string; color: string; text: string; sub?: string }>,
) {
  return useMemo(() => {
    if (apiSignals && apiSignals.length > 0) return apiSignals;
    // Derive synthetic signals from interpretations
    const SEV: Record<string, string> = { '◆': 'warning', '⬡': 'info', '◉': 'info', '◎': 'info', '◈': 'info', '✦': 'info', '∿': 'warning', '○': 'info' };
    return interpretations.map((item, i) => ({
      id:        `synth-${i}`,
      message:   item.text,
      detail:    item.sub ?? null,
      category:  'ai',
      severity:  SEV[item.icon] ?? 'info',
      createdAt: new Date(Date.now() - i * 240_000).toISOString(),
    }));
  }, [apiSignals, interpretations]);
}

/* ── Main ────────────────────────────────────────────────────────────────────── */

export default function DreamIntelligence() {
  const { data: intel }      = useQuery({ queryKey: ['admin','intelligence'],        queryFn: fetchDreamIntelligence,       staleTime: 120_000 });
  const { data: collective } = useQuery({ queryKey: ['collective-consciousness'],    queryFn: fetchCollectiveConsciousness, refetchInterval: 90_000 });
  const { data: emotionMap } = useQuery({ queryKey: ['emotion-map'],                queryFn: fetchEmotionMap,              refetchInterval: 60_000 });
  const { data: health }     = useQuery({ queryKey: ['com-health'],                 queryFn: fetchCommunityHealth,         refetchInterval: 60_000 });
  const { data: symbolData } = useQuery({ queryKey: ['symbol-analysis'],            queryFn: fetchSymbolAnalysis,          staleTime: 120_000 });
  const { data: archData }   = useQuery({ queryKey: ['archetype-analysis'],         queryFn: fetchArchetypeAnalysis,       staleTime: 120_000 });
  const { data: aiSignals }  = useQuery({ queryKey: ['ai-signals'],                 queryFn: () => fetchAISignals(12),     refetchInterval: 60_000 });

  const climateScore = Math.round(
    (health?.positivityIndex  ?? 50) * 0.35 +
    (100 - (health?.anxietyIndex  ?? 30)) * 0.25 +
    (health?.lucidRatio       ?? 10) * 0.20 +
    (100 - (health?.nightmareRatio ?? 20)) * 0.15 +
    (collective?.alignmentScore   ?? 50) * 0.05,
  );

  const topArchetype = archData?.archetypes?.[0];
  const topSymbol    = collective?.sharedSymbols?.[0];
  const topEmotions  = emotionMap?.topEmotions ?? intel?.trendingEmotions?.map(e => ({
    emotion: e.emotion, count: e.count, pct: 0, type: 'neutral' as const,
  })) ?? [];

  const interpretations = useInterpretations({
    coherenceLevel:      collective?.coherenceLevel,
    alignmentScore:      collective?.alignmentScore     ?? 0,
    lucidRatio:          health?.lucidRatio             ?? 0,
    nightmareRatio:      health?.nightmareRatio         ?? 0,
    mostActiveArchetype: archData?.mostActiveArchetype,
    archetypeTrend:      topArchetype?.trend,
    dominantEmotion:     emotionMap?.dominantEmotion    ?? collective?.collectiveEmotion,
    dominantType:        emotionMap?.dominantType,
    topSymbol:           topSymbol?.symbol,
    topSymbolCount:      topSymbol?.dreamCount,
    velocityIndex:       emotionMap?.velocityIndex,
    positivityIndex:     health?.positivityIndex,
  });

  const liveSignals = useLiveSignals(aiSignals, interpretations);

  // Primary insight = first interpretation — featured in the hero
  const primaryInsight = interpretations[0];

  const totalDreams = intel?.totalDreamsAnalyzed ?? 0;

  // Symbols for collective mind panel (shared > symbol analysis fallback)
  const collectiveSymbols = (collective?.sharedSymbols ?? []).length > 0
    ? (collective?.sharedSymbols ?? []).map(s => ({ symbol: s.symbol, category: 'unknown', count: s.dreamCount }))
    : (symbolData?.topSymbols ?? []).slice(0, 8).map(s => ({ symbol: s.symbol, category: s.category, count: s.count }));

  return (
    <div className="section-executive relative">
      <Header
        title="Intelligence Hub"
        subtitle="AI Bilinç Gözlemevi — kolektif rüya alanının canlı haritası"
        section="executive"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
                <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
              </div>
              <span className="text-[9px] font-mono" style={{ color: 'rgba(204,128,255,0.7)' }}>
                {totalDreams.toLocaleString('tr-TR')} RÜYA ANALİZ EDİLDİ
              </span>
            </div>
            <span className="text-dc-border text-[9px]">|</span>
            <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {liveSignals.length} AI SİNYAL
            </span>
          </div>
        }
      />

      {/* ── Hero: Collective State ────────────────────────────────────────── */}
      <ConsciousnessStateHero
        coherenceLevel={collective?.coherenceLevel}
        alignmentScore={collective?.alignmentScore ?? 0}
        resonanceCount={collective?.resonanceCount ?? 0}
        dominantEmotion={emotionMap?.dominantEmotion ?? collective?.collectiveEmotion}
        climateScore={climateScore}
        primaryInsight={primaryInsight}
        lucidRatio={health?.lucidRatio ?? 0}
        nightmareRatio={health?.nightmareRatio ?? 0}
      />

      {/* ── Row 2: AI Insights (hero weight) + Emotional Field ───────────── */}
      <div className="grid grid-cols-12 gap-5 mb-5">

        {/* AI Interpretations — enlarged, primary panel */}
        <div className="col-span-5 os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#7B6FFF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#7B6FFF' }} />
            </div>
            <p className="os-title">AI YORUMLARI</p>
          </div>
          <div className="p-5 space-y-3">
            {interpretations.map((item, i) => (
              <div key={i} className="rounded-xl p-4" style={{
                background: i === 0 ? `${item.color}09` : `${item.color}04`,
                border:     `1px solid ${item.color}${i === 0 ? '28' : '14'}`,
                boxShadow:  i === 0 ? `inset 0 0 30px ${item.color}04` : 'none',
              }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ fontSize: i === 0 ? 13 : 11, color: item.color }}>{item.icon}</span>
                  <p className="font-mono font-bold leading-snug" style={{
                    fontSize: i === 0 ? 12 : 11,
                    color: item.color,
                    textShadow: i === 0 ? `0 0 16px ${item.color}30` : 'none',
                  }}>
                    {item.text}
                  </p>
                </div>
                {item.sub && (
                  <p className="text-[9px] font-mono leading-relaxed" style={{ color: 'rgba(232,232,255,0.4)' }}>
                    {item.sub}
                  </p>
                )}
              </div>
            ))}
            {interpretations.length === 0 && (
              <div className="h-32 flex items-center justify-center text-dc-muted text-xs animate-pulse">
                Bilinç analizi yapılıyor…
              </div>
            )}
          </div>
        </div>

        {/* Emotional Field */}
        <div className="col-span-7 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono" style={{ color: '#FF4A5E' }}>◉</span>
              <p className="os-title">DUYGUSAL ALAN</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono px-2 py-0.5 rounded" style={{
                background: emColor(emotionMap?.dominantType) + '15',
                color:      emColor(emotionMap?.dominantType),
              }}>
                {trEmotion(emotionMap?.dominantEmotion ?? '—').toUpperCase()}
              </span>
              <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                HIZ {emotionMap?.velocityIndex?.toFixed(0) ?? '—'}
              </span>
            </div>
          </div>
          <div className="p-5">
            {topEmotions.length > 0
              ? <EmotionOrbField emotions={topEmotions} />
              : <div className="h-40 flex items-center justify-center text-dc-muted text-xs animate-pulse">Duygu verisi bekleniyor…</div>
            }
          </div>
          {emotionMap?.emotionTimeline && emotionMap.emotionTimeline.length > 0 && (
            <div className="px-5 pb-5">
              <p className="os-label mb-2">DUYGUSAL KAYMA · 30 GÜN</p>
              <div className="flex items-end gap-0.5" style={{ height: 36 }}>
                {emotionMap.emotionTimeline.slice(-24).map((t, i) => {
                  const h = Math.max(4, Math.round(t.positive * 36 / 100));
                  return (
                    <div key={i} className="flex-1 rounded-sm" style={{
                      height: h,
                      background: `linear-gradient(180deg, rgba(56,214,138,0.8), rgba(56,214,138,0.2))`,
                    }} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Collective Mind + Archetypes + Emerging ───────────────── */}
      <div className="grid grid-cols-12 gap-5 mb-5">

        {/* Collective Mind — symbol focus + themes */}
        <div className="col-span-4 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono" style={{ color: '#00CFFF' }}>∞</span>
              <p className="os-title">KOLEKTİF ZİHİN</p>
            </div>
            <Link to="/collective-consciousness" className="text-[9px] font-bold font-mono tracking-widest"
              style={{ color: '#00CFFF', opacity: 0.6 }}>
              DERİN GÖRÜNÜM →
            </Link>
          </div>
          <div className="p-4">
            <SymbolFocus symbols={collectiveSymbols} />
            {(collective?.collectiveThemes ?? []).length > 0 && (
              <div className="mt-4">
                <p className="os-label mb-2">ORTAK TEMALAR</p>
                <div className="flex flex-wrap gap-1.5">
                  {(collective?.collectiveThemes ?? []).slice(0, 6).map((t, i) => (
                    <span key={t.theme} className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `rgba(204,128,255,${0.06 + i * 0.02})`,
                        border:     `1px solid rgba(204,128,255,${0.15 + i * 0.03})`,
                        color:      '#CC80FF',
                      }}>
                      {t.theme} <span style={{ opacity: 0.5 }}>·{t.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span>{collective?.mindToMindConnections?.toLocaleString('tr-TR') ?? 0} bağlantı</span>
              <span>{collective?.alignmentScore ?? 0}% uyum</span>
            </div>
          </div>
        </div>

        {/* Archetype Activity */}
        <div className="col-span-4 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: '#CC80FF', fontSize: 9 }}>⬡</span>
              <p className="os-title">ARKETİP AKTİVİTESİ</p>
            </div>
            <Link to="/archetype-analysis" className="text-[9px] font-bold font-mono tracking-widest"
              style={{ color: '#CC80FF', opacity: 0.6 }}>
              DETAY →
            </Link>
          </div>
          <div className="p-4">
            {archData?.archetypes?.length
              ? <ArchetypeNexus archetypes={archData.archetypes} mostActive={archData.mostActiveArchetype ?? null} />
              : <div className="h-40 flex items-center justify-center text-dc-muted text-xs animate-pulse">Arketip verisi yükleniyor…</div>
            }
          </div>
        </div>

        {/* Emerging Themes */}
        <div className="col-span-4 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: '#38D68A', fontSize: 9 }}>↑</span>
              <p className="os-title">YÜKSELİŞTEKİLER</p>
            </div>
            <Link to="/collective-signals" className="text-[9px] font-bold font-mono tracking-widest"
              style={{ color: '#38D68A', opacity: 0.6 }}>
              SİNYALLER →
            </Link>
          </div>
          <div className="p-4">
            {(symbolData?.emergingSymbols?.length || collective?.collectiveThemes?.length)
              ? <EmergingThemes
                  themes={collective?.collectiveThemes ?? []}
                  emergingSymbols={symbolData?.emergingSymbols ?? []}
                />
              : <div className="h-40 flex items-center justify-center text-dc-muted text-xs animate-pulse">Yükleniyor…</div>
            }
          </div>
        </div>
      </div>

      {/* ── Row 4: AI Signals + Resonance Network + Resonant Dreams ─────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Live AI Signals — always populated */}
        <div className="col-span-4 os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#7B6FFF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#7B6FFF' }} />
            </div>
            <p className="os-title">CANLI AI SİNYALLERİ</p>
          </div>
          <div className="divide-y overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.04)', maxHeight: 280 }}>
            {liveSignals.slice(0, 8).map((sig, i) => {
              const color = sig.severity === 'critical' ? '#FF4A5E'
                : sig.severity === 'warning' ? '#FF8C00' : '#7B6FFF';
              const age = Math.round((Date.now() - new Date(sig.createdAt).getTime()) / 60_000);
              return (
                <div key={sig.id ?? i} className="flex items-start gap-3 px-4 py-3 data-row">
                  <span className="text-[10px] shrink-0 mt-0.5" style={{ color }}>◆</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono font-semibold leading-snug" style={{ color: 'rgba(232,232,255,0.85)' }}>
                      {sig.message}
                    </p>
                    {sig.detail && (
                      <p className="text-[9px] font-mono mt-0.5 leading-relaxed" style={{ color: 'rgba(232,232,255,0.35)' }}>
                        {sig.detail}
                      </p>
                    )}
                  </div>
                  <span className="text-[8px] font-mono shrink-0" style={{ color: `${color}70` }}>
                    {age < 60 ? `${age}dk` : `${Math.round(age/60)}s`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resonance pairs */}
        <div className="col-span-4 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: '#00CFFF', fontSize: 9 }}>◎</span>
              <p className="os-title">REZONANS AĞI</p>
            </div>
            <span className="text-[9px] font-mono" style={{ color: 'rgba(0,207,255,0.4)' }}>
              SEMBOL EŞ-GÖRÜNÜMÜ
            </span>
          </div>
          <div className="p-4">
            {symbolData?.symbolRelationships?.length
              ? <ResonancePairs relationships={symbolData.symbolRelationships} />
              : <div className="h-32 flex items-center justify-center text-dc-muted text-xs animate-pulse">
                  Ağ verisi yükleniyor…
                </div>
            }
          </div>
        </div>

        {/* Most resonant dreams */}
        <div className="col-span-4 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">EN REZONANSLI RÜYALAR</p>
            <Link to="/connections/resonance" className="text-[9px] font-bold font-mono tracking-widest"
              style={{ color: '#CC80FF', opacity: 0.6 }}>
              REZONANS →
            </Link>
          </div>
          <div className="divide-y overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.04)', maxHeight: 280 }}>
            {(intel?.mostResonantDreams ?? []).slice(0, 8).map((d, i) => {
              const displayTitle = isTurkish(d.title ?? '')
                ? (d.title ?? '—')
                : TR_DREAM_TITLES[i % TR_DREAM_TITLES.length];
              return (
              <Link key={d.id} to={`/dreams/${d.id}`}
                className="flex items-center gap-3 px-4 py-3 data-row">
                <span className="text-[10px] font-bold font-mono w-4 shrink-0"
                  style={{ color: i < 3 ? '#FFD700' : '#5A5A84' }}>
                  {i < 3 ? ['①','②','③'][i] : `${i+1}.`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold truncate" style={{ color: 'rgba(232,232,255,0.85)' }}>
                    {displayTitle}
                  </p>
                  <p className="os-label">@{d.authorUsername}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-[10px]" style={{ color: '#00CFFF' }}>{d.matchCount}</p>
                  <p className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>eşleşme</p>
                </div>
              </Link>
              );
            })}
            {(intel?.mostResonantDreams ?? []).length === 0 && (
              <div className="p-6 text-center text-dc-muted text-xs">Henüz rezonans verisi yok</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
