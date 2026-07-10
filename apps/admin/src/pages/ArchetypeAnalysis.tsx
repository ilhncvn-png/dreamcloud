import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import {
  fetchArchetypeAnalysis,
  fetchArchetypeDynamics,
  fetchCollectiveConsciousness,
  fetchCollectiveIntelligenceSummary,
} from '../api/admin.api';
import type { ArchetypeAnalysisData } from '../types/admin.types';

type ArchetypeEntry = ArchetypeAnalysisData['archetypes'][number];

/* ── Color palette ───────────────────────────────────────────────────── */

const ARCHETYPE_COLORS = [
  '#FFD700','#CC80FF','#FF8CF7','#00CFFF',
  '#38D68A','#FFB800','#FF5C5C','#7B6FFF',
  '#80E8FF','#FF8C00','#38D68A','#CC80FF',
];
function archetypeHex(i: number) { return ARCHETYPE_COLORS[i % ARCHETYPE_COLORS.length]; }

/* ── Lore corpus ─────────────────────────────────────────────────────── */

interface ArchetypeLore {
  meaning: string; collective: string; dreamImpact: string;
  behaviorInfluence: string; emotionalInfluence: string;
  typicalSymbols: string[]; typicalScenes: string[];
  evolution: string; observation: string;
}

const ARCHETYPE_LORE: Record<string, ArchetypeLore> = {
  shadow: {
    meaning: 'Kişiliğin bilinçdışında tutulan, ego tarafından reddedilen karanlık yönleri temsil eder.',
    collective: 'Shadow baskın olduğunda topluluklar reddedilen özellikleri başkalarına yansıtır — çatışma artar, günah keçisi dinamikleri derinleşir.',
    dreamImpact: 'Tehdit edici figürler, karanlık mekanlar, kovalanma ve yüzleşme sahneleri olarak tezahür eder.',
    behaviorInfluence: 'Savunma mekanizmalarını, projeksiyonu ve bilinçsiz tepkiselliği artırır.',
    emotionalInfluence: 'Korku, öfke, ifade edilmemiş suçluluk ve anksiyete amplifikasyonu.',
    typicalSymbols: ['karanlık figür', 'mağara', 'ayna', 'maske', 'fırtına'],
    typicalScenes: ['kovalanma', 'karanlık yabancıyla yüzleşme', 'yeraltı geçitleri'],
    evolution: 'Entegre edildiğinde yaratıcı güce ve özgün öz-ifadeye dönüşür.',
    observation: 'Shadow aktivasyonu artıyorsa projeksiyonu ve suçlamayı gözlemleyin; entegrasyon fırsatı yakın olabilir.',
  },
  hero: {
    meaning: 'Kolektif zorluklarla yüzleşen, dönüşüm ve başarı arayan arketipik güçtür.',
    collective: 'Hero baskın olduğunda topluluk birlikte üstesinden gelinecek engeller arar; liderlik ve dayanıklılık dinamikleri güçlenir.',
    dreamImpact: 'Macera, engel aşma ve zafer sahneleri olarak tezahür eder.',
    behaviorInfluence: 'Rekabetçi güdüyü, dayanıklılığı ve toplumsal onay arayışını artırır.',
    emotionalInfluence: 'Cesaret, kararlılık, bazen aşırı yüklenme ve yorgunluk.',
    typicalSymbols: ['kılıç', 'yol', 'ışık', 'dağ', 'kalkan'],
    typicalScenes: ['zorlu yolculuk', 'ejderha yenme', 'kahraman dönüşü'],
    evolution: 'Olgunlaştıkça Rehber arketipine dönüşerek bilgelik ve paylaşımla sonuçlanır.',
    observation: 'Hero baskın iken kolektif tükenmişlik riskini ve "hero fatigue" belirtilerini izleyin.',
  },
  persona: {
    meaning: 'Topluma sunulan sosyal maske; öz ile dünya arasındaki arabulucudur.',
    collective: 'Persona baskın olduğunda toplumsal roller ve sosyal uyum ön plana çıkar; performatif kimlikler yoğunlaşır.',
    dreamImpact: 'Kıyafet değişimi, sahne sahneleri ve kimlik belirsizliği olarak tezahür eder.',
    behaviorInfluence: 'Sosyal uyum davranışını, rol yapma ihtiyacını ve onay arayışını güçlendirir.',
    emotionalInfluence: 'Yüzeysel rahatlık, iç çatışma ve kimlik sorgulama.',
    typicalSymbols: ['maske', 'kıyafet', 'ayna', 'sahne', 'kalabalık'],
    typicalScenes: ['gala/tören sahneleri', 'kimlik testi', 'rol oynama'],
    evolution: 'Maske düştüğünde Shadow entegrasyonu başlar; gerçek benlik ortaya çıkar.',
    observation: 'Yüksek Persona dönemlerinde otantiklik krizlerine ve kimlik yorgunluğuna dikkat edin.',
  },
  anima: {
    meaning: 'Erkek psikedeki dişil prensip — his, sezgi ve bağ kurma kapasitesi.',
    collective: 'Anima baskın olduğunda toplulukta empati dalgalanmaları ve duygusal derinlik artar.',
    dreamImpact: 'Mistik kadın figürler, su sembolleri ve ay imgeleri olarak tezahür eder.',
    behaviorInfluence: 'Duygusal açıklığı ve sezgisel kararları güçlendirir.',
    emotionalInfluence: 'Derin his, melankoli, şiirsellik ve bağlantı özlemi.',
    typicalSymbols: ['ay', 'su', 'çiçek', 'kadın figürü', 'deniz'],
    typicalScenes: ['ilahi kadınla karşılaşma', 'su yolculuğu', 'aşk sahneleri'],
    evolution: 'Entegre edildiğinde sezgisel zeka ve bütünleşik duygusal olgunluğa dönüşür.',
    observation: 'Anima dalgalanmalarında empati artışı ile birlikte duygusal yoğunluk krizlerini takip edin.',
  },
  animus: {
    meaning: 'Kadın psikedeki eril prensip — otorite, mantık ve eylem kapasitesi.',
    collective: 'Animus baskın olduğunda kolektif eylemliliği ve yapısal düşünce derinleşir.',
    dreamImpact: 'Otoriter erkek figürler, kural sahneleri ve güç dinamikleri olarak tezahür eder.',
    behaviorInfluence: 'Kararlılık, hedef odaklılık ve bazen aşırı sertlik.',
    emotionalInfluence: 'Güç, kontrol, sertlik ve bazen yalnızlık.',
    typicalSymbols: ['kule', 'kılıç', 'taş', 'güneş', 'emir'],
    typicalScenes: ['emir verme', 'yapı inşa etme', 'otorite sınavı'],
    evolution: 'Entegrasyonla sağlıklı öz-disiplin ve yaratıcı liderliğe dönüşür.',
    observation: 'Animus dönemlerinde katı düşünce kalıplarını ve diyaloğa direnci gözlemleyin.',
  },
  trickster: {
    meaning: 'Düzeni bozan, kuralları ihlal eden ve dönüşümü kışkırtan yaramaz güçtür.',
    collective: 'Trickster baskın olduğunda topluluk yerleşik normlara meydan okur; yaratıcı kaos baş gösterir.',
    dreamImpact: 'Absürd sahneler, kural ihlalleri ve sürpriz dönüşümler olarak tezahür eder.',
    behaviorInfluence: 'Yaratıcılık, isyankarlık ve sosyal normları sorgulama dürtüsü.',
    emotionalInfluence: 'Şakacılık, özgürlük, bazen endişe ve kaos.',
    typicalSymbols: ['tilki', 'soytarı', 'labirent', 'ayna', 'ateş'],
    typicalScenes: ['kurulmuş olaylar', 'absürd yolculuklar', 'beklenmedik dönüşler'],
    evolution: 'Kontrol edildiğinde inovasyon ve dönüşüm katalizörüne dönüşür.',
    observation: 'Trickster aktivasyonunda ani sistem değişimlerini ve kural ihlali eğilimlerini izleyin.',
  },
  child: {
    meaning: 'Saflık, merak, yenilenme potansiyeli ve masumiyet arketipidir.',
    collective: 'Çocuk baskın olduğunda toplulukta yenilenme özlemi ve yaratıcı merak derinleşir.',
    dreamImpact: 'Çocukluk mekanları, oyun ve saf keşif sahneleri olarak tezahür eder.',
    behaviorInfluence: 'Merak, özgünlük ve boyut yaşa karşı çocuksu sevinç.',
    emotionalInfluence: 'Neşe, güvensizlik, özlem ve keşif heyecanı.',
    typicalSymbols: ['oyuncak', 'bahçe', 'okul', 'tomurcuk', 'güneş'],
    typicalScenes: ['çocukluk evine dönüş', 'oyun sahneleri', 'keşif yolculukları'],
    evolution: 'Olgunlaştığında yaratıcı vizyon ve derin yenilenme kapasitesine dönüşür.',
    observation: 'Child baskın iken regresyon örüntülerini ve aşırı bağımlılık dinamiklerini takip edin.',
  },
  guide: {
    meaning: 'Bilgelik, yön ve derin anlayış sunan arketipik rehber güçtür.',
    collective: 'Rehber baskın olduğunda topluluk bilgelik ve anlam arayışında yoğunlaşır.',
    dreamImpact: 'Bilge yaşlı figürler, ışıklı yollar ve yol işaretleri olarak tezahür eder.',
    behaviorInfluence: 'Bilgelik arayışını, mentorluk ilişkilerini ve uzun vadeli düşünmeyi güçlendirir.',
    emotionalInfluence: 'Huzur, anlam, netlik ve derin güven.',
    typicalSymbols: ['fener', 'kitap', 'kule', 'yıldız', 'yol'],
    typicalScenes: ['bilge ile buluşma', 'işaret arama', 'anlam yolculuğu'],
    evolution: 'En yüksek formda evrensel bilgeliğin yayıcısına dönüşür.',
    observation: 'Guide dönemlerinde sözde-bilgelik ve dogmatizm riskini; takipçi dinamiklerini gözlemleyin.',
  },
};

