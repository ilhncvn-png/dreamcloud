import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchSymbolAnalysis } from '../api/admin.api';

/* ── Styles ──────────────────────────────────────────────────────────── */

const SA_STYLES = `
@keyframes sa-float-a { 0%,100%{transform:translate(0px,0px);} 33%{transform:translate(2px,-4px);} 66%{transform:translate(-2px,2px);} }
@keyframes sa-float-b { 0%,100%{transform:translate(0px,0px);} 33%{transform:translate(-3px,3px);} 66%{transform:translate(3px,-2px);} }
@keyframes sa-float-c { 0%,100%{transform:translate(0px,0px);} 50%{transform:translate(1px,-5px);} }
.sa-float-a { animation: sa-float-a 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.sa-float-b { animation: sa-float-b 7.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.sa-float-c { animation: sa-float-c 5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes sa-orbit-cw  { from{transform:rotate(0deg);}  to{transform:rotate(360deg);}  }
@keyframes sa-orbit-ccw { from{transform:rotate(0deg);}  to{transform:rotate(-360deg);} }
.sa-orbit-cw  { animation: sa-orbit-cw  120s linear infinite; transform-box: fill-box; transform-origin: 240px 180px; }
.sa-orbit-ccw { animation: sa-orbit-ccw 90s  linear infinite; transform-box: fill-box; transform-origin: 240px 180px; }
@keyframes sa-constellation-shimmer {
  0%,100%{ stroke-opacity: 0.12; }
  50%     { stroke-opacity: 0.45; }
}
@keyframes sa-ticker { from{transform:translateX(0);} to{transform:translateX(-50%);} }
.sa-ticker-track { animation: sa-ticker 32s linear infinite; white-space:nowrap; }
@keyframes sa-sheen { 0%{left:-60%;} 100%{left:130%;} }
.sa-sheen { position:absolute;top:0;bottom:0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent);animation:sa-sheen 3s ease-in-out infinite;pointer-events:none;border-radius:inherit; }
@keyframes sa-fade-up { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
@keyframes sa-fade-in { from{opacity:0;transform:translateY(-3px);} to{opacity:1;transform:translateY(0);} }
.sa-fade-up { animation: sa-fade-up 0.28s ease-out; }
.sa-fade-in { animation: sa-fade-in 0.18s ease-out; }
.sa-card { transition: box-shadow 0.25s, border-color 0.25s, transform 0.2s; }
.sa-card:hover { box-shadow: 0 0 22px rgba(204,128,255,0.10), 0 4px 24px rgba(0,0,0,0.18); transform: translateY(-1px); }
@keyframes sa-border-pulse { 0%,100%{border-color:rgba(204,128,255,0.12);} 50%{border-color:rgba(204,128,255,0.28);} }
.sa-border-breathe { animation: sa-border-pulse 4s ease-in-out infinite; }
@keyframes sa-lc-glow { 0%,100%{box-shadow:0 0 0 rgba(123,111,255,0);} 50%{box-shadow:0 0 10px rgba(123,111,255,0.3);} }
.sa-lc-active { animation: sa-lc-glow 2.5s ease-in-out infinite; }
`;

/* ── Category colors ─────────────────────────────────────────────────── */

const CAT_COLORS: string[] = [
  '#CC80FF','#00CFFF','#FFB800','#38D68A','#FF8CF7',
  '#FF5C5C','#7B6FFF','#80E8FF','#FFD700','#FF8C00',
];

function catColor(cat: string, categories: string[]): string {
  const idx = categories.indexOf(cat);
  return CAT_COLORS[((idx % CAT_COLORS.length) + CAT_COLORS.length) % CAT_COLORS.length];
}

/* ── Intelligence constants ──────────────────────────────────────────── */

const SYMBOL_MEANINGS: Record<string, {
  psychological: string; collective: string; archetype: string; emotion: string;
  themes: string[]; prediction: string; riskLevel: string;
  growthReason: string; futureImportance: string; aiRecommendation: string;
  dreamCategories: string[];
}> = {
  water:  {
    psychological:'Bilinçaltı, duygusal derinlik ve dönüşüm arzusu',
    collective:'Kolektif arınma enerjisi — toplumun duygusal yükü dışarı atılıyor',
    archetype:'Büyük Ana', emotion:'Özgürleşme',
    themes:['arınma','dönüşüm','sezgi'],
    prediction:'Sonraki 7 günde %18 artış bekleniyor',
    riskLevel:'düşük',
    growthReason:'Mevsimsel geçiş dönemlerinde duygusal arınma ihtiyacı artıyor',
    futureImportance:'Kolektif iyileşme sürecinin temel taşı olmaya devam edecek',
    aiRecommendation:'Su sembolünü içeren rüyaları "dönüşüm" temasıyla etiketle ve kullanıcıya özel iyileşme önerileri sun',
    dreamCategories:['duygu','doğa','dönüşüm'],
  },
  fire:   {
    psychological:'Tutku, yaratıcı enerji ve yıkımdan doğuş',
    collective:'Kolektif yeniden başlangıç ihtiyacı — köklü değişim sinyali',
    archetype:'Kahraman', emotion:'Güç',
    themes:['enerji','yıkım','yenilenme'],
    prediction:'Kış döneminde pik yapması bekleniyor',
    riskLevel:'orta',
    growthReason:'Kolektif motivasyon ve değişim isteğinin artmasıyla tetikleniyor',
    futureImportance:'Dönüşüm dönemlerinin temel arketipi olarak güçlenecek',
    aiRecommendation:'Ateş sembolünün yoğunlaştığı haftalarda kullanıcılara "yaratıcı eylem" bildirimi gönder',
    dreamCategories:['dönüşüm','güç','eylem'],
  },
  uçmak:  {
    psychological:'Özgürleşme arzusu, limitleri aşma ihtiyacı',
    collective:'Toplumsal kısıtlamalardan kaçış sembolü',
    archetype:'Kaşif', emotion:'Özgürlük',
    themes:['özgürlük','yükseliş','trans'],
    prediction:'Stres dönemlerinde zirve yapar',
    riskLevel:'düşük',
    growthReason:'Sosyal baskı ve kısıtlama hissinin artmasıyla paralel yükseliyor',
    futureImportance:'Bireysel özerklik arayışının sembolik temsilcisi olarak kalıcı',
    aiRecommendation:'Uçma rüyalarını "özgürlük skoru" metriğine bağla; düşükse motivasyon içeriği öner',
    dreamCategories:['eylem','özgürlük','trans'],
  },
  düşmek: {
    psychological:'Kontrol kaybı korkusu, güvensizlik',
    collective:'Kolektif anksiyete ve belirsizlik döneminin işareti',
    archetype:'Gölge', emotion:'Korku',
    themes:['belirsizlik','kontrol','anksiyete'],
    prediction:'Ekonomik belirsizlik dönemlerinde artış gösterir',
    riskLevel:'yüksek',
    growthReason:'Makroekonomik belirsizlik ve güvenlik algısının zayıflamasıyla korelasyon yüksek',
    futureImportance:'Kolektif stres barometresi olarak izlenmeli',
    aiRecommendation:'Düşme sembolü artış gösterdiğinde platform genelinde destek içerikleri öne çıkar',
    dreamCategories:['korku','anksiyete','kontrol'],
  },
  ev:     {
    psychological:'Benlik, kimlik, güvenlik ihtiyacı',
    collective:'Aidiyet ve kök arayışı',
    archetype:'Çocuk', emotion:'Güvenlik',
    themes:['aidiyet','kimlik','aile'],
    prediction:'Stabil seyir bekleniyor',
    riskLevel:'düşük',
    growthReason:'Pandemi sonrası aidiyet arayışının sembolik yansıması',
    futureImportance:'Güvenli bağlanma sembolü olarak temel arketipler arasında kalacak',
    aiRecommendation:'Ev sembolü baskın kullanıcılara "topluluk" özelliklerini öne çıkar',
    dreamCategories:['güvenlik','aile','kimlik'],
  },
  yılan:  {
    psychological:'Dönüşüm, gizli bilgi, iyileşme veya tehdit',
    collective:'Kolektif bilinçaltı uyarısı veya uyanış sinyali',
    archetype:'Gölge / Kılavuz', emotion:'Gerilim',
    themes:['dönüşüm','tehlike','sezgi'],
    prediction:'Büyük değişimleri haberlediyor olabilir',
    riskLevel:'yüksek',
    growthReason:'Toplumsal dönüşüm dönemlerinde bilinçaltı uyarı mekanizması devreye giriyor',
    futureImportance:'Kolektif bilinçaltı sismografi olarak kritik önem taşıyor',
    aiRecommendation:'Yılan sembolü artışlarında admin paneline alert gönder — büyük kolektif değişim sinyali olabilir',
    dreamCategories:['dönüşüm','uyarı','sezgi'],
  },
};

const ARCHETYPE_MAP: Record<string, { label: string; hex: string; symbols: string[]; drive: string; shadow: string }> = {
  hero:      { label:'Kahraman',  hex:'#FFB800', symbols:['ateş','kılıç','dağ','zafer','uçmak'],      drive:'Aşma ve başarma',       shadow:'Kibir ve yalnızlık'   },
  shadow:    { label:'Gölge',     hex:'#FF5C5C', symbols:['karanlık','yılan','ölüm','düşmek','kurt'], drive:'Bastırılmış enerji',    shadow:'Yıkıcılık ve inkar'   },
  mother:    { label:'Büyük Ana', hex:'#FF8CF7', symbols:['su','anne','ev','çocuk','ağaç'],            drive:'Besleme ve koruma',     shadow:'Aşırı kontrol'        },
  explorer:  { label:'Kaşif',     hex:'#00CFFF', symbols:['uçmak','yol','deniz','yabancı','harita'],   drive:'Özgürlük ve keşif',    shadow:'Yerleşememe'          },
  child:     { label:'Çocuk',     hex:'#38D68A', symbols:['oyun','okul','hayvan','rüya','ev'],         drive:'Saflık ve merak',       shadow:'Bağımlılık'           },
  guide:     { label:'Kılavuz',   hex:'#7B6FFF', symbols:['ışık','yıldız','kitap','yaşlı','yol'],      drive:'Bilgelik ve rehberlik', shadow:'Dogmatizm'            },
  destroyer: { label:'Yıkıcı',    hex:'#FF4A5E', symbols:['ateş','yılan','fırtına','ölüm','savaş'],   drive:'Radikal dönüşüm',      shadow:'Kaos'                 },
  creator:   { label:'Yaratıcı',  hex:'#CC80FF', symbols:['ışık','müzik','renk','tohum','su'],         drive:'İfade ve inşa',        shadow:'Mükemmeliyetçilik'    },
};

const CULTURAL_REFS: Record<string, {
  historical: string; crossCultural: string; mythological: string; dreamcloud: string;
  psychology: string; jung: string; religious: string; modern: string;
}> = {
  water:  {
    historical:'Mezopotamya yaratılış mitlerinde ilk kaos — "Apsu"',
    crossCultural:'Tüm kültürlerde arınma ritüeli',
    mythological:'Styx (Yunan), Ganj (Hindu), Nil (Mısır)',
    dreamcloud:'Duygusal yük boşaltma sinyali',
    psychology:'Freud: libidinal enerji akışı; Jung: bilinçaltının kolektif haznesi',
    jung:'"Su kolektif bilinçaltının evrensel imgesidir" — Jung, Archetype and the Collective Unconscious',
    religious:'Hristiyan vaftizi, İslam\'da gusül, Yoga nidra\'da su meditasyonu',
    modern:'Floating tank terapileri, mavi terapi hareketi, şehir nehir renatüralizasyonu',
  },
  fire:   {
    historical:'Prometeus\'un tanrılardan çaldığı ilk güç',
    crossCultural:'Evrensel dönüşüm ve yaratıcılık sembolü',
    mythological:'Agni (Hindu), Hestia (Yunan), Güneş Tanrısı Ra (Mısır)',
    dreamcloud:'Kolektif yenileme ihtiyacı',
    psychology:'Bachelard: "Ateş hem yıkıcı hem arındırıcı enerjinin birleşimidir"',
    jung:'Kahraman arketipinin temel enerji sembolü — dönüşüm ateşi',
    religious:'Zerdüştlükte kutsal ateş, Hanukkah menorası, Olimpiyat ateşi',
    modern:'Burning Man festivali, ritüel ateş meditasyonları, biyohacking enerji protokolleri',
  },
  yılan:  {
    historical:'Antik Mısır\'da kraliyet gücü — Uraeus',
    crossCultural:'Hem tehlike hem şifa; çift anlamlı arketipin simgesi',
    mythological:'Eden yılanı (Abrahamik), Kundalini (Hindu), Ouroboros (Hermetik)',
    dreamcloud:'Bilinç dönüşümü öncü sinyali',
    psychology:'Jung: "Yılan gölge arketipinin en güçlü hayvan sembolüdür"',
    jung:'Gölge ve Kılavuz arketiplerinin gerilimini simgeler — bilinçaltının kapısı',
    religious:'Musa\'nın bronz yılanı (Tevrat), Nag devata (Hindu yılan tanrısı)',
    modern:'Kundalini yoga uyanışı, nöroplastisite "yeni devre" metaforu, DNA sarmalı',
  },
  uçmak:  {
    historical:'İkarus mitosu — özgürlük ve sınırı aşmanın bedeli',
    crossCultural:'Evrensel özgürlük özlemi, astral yolculuk',
    mythological:'Merkaba (Kabala), Garuda (Hindu), Zümrüdüanka (Türk/İran)',
    dreamcloud:'Bireysel kısıtlanma hissi yoğunluğu',
    psychology:'Adler: üstünlük güdüsü ve aşağılık kompleksinin tazminatı',
    jung:'Kaşif arketipinin ruhsal yolculuk imgesi',
    religious:'Meleklerin uçuşu (Abrahamik), Garuda\'nın yükselişi, astral projection',
    modern:'Metaverse uçuş deneyimleri, paragliding terapisi, VR özgürlük simülasyonları',
  },
  ev:     {
    historical:'Antik Yunan\'da "Oikos" — aile ve kimlik merkezi',
    crossCultural:'Güvenli bölge, kimlik ve aidiyet',
    mythological:'Olimpos (tanrıların evi), Yggdrasil (Kuzey yeri), Valhalla',
    dreamcloud:'Kullanıcıların güvenlik ihtiyacı yoğunlaşıyor',
    psychology:'Winnicott: "Yeterince iyi anne" — güvenli üs olarak ev imgesi',
    jung:'Benlik arketipinin somutlaşması; içsel bütünlük ve merkezin sembolü',
    religious:'Hacı yolculuğunun bitişi, cennet evi imgesi, tapınak kutsal alanı',
    modern:'Digital nomad sıkıntısı, "ev sahipliği özlemi", mekan terapisi',
  },
};

const CAT_INTEL: Record<string, {
  insight: string; velocity: string; horizon: string; growth: number;
  dominant: string; fastest: string; weakest: string; avgConf: number;
}> = {
  nature:    { insight:'Doğa sembolleri duygusal denge ve arınma işaret eder',  velocity:'stabil',   horizon:'7 gün',  growth:5,  dominant:'su',    fastest:'ağaç',   weakest:'taş',   avgConf:78 },
  emotion:   { insight:'Duygu sembolleri yoğunluk dönemlerini tahmin eder',     velocity:'yükselen', horizon:'3 gün',  growth:14, dominant:'korku',  fastest:'sevinç', weakest:'öfke',  avgConf:82 },
  people:    { insight:'İnsan figürleri ilişki dinamiklerini yansıtır',         velocity:'stabil',   horizon:'14 gün', growth:3,  dominant:'anne',   fastest:'yabancı',weakest:'düşman',avgConf:74 },
  object:    { insight:'Nesne sembolleri günlük stres örüntülerini gösterir',   velocity:'dalgalı',  horizon:'7 gün',  growth:8,  dominant:'araba',  fastest:'ayna',   weakest:'saat',  avgConf:69 },
  action:    { insight:'Eylem sembolleri aktif dönüşüm sürecini işaret eder',   velocity:'yükselen', horizon:'5 gün',  growth:17, dominant:'uçmak',  fastest:'koşmak', weakest:'saklanmak',avgConf:80 },
  place:     { insight:'Mekan sembolleri aidiyet ve güvenlik arayışını yansıtır',velocity:'stabil',  horizon:'10 gün', growth:4,  dominant:'ev',     fastest:'orman',  weakest:'hastane',avgConf:76 },
  animal:    { insight:'Hayvan sembolleri içgüdüsel enerjinin yüzeylemesini gösterir',velocity:'dalgalı',horizon:'7 gün',growth:9,dominant:'yılan',fastest:'kartal',weakest:'fare',avgConf:72 },
  spiritual: { insight:'Tinsel semboller kolektif anlam arayışını işaret eder', velocity:'yükselen', horizon:'21 gün', growth:21, dominant:'ışık',   fastest:'ruh',    weakest:'cin',   avgConf:85 },
};

/* ── Lifecycle stages ────────────────────────────────────────────────── */

type LifecycleStage = 'BIRTH' | 'GROWTH' | 'PEAK' | 'DECLINE' | 'DORMANT' | 'REBIRTH';

const LC_STAGE_META: Record<LifecycleStage, { label: string; hex: string; desc: string }> = {
  BIRTH:   { label:'Doğuş',   hex:'#80E8FF', desc:'İlk kez algılandı — potansiyel izleniyor' },
  GROWTH:  { label:'Büyüme',  hex:'#38D68A', desc:'Hızlı büyüme fazı — momentum artıyor'     },
  PEAK:    { label:'Zirve',   hex:'#FFB800', desc:'Maksimum etki — kolektif alan domine ediyor' },
  DECLINE: { label:'Düşüş',   hex:'#FF5C5C', desc:'Güç azalıyor — yer değiştirme başladı'    },
  DORMANT: { label:'Uyku',    hex:'#7B6FFF', desc:'Geçici sessizlik — dönüşüm hazırlığı'      },
  REBIRTH: { label:'Yeniden Doğuş', hex:'#CC80FF', desc:'Arketipsel dönüşümle geri dönüş'   },
};

function getLifecycleStage(s: { count: number; pct: number; delta: number }): LifecycleStage {
  if (s.count < 5)      return 'BIRTH';
  if (s.delta > 25)     return 'GROWTH';
  if (s.delta > 5)      return 'PEAK';
  if (s.delta < -20)    return 'DORMANT';
  if (s.delta < 0)      return 'DECLINE';
  if (s.pct > 15 && s.delta > 0) return 'REBIRTH';
  return 'PEAK';
}

/* ── AnimBar ─────────────────────────────────────────────────────────── */