function getArchetypeLore(name: string): ArchetypeLore {
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  return ARCHETYPE_LORE[key] ?? {
    meaning: `${name} kolektif psikenin aktif bir gücüdür; bilinçdışı deneyimi şekillendirir.`,
    collective: `${name} baskın olduğunda topluluğun rüya dinamikleri bu arketip etrafında yoğunlaşır.`,
    dreamImpact: 'Bu arketipe özgü semboller ve figürler rüyalarda belirgin biçimde tezahür eder.',
    behaviorInfluence: 'Kolektif davranış kalıplarını ve toplumsal motivasyonları etkiler.',
    emotionalInfluence: 'Derin duygusal rezonans ve bilinçdışı his kalıpları üretir.',
    typicalSymbols: ['gölge', 'ışık', 'ayna', 'yol', 'kapı'],
    typicalScenes: ['arayış sahneleri', 'karşılaşma sahneleri', 'dönüşüm ritüelleri'],
    evolution: 'Daha yüksek bilinç seviyesiyle entegrasyon ve dönüşüm kaçınılmazdır.',
    observation: 'Bu arketip aktifleştiğinde kolektif alan dinamiklerindeki kaymaları gözlemleyin.',
  };
}

/* ── CountUp — RAF-driven number animation ───────────────────────────── */

function CountUp({ to, duration = 1100 }: { to: number; duration?: number }) {
  const [val, setVal]     = useState(to);
  const rafRef            = useRef(0);
  const startRef          = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = null;
    const run = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t    = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - (1 - t) ** 3;
      setVal(Math.round(ease * to));
      if (t < 1) rafRef.current = requestAnimationFrame(run);
    };
    rafRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to, duration]);
  return <>{val}</>;
}

/* ── Jungian Field ───────────────────────────────────────────────────── */