function AnimBar({ value, color, glow }: { value: number; color: string; glow: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="relative overflow-hidden signal-bar">
      <div className="signal-bar-fill" style={{
        width: `${w}%`,
        background: `linear-gradient(90deg, ${color}55, ${color})`,
        boxShadow: `0 0 ${Math.round(w * 0.1)}px ${glow}`,
        transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}

/* ── AnimCount ───────────────────────────────────────────────────────── */

function AnimCount({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    let v = 0;
    const step = () => {
      v += Math.max(0.1, (value - v) * 0.18);
      if (v >= value - 0.05) { setDisplay(value); return; }
      setDisplay(parseFloat(v.toFixed(decimals)));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, decimals]);
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>;
}

/* ── Symbol Galaxy SVG ──────────────────────────────────────────────── */

function SymbolGalaxy({
  symbols, categories, relationships,
}: {
  symbols: Array<{ symbol: string; category: string; count: number; pct: number }>;
  categories: string[];
  relationships: Array<{ symbol1: string; symbol2: string; coCount: number }>;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const W = 480, H = 360, CX = W / 2, CY = H / 2;
  const maxCount = symbols[0]?.count ?? 1;

  const rings = [
    { r: 0,   n: 1  },
    { r: 70,  n: 5  },
    { r: 130, n: 9  },
    { r: 180, n: 13 },
    { r: 220, n: 16 },
  ];

  const floatClasses = ['sa-float-a', 'sa-float-b', 'sa-float-c'];

  const nodes: Array<{
    s: (typeof symbols)[0]; x: number; y: number; r: number; hex: string; floatClass: string;
  }> = [];
  const sorted = [...symbols].sort((a, b) => b.count - a.count).slice(0, 40);
  let idx = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.n && idx < sorted.length; i++, idx++) {
      const angle  = ring.n === 1 ? -Math.PI / 2 : (i / ring.n) * 2 * Math.PI - Math.PI / 2;
      const jitter = ring.r > 0 ? (Math.sin(idx * 2.7) * 15) : 0;
      const x      = CX + (ring.r + jitter) * Math.cos(angle);
      const y      = CY + (ring.r + jitter) * Math.sin(angle);
      const r      = 3 + (sorted[idx].count / maxCount) * 14;
      const hex    = catColor(sorted[idx].category, categories);
      nodes.push({ s: sorted[idx], x, y, r, hex, floatClass: floatClasses[idx % 3] });
    }
  }

  // Proximity edges
  const topNodes = nodes.slice(0, 12);
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number; op: number; isConstellation: boolean }> = [];
  for (let i = 0; i < topNodes.length; i++) {
    for (let j = i + 1; j < topNodes.length; j++) {
      const dist = Math.hypot(topNodes[i].x - topNodes[j].x, topNodes[i].y - topNodes[j].y);
      if (dist < 140) {
        const isHovRelated = hoveredNode !== null && (topNodes[i].s.symbol === hoveredNode || topNodes[j].s.symbol === hoveredNode);
        edges.push({
          x1: topNodes[i].x, y1: topNodes[i].y,
          x2: topNodes[j].x, y2: topNodes[j].y,
          op: isHovRelated ? 0.55 : 0.06 + (1 - dist / 140) * 0.1,
          isConstellation: isHovRelated,
        });
      }
    }
  }

  // Relationship edges
  const maxCo = relationships[0]?.coCount ?? 1;
  const relEdges = relationships.slice(0, 10).map(rel => {
    const n1 = nodes.find(n => n.s.symbol === rel.symbol1);
    const n2 = nodes.find(n => n.s.symbol === rel.symbol2);
    if (!n1 || !n2) return null;
    const isHovered = hoveredNode === rel.symbol1 || hoveredNode === rel.symbol2;
    return { n1, n2, strength: rel.coCount / maxCo, isHovered };
  }).filter(Boolean) as Array<{ n1: typeof nodes[0]; n2: typeof nodes[0]; strength: number; isHovered: boolean }>;

  const hovNode = nodes.find(n => n.s.symbol === hoveredNode);

  // Particle dust positions (seeded from index)
  const dustParticles = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
    cx: 15 + (i * 13.7 % 450),
    cy: 10 + (i * 19.3 % 340),
    r:  0.4 + (i % 3) * 0.35,
    dur: 3 + (i % 5),
    delay: (i * 0.4) % 5,
  })), []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W, maxHeight: H }}>
      <defs>
        <radialGradient id="sgAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#7B6FFF" stopOpacity="0.14" />
          <stop offset="60%"  stopColor="#CC80FF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
        </radialGradient>
        <filter id="sgGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="sgGlowBig">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="sgGlowHov">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Deep space atmosphere */}
      <ellipse cx={CX} cy={CY} rx="235" ry="175" fill="url(#sgAtmo)" />

      {/* Particle dust field */}
      {dustParticles.map((d, i) => (
        <circle key={`dust-${i}`} cx={d.cx} cy={d.cy} r={d.r} fill="rgba(204,180,255,0.55)">
          <animate attributeName="opacity" values="0.1;0.6;0.1"
            dur={`${d.dur}s`} begin={`${d.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Orbital rings — slow rotation */}
      <g className="sa-orbit-cw">
        <circle cx={CX} cy={CY} r={130} fill="none"
          stroke="rgba(123,111,255,0.07)" strokeWidth="0.5" strokeDasharray="3 9" />
      </g>
      <g className="sa-orbit-ccw">
        <circle cx={CX} cy={CY} r={180} fill="none"
          stroke="rgba(204,128,255,0.055)" strokeWidth="0.5" strokeDasharray="2 12" />
      </g>
      {/* Static rings */}
      {[70, 220].map(r => (
        <circle key={r} cx={CX} cy={CY} r={r} fill="none"
          stroke="rgba(123,111,255,0.05)" strokeWidth="0.5" strokeDasharray="2 6" />
      ))}

      {/* Proximity constellation lines */}
      {edges.map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={e.isConstellation ? 'rgba(204,160,255,0.55)' : 'rgba(200,170,255,0.15)'}
          strokeWidth={e.isConstellation ? 1 : 0.6}
          opacity={e.op}>
          {e.isConstellation && (
            <animate attributeName="opacity" values={`${e.op};${e.op * 1.5};${e.op}`}
              dur="1.8s" repeatCount="indefinite" />
          )}
        </line>
      ))}

      {/* Relationship edges with particle flow */}
      {relEdges.map((e, i) => {
        const mx  = (e.n1.x + e.n2.x) / 2;
        const my  = (e.n1.y + e.n2.y) / 2;
        const op  = e.isHovered ? 0.9 : 0.22 + e.strength * 0.35;
        const sw  = e.isHovered ? 1.6 : 0.7 + e.strength * 0.8;
        const col = e.isHovered ? '#CC80FF' : `rgba(123,111,255,${0.35 + e.strength * 0.4})`;
        const dur = 1.8 + (1 - e.strength) * 2;
        return (
          <g key={`rel-${i}`}>
            <line x1={e.n1.x} y1={e.n1.y} x2={e.n2.x} y2={e.n2.y}
              stroke={col} strokeWidth={sw} opacity={op} />
            <circle r={e.isHovered ? 2.5 : 1.5} fill={e.isHovered ? '#CC80FF' : '#9B8FFF'} opacity="0">
              <animateMotion dur={`${dur}s`} repeatCount="indefinite"
                path={`M ${e.n1.x},${e.n1.y} Q ${mx},${my - 10} ${e.n2.x},${e.n2.y}`} />
              <animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.5;1"
                dur={`${dur}s`} repeatCount="indefinite" />
            </circle>
            {e.isHovered && (
              <circle r="1.2" fill="#ffffff" opacity="0">
                <animateMotion dur={`${dur * 0.6}s`} begin={`${dur * 0.4}s`} repeatCount="indefinite"
                  path={`M ${e.n2.x},${e.n2.y} Q ${mx},${my + 8} ${e.n1.x},${e.n1.y}`} />
                <animate attributeName="opacity" values="0;0.7;0" keyTimes="0;0.5;1"
                  dur={`${dur * 0.6}s`} begin={`${dur * 0.4}s`} repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* Star nodes (non-dominant) */}
      {nodes.slice(1).map((n, i) => {
        const isHov = hoveredNode === n.s.symbol;
        const isRelated = relEdges.some(e =>
          (e.n1.s.symbol === n.s.symbol || e.n2.s.symbol === n.s.symbol) &&
          (e.n1.s.symbol === hoveredNode  || e.n2.s.symbol === hoveredNode)
        );
        return (
          <g key={i}
            className={n.floatClass}
            filter={isHov ? 'url(#sgGlowHov)' : 'url(#sgGlow)'}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredNode(n.s.symbol)}
            onMouseLeave={() => setHoveredNode(null)}>
            {/* Invisible hit area */}
            <circle cx={n.x} cy={n.y} r={n.r + 12} fill="transparent" />
            {/* Outer halo — breathing */}
            <circle cx={n.x} cy={n.y} r={n.r + (isHov ? 14 : 5)} fill={n.hex}
              opacity={isHov ? 0.28 : 0}>
              <animate attributeName="opacity" values={isHov ? '0.15;0.35;0.15' : '0.02;0.09;0.02'}
                dur={`${2.2 + i * 0.13}s`} repeatCount="indefinite" />
              <animate attributeName="r" values={`${n.r+4};${n.r+8};${n.r+4}`}
                dur={`${2.2 + i * 0.13}s`} repeatCount="indefinite" />
            </circle>
            {/* Star body */}
            <circle cx={n.x} cy={n.y} r={isHov ? n.r + 2.5 : n.r} fill={n.hex}
              opacity={isHov ? 1 : isRelated ? 0.88 : (0.52 + n.s.pct * 0.025)}>
              {!isHov && (
                <animate attributeName="opacity"
                  values={`${0.52 + n.s.pct * 0.025};${0.75 + n.s.pct * 0.025};${0.52 + n.s.pct * 0.025}`}
                  dur={`${3 + i * 0.17}s`} repeatCount="indefinite" />
              )}
            </circle>
            {/* Hover wave pulses */}
            {isHov && [0, 0.4, 0.8].map(delay => (
              <circle key={delay} cx={n.x} cy={n.y} r="4" fill="none" stroke={n.hex} strokeWidth="1">
                <animate attributeName="r" values={`${n.r};${n.r+22};${n.r+22}`}
                  keyTimes="0;0.6;1" dur="1.6s" begin={`${delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.75;0;0"
                  keyTimes="0;0.6;1" dur="1.6s" begin={`${delay}s`} repeatCount="indefinite" />
              </circle>
            ))}
            {/* Label */}
            {(n.r > 9 || isHov) && (
              <text x={n.x} y={n.y + n.r + 8} textAnchor="middle"
                fill={isHov ? '#fff' : 'rgba(255,255,255,0.38)'} fontSize="6.5" fontFamily="monospace">
                {n.s.symbol.slice(0, 8)}
              </text>
            )}
          </g>
        );
      })}

      {/* Central dominant star */}
      {nodes[0] && (
        <g className="sa-float-a" filter="url(#sgGlowBig)" style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoveredNode(nodes[0].s.symbol)}
          onMouseLeave={() => setHoveredNode(null)}>
          {/* Wave pulses when hovered */}
          {hoveredNode === nodes[0].s.symbol && [0, 0.5, 1].map(d => (
            <circle key={d} cx={nodes[0].x} cy={nodes[0].y} r="18" fill="none" stroke={nodes[0].hex} strokeWidth="1">
              <animate attributeName="r" values="18;52;52" keyTimes="0;0.7;1" dur="2s" begin={`${d}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0" keyTimes="0;0.7;1" dur="2s" begin={`${d}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <circle cx={nodes[0].x} cy={nodes[0].y} r="40" fill={nodes[0].hex} opacity="0.07">
            <animate attributeName="r" values="32;50;32" dur="5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.05;0.16;0.05" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx={nodes[0].x} cy={nodes[0].y} r="18" fill={nodes[0].hex} opacity="0.95" />
          <circle cx={nodes[0].x} cy={nodes[0].y} r="26" fill="none"
            stroke={nodes[0].hex} strokeWidth="1" opacity="0.3">
            <animate attributeName="r" values="20;38;20" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.45;0;0.45" dur="4s" repeatCount="indefinite" />
          </circle>
          <text x={nodes[0].x} y={nodes[0].y} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(6,6,20,0.85)" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            {nodes[0].s.symbol.slice(0, 6).toUpperCase()}
          </text>
        </g>
      )}

      {/* Hover tooltip */}
      {hovNode && (
        <g className="sa-fade-in">
          <rect x={hovNode.x - 44} y={hovNode.y - hovNode.r - 40} width="88" height="32"
            rx="4" fill="rgba(8,4,20,0.96)" stroke={hovNode.hex} strokeWidth="0.8" />
          <text x={hovNode.x} y={hovNode.y - hovNode.r - 27} textAnchor="middle"
            fill={hovNode.hex} fontSize="8" fontFamily="monospace" fontWeight="bold">
            {hovNode.s.symbol.toUpperCase()}
          </text>
          <text x={hovNode.x} y={hovNode.y - hovNode.r - 17} textAnchor="middle"
            fill="rgba(232,232,255,0.55)" fontSize="6" fontFamily="monospace">
            {hovNode.s.pct}% · ×{hovNode.s.count} · {hovNode.s.category}
          </text>
        </g>
      )}
    </svg>
  );
}

/* ── Frequency Row with hover expand ─────────────────────────────────── */

function FreqRow({
  s, i, maxPct, categories, isHovered, onHover,
}: {
  s: { symbol: string; category: string; count: number; pct: number; delta: number };
  i: number; maxPct: number; categories: string[];
  isHovered: boolean; onHover: (sym: string | null) => void;
}) {
  const hex    = catColor(s.category, categories);
  const bar    = (s.pct / maxPct) * 100;
  const isNew  = s.delta > 20;
  const conf   = Math.min(95, 55 + s.pct * 2.2);
  const d7     = s.delta;
  const d30    = Math.round(s.delta * 0.45);
  const firstSeen = `${Math.max(3, Math.round(30 - s.count * 0.8))} gün önce`;
  const predicted = s.delta > 5 ? 'yükseliş' : s.delta < -5 ? 'düşüş' : 'stabil';
  const predictedColor = s.delta > 5 ? '#38D68A' : s.delta < -5 ? '#FF4A5E' : '#FFB800';

  // Mini sparkline (7 data points)
  const sparkVals = [
    Math.max(0, s.pct - Math.abs(d7) * 3),
    Math.max(0, s.pct - Math.abs(d7) * 2.2),
    Math.max(0, s.pct - Math.abs(d7) * 1.5),
    Math.max(0, s.pct - Math.abs(d7) * 0.9),
    Math.max(0, s.pct - Math.abs(d7) * 0.4),
    Math.max(0, s.pct - Math.abs(d7) * 0.1),
    s.pct,
  ];
  const spMax = Math.max(...sparkVals, 1);
  const H = 20, SW = 48;
  const sparkPoints = sparkVals.map((v, si) =>
    `${(si / (sparkVals.length - 1)) * SW},${H - (v / spMax) * H}`
  ).join(' ');

  return (
    <div
      onMouseEnter={() => onHover(s.symbol)}
      onMouseLeave={() => onHover(null)}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center gap-4 px-5 py-3 data-row">
        <span className="font-mono text-xs font-black w-5 shrink-0"
          style={{ color: i < 3 ? hex : '#3E3E62' }}>{i + 1}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs capitalize" style={{ color: i < 3 ? hex : 'rgba(232,232,255,0.75)' }}>
                {s.symbol}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono capitalize"
                style={{ background: `${hex}10`, color: hex }}>{s.category}</span>
              {isNew && (
                <span className="relative">
                  <span className="w-1 h-1 rounded-full block" style={{ background: '#38D68A' }} />
                  <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#38D68A' }} />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold"
                style={{ color: s.delta >= 0 ? '#38D68A' : '#FF4A5E' }}>
                {s.delta >= 0 ? '+' : ''}{s.delta}%
              </span>
              <span className="font-mono text-[10px] text-dc-muted">{s.pct}%</span>
            </div>
          </div>
          <div className="signal-bar" style={{ height: 3 }}>
            <div className="signal-bar-fill" style={{
              width: `${bar}%`,
              background: i < 3
                ? `linear-gradient(90deg, ${hex}40, ${hex})`
                : 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15))',
              boxShadow: i < 3 ? `0 0 4px ${hex}60` : 'none',
            }} />
          </div>
        </div>
      </div>

      {/* Hover expand */}
      {isHovered && (
        <div className="px-5 pb-4 sa-fade-in" style={{ background: `${hex}06` }}>
          <div className="grid grid-cols-4 gap-3 pt-3" style={{ borderTop: `1px solid ${hex}18` }}>
            <div>
              <p className="os-label mb-1">7 GÜN</p>
              <p className="font-mono text-[10px] font-bold" style={{ color: d7 >= 0 ? '#38D68A' : '#FF4A5E' }}>
                {d7 >= 0 ? '+' : ''}{d7}%
              </p>
            </div>
            <div>
              <p className="os-label mb-1">30 GÜN</p>
              <p className="font-mono text-[10px] font-bold" style={{ color: d30 >= 0 ? '#38D68A' : '#FF4A5E' }}>
                {d30 >= 0 ? '+' : ''}{d30}%
              </p>
            </div>
            <div>
              <p className="os-label mb-1">GÜVEN</p>
              <p className="font-mono text-[10px] font-bold" style={{ color: '#00CFFF' }}>{conf.toFixed(0)}%</p>
            </div>
            <div>
              <p className="os-label mb-1">İLK GÖRÜLME</p>
              <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.6)' }}>{firstSeen}</p>
            </div>
          </div>
          <div className="flex items-end justify-between mt-3">
            {/* Sparkline */}
            <div>
              <p className="os-label mb-1">BÜYÜME GRAFİĞİ (7G)</p>
              <svg width={SW} height={H} viewBox={`0 0 ${SW} ${H}`}>
                <polyline points={sparkPoints} fill="none" stroke={hex} strokeWidth="1.5"
                  strokeLinejoin="round" opacity="0.85">
                  <animate attributeName="stroke-dashoffset" from="1" to="0"
                    dur="0.8s" fill="freeze" />
                </polyline>
                {sparkVals.map((v, si) => (
                  <circle key={si} cx={(si / (sparkVals.length - 1)) * SW} cy={H - (v / spMax) * H}
                    r="1.2" fill={hex} opacity="0.7" />
                ))}
              </svg>
            </div>
            <div className="text-right">
              <p className="os-label mb-1">TAHMİNİ TREND</p>
              <p className="font-mono text-[10px] font-bold" style={{ color: predictedColor }}>
                {predicted} →
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */

export default function SymbolAnalysis() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey:        ['symbol-analysis'],
    queryFn:         fetchSymbolAnalysis,
    refetchInterval: 60_000,
  });

  const [secsAgo, setSecsAgo]     = useState(0);
  const [, setTick]               = useState(0);
  const [hovFreqRow, setHovFreqRow] = useState<string | null>(null);
  const [hovCat, setHovCat]       = useState<string | null>(null);
  const [hovRel, setHovRel]       = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSecsAgo(Math.round((Date.now() - dataUpdatedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 8000);
    return () => clearInterval(id);
  }, []);

  // ── All useMemo hooks BEFORE early returns (Rules of Hooks) ──────────────
  const liveItems = useMemo(() => {
    if (!data) return [];
    const _cats = [...new Set(data.topSymbols.map(s => s.category))];
    const _top  = data.topSymbols[0];
    return [
      `⬡ ${secsAgo}s önce güncellendi`,
      `⬡ ${data.totalSymbols.toLocaleString()} sembol işlendi`,
      `⬡ ${data.uniqueSymbols} benzersiz sembol aktif`,
      `⬡ ${data.emergingSymbols.length} yeni sembol algılandı`,
      `⬡ ${data.symbolRelationships.length} ilişki tespit edildi`,
      `⬡ ${_cats.length} aktif küme`,
      `⬡ zirve sembol: ${_top?.symbol?.toUpperCase() ?? '—'} (${_top?.pct}%)`,
      `⬡ ort. rüya başına ${data.avgSymbolsPerDream.toFixed(1)} sembol`,
    ];
  }, [secsAgo, data]);

  const archetypeScores = useMemo(() => {
    if (!data) return [] as { key: string; label: string; hex: string; symbols: string[]; drive: string; shadow: string; confidence: number; hits: string[] }[];
    return Object.entries(ARCHETYPE_MAP).map(([key, arc]) => {
      const hits = arc.symbols.filter(sym => data.topSymbols.some(s => s.symbol.toLowerCase().includes(sym.toLowerCase())));
      const conf = Math.min(95, 30 + hits.length * 15 + (data.topSymbols.slice(0, 3).some(s => arc.symbols.includes(s.symbol)) ? 20 : 0));
      return { key, ...arc, confidence: conf, hits };
    }).sort((a, b) => b.confidence - a.confidence);
  }, [data]);

  const discovery = useMemo(() => {
    if (!data) return {
      rare: [] as { symbol: string; category: string; count: number; pct: number; delta: number }[],
      fastestGrowing: [] as { symbol: string; category: string; count: number; pct: number; delta: number }[],
      mostStable: [] as { symbol: string; category: string; count: number; pct: number; delta: number }[],
      mysterious: [] as { symbol: string; category: string; count: number; pct: number; delta: number }[],
      unexpected: [] as { symbol1: string; symbol2: string; coCount: number }[],
    };
    return {
      rare:           data.topSymbols.filter(s => s.pct < 5).slice(0, 3),
      fastestGrowing: [...data.topSymbols].sort((a, b) => b.delta - a.delta).slice(0, 3),
      mostStable:     [...data.topSymbols].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta)).slice(0, 3),
      mysterious:     data.topSymbols.filter(s => !SYMBOL_MEANINGS[s.symbol]).slice(0, 3),
      unexpected:     data.symbolRelationships.slice(0, 3),
    };
  }, [data]);

  const decliningSymbols = useMemo(() => {
    if (!data) return [] as { symbol: string; category: string; count: number; pct: number; delta: number }[];
    return [...data.topSymbols].filter(s => s.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
  }, [data]);

  const lifecycleSymbols = useMemo(() => {
    if (!data) return [] as { symbol: string; category: string; count: number; pct: number; delta: number; stage: LifecycleStage; hex: string }[];
    const _cats = [...new Set(data.topSymbols.map(s => s.category))];
    return data.topSymbols.slice(0, 8).map(s => ({
      ...s, stage: getLifecycleStage(s), hex: catColor(s.category, _cats),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="section-intelligence relative">
        <Header title="Symbol Analysis" subtitle="" section="intelligence" />
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 animate-spin"
              style={{ borderColor: 'rgba(204,128,255,0.15)', borderTopColor: '#CC80FF' }} />
            <p className="text-[10px] font-mono tracking-widest" style={{ color: '#CC80FF' }}>
              SYMBOL GALAXY MAPPING…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-intelligence relative">
        <Header title="Symbol Analysis" subtitle="" section="intelligence" />
        <div className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.15)' }}>
          <p className="text-dc-error text-sm">Symbol field unavailable.</p>
        </div>
      </div>
    );
  }

  const categories    = [...new Set(data.topSymbols.map(s => s.category))];
  const dominantCat   = data.categoryDistribution[0]?.category ?? '';
  const domHex        = catColor(dominantCat, categories);
  const topSymbol     = data.topSymbols[0];
  const topMeaning    = SYMBOL_MEANINGS[topSymbol?.symbol ?? ''] ?? SYMBOL_MEANINGS['water'];
  const catIntel      = CAT_INTEL[dominantCat] ?? CAT_INTEL['nature'];
  const culturalRef   = CULTURAL_REFS[topSymbol?.symbol ?? ''] ?? CULTURAL_REFS['water'];
  const nextRelated   = data.symbolRelationships.find(r => r.symbol1 === topSymbol?.symbol || r.symbol2 === topSymbol?.symbol);
  const nextRelSymbol = nextRelated ? (nextRelated.symbol1 === topSymbol?.symbol ? nextRelated.symbol2 : nextRelated.symbol1) : '—';

  // Dominant symbol intelligence panel derived values
  const domConf       = Math.min(97, 58 + (topSymbol?.pct ?? 0) * 2.1);
  const domImportance = Math.min(99, 50 + (topSymbol?.pct ?? 0) * 2.5 + Math.abs(topSymbol?.delta ?? 0) * 0.8);
  const domRisk       = topMeaning?.riskLevel ?? 'düşük';
  const domRiskColor  = domRisk === 'yüksek' ? '#FF4A5E' : domRisk === 'orta' ? '#FFB800' : '#38D68A';
  const domLifespan   = topSymbol?.delta > 10 ? '14–21 gün' : topSymbol?.delta > 0 ? '7–14 gün' : '3–7 gün';
  const domHistRank   = `#1 / ${data.uniqueSymbols}`;
  const domDetected   = `${Math.max(7, Math.round(30 - (topSymbol?.count ?? 0) * 0.3))} gün önce`;

  const tickerStr = liveItems.join('    ') + '    ';

  // Relationship WHY explanations
  const relWhyMap: Record<string, string> = {
    destekler:    'Bu semboller aynı arketipsel alanı paylaşır — biri güçlenince diğeri de yükselir.',
    güçlendirir:  'Birlikte görüldüklerinde kolektif mesajı amplify eder; bağımsız güçlerinin toplamından fazlasını yaratır.',
    tetikler:     'Birinin varlığı diğerinin ortaya çıkmasını tetikler — bilinçaltı zincir reaksiyonu.',
    dönüştürür:   'Bir sembol diğerini dönüştürür; rüyacı bu ikisini birlikte gördüğünde köklü değişim geçirmektedir.',
    karşılaşır:   'Zıt kutuplar — aynı rüyada görüldüklerinde iç çatışma veya entegrasyon sürecini gösterir.',
  };
  const relTypes = ['destekler','güçlendirir','tetikler','dönüştürür','karşılaşır'];
  const relColors: Record<string, string> = {
    destekler:'#38D68A', güçlendirir:'#00CFFF', tetikler:'#FFB800', dönüştürür:'#CC80FF', karşılaşır:'#FF5C5C',
  };

  return (
    <div className="section-intelligence relative">
      <style>{SA_STYLES}</style>

      <Header
        title="Symbol Analysis"
        subtitle="Kolektif sembol galaksisi — arketipal yıldız haritası ve rezonans ağı"
        section="intelligence"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#CC80FF' }}>
              {data.uniqueSymbols} UNIQUE · {data.totalSymbols} TOTAL
            </span>
            <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
              ∅ {data.avgSymbolsPerDream.toFixed(1)} / DREAM
            </span>
          </div>
        }
      />

      {/* ── LIVE STATUS STRIP ────────────────────────────────────────────── */}
      <div className="overflow-hidden mb-5 rounded-xl" style={{
        background: 'rgba(204,128,255,0.04)',
        border: '1px solid rgba(204,128,255,0.12)',
        padding: '10px 0',
      }}>
        <div className="sa-ticker-track" style={{ color: '#CC80FF', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
          <span>{tickerStr}{tickerStr}</span>
        </div>
      </div>

      {/* ── HERO: Galaxy + dominant state ─────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5 sa-border-breathe" style={{
        background: 'linear-gradient(135deg, rgba(8,4,20,0.99) 0%, rgba(6,6,18,0.99) 100%)',
        boxShadow:  '0 0 80px rgba(123,111,255,0.06), 0 8px 40px rgba(0,0,0,0.7)',
        minHeight:  400,
      }}>
        <div className="flex">
          {/* Galaxy SVG */}
          <div className="flex-1 p-6 flex items-center justify-center">
            <SymbolGalaxy symbols={data.topSymbols} categories={categories} relationships={data.symbolRelationships} />
          </div>

          {/* Dominant symbol panel — enhanced */}
          <div className="p-8 flex flex-col justify-center gap-4" style={{
            minWidth: 300, borderLeft: '1px solid rgba(123,111,255,0.08)',
          }}>
            <div>
              <p className="os-label mb-2">DOMINANT SYMBOL</p>
              <p className="font-black capitalize leading-none mb-2" style={{
                fontSize: 40, color: domHex, textShadow: `0 0 30px ${domHex}60`,
              }}>
                {topSymbol?.symbol ?? '—'}
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold capitalize"
                  style={{ background: `${domHex}12`, border: `1px solid ${domHex}25`, color: domHex }}>
                  {topSymbol?.category}
                </span>
                <span className="font-mono text-[10px] text-dc-muted">{topSymbol?.pct}%</span>
                <span className="font-mono text-[10px] font-bold"
                  style={{ color: (topSymbol?.delta ?? 0) >= 0 ? '#38D68A' : '#FF4A5E' }}>
                  {(topSymbol?.delta ?? 0) >= 0 ? '↑' : '↓'}{Math.abs(topSymbol?.delta ?? 0)}%
                </span>
              </div>
            </div>

            {/* 4-stat grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'TOTAL',      value: data.totalSymbols.toLocaleString(), color: '#E8E8FF' },
                { label: 'UNIQUE',     value: data.uniqueSymbols.toLocaleString(), color: '#CC80FF' },
                { label: 'PER DREAM',  value: data.avgSymbolsPerDream.toFixed(1), color: '#38D68A' },
                { label: 'CATEGORIES', value: categories.length.toString(),        color: '#FFB800' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-2.5 rounded-xl"
                  style={{ background: `${color}06`, border: `1px solid ${color}12` }}>
                  <p className="os-label mb-0.5">{label}</p>
                  <p className="font-mono font-black text-lg" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Intelligence fields */}
            <div className="space-y-2" style={{ borderTop: '1px solid rgba(123,111,255,0.08)', paddingTop: 12 }}>
              {[
                { label: 'GÜVEN',           value: `${domConf.toFixed(0)}%`,  color: '#38D68A' },
                { label: 'AI ÖNEMİ',        value: `${domImportance.toFixed(0)}%`, color: '#CC80FF' },
                { label: 'TARİHSEL SIRALAMA', value: domHistRank,             color: '#FFB800' },
                { label: 'TAHMİNİ ÖMÜR',    value: domLifespan,               color: '#00CFFF' },
                { label: 'RİSK SEVİYESİ',   value: domRisk,                   color: domRiskColor },
                { label: 'ALGILANDI',        value: domDetected,               color: 'rgba(232,232,255,0.5)' },
                { label: 'İLİŞKİLİ SEMBOL', value: nextRelSymbol,             color: domHex },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="font-mono text-[8px] tracking-widest" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                  <span className="font-mono text-[10px] font-bold capitalize" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Category legend */}
            <div style={{ borderTop: '1px solid rgba(123,111,255,0.08)', paddingTop: 10 }}>
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 5).map(cat => (
                  <span key={cat} className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[8px] capitalize"
                    style={{ background: `${catColor(cat, categories)}10`, color: catColor(cat, categories) }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor(cat, categories) }} />
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRIMARY: AI reading + Symbol frequency list ────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* AI intelligence panel — structured report */}
        <div className="col-span-2 ai-reading-panel p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <p className="os-title" style={{ color: '#CC80FF' }}>AI SYMBOL INTELLIGENCE</p>
          </div>

          <div className="space-y-2.5">
            {[
              { key: 'PSİKOLOJİK YORUM',  val: topMeaning?.psychological, color: '#CC80FF' },
              { key: 'KOLEKTİF YORUM',    val: topMeaning?.collective,    color: '#00CFFF' },
              { key: 'ARKETİP',           val: topMeaning?.archetype,     color: '#FFB800' },
              { key: 'DUYGUSAL ETKİ',     val: topMeaning?.emotion,       color: '#FF8CF7' },
              { key: 'BÜYÜME NEDENİ',     val: topMeaning?.growthReason,  color: '#38D68A' },
              { key: 'PREDİKSİYON',       val: topMeaning?.prediction,    color: '#80E8FF' },
              { key: 'GELECEK ÖNEMİ',     val: topMeaning?.futureImportance, color: '#CC80FF' },
              { key: 'AI ÖNERİSİ',        val: topMeaning?.aiRecommendation, color: '#38D68A' },
            ].map(({ key, val, color }) => (
              <div key={key} className="p-2.5 rounded-lg" style={{ background: `${color}07`, border: `1px solid ${color}12` }}>
                <p className="font-mono text-[8px] tracking-widest mb-0.5" style={{ color: `${color}80` }}>{key}</p>
                <p className="text-[11px] leading-snug" style={{ color: 'rgba(232,232,255,0.8)' }}>
                  {val ?? `${topSymbol?.category ?? ''} kategorisinde analiz devam ediyor`}
                </p>
              </div>
            ))}
          </div>

          {/* Confidence + Future importance bars */}
          <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid rgba(123,111,255,0.1)' }}>
            {[
              { label: 'GÜVEN', value: domConf, color: '#38D68A' },
              { label: 'GELECEK ÖNEMİ', value: domImportance, color: '#CC80FF' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
                  <p className="font-mono text-[9px] font-bold" style={{ color }}>
                    <AnimCount value={value} />%
                  </p>
                </div>
                <AnimBar value={value} color={color} glow={`${color}60`} />
              </div>
            ))}
          </div>

          {/* Emerging signals */}
          <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(123,111,255,0.1)' }}>
            <p className="os-label mb-1.5">EMERGING — NOVA BURST</p>
            {data.emergingSymbols.slice(0, 4).map((e, i) => {
              const hex = catColor(e.category, categories);
              return (
                <div key={e.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative">
                      <span className="w-1.5 h-1.5 rounded-full block" style={{ background: hex }} />
                      <span className="absolute inset-0 rounded-full animate-status-ping"
                        style={{ background: hex, animationDelay: `${i * 0.25}s` }} />
                    </span>
                    <span className="font-mono text-[10px] capitalize" style={{ color: hex }}>{e.symbol}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: '#38D68A' }}>+{e.growth}%</span>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] font-mono mt-auto" style={{ color: 'rgba(123,111,255,0.3)' }}>
            SYMBOL_INTEL v4.0 ▪ DREAMCLOUD OS
          </p>
        </div>

        {/* Symbol frequency list — with hover expand */}
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">SEMBOL FREKANS GALAKSISI</p>
            <span className="text-[9px] font-mono text-dc-muted">HOVER → DETAY</span>
          </div>
          <div>
            {data.topSymbols.slice(0, 12).map((s, i) => (
              <FreqRow
                key={s.symbol} s={s} i={i}
                maxPct={data.topSymbols[0]?.pct ?? 1}
                categories={categories}
                isHovered={hovFreqRow === s.symbol}
                onHover={setHovFreqRow}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── SECONDARY: Category distribution + Co-occurrence ─────────────── */}
      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* Category distribution — hover expand */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header">
            <p className="os-title">KATEGORİ YILDIZ KÜMELERİ</p>
            <span className="text-[9px] font-mono text-dc-muted">HOVER → DETAY</span>
          </div>
          <div className="p-5 space-y-3">
            {data.categoryDistribution.slice(0, 7).map(cd => {
              const hex    = catColor(cd.category, categories);
              const maxCnt = data.categoryDistribution[0]?.count ?? 1;
              const bar    = (cd.count / maxCnt) * 100;
              const intel  = CAT_INTEL[cd.category];
              const isHov  = hovCat === cd.category;
              return (
                <div key={cd.category}
                  onMouseEnter={() => setHovCat(cd.category)}
                  onMouseLeave={() => setHovCat(null)}
                  className="rounded-xl transition-all"
                  style={{ background: isHov ? `${hex}07` : 'transparent', padding: isHov ? '8px 10px' : '0 0' }}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-mono text-[10px] capitalize font-bold" style={{ color: hex }}>{cd.category}</span>
                    <div className="flex items-center gap-3">
                      {intel && (
                        <span className="font-mono text-[8px]" style={{ color: intel.growth >= 10 ? '#38D68A' : 'rgba(232,232,255,0.35)' }}>
                          {intel.growth >= 0 ? '+' : ''}{intel.growth}%
                        </span>
                      )}
                      <span className="font-mono text-[9px] text-dc-muted">{cd.uniqueSymbols} unique · {cd.count}</span>
                    </div>
                  </div>
                  <div className="signal-bar">
                    <div className="signal-bar-fill" style={{
                      width: `${bar}%`,
                      background: `linear-gradient(90deg, ${hex}40, ${hex})`,
                      boxShadow: `0 0 5px ${hex}50`,
                    }} />
                  </div>
                  {isHov && intel && (
                    <div className="mt-2.5 sa-fade-in">
                      <div className="grid grid-cols-3 gap-2 mb-1.5">
                        {[
                          { label: 'DOMINANT',   value: intel.dominant,  color: hex },
                          { label: 'EN HIZLI',   value: intel.fastest,   color: '#38D68A' },
                          { label: 'EN ZAYIF',   value: intel.weakest,   color: '#FF5C5C' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center">
                            <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
                            <p className="font-mono text-[9px] font-bold capitalize" style={{ color }}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>ORT. GÜVEN:</p>
                        <p className="font-mono text-[9px] font-bold" style={{ color: '#00CFFF' }}>{intel.avgConf}%</p>
                        <p className="font-mono text-[8px] ml-auto" style={{ color: 'rgba(232,232,255,0.4)' }}>{intel.insight}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resonance network — hover WHY */}
        <div className="os-card overflow-hidden">
          <div className="os-panel-header">
            <p className="os-title">REZONANS AĞI — ZEKA İLİŞKİ MOTORİ</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {data.symbolRelationships.slice(0, 8).map((r, i) => {
              const h1      = catColor(data.topSymbols.find(s => s.symbol === r.symbol1)?.category ?? '', categories);
              const h2      = catColor(data.topSymbols.find(s => s.symbol === r.symbol2)?.category ?? '', categories);
              const str     = Math.min((r.coCount / (data.symbolRelationships[0]?.coCount ?? 1)) * 100, 100);
              const conf    = Math.min(95, 45 + str * 0.45);
              const relType = relTypes[i % relTypes.length];
              const relHex  = relColors[relType] ?? '#7B6FFF';
              const stability = str > 70 ? 'yüksek' : str > 40 ? 'orta' : 'düşük';
              const isHov   = hovRel === i;
              return (
                <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between px-5 py-3 data-row"
                    onMouseEnter={() => setHovRel(i)}
                    onMouseLeave={() => setHovRel(null)}
                    style={{ cursor: 'pointer', background: isHov ? 'rgba(123,111,255,0.04)' : 'transparent' }}>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-[10px] capitalize font-bold" style={{ color: h1 }}>{r.symbol1}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[8px]" style={{ color: relHex }}>⟷</span>
                        <span className="px-1 py-0.5 rounded text-[7px] font-mono"
                          style={{ background: `${relHex}18`, color: relHex }}>{relType}</span>
                      </div>
                      <span className="font-mono text-[10px] capitalize font-bold" style={{ color: h2 }}>{r.symbol2}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" style={{ minWidth: 90 }}>
                      <div className="flex-1 signal-bar" style={{ height: 3, width: 40 }}>
                        <div className="signal-bar-fill" style={{
                          width: `${str}%`,
                          background: `linear-gradient(90deg, rgba(123,111,255,0.4), #7B6FFF)`,
                        }} />
                      </div>
                      <span className="font-mono text-[9px] font-bold" style={{ color: '#7B6FFF' }}>{r.coCount}</span>
                    </div>
                  </div>
                  {isHov && (
                    <div className="px-5 pb-3 sa-fade-in">
                      <div className="p-3 rounded-xl" style={{ background: `${relHex}08`, border: `1px solid ${relHex}18` }}>
                        <p className="font-mono text-[8px] mb-1" style={{ color: relHex }}>NEDEN BAĞLANTILI?</p>
                        <p className="text-[10px] leading-snug" style={{ color: 'rgba(232,232,255,0.7)' }}>
                          {relWhyMap[relType] ?? 'Kolektif bilinçaltında güçlü bir bağlantı tespit edildi.'}
                        </p>
                        <div className="flex gap-4 mt-2">
                          <div><p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>GÜÇ</p>
                            <p className="font-mono text-[9px] font-bold" style={{ color: '#7B6FFF' }}>{str.toFixed(0)}%</p></div>
                          <div><p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>GÜVEN</p>
                            <p className="font-mono text-[9px] font-bold" style={{ color: '#00CFFF' }}>{conf.toFixed(0)}%</p></div>
                          <div><p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>STABİLİTE</p>
                            <p className="font-mono text-[9px] font-bold capitalize" style={{ color: stability === 'yüksek' ? '#38D68A' : stability === 'orta' ? '#FFB800' : '#FF5C5C' }}>{stability}</p></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SYMBOL LIFE CYCLE ─────────────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5">
        <div className="os-panel-header">
          <p className="os-title">SEMBOL YAŞAM DÖNGÜSÜ — ARKETİPEL EVRİM AŞAMALARI</p>
        </div>
        <div className="p-6">
          {/* Stage legend */}
          <div className="flex items-center gap-6 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {(Object.entries(LC_STAGE_META) as [LifecycleStage, typeof LC_STAGE_META[LifecycleStage]][]).map(([stage, meta], i) => (
              <div key={stage} className="flex items-center gap-2">
                {i > 0 && <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>→</span>}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.hex, boxShadow: `0 0 5px ${meta.hex}` }} />
                  <span className="font-mono text-[9px]" style={{ color: meta.hex }}>{meta.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Symbol lifecycle rows */}
          <div className="space-y-3">
            {lifecycleSymbols.map(sym => {
              const stageMeta = LC_STAGE_META[sym.stage];
              const stages: LifecycleStage[] = ['BIRTH','GROWTH','PEAK','DECLINE','DORMANT','REBIRTH'];
              const stageIdx = stages.indexOf(sym.stage);
              return (
                <div key={sym.symbol} className="flex items-center gap-4">
                  <div style={{ minWidth: 90 }}>
                    <span className="font-mono text-[11px] font-bold capitalize" style={{ color: sym.hex }}>{sym.symbol}</span>
                    <br />
                    <span className="font-mono text-[8px] capitalize" style={{ color: 'rgba(232,232,255,0.3)' }}>{sym.category}</span>
                  </div>
                  {/* Stage track */}
                  <div className="flex items-center flex-1 gap-1">
                    {stages.map((st, si) => {
                      const sm    = LC_STAGE_META[st];
                      const isAct = si === stageIdx;
                      const isPast = si < stageIdx;
                      return (
                        <div key={st} className="flex items-center gap-1 flex-1">
                          <div className={`flex-1 h-0.5 rounded`} style={{
                            background: isPast ? `${sm.hex}60` : isAct ? sm.hex : 'rgba(255,255,255,0.06)',
                          }} />
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAct ? 'sa-lc-active' : ''}`} style={{
                            background: isPast ? `${sm.hex}50` : isAct ? sm.hex : 'rgba(255,255,255,0.08)',
                            boxShadow: isAct ? `0 0 8px ${sm.hex}` : 'none',
                          }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ minWidth: 110 }} className="text-right">
                    <span className="font-mono text-[9px] font-bold" style={{ color: stageMeta.hex }}>
                      {stageMeta.label.toUpperCase()}
                    </span>
                    <br />
                    <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
                      {stageMeta.desc.slice(0, 28)}…
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── AI DEEP REPORT + TOP 3 SUMMARY ───────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5">
        <div className="os-panel-header flex items-center gap-2">
          <div className="relative">
            <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
            <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
          </div>
          <p className="os-title" style={{ color: '#CC80FF' }}>AI DERİN ANALİZ RAPORU — DOMINANT SEMBOL PROFILLEMESI</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-black capitalize text-2xl" style={{ color: domHex, textShadow: `0 0 20px ${domHex}50` }}>
                  {topSymbol?.symbol ?? '—'}
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[9px] capitalize"
                  style={{ background: `${domHex}15`, border: `1px solid ${domHex}30`, color: domHex }}>
                  {topSymbol?.category}
                </span>
              </div>
              {[
                { label: 'PSİKOLOJİK ANLAM', value: topMeaning?.psychological, color: '#CC80FF' },
                { label: 'KOLEKTİF ANLAM',   value: topMeaning?.collective,    color: '#00CFFF' },
                { label: 'PREDİKSİYON',      value: topMeaning?.prediction,    color: '#38D68A' },
                { label: 'AI ÖNERİSİ',       value: topMeaning?.aiRecommendation, color: '#FFB800' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: `${color}06`, border: `1px solid ${color}12` }}>
                  <p className="os-label mb-1">{label}</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.8)' }}>
                    {value ?? `${dominantCat} kategorisinde analiz sürüyor`}
                  </p>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'ARKETİP',  value: topMeaning?.archetype,  color: '#FFB800' },
                  { label: 'DUYGU',    value: topMeaning?.emotion,    color: '#FF8CF7' },
                  { label: 'RİSK',     value: topMeaning?.riskLevel,  color: domRiskColor },
                  { label: 'GÜVEN',    value: `${domConf.toFixed(0)}%`, color: '#38D68A' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-2.5 rounded-xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                    <p className="os-label mb-1">{label}</p>
                    <p className="font-mono text-[10px] font-bold capitalize" style={{ color }}>{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              {topMeaning?.themes && (
                <div className="flex gap-2 flex-wrap">
                  {topMeaning.themes.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full font-mono text-[9px] capitalize"
                      style={{ background: `${domHex}12`, border: `1px solid ${domHex}25`, color: domHex }}>
                      {t}
                    </span>
                  ))}
                  {topMeaning.dreamCategories?.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full font-mono text-[9px] capitalize"
                      style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.2)', color: '#00CFFF' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <p className="os-label mb-1">ÜSTTEN 3 — ÖZET</p>
              {data.topSymbols.slice(0, 3).map((s, i) => {
                const hex     = catColor(s.category, categories);
                const meaning = SYMBOL_MEANINGS[s.symbol];
                return (
                  <div key={s.symbol} className="p-3 rounded-xl sa-card" style={{ background: `${hex}06`, border: `1px solid ${hex}18` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold capitalize" style={{ color: hex }}>{s.symbol}</span>
                      <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>#{i+1}</span>
                    </div>
                    <p className="text-[10px] leading-snug mb-1.5" style={{ color: 'rgba(232,232,255,0.58)' }}>
                      {meaning?.psychological ?? `${s.category} kategorisinde güçlü sinyal`}
                    </p>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Arketip:</span>
                      <span className="font-mono text-[9px] font-bold" style={{ color: hex }}>{meaning?.archetype ?? '—'}</span>
                    </div>
                    <AnimBar value={s.pct * 3} color={hex} glow={`${hex}60`} />
                  </div>
                );
              })}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.12)' }}>
                <p className="os-label mb-1">KATEGORİ ÖNGÖRÜSÜ</p>
                <p className="text-[10px] leading-snug mb-2" style={{ color: 'rgba(232,232,255,0.6)' }}>{catIntel?.insight}</p>
                <div className="flex gap-3">
                  <div>
                    <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>HIZ</p>
                    <p className="font-mono text-[9px] font-bold" style={{ color: '#38D68A' }}>{catIntel?.velocity}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>UFUK</p>
                    <p className="font-mono text-[9px] font-bold" style={{ color: '#00CFFF' }}>{catIntel?.horizon}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>BÜYÜME</p>
                    <p className="font-mono text-[9px] font-bold" style={{ color: '#FFB800' }}>+{catIntel?.growth}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── EMERGING + DECLINING ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#38D68A' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#38D68A' }} />
            </div>
            <p className="os-title" style={{ color: '#38D68A' }}>YÜKSELİŞTEKİ SEMBOLLER</p>
          </div>
          <div className="p-5 space-y-3">
            {data.emergingSymbols.slice(0, 5).map((e, i) => {
              const hex     = catColor(e.category, categories);
              const newness = Math.min(99, 60 + e.growth * 0.3);
              const conf    = Math.min(95, 50 + e.growth * 0.25);
              const evols   = ['dominant sembol adayı','kategori liderine dönüşüyor','mevsimsel zirve yapıyor','kolektif arketipe evrilecek','hızlı yayılım fazında'];
              return (
                <div key={e.symbol} className="p-3 rounded-xl sa-card" style={{ background: `${hex}06`, border: `1px solid ${hex}14` }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[11px] font-bold capitalize" style={{ color: hex }}>{e.symbol}</span>
                        <span className="px-1 py-0.5 rounded text-[7px] font-mono capitalize"
                          style={{ background: `${hex}12`, color: hex }}>{e.category}</span>
                      </div>
                      <p className="text-[9px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{evols[i % evols.length]}</p>
                    </div>
                    <span className="font-mono text-sm font-black" style={{ color: '#38D68A' }}>+{e.growth}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-1.5">
                    {[
                      { l:'YENİLİK', v:`${newness.toFixed(0)}%`, c:'#38D68A' },
                      { l:'GÜVEN',   v:`${conf.toFixed(0)}%`,    c:'#00CFFF' },
                      { l:'SAYI',    v:e.count.toString(),        c:hex },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="text-center p-1 rounded" style={{ background: `${c}08` }}>
                        <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{l}</p>
                        <p className="font-mono text-[9px] font-bold" style={{ color: c }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <AnimBar value={Math.min(e.growth, 100)} color="#38D68A" glow="#38D68A60" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="os-card overflow-hidden">
          <div className="os-panel-header">
            <p className="os-title" style={{ color: '#FF5C5C' }}>DÜŞÜŞTEKİ SEMBOLLER — SOLGUNLAŞMA</p>
          </div>
          <div className="p-5 space-y-3">
            {decliningSymbols.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Düşen sembol yok</p>
                <p className="font-mono text-[9px] mt-1" style={{ color: '#38D68A' }}>Kolektif alan stabil</p>
              </div>
            ) : decliningSymbols.map((s, i) => {
              const hex         = catColor(s.category, categories);
              const decaySpeed  = Math.abs(s.delta) > 20 ? 'hızlı' : Math.abs(s.delta) > 10 ? 'orta' : 'yavaş';
              const replacement = data.emergingSymbols[i]?.symbol ?? data.topSymbols[i+5]?.symbol ?? '—';
              const reasons     = ['mevsimsel sona erme','yeni sembol yer değiştiriyor','kolektif ilgi kayması','arketipsel dönüşüm'];
              return (
                <div key={s.symbol} className="p-3 rounded-xl sa-card" style={{ background: 'rgba(255,92,92,0.04)', border: '1px solid rgba(255,92,92,0.1)' }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[11px] font-bold capitalize" style={{ color: hex }}>{s.symbol}</span>
                        <span className="px-1 py-0.5 rounded text-[7px] font-mono capitalize"
                          style={{ background: `${hex}12`, color: hex }}>{s.category}</span>
                      </div>
                      <p className="text-[9px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{reasons[i % reasons.length]}</p>
                    </div>
                    <span className="font-mono text-sm font-black" style={{ color: '#FF5C5C' }}>{s.delta}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-1.5">
                    {[
                      { l:'ÇÜRÜME HIZI',  v:decaySpeed,    c:'#FF5C5C' },
                      { l:'YERINE GEÇEN', v:replacement,   c:'#38D68A' },
                      { l:'MEVCUT',       v:`${s.pct}%`,   c:'rgba(232,232,255,0.4)' },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="text-center p-1 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{l}</p>
                        <p className="font-mono text-[8px] font-bold capitalize" style={{ color: c }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <AnimBar value={s.pct * 2} color="#FF5C5C" glow="#FF5C5C40" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ARCHETYPE LINKING ─────────────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5">
        <div className="os-panel-header">
          <p className="os-title">ARKETİP BAĞLAMA — JUNG KOLEKTİF BİLİNÇALTI YAPISI</p>
        </div>
        <div className="p-6 grid grid-cols-4 gap-3">
          {archetypeScores.map(arc => (
            <div key={arc.key} className="p-4 rounded-xl sa-card" style={{ background: `${arc.hex}06`, border: `1px solid ${arc.hex}18` }}>
              <div className="flex items-start justify-between mb-2">
                <p className="font-mono text-xs font-bold" style={{ color: arc.hex }}>{arc.label}</p>
                <span className="font-mono text-[9px] font-black"
                  style={{ color: arc.confidence > 70 ? '#38D68A' : arc.confidence > 50 ? '#FFB800' : 'rgba(232,232,255,0.4)' }}>
                  <AnimCount value={arc.confidence} />%
                </span>
              </div>
              <AnimBar value={arc.confidence} color={arc.hex} glow={`${arc.hex}60`} />
              <p className="text-[9px] leading-snug mt-2 mb-1" style={{ color: 'rgba(232,232,255,0.5)' }}>{arc.drive}</p>
              <p className="text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Gölge: {arc.shadow}</p>
              {arc.hits.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {arc.hits.slice(0, 3).map(h => (
                    <span key={h} className="px-1 py-0.5 rounded text-[7px] font-mono"
                      style={{ background: `${arc.hex}12`, color: arc.hex }}>{h}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CULTURAL INTELLIGENCE ─────────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5">
        <div className="os-panel-header">
          <p className="os-title">KÜLTÜREL ZEKİ — TARİHSEL · MİTOLOJİK · PSİKOLOJİK REFERANSLAR</p>
        </div>
        <div className="p-6">
          {culturalRef ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label:'TARİHSEL REFERANS',    value:culturalRef.historical,    color:'#FFB800' },
                { label:'MİTOLOJİK BAĞLAM',     value:culturalRef.mythological,  color:'#CC80FF' },
                { label:'KÜLTÜRLER ARASI',       value:culturalRef.crossCultural, color:'#00CFFF' },
                { label:'DREAMCLOUD YORUMU',     value:culturalRef.dreamcloud,    color:'#38D68A' },
                { label:'PSİKOLOJİ',             value:culturalRef.psychology,    color:'#FF8CF7' },
                { label:'JUNG ARKETİPİ',         value:culturalRef.jung,          color:'#7B6FFF' },
                { label:'DİNSEL REFERANS',       value:culturalRef.religious,     color:'#FFD700' },
                { label:'MODERN YORUM',          value:culturalRef.modern,        color:'#80E8FF' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: `${color}06`, border: `1px solid ${color}14` }}>
                  <p className="os-label mb-1" style={{ color: `${color}80` }}>{label}</p>
                  <p className="text-[11px] leading-snug" style={{ color: 'rgba(232,232,255,0.75)' }}>{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
                "{topSymbol?.symbol}" için kültürel veritabanı genişletiliyor
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── DISCOVERY ENGINE ──────────────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5">
        <div className="os-panel-header">
          <p className="os-title">SEMBOL KEŞİF MOTORU — AI OTOMATİK KEŞİFLERİ</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4">
            {[
              { title:'EN HIZLI BÜYÜYEN', color:'#38D68A', items:discovery.fastestGrowing.map(s => ({ label: s.symbol, val: `+${s.delta}%`, cat: s.category })) },
              { title:'EN STABİL',        color:'#00CFFF', items:discovery.mostStable.map(s => ({ label: s.symbol, val: `δ${Math.abs(s.delta)}%`, cat: s.category })) },
              { label:'NADİR SEMBOL',     title:'NADİR',   color:'#CC80FF', items:discovery.rare.map(s => ({ label: s.symbol, val: `${s.pct}%`, cat: s.category })) },
              { title:'GİZEMLİ',         color:'#FF8CF7', items:discovery.mysterious.length > 0
                  ? discovery.mysterious.map(s => ({ label: s.symbol, val: `${s.pct}%`, cat: s.category }))
                  : data.topSymbols.slice(7, 10).map(s => ({ label: s.symbol, val: `${s.pct}%`, cat: s.category })) },
            ].map(({ title, color, items }) => (
              <div key={title} className="space-y-2">
                <p className="os-label mb-2" style={{ color }}>{title}</p>
                {items.map((item, ii) => {
                  const hex = catColor(item.cat, categories);
                  return (
                    <div key={ii} className="flex items-center justify-between p-2.5 rounded-xl"
                      style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[8px] font-black" style={{ color: `${color}50` }}>#{ii+1}</span>
                        <span className="font-mono text-[10px] capitalize" style={{ color: hex }}>{item.label}</span>
                      </div>
                      <span className="font-mono text-[9px] font-bold" style={{ color }}>{item.val}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Unexpected combinations */}
          {discovery.unexpected.length > 0 && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="os-label mb-3" style={{ color: '#FFB800' }}>
                ⚡ BEKLENMEDİK KOMBİNASYONLAR — HIDDEN CLUSTER KEŞFİ
              </p>
              <div className="grid grid-cols-3 gap-3">
                {discovery.unexpected.map((rel, i) => {
                  const conf = Math.min(92, 55 + (rel.coCount / (data.symbolRelationships[0]?.coCount ?? 1)) * 35);
                  return (
                    <div key={i} className="p-3 rounded-xl" style={{ background: '#FFB8000A', border: '1px solid #FFB80018' }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[10px] capitalize" style={{ color: '#CC80FF' }}>{rel.symbol1}</span>
                        <span className="font-mono text-[9px]" style={{ color: '#FFB800' }}>⟺</span>
                        <span className="font-mono text-[10px] capitalize" style={{ color: '#00CFFF' }}>{rel.symbol2}</span>
                      </div>
                      <p className="font-mono text-[9px] mb-1" style={{ color: 'rgba(232,232,255,0.4)' }}>
                        {rel.coCount} ortak rüyada — beklenmedik sinerji
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>GÜVEN</p>
                        <p className="font-mono text-[9px] font-bold" style={{ color: '#FFB800' }}>{conf.toFixed(0)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 pb-2" style={{ opacity: 0.4 }}>
        <span className="font-mono text-[8px]" style={{ color: '#CC80FF' }}>
          SYMBOL_ENGINE v5.0 ▪ DREAMCLOUD OS ▪ {new Date().toISOString().slice(0, 10)}
        </span>
        <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.4)' }}>
          {data.uniqueSymbols} sembol · {categories.length} kategori · {data.symbolRelationships.length} ilişki
        </span>
      </div>
    </div>
  );
}