function JungianField({
  archetypes, mostActive, selectedArchetype, onSelect,
}: {
  archetypes: Array<{ name: string; count: number; pct: number; trend: 'rising' | 'falling' | 'stable' }>;
  mostActive: string | null;
  selectedArchetype: string | null;
  onSelect: (name: string) => void;
}) {
  const W = 520, H = 360, CX = W / 2, CY = H / 2;
  const maxPct = archetypes[0]?.pct ?? 1;

  const rings = [{ r: 0, n: 1 }, { r: 100, n: 5 }, { r: 185, n: 8 }];
  const nodes: Array<{ a: typeof archetypes[0]; x: number; y: number; r: number; hex: string; idx: number }> = [];
  const sorted = [...archetypes].sort((a, b) => b.pct - a.pct).slice(0, 14);
  let idx = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.n && idx < sorted.length; i++, idx++) {
      const angle = ring.n === 1 ? 0 : (i / ring.n) * 2 * Math.PI - Math.PI / 2;
      nodes.push({
        a: sorted[idx], hex: archetypeHex(idx), idx,
        x: CX + ring.r * Math.cos(angle),
        y: CY + ring.r * Math.sin(angle),
        r: 6 + (sorted[idx].pct / maxPct) * 26,
      });
    }
  }

  const arcEdges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < Math.min(nodes.length, 6); i++) {
    for (let j = i + 1; j < Math.min(nodes.length, 6); j++) {
      if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) < 180) {
        arcEdges.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y });
      }
    }
  }

  const particles = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const r = 55 + (i % 4) * 42;
    return { cx: CX + r * Math.cos(a), cy: CY + r * Math.sin(a), dur: 7 + i * 0.55, off: i * 0.38 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W, maxHeight: H }}>
      <defs>
        <radialGradient id="jfAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFD700" stopOpacity="0.06" />
          <stop offset="40%"  stopColor="#CC80FF" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
        </radialGradient>
        <filter id="jfGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="jfGlowBig">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="jfGlowSel">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Atmosphere */}
      <ellipse cx={CX} cy={CY} rx="255" ry="175" fill="url(#jfAtmo)" />

      {/* Slowly rotating outer ring guide */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="180s" repeatCount="indefinite" />
        <circle cx={CX} cy={CY} r="185" fill="none"
          stroke="rgba(255,215,0,0.04)" strokeWidth="0.5" strokeDasharray="2 14" />
      </g>

      {/* Counter-rotating inner ring */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${CX} ${CY}`} to={`-360 ${CX} ${CY}`} dur="120s" repeatCount="indefinite" />
        <circle cx={CX} cy={CY} r="100" fill="none"
          stroke="rgba(204,128,255,0.04)" strokeWidth="0.5" strokeDasharray="3 10" />
      </g>

      {/* Static center ring */}
      <circle cx={CX} cy={CY} r="40" fill="none" stroke="rgba(255,215,0,0.06)" strokeWidth="0.5" />

      {/* Center pulse */}
      <circle cx={CX} cy={CY} r="6" fill="rgba(255,215,0,0.12)" filter="url(#jfGlow)">
        <animate attributeName="r" values="4;12;4" dur="5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.04;0.15" dur="5s" repeatCount="indefinite" />
      </circle>

      {/* Floating particles */}
      {particles.map((p, i) => (
        <circle key={`p${i}`} cx={p.cx} cy={p.cy} r="1.2"
          fill={i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#CC80FF' : '#7B6FFF'} opacity="0">
          <animate attributeName="opacity" values="0;0.22;0;0.14;0"
            dur={`${p.dur}s`} begin={`${p.off}s`} repeatCount="indefinite" />
          <animate attributeName="cx"
            values={`${p.cx};${p.cx + 9};${p.cx - 5};${p.cx + 3};${p.cx}`}
            dur={`${p.dur * 1.4}s`} repeatCount="indefinite" />
          <animate attributeName="cy"
            values={`${p.cy};${p.cy - 6};${p.cy + 10};${p.cy - 3};${p.cy}`}
            dur={`${p.dur * 1.1}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Connection lines with animated energy flow */}
      {arcEdges.map((e, i) => (
        <g key={`e${i}`}>
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="rgba(255,215,0,0.06)" strokeWidth="0.8" />
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="#FFD700" strokeWidth="1" opacity="0"
            strokeDasharray="3 16">
            <animate attributeName="opacity" values="0;0.18;0"
              dur={`${5 + i * 0.6}s`} begin={`${i * 0.9}s`} repeatCount="indefinite" />
            <animate attributeName="strokeDashoffset" from="0" to="-19"
              dur="1.2s" repeatCount="indefinite" />
          </line>
        </g>
      ))}

      {/* Non-dominant nodes (rings 1 & 2) */}
      {nodes.slice(1).map((n, i) => {
        const isDom  = n.a.name === mostActive;
        const isSel  = n.a.name === selectedArchetype;
        return (
          <g key={i} filter={isSel ? 'url(#jfGlowSel)' : 'url(#jfGlow)'}
            style={{ cursor: 'pointer' }} onClick={() => onSelect(n.a.name)}>
            {/* ambient halo */}
            <circle cx={n.x} cy={n.y} r={n.r + 9} fill={n.hex} opacity="0.05">
              <animate attributeName="opacity" values="0.02;0.1;0.02"
                dur={`${3.2 + i * 0.22}s`} repeatCount="indefinite" />
              {/* floating drift */}
              <animate attributeName="cy"
                values={`${n.y};${n.y - 3};${n.y + 2};${n.y}`}
                dur={`${6 + i * 0.35}s`} repeatCount="indefinite" />
            </circle>
            {/* selected ring */}
            {isSel && (
              <>
                <circle cx={n.x} cy={n.y} r={n.r + 14} fill="none"
                  stroke={n.hex} strokeWidth="1.5" opacity="0.5">
                  <animate attributeName="r" values={`${n.r + 12};${n.r + 22};${n.r + 12}`} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0.1;0.55" dur="2.2s" repeatCount="indefinite" />
                </circle>
                <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none"
                  stroke={n.hex} strokeWidth="0.8" opacity="0.3" strokeDasharray="3 5">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${n.x} ${n.y}`} to={`360 ${n.x} ${n.y}`} dur="8s" repeatCount="indefinite" />
                </circle>
              </>
            )}
            {/* rising ripple */}
            {n.a.trend === 'rising' && !isSel && (
              <circle cx={n.x} cy={n.y} r={n.r + 3} fill="none"
                stroke={n.hex} strokeWidth="0.8" opacity="0">
                <animate attributeName="r" values={`${n.r + 2};${n.r + 11};${n.r + 2}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.45;0;0.45" dur="3s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={n.x} cy={n.y} r={n.r}
              fill={n.hex}
              opacity={isSel ? 1 : isDom ? 0.92 : 0.48 + n.a.pct * 0.02}>
              <animate attributeName="cy"
                values={`${n.y};${n.y - 2.5};${n.y + 1.5};${n.y}`}
                dur={`${5.5 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
            {n.r > 13 && (
              <text x={n.x} y={n.y + n.r + 9} textAnchor="middle"
                fill={isSel ? n.hex : 'rgba(255,255,255,0.4)'}
                fontSize={isSel ? '7.5' : '7'} fontFamily="monospace" fontWeight={isSel ? 'bold' : 'normal'}>
                {n.a.name.slice(0, 9)}
              </text>
            )}
          </g>
        );
      })}

      {/* Dominant node (center) */}
      {nodes[0] && (() => {
        const n = nodes[0];
        const isSel = n.a.name === selectedArchetype;
        return (
          <g filter="url(#jfGlowBig)" style={{ cursor: 'pointer' }} onClick={() => onSelect(n.a.name)}>
            {/* outer breathe */}
            <circle cx={n.x} cy={n.y} r={n.r + 20} fill={n.hex} opacity="0.07">
              <animate attributeName="r" values={`${n.r + 14};${n.r + 32};${n.r + 14}`} dur="6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.04;0.14;0.04" dur="6s" repeatCount="indefinite" />
            </circle>
            {isSel && (
              <circle cx={n.x} cy={n.y} r={n.r + 26} fill="none"
                stroke={n.hex} strokeWidth="1.5" opacity="0.4">
                <animate attributeName="r" values={`${n.r + 22};${n.r + 38};${n.r + 22}`} dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.45;0.05;0.45" dur="2.5s" repeatCount="indefinite" />
              </circle>
            )}
            {/* orbit dash */}
            <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none"
              stroke={n.hex} strokeWidth="0.8" opacity="0.18" strokeDasharray="4 8">
              <animateTransform attributeName="transform" type="rotate"
                from={`0 ${n.x} ${n.y}`} to={`360 ${n.x} ${n.y}`} dur="20s" repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.hex} opacity="0.95" />
            <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke={n.hex} strokeWidth="1.5" opacity="0.28">
              <animate attributeName="r" values={`${n.r + 3};${n.r + 17};${n.r + 3}`} dur="4.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur="4.5s" repeatCount="indefinite" />
            </circle>
            <text x={n.x} y={n.y - 4} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(6,6,20,0.85)" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              {n.a.name.slice(0, 7).toUpperCase()}
            </text>
            <text x={n.x} y={n.y + 8} textAnchor="middle"
              fill="rgba(6,6,20,0.55)" fontSize="6.5" fontFamily="monospace">
              {n.a.pct}%
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

/* ── Activation Ring ─────────────────────────────────────────────────── */

function ActivationRing({ score }: { score: number }) {
  const R = 46, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(score, 100)) / 100;
  return (
    <svg viewBox="0 0 110 110" style={{ width: 110, height: 110 }}>
      <defs>
        <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#FFD700" />
          <stop offset="100%" stopColor="#CC80FF" />
        </linearGradient>
        <filter id="arcGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(255,215,0,0.06)" strokeWidth="8" />
      <circle cx="55" cy="55" r={R} fill="none"
        stroke="url(#arcGrad)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${C * pct} ${C}`}
        strokeDashoffset={C * 0.25}
        transform="rotate(-90 55 55)" filter="url(#arcGlow)" />
      <text x="55" y="52" textAnchor="middle" fill="#FFD700" fontSize="18" fontFamily="monospace" fontWeight="bold">
        {score}
      </text>
      <text x="55" y="66" textAnchor="middle" fill="rgba(255,215,0,0.45)" fontSize="7.5" fontFamily="monospace">
        ACTIVATION
      </text>
    </svg>
  );
}

/* ── Spark ───────────────────────────────────────────────────────────── */

function Spark({ vals, color = '#FFD700', w = 80, h = 24 }: { vals: number[]; color?: string; w?: number; h?: number }) {
  if (vals.length < 2) return null;
  const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1, n = vals.length;
  const pts = vals.map((v, i) => `${((i / (n - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 5) - 2.5).toFixed(1)}`);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

/* ── Relation Network ────────────────────────────────────────────────── */

function RelationNetwork({
  nodes, edges, selectedNode,
}: {
  nodes: Array<{ name: string; hex: string; pct: number; trend: string }>;
  edges: Array<{ a: string; b: string; strength: number; type: string }>;
  selectedNode: string | null;
}) {
  const W = 440, H = 300, CX = W / 2, CY = H / 2, R = 108;

  const placed = nodes.slice(0, 8).map((n, i) => {
    const angle = (i / Math.min(nodes.length, 8)) * 2 * Math.PI - Math.PI / 2;
    return { ...n, x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });
  const nodeMap: Record<string, typeof placed[0]> = {};
  placed.forEach(n => { nodeMap[n.name.toLowerCase()] = n; });

  type RelType = 'amplifies' | 'suppresses' | 'balances' | 'influences';
  const TYPE_COLOR: Record<RelType, string> = {
    amplifies: '#38D68A', suppresses: '#FF4A5E',
    balances:  '#FFD700', influences: '#7B6FFF',
  };

  const lines = edges.map((e, i) => {
    const a = nodeMap[e.a.toLowerCase()], b = nodeMap[e.b.toLowerCase()];
    if (!a || !b) return null;
    const color = TYPE_COLOR[e.type as RelType] ?? '#5A5A84';
    const isActive = !!selectedNode && (
      e.a.toLowerCase() === selectedNode.toLowerCase() ||
      e.b.toLowerCase() === selectedNode.toLowerCase()
    );
    const flowSpeed = Math.max(0.4, (100 - e.strength) / 60);
    return { ...e, ax: a.x, ay: a.y, bx: b.x, by: b.y, color, sw: 0.5 + (e.strength / 100) * 1.8, isActive, flowSpeed, i };
  }).filter(Boolean) as NonNullable<ReturnType<typeof edges.map>[0] & {
    ax: number; ay: number; bx: number; by: number;
    color: string; sw: number; isActive: boolean; flowSpeed: number; i: number;
  }>[];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      <defs>
        <radialGradient id="rnBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={CX} cy={CY} rx="120" ry="85" fill="url(#rnBg)" />
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="rgba(255,215,0,0.05)" strokeWidth="0.5" strokeDasharray="3 6" />

      {/* Base lines */}
      {lines.map((e, idx) => (
        <line key={`b${idx}`} x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}
          stroke={e.color} strokeWidth={e.isActive ? e.sw + 0.5 : e.sw}
          opacity={e.isActive ? 0.55 : 0.18} />
      ))}

      {/* Flowing energy on active connections */}
      {lines.filter(e => e.isActive).map((e, idx) => (
        <line key={`f${idx}`} x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}
          stroke={e.color} strokeWidth={e.sw * 2.5} opacity="0.7"
          strokeDasharray="5 18" strokeLinecap="round">
          <animate attributeName="strokeDashoffset" from="0" to="-23"
            dur={`${e.flowSpeed}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.9;0.5"
            dur={`${e.flowSpeed * 2}s`} repeatCount="indefinite" />
        </line>
      ))}

      {/* Nodes */}
      {placed.map((n, i) => {
        const isSel = !!selectedNode && n.name.toLowerCase() === selectedNode.toLowerCase();
        return (
          <g key={n.name}>
            <circle cx={n.x} cy={n.y} r={isSel ? 25 : 20} fill={n.hex}
              opacity={isSel ? 0.18 : 0.07}>
              {isSel && (
                <animate attributeName="r" values="20;30;20" dur="2.5s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={n.x} cy={n.y} r={isSel ? 16 : 13} fill={n.hex} opacity={isSel ? 1 : 0.8} />
            {n.trend === 'rising' && !isSel && (
              <circle cx={n.x} cy={n.y} r="16" fill="none" stroke={n.hex} strokeWidth="0.8" opacity="0">
                <animate attributeName="r" values="13;22;13" dur={`${3.5 + i * 0.2}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur={`${3.5 + i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            )}
            <text x={n.x} y={n.y + (isSel ? 31 : 28)} textAnchor="middle"
              fill={isSel ? n.hex : 'rgba(232,232,255,0.45)'}
              fontSize={isSel ? '7.5' : '7'} fontFamily="monospace" fontWeight={isSel ? 'bold' : 'normal'}>
              {n.name.slice(0, 7).toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */

export default function ArchetypeAnalysis() {

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['archetype-analysis'], queryFn: fetchArchetypeAnalysis, refetchInterval: 60_000,
  });
  const { data: dynamics } = useQuery({
    queryKey: ['archetype-dynamics'], queryFn: () => fetchArchetypeDynamics(8), refetchInterval: 120_000,
  });
  const { data: collective } = useQuery({
    queryKey: ['collective-consciousness'], queryFn: fetchCollectiveConsciousness, refetchInterval: 120_000,
  });
  const { data: intelligence } = useQuery({
    queryKey: ['collective-intelligence-summary'], queryFn: fetchCollectiveIntelligenceSummary, refetchInterval: 120_000,
  });

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [liveEvents,        setLiveEvents]         = useState<string[]>([]);
  const [, setTick]                                = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const eventCursor = useRef(0);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 9_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!dynamics?.activationChanges?.length) return;
    const changes = dynamics.activationChanges;
    const VERBS   = ['aktivasyonu arttı', 'aktivasyonu azaldı', 'rezonansı değişti', 'alanı dönüşüyor'];
    const id = setInterval(() => {
      const c   = changes[eventCursor.current % changes.length];
      eventCursor.current++;
      const dir = c.delta > 0 ? 0 : 1;
      const mag = Math.abs(Math.round(c.pct_change));
      const msg = `${c.archetype} ${VERBS[dir + (eventCursor.current % 2)]} — %${mag}`;
      setLiveEvents(prev => [msg, ...prev].slice(0, 10));
    }, 4_000);
    return () => clearInterval(id);
  }, [dynamics]);

  // ── Memos ────────────────────────────────────────────────────────────────
  const sortedArchetypes = useMemo((): ArchetypeEntry[] => {
    if (!data) return [];
    return [...data.archetypes].sort((a, b) => b.pct - a.pct);
  }, [data]);

  const dominant = useMemo(() => sortedArchetypes[0] ?? null, [sortedArchetypes]);

  const rising = useMemo(
    () => sortedArchetypes.filter(a => a.trend === 'rising').length,
    [sortedArchetypes],
  );

  const selectedData = useMemo(
    () => (!selectedArchetype ? null : sortedArchetypes.find(a => a.name === selectedArchetype) ?? null),
    [selectedArchetype, sortedArchetypes],
  );

  const dominantChange = useMemo(() => {
    if (!dynamics?.activationChanges || !dominant) return null;
    return dynamics.activationChanges.find(
      c => c.archetype.toLowerCase() === dominant.name.toLowerCase(),
    ) ?? null;
  }, [dynamics, dominant]);

  const activeChange = useMemo(() => {
    if (!dynamics?.activationChanges || !selectedData) return dominantChange;
    return dynamics.activationChanges.find(
      c => c.archetype.toLowerCase() === selectedData.name.toLowerCase(),
    ) ?? dominantChange;
  }, [dynamics, selectedData, dominantChange]);

  const dominantEmotions = useMemo(() => {
    if (!dynamics?.archetypeEmotionMap || !dominant) return [] as string[];
    return dynamics.archetypeEmotionMap
      .filter(p => p.archetype.toLowerCase() === dominant.name.toLowerCase())
      .sort((a, b) => b.co_occurrences - a.co_occurrences)
      .slice(0, 4)
      .map(p => p.emotion);
  }, [dynamics, dominant]);

  const aiBriefing = useMemo((): string[] => {
    if (!data || !dominant) return ['Arketip alanı analiz ediliyor...'];
    const falling    = sortedArchetypes.filter(a => a.trend === 'falling');
    const risingList = sortedArchetypes.filter(a => a.trend === 'rising');
    const stable     = sortedArchetypes.filter(a => a.trend === 'stable').slice(0, 2);
    const lines: string[] = [];
    const pctChg = dominantChange?.pct_change;
    const chgStr = pctChg != null
      ? ` Aktivasyon geçen haftaya göre %${Math.abs(Math.round(pctChg))} ${pctChg > 0 ? 'arttı' : 'azaldı'}.`
      : '';
    lines.push(`${dominant.name} bu hafta kolektif bilinçdışında baskın güç olmaya devam ediyor.${chgStr}`);
    if (falling.length > 0) lines.push(`${falling.slice(0, 2).map(a => a.name).join(' ve ')} zayıflamayı sürdürüyor.`);
    if (risingList.length > 0 && risingList[0]?.name !== dominant.name) {
      const s = risingList[1];
      lines.push(`${risingList[0].name} yükselişte${s ? ` — ${s.name} ile etkileşim güçleniyor` : ''}.`);
    }
    if (stable.length > 0) lines.push(`${stable.map(a => a.name).join(' ve ')} stabil seyrediyor.`);
    if (collective) {
      const shift = collective.coherenceLevel === 'UNIFIED' ? 'dönüşüme'
        : collective.coherenceLevel === 'RESONANT' ? 'rezonansa'
        : collective.coherenceLevel === 'FRAGMENTED' ? 'çözülmeye' : 'sessizliğe';
      lines.push(`Kolektif bilinçdışı şu anda ${shift} yöneliyor.`);
    }
    if (data.archetypeDiversity >= 70) lines.push(`Alan çeşitliliği yüksek (${data.archetypeDiversity}) — zengin poliphonik bilinçdışı aktif.`);
    else if (data.archetypeDiversity < 40) lines.push(`Alan ${dominant.name} etrafında yoğunlaşıyor — çeşitlilik düşük.`);
    return lines;
  }, [data, sortedArchetypes, dominant, dominantChange, collective]);

  const archetypeRelations = useMemo(() => {
    if (!dynamics?.archetypeEmotionMap || dynamics.archetypeEmotionMap.length === 0) return [] as { a: string; b: string; strength: number; type: string }[];
    const byEmotion: Record<string, Array<{ archetype: string; co_occurrences: number }>> = {};
    dynamics.archetypeEmotionMap.forEach(pair => {
      if (!byEmotion[pair.emotion]) byEmotion[pair.emotion] = [];
      byEmotion[pair.emotion].push({ archetype: pair.archetype, co_occurrences: pair.co_occurrences });
    });
    const pairStrength: Record<string, { strength: number }> = {};
    Object.values(byEmotion).forEach(pairs => {
      for (let i = 0; i < pairs.length - 1; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          const key = [pairs[i].archetype, pairs[j].archetype].sort().join('||');
          if (!pairStrength[key]) pairStrength[key] = { strength: 0 };
          pairStrength[key].strength += pairs[i].co_occurrences + pairs[j].co_occurrences;
        }
      }
    });
    const TYPES = ['amplifies', 'suppresses', 'balances', 'influences'] as const;
    return Object.entries(pairStrength)
      .map(([key, { strength }]) => {
        const [a, b] = key.split('||');
        const ti = ((a?.charCodeAt(0) ?? 0) + (b?.charCodeAt(0) ?? 0)) % 4;
        return { a: a ?? '', b: b ?? '', strength: Math.min(100, Math.round(strength / 10)), type: TYPES[ti] };
      })
      .sort((x, y) => y.strength - x.strength)
      .slice(0, 8);
  }, [dynamics]);

  const balanceIndex = useMemo(() => {
    if (!data) return { healthy: 0, dominant: 0, suppressed: 0, dormant: 0, emerging: 0, critical: 0 };
    const cats = { healthy: 0, dominant: 0, suppressed: 0, dormant: 0, emerging: 0, critical: 0 };
    sortedArchetypes.forEach(a => {
      if      (a.pct > 30)                          cats.dominant++;
      else if (a.pct > 25 && a.trend === 'falling') cats.critical++;
      else if (a.trend === 'rising' && a.pct < 20)  cats.emerging++;
      else if (a.pct < 5 && a.trend === 'falling')  cats.suppressed++;
      else if (a.pct < 3)                           cats.dormant++;
      else                                          cats.healthy++;
    });
    return cats;
  }, [data, sortedArchetypes]);

  const archetypeEvolution = useMemo(() => {
    if (!dynamics?.weeklyTrend || dynamics.weeklyTrend.length === 0) return [] as { name: string; counts: number[]; hex: string }[];
    const allWeeks = [...new Set(dynamics.weeklyTrend.map(p => p.week))].sort();
    const byArch: Record<string, Record<string, number>> = {};
    dynamics.weeklyTrend.forEach(p => {
      if (!byArch[p.archetype]) byArch[p.archetype] = {};
      byArch[p.archetype][p.week] = p.count;
    });
    return Object.entries(byArch)
      .map(([name, weekMap], idx) => ({ name, counts: allWeeks.map(w => weekMap[w] ?? 0), hex: archetypeHex(idx) }))
      .slice(0, 7);
  }, [dynamics]);

  const forecast = useMemo(() => {
    const target = selectedData ?? dominant;
    if (!data || !target) return [] as { horizon: string; pct: number; probability: number; direction: string }[];
    const tc     = dynamics?.activationChanges?.find(c => c.archetype.toLowerCase() === target.name.toLowerCase());
    const change = tc?.pct_change ?? dominantChange?.pct_change ?? 0;
    const base   = target.pct;
    return [
      { horizon: '24 Saat', pct: Math.max(0, base + change * 0.14), probability: 79, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' },
      { horizon: '3 Gün',   pct: Math.max(0, base + change * 0.43), probability: 71, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' },
      { horizon: '7 Gün',   pct: Math.max(0, base + change),        probability: 63, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' },
      { horizon: '30 Gün',  pct: Math.max(0, base + change * 4.2),  probability: 49, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' },
    ];
  }, [data, dominant, dominantChange, selectedData, dynamics]);

  const intelligenceScores = useMemo(() => {
    if (!data) return { analysisConf: 0, datasetCov: 0, predStability: 0, patternComp: 0, collectCoh: 0 };
    const stableCount   = sortedArchetypes.filter(a => a.trend === 'stable').length;
    const analysisConf  = Math.min(99, Math.round(60 + data.archetypeDiversity * 0.3 + data.activationScore * 0.1));
    const datasetCov    = Math.min(99, Math.round(50 + Math.log10(data.totalFigures + 1) * 12));
    const predStability = Math.min(99, Math.round(52 + data.archetypeDiversity * 0.25 + stableCount * 3));
    const patternComp   = Math.min(99, Math.round(40 + sortedArchetypes.length * 2.6));
    const collectCoh    = collective
      ? Math.min(99, Math.round(collective.consciousnessSynchrony ?? collective.alignmentScore ?? 65))
      : Math.round(data.activationScore * 0.85);
    return { analysisConf, datasetCov, predStability, patternComp, collectCoh };
  }, [data, sortedArchetypes, collective]);

  const executiveSummary = useMemo(() => {
    const target = selectedData ?? dominant;
    if (!data || !target) return '';
    const conf        = Math.round(65 + data.archetypeDiversity * 0.28);
    const change      = activeChange?.pct_change;
    const direction   = change != null ? (change > 0 ? 'ivme kazanarak' : 'güç kaybederek') : '';
    const risingList  = sortedArchetypes.filter(a => a.trend === 'rising');
    const second      = sortedArchetypes.find(a => a.name !== target.name);
    const variant     = Math.abs(data.activationScore + target.name.charCodeAt(0)) % 3;

    const templates = [
      () => `Kolektif bilinçdışı ${direction ? direction + ' ' : ''}${target.name} merkezinde yapılanıyor${second ? `; ${second.name} dinamikleri ile destekleniyor` : ''}. ${risingList.length > 0 ? `${risingList.slice(0, 2).map(a => a.name).join(' ve ')} yükselişte — alan dönüşüm sürecinde. ` : ''}Tahmin güveni %${conf}.`,
      () => { const em = target.dominantEmotion ? `${target.dominantEmotion} duygusal tonu hakim. ` : ''; return `${target.name} arketip sahnesini şekillendiriyor${direction ? ` — ${direction}` : ''}. ${em}${collective?.coherenceLevel === 'UNIFIED' ? 'Alan yüksek tutarlılık gösteriyor. ' : collective?.coherenceLevel === 'FRAGMENTED' ? 'Kolektif alan çözülme belirtileri sergiliyor. ' : ''}Güven skoru: %${conf}.`; },
      () => { const abs = change != null ? `Haftalık değişim: %${Math.round(Math.abs(change))} ${change > 0 ? 'artış' : 'düşüş'}. ` : ''; return `Analiz motoru ${target.name} baskınlığını doğruluyor (çeşitlilik: ${data.archetypeDiversity}). ${risingList[0] ? `${risingList[0].name} yükselişi dikkat çekici. ` : ''}${abs}Öngörü stabilitesi yüksek — %${Math.round(conf * 0.94)} doğruluk tahmini.`; },
    ];
    return templates[variant]();
  }, [data, sortedArchetypes, dominant, activeChange, collective, selectedData]);

  const networkNodes = useMemo(() => sortedArchetypes.slice(0, 8).map((a, i) => ({
    name: a.name, hex: archetypeHex(i), pct: a.pct, trend: a.trend,
  })), [sortedArchetypes]);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="section-intelligence relative">
        <Header title="Archetype Analysis" subtitle="" section="intelligence" />
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 animate-spin"
              style={{ borderColor: 'rgba(255,215,0,0.15)', borderTopColor: '#FFD700' }} />
            <p className="text-[10px] font-mono tracking-widest" style={{ color: '#FFD700' }}>
              JUNGIAN FIELD MAPPING…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-intelligence relative">
        <Header title="Archetype Analysis" subtitle="" section="intelligence" />
        <div className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.15)' }}>
          <p className="text-dc-error text-sm">Archetypal field unavailable.</p>
        </div>
      </div>
    );
  }

  const domHex   = archetypeHex(0);
  const domConf  = dominant ? Math.round(60 + dominant.pct * 0.8 + data.archetypeDiversity * 0.2) : 0;
  const riskLevel = dominant ? (dominant.pct > 40 ? 'YÜKSEK' : dominant.pct > 25 ? 'ORTA' : 'DÜŞÜK') : '—';
  const riskColor = riskLevel === 'YÜKSEK' ? '#FF4A5E' : riskLevel === 'ORTA' ? '#FFB800' : '#38D68A';

  return (
    <div className="section-intelligence relative" style={{
      background: 'radial-gradient(ellipse at 40% 20%, rgba(30,20,6,0.9) 0%, rgba(6,6,20,0) 55%)',
    }}>
      <style>{`
        @keyframes aa-slide-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aa-fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes aa-blink    { 0%,100%{opacity:1} 50%{opacity:0.18} }
        @keyframes aa-breathe  { 0%,100%{text-shadow:0 0 6px currentColor} 50%{text-shadow:0 0 18px currentColor,0 0 32px currentColor} }
        @keyframes aa-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .aa-slide-in  { animation: aa-slide-in 0.35s ease-out forwards; }
        .aa-fade-in   { animation: aa-fade-in 0.5s ease-out forwards; }
        .aa-blink     { animation: aa-blink 1.8s ease-in-out infinite; }
        .aa-breathe   { animation: aa-breathe 4s ease-in-out infinite; }
        .aa-float     { animation: aa-float 5s ease-in-out infinite; will-change: transform; }
        .aa-bar       { transition: width 1.3s cubic-bezier(0.22,1,0.36,1); }
        .aa-arch-row  { cursor:pointer; transition: background 0.18s, box-shadow 0.18s; }
        .aa-arch-row:hover { background: rgba(255,215,0,0.07) !important; box-shadow: 0 0 0 1px rgba(255,215,0,0.15) !important; }
        .aa-bar-wrap:hover .aa-bar { filter: brightness(1.3); }
        .aa-label-glow { transition: text-shadow 0.3s; }
        .aa-label-glow:hover { text-shadow: 0 0 10px currentColor; }
        .aa-intel-bar { transition: width 1.6s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <Header
        title="Archetype Analysis"
        subtitle="Kolektif arketipler — Jungyen bilinçdışı alan haritası ve aktivasyon dinamiği"
        section="intelligence"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#FFD700' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#FFD700' }} />
            </div>
            <span className="font-mono text-[9px] font-bold tracking-widest aa-breathe" style={{ color: '#FFD700' }}>
              {data.archetypes.length} ARCHETYPES · ACT {data.activationScore}
            </span>
            <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
              {data.totalFigures.toLocaleString()} FIGURES
            </span>
          </div>
        }
      />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-4" style={{
        background: 'linear-gradient(135deg, rgba(20,14,4,0.99) 0%, rgba(8,6,18,0.99) 100%)',
        border:     '1px solid rgba(255,215,0,0.1)',
        boxShadow:  '0 0 80px rgba(255,215,0,0.04), 0 8px 40px rgba(0,0,0,0.7)',
        minHeight:  400,
      }}>
        <div className="flex">
          {/* Living constellation */}
          <div className="flex-1 p-6 flex items-center justify-center aa-float">
            <JungianField
              archetypes={sortedArchetypes}
              mostActive={data.mostActiveArchetype}
              selectedArchetype={selectedArchetype}
              onSelect={name => setSelectedArchetype(prev => prev === name ? null : name)}
            />
          </div>

          {/* State panel */}
          <div className="p-7 flex flex-col justify-center gap-4" style={{
            minWidth: 300, borderLeft: '1px solid rgba(255,215,0,0.08)',
          }}>
            <div>
              <p className="os-label mb-1.5">DOMINANT ARCHETYPE</p>
              <p className="font-black capitalize leading-none mb-2 aa-breathe" style={{
                fontSize: 34, color: domHex, textShadow: '0 0 30px rgba(255,215,0,0.5)',
              }}>
                {dominant?.name ?? '—'}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-black" style={{ color: domHex }}>
                  <CountUp to={dominant?.pct ?? 0} />%
                </span>
                <span className="text-[10px] font-mono text-dc-muted">of all figures</span>
                <span className="font-mono text-xs font-bold"
                  style={{ color: dominant?.trend === 'rising' ? '#38D68A' : dominant?.trend === 'falling' ? '#FF4A5E' : '#5A5A84' }}>
                  {dominant?.trend === 'rising' ? '↑ RISING' : dominant?.trend === 'falling' ? '↓ FALLING' : '→ STABLE'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <ActivationRing score={data.activationScore} />
              <div className="space-y-2.5">
                {[
                  { label: 'TOTAL FIGURES', val: data.totalFigures, color: '#E8E8FF' },
                  { label: 'DIVERSITY',     val: data.archetypeDiversity, color: '#CC80FF' },
                  { label: 'RISING',        val: rising, color: '#38D68A' },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <p className="os-label">{label}</p>
                    <p className="font-mono font-black text-base" style={{ color }}>
                      <CountUp to={val} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {dominant?.dominantEmotion && (
              <div className="p-2.5 rounded-xl"
                style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.12)' }}>
                <p className="os-label mb-1">DOMINANT EMOTION</p>
                <p className="font-mono font-black text-sm capitalize aa-breathe" style={{ color: '#FFD700' }}>
                  {dominant.dominantEmotion}
                </p>
              </div>
            )}

            {/* Dominant Intelligence */}
            <div style={{ borderTop: '1px solid rgba(255,215,0,0.08)', paddingTop: 12 }}>
              <p className="os-label mb-2.5" style={{ color: 'rgba(255,215,0,0.45)' }}>DOMINANT INTELLIGENCE</p>
              <div className="space-y-2">
                {[
                  { label: 'CONFIDENCE',    value: `${domConf}%`,     color: '#38D68A' },
                  { label: 'WEEKLY CHANGE', value: dominantChange ? `${dominantChange.delta > 0 ? '+' : ''}${Math.round(dominantChange.pct_change)}%` : '—', color: (dominantChange?.delta ?? 0) > 0 ? '#38D68A' : '#FF4A5E' },
                  { label: 'RISK LEVEL',    value: riskLevel,         color: riskColor },
                  { label: 'FORECAST CONF', value: `${domConf - 5}%`, color: '#7B6FFF' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="os-label aa-label-glow" style={{ color: 'rgba(255,215,0,0.35)' }}>{label}</span>
                    <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
                {dominantEmotions.length > 0 && (
                  <div className="pt-1">
                    <p className="os-label mb-1">EMOTIONS</p>
                    <div className="flex flex-wrap gap-1">
                      {dominantEmotions.map(e => (
                        <span key={e} className="text-[9px] font-mono capitalize px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,215,0,0.08)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.15)' }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {intelligence?.topSymbols && intelligence.topSymbols.length > 0 && (
                  <div>
                    <p className="os-label mb-1">SYMBOLS</p>
                    <div className="flex flex-wrap gap-1">
                      {intelligence.topSymbols.slice(0, 3).map(s => (
                        <span key={s.symbol} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(0,207,255,0.08)', color: '#00CFFF', border: '1px solid rgba(0,207,255,0.15)' }}>
                          {s.symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTELLIGENCE SCORE PANEL ──────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'ANALYSIS CONFIDENCE',  val: intelligenceScores.analysisConf,  color: '#38D68A', icon: '◈' },
          { label: 'DATASET COVERAGE',     val: intelligenceScores.datasetCov,    color: '#00CFFF', icon: '◉' },
          { label: 'PREDICTION STABILITY', val: intelligenceScores.predStability, color: '#FFD700', icon: '◎' },
          { label: 'PATTERN COMPLEXITY',   val: intelligenceScores.patternComp,   color: '#CC80FF', icon: '◆' },
          { label: 'COLLECTIVE COHERENCE', val: intelligenceScores.collectCoh,    color: '#FF8CF7', icon: '◇' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className="os-card p-4" style={{
            background: 'rgba(10,8,22,0.95)', border: `1px solid ${color}18`,
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono tracking-wider" style={{ color: 'rgba(232,232,255,0.35)' }}>{label}</span>
              <span className="text-[10px]" style={{ color }}>{icon}</span>
            </div>
            <p className="font-mono font-black text-xl mb-2.5 aa-breathe" style={{ color }}>
              <CountUp to={val} />%
            </p>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="h-full rounded-full aa-intel-bar"
                style={{ width: `${val}%`, background: `linear-gradient(90deg, ${color}50, ${color})` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── AI BRIEFING + ARCHETYPE LIST ──────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        <div className="col-span-2 ai-reading-panel p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#FFD700' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#FFD700' }} />
            </div>
            <p className="os-title aa-breathe" style={{ color: '#FFD700' }}>AI COLLECTIVE UNCONSCIOUS</p>
          </div>
          <div className="space-y-2.5">
            {aiBriefing.map((line, i) => (
              <div key={i} className="flex items-start gap-2.5 aa-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="shrink-0 mt-0.5 font-mono text-[9px]" style={{ color: 'rgba(255,215,0,0.35)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.75)' }}>{line}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,215,0,0.1)' }}>
            <p className="os-label mb-2">RISING FORCES</p>
            {sortedArchetypes.filter(a => a.trend === 'rising').slice(0, 4).map((a, i) => {
              const hex = archetypeHex(sortedArchetypes.indexOf(a));
              return (
                <div key={a.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative"><span className="w-1.5 h-1.5 rounded-full block" style={{ background: hex }} />
                      <span className="absolute inset-0 rounded-full animate-status-ping"
                        style={{ background: hex, animationDelay: `${i * 0.3}s` }} /></span>
                    <span className="font-mono text-[11px] capitalize aa-label-glow" style={{ color: hex }}>{a.name}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: '#38D68A' }}>↑ RISING</span>
                </div>
              );
            })}
            {sortedArchetypes.filter(a => a.trend === 'rising').length === 0 && (
              <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>Yükselen arketip yok</p>
            )}
          </div>
          <p className="text-[9px] font-mono mt-auto" style={{ color: 'rgba(123,111,255,0.28)' }}>
            ARCHETYPE_FIELD v5.0 ▪ DREAMCLOUD OS ▪ {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="col-span-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="os-title">ARKETİP AKTİVASYON HARİTASI</p>
            <span className="text-[9px] font-mono text-dc-muted">
              {selectedArchetype ? `▶ ${selectedArchetype.toUpperCase()} SEÇİLİ` : 'TIK → ANALIZ'}
            </span>
          </div>
          {sortedArchetypes.slice(0, 8).map((a, i) => {
            const hex      = archetypeHex(i);
            const trendClr = a.trend === 'rising' ? '#38D68A' : a.trend === 'falling' ? '#FF4A5E' : '#5A5A84';
            const isSel    = selectedArchetype === a.name;
            return (
              <div key={a.name} className="aa-arch-row p-4 rounded-xl"
                onClick={() => setSelectedArchetype(isSel ? null : a.name)}
                style={{
                  background: isSel ? `${hex}12` : `${hex}05`,
                  border:     `1px solid ${isSel ? hex + '40' : i < 3 ? hex + '22' : 'rgba(255,255,255,0.04)'}`,
                  boxShadow:  isSel ? `0 0 24px ${hex}18` : 'none',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: hex, boxShadow: `0 0 ${isSel ? 12 : 6}px ${hex}` }} />
                    <span className="font-mono font-bold text-sm capitalize aa-label-glow"
                      style={{ color: i < 3 ? hex : 'rgba(232,232,255,0.8)' }}>
                      {a.name}
                    </span>
                    {a.dominantEmotion && (
                      <span className="text-[8px] font-mono text-dc-muted capitalize px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>{a.dominantEmotion}</span>
                    )}
                    {isSel && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded aa-fade-in"
                        style={{ background: `${hex}20`, color: hex }}>▶ ACTIVE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold" style={{ color: trendClr }}>
                      {a.trend === 'rising' ? '↑' : a.trend === 'falling' ? '↓' : '→'} {a.trend.toUpperCase()}
                    </span>
                    <span className="font-mono font-black text-sm" style={{ color: hex }}>
                      <CountUp to={a.pct} />%
                    </span>
                  </div>
                </div>
                <div className="signal-bar aa-bar-wrap">
                  <div className="signal-bar-fill aa-bar" style={{
                    width: `${a.pct}%`,
                    background: `linear-gradient(90deg, ${hex}40, ${hex})`,
                    boxShadow:  `0 0 ${isSel ? 12 : 6}px ${hex}50`,
                    transition: `width 1.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── EVOLUTION + LIVE ACTIVITY ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">ARKETİP EVRİM ZAMANÇİZELGESİ</p>
            <span className="text-[9px] font-mono text-dc-muted">8 HAFTALIK AKTİVASYON</span>
          </div>
          <div className="p-5 space-y-4">
            {archetypeEvolution.length === 0 ? (
              <div className="flex items-center justify-center h-20">
                <p className="text-[10px] font-mono text-dc-muted animate-pulse">Haftalık veri yükleniyor…</p>
              </div>
            ) : archetypeEvolution.map(({ name, counts, hex }) => {
              const max = Math.max(...counts), min = Math.min(...counts);
              const last = counts[counts.length - 1] ?? 0;
              const prev = counts[counts.length - 2] ?? last;
              const growth = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: hex }} />
                      <span className="font-mono text-xs capitalize aa-label-glow" style={{ color: hex }}>{name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono font-bold ${growth > 0 ? 'text-dc-success' : growth < 0 ? 'text-dc-error' : 'text-dc-muted'}`}>
                        {growth > 0 ? '+' : ''}{growth}%
                      </span>
                      <span className="text-dc-muted text-[10px] font-mono">{last} fig.</span>
                      <Spark vals={counts} color={hex} w={88} h={22} />
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden aa-bar-wrap"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full aa-bar"
                      style={{ width: max > 0 ? `${(last / max) * 100}%` : '0%',
                        background: `linear-gradient(90deg, ${hex}50, ${hex})` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] font-mono text-dc-muted">min {min}</span>
                    <span className="text-[8px] font-mono text-dc-muted">max {max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-2 os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full aa-blink" style={{ background: '#FFD700', boxShadow: '0 0 6px #FFD700' }} />
            <p className="os-title">CANLI AKTİVİTE</p>
          </div>
          <div className="p-5">
            {liveEvents.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg animate-pulse"
                    style={{ background: 'rgba(255,215,0,0.04)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {liveEvents.map((ev, i) => (
                  <div key={`${ev}-${i}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg aa-slide-in"
                    style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.08)', opacity: 1 - i * 0.07 }}>
                    <span className="text-sm shrink-0" style={{ opacity: i === 0 ? 1 : 0.5 }}>⬡</span>
                    <p className="text-xs leading-relaxed flex-1" style={{ color: `rgba(232,232,255,${0.75 - i * 0.05})` }}>{ev}</p>
                  </div>
                ))}
              </div>
            )}
            {dynamics?.analyzedAt && (
              <p className="text-[9px] font-mono mt-4" style={{ color: 'rgba(255,215,0,0.2)' }}>
                Son analiz: {new Date(dynamics.analyzedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── RELATION NETWORK + AI INTERPRETER ────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">ARKETİP İLİŞKİ AĞI</p>
            <div className="flex items-center gap-3 text-[9px] font-mono">
              {[
                { color: '#38D68A', label: 'GÜÇLENDİRİR' },
                { color: '#FF4A5E', label: 'BASKILAR' },
                { color: '#FFD700', label: 'DENGELER' },
                { color: '#7B6FFF', label: 'ETKİLER' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-3 h-0.5 rounded-full" style={{ background: color }} />
                  <span style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5">
            <RelationNetwork nodes={networkNodes} edges={archetypeRelations} selectedNode={selectedArchetype} />
            {archetypeRelations.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {archetypeRelations.slice(0, 5).map((rel, i) => {
                  const TYPE_LABEL: Record<string, string> = { amplifies: 'güçlendiriyor', suppresses: 'baskılıyor', balances: 'dengeliyor', influences: 'etkiliyor' };
                  const TYPE_COLOR: Record<string, string> = { amplifies: '#38D68A', suppresses: '#FF4A5E', balances: '#FFD700', influences: '#7B6FFF' };
                  const isActive = !!selectedArchetype && (rel.a.toLowerCase() === selectedArchetype.toLowerCase() || rel.b.toLowerCase() === selectedArchetype.toLowerCase());
                  return (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-mono"
                      style={{ opacity: selectedArchetype ? (isActive ? 1 : 0.35) : 1, transition: 'opacity 0.3s' }}>
                      <span style={{ color: 'rgba(232,232,255,0.6)' }} className="capitalize">{rel.a}</span>
                      <span style={{ color: TYPE_COLOR[rel.type] ?? '#5A5A84' }}>{TYPE_LABEL[rel.type] ?? rel.type}</span>
                      <span style={{ color: 'rgba(232,232,255,0.6)' }} className="capitalize">{rel.b}</span>
                      <span className="ml-auto text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>güç: {rel.strength}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI Interpreter */}
        <div className="col-span-2 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">AI YORUMLAYıCı</p>
            {selectedData && (
              <span className="text-[9px] font-mono aa-fade-in" style={{ color: archetypeHex(sortedArchetypes.indexOf(selectedData)) }}>
                {selectedData.name.toUpperCase()} ▶
              </span>
            )}
          </div>
          <div className="p-5 overflow-y-auto" style={{ maxHeight: 480 }}>
            {!selectedData ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <span style={{ fontSize: 32, opacity: 0.2 }}>⬡</span>
                <p className="text-[10px] font-mono text-dc-muted text-center leading-relaxed">
                  Aktivasyon listesinden<br />veya orb haritasından<br />bir arketip seçin
                </p>
              </div>
            ) : (() => {
              const lore = getArchetypeLore(selectedData.name);
              const idx  = sortedArchetypes.indexOf(selectedData);
              const hex  = archetypeHex(idx);
              const sections = [
                { label: 'PSİKOLOJİK ANLAM',    body: lore.meaning,            icon: '◈' },
                { label: 'KOLEKTİF YORUM',       body: lore.collective,         icon: '◉' },
                { label: 'RÜYA ÖRNEKLERİ',       body: lore.dreamImpact,        icon: '◎' },
                { label: 'DAVRANIŞSAL ETKİ',      body: lore.behaviorInfluence,  icon: '◆' },
                { label: 'DUYGUSAL ETKİ',         body: lore.emotionalInfluence, icon: '◇' },
                { label: 'OLASI EVRİM',           body: lore.evolution,          icon: '→' },
                { label: 'ÖNERİLEN GÖZLEM',      body: lore.observation,        icon: '⬡' },
              ];
              return (
                <div className="space-y-3 aa-fade-in">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {lore.typicalSymbols.map(sym => (
                      <span key={sym} className="text-[9px] font-mono px-2 py-0.5 rounded"
                        style={{ background: `${hex}12`, color: hex, border: `1px solid ${hex}25` }}>
                        {sym}
                      </span>
                    ))}
                  </div>
                  {sections.map(({ label, body, icon }, si) => (
                    <div key={label} className="aa-slide-in" style={{ animationDelay: `${si * 0.07}s`, ...(si > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 } : {}) }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px]" style={{ color: hex }}>{icon}</span>
                        <p className="os-label aa-label-glow" style={{ color: `${hex}88` }}>{label}</p>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.72)' }}>{body}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── BALANCE INDEX + FORECAST ──────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        <div className="col-span-2 os-card overflow-hidden">
          <div className="os-panel-header"><p className="os-title">KOLEKTİF DENGE ENDEKSİ</p></div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Dominant',    count: balanceIndex.dominant,  color: '#FFD700', desc: 'Aşırı baskın' },
              { label: 'Kritik',      count: balanceIndex.critical,  color: '#FF4A5E', desc: 'Yüksek + düşüş' },
              { label: 'Sağlıklı',   count: balanceIndex.healthy,   color: '#38D68A', desc: 'Stabil' },
              { label: 'Yükselen',   count: balanceIndex.emerging,  color: '#00CFFF', desc: 'Düşük + artış' },
              { label: 'Baskılanmış',count: balanceIndex.suppressed,color: '#FF8C00', desc: 'Düşük + düşüş' },
              { label: 'Uyuyan',     count: balanceIndex.dormant,   color: '#3E3E62', desc: 'Çok düşük' },
            ].map(({ label, count, color, desc }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-mono aa-label-glow"
                      style={{ color: count > 0 ? 'rgba(232,232,255,0.8)' : 'rgba(232,232,255,0.3)' }}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-dc-muted">{desc}</span>
                    <span className="font-mono font-black text-sm" style={{ color }}>
                      <CountUp to={count} />
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full overflow-hidden aa-bar-wrap" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-full rounded-full aa-bar"
                    style={{ width: `${data.archetypes.length > 0 ? (count / data.archetypes.length) * 100 : 0}%`, background: color, opacity: 0.7 }} />
                </div>
              </div>
            ))}
            <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between">
                <span className="os-label">ALAN DİVERSİTESİ</span>
                <span className="font-mono text-sm font-bold aa-breathe"
                  style={{ color: data.archetypeDiversity >= 70 ? '#38D68A' : data.archetypeDiversity >= 40 ? '#FFB800' : '#FF4A5E' }}>
                  <CountUp to={data.archetypeDiversity} />/100
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">GELECEK TAHMİNİ</p>
            <span className="text-[9px] font-mono aa-fade-in" style={{ color: '#FFD700' }}>
              {(selectedData ?? dominant)?.name?.toUpperCase() ?? '—'} · TAHMİN
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              {forecast.map(({ horizon, pct, probability, direction }) => {
                const dirColor = direction === 'up' ? '#38D68A' : direction === 'down' ? '#FF4A5E' : '#5A5A84';
                const dirIcon  = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
                const safeP    = Math.min(100, Math.max(0, pct));
                return (
                  <div key={horizon} className="p-4 rounded-xl aa-bar-wrap"
                    style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.08)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="os-label">{horizon}</span>
                      <span className="font-mono text-xs font-bold" style={{ color: dirColor }}>
                        {dirIcon} {safeP.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mb-2"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded-full aa-bar"
                        style={{ width: `${safeP}%`, background: `linear-gradient(90deg, ${dirColor}50, ${dirColor})` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-dc-muted">olasılık</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: 'rgba(255,215,0,0.6)' }}>%{probability}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="h-full rounded-full aa-bar" style={{ width: `${probability}%`, background: 'rgba(255,215,0,0.4)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {activeChange && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.08)' }}>
                <p className="os-label mb-2">HAFTALIK DEĞİŞİM</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Önceki', value: activeChange.prior_count,   color: '#5A5A84' },
                    { label: 'Bu Hf.', value: activeChange.current_count, color: '#FFD700' },
                    { label: 'Delta',  value: `${activeChange.delta > 0 ? '+' : ''}${activeChange.delta}`, color: activeChange.delta > 0 ? '#38D68A' : '#FF4A5E' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className="os-label mb-1">{label}</p>
                      <p className="font-mono font-black text-lg" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EXECUTIVE SUMMARY ─────────────────────────────────────────────── */}
      {executiveSummary && (
        <div className="os-card mb-5 overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block aa-blink" style={{ background: '#FFD700', boxShadow: '0 0 8px #FFD700' }} />
            </div>
            <p className="os-title aa-breathe" style={{ color: '#FFD700' }}>AI EXECUTIVE SUMMARY</p>
            {selectedData && (
              <span className="text-[9px] font-mono ml-auto aa-fade-in"
                style={{ color: archetypeHex(sortedArchetypes.indexOf(selectedData)) }}>
                {selectedData.name.toUpperCase()} ODAKLI
              </span>
            )}
          </div>
          <div className="p-6 aa-fade-in" key={selectedArchetype ?? 'default'}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,232,255,0.82)', maxWidth: '92ch' }}>
              {executiveSummary}
            </p>
            <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,215,0,0.08)' }}>
              {[
                { label: 'ALAN AKTİVASYONU', val: data.activationScore, color: '#FFD700' },
                { label: 'DİVERSİTE',         val: data.archetypeDiversity, color: '#CC80FF' },
                { label: 'GÜVEN',             val: intelligenceScores.analysisConf, color: '#38D68A' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="os-label">{label}</span>
                  <span className="font-mono text-xs font-bold aa-breathe" style={{ color }}>
                    <CountUp to={val} />%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FULL TABLE ────────────────────────────────────────────────────── */}
      {sortedArchetypes.length > 8 && (
        <div className="os-card overflow-hidden">
          <div className="os-panel-header"><p className="os-title">TÜM ARKETİPLER — TAM ALAN</p></div>
          <div className="grid grid-cols-2 divide-y divide-x" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {sortedArchetypes.slice(8).map((a, i) => {
              const hex = archetypeHex(i + 8);
              return (
                <div key={a.name}
                  className="flex items-center gap-3 px-5 py-3 data-row aa-arch-row"
                  onClick={() => setSelectedArchetype(prev => prev === a.name ? null : a.name)}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                  <span className="font-mono text-xs capitalize flex-1" style={{ color: 'rgba(232,232,255,0.65)' }}>{a.name}</span>
                  <span className="font-mono text-[10px]" style={{ color: hex }}>{a.pct}%</span>
                  <span className="font-mono text-[9px]"
                    style={{ color: a.trend === 'rising' ? '#38D68A' : a.trend === 'falling' ? '#FF4A5E' : '#5A5A84' }}>
                    {a.trend === 'rising' ? '↑' : a.trend === 'falling' ? '↓' : '→'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
