import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchUserSegments } from '../api/admin.api';
import type { BehaviorSegment, ArchetypeSegment, EmotionSegment } from '../api/admin.api';

const C = {
  green:'#38D68A', gold:'#FFB800', purple:'#7B6FFF', cyan:'#00CFFF',
  pink:'#FF4D8F', red:'#FF4A5E', orange:'#FF8C00', violet:'#CC80FF', dim:'#5A5A84',
} as const;

// ── Preserved Helpers ──────────────────────────────────────────────────────────

function Stars({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <span className="font-mono text-xs tracking-tight" style={{ color: '#FFB800' }}>
      {Array.from({ length: total }, (_, i) =>
        i < filled ? '★' : <span key={i} style={{ opacity: 0.25 }}>★</span>,
      )}
    </span>
  );
}

type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg: Record<RiskLevel, { bg: string; color: string }> = {
    Low:      { bg: 'rgba(56,214,138,0.12)',  color: '#38D68A' },
    Medium:   { bg: 'rgba(255,184,0,0.12)',   color: '#FFB800' },
    High:     { bg: 'rgba(255,74,94,0.12)',   color: '#FF4A5E' },
    Critical: { bg: 'rgba(255,74,94,0.20)',   color: '#FF4A5E' },
  };
  const { bg, color } = cfg[level];
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded"
      style={{ background: bg, color, border: `1px solid ${color}30` }}>
      {level}
    </span>
  );
}

function ConversionBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-dc-muted text-[9px] font-semibold uppercase tracking-wider">Conversion</span>
        <span className="text-xs font-bold font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── New Micro-components ───────────────────────────────────────────────────────

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[8px] font-mono w-5 text-right shrink-0" style={{ color }}>{pct}</span>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const n = data.length; if (n < 2) return null;
  const max = Math.max(...data, 1); const W = 72, H = 20;
  const pts = data.map((v,i) => `${(i/(n-1))*W},${H-(v/max)*H*0.85}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="opacity-70 shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function OppRing({ score, color }: { score: number; color: string }) {
  const r = 14, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
      <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
      <circle cx="17" cy="17" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 17 17)" />
      <text x="17" y="21" textAnchor="middle" fontSize="8" fontWeight="bold" fill={color}>{score}</text>
    </svg>
  );
}

// ── Business Segment Data ──────────────────────────────────────────────────────

interface BusinessSegment {
  id: number; icon: string; name: string; color: string;
  users: number; growth: string; growthPositive: boolean;
  engagement: string; revStars: number; conversion: number;
  risk: RiskLevel; campaign: string; description: string;
}

const BUSINESS_SEGMENTS: BusinessSegment[] = [
  { id:1,  icon:'⚡', name:'Power Dreamers',               color:C.purple,  users:84,  growth:'+12%',  growthPositive:true,  engagement:'Very High', revStars:5, conversion:34, risk:'Low',      campaign:'Premium Conversion Drive',           description:'5+ dreams/week, high engagement, core platform advocates' },
  { id:2,  icon:'🌀', name:'Lucid Seekers',                color:C.cyan,    users:16,  growth:'+28%',  growthPositive:true,  engagement:'Very High', revStars:5, conversion:42, risk:'Low',      campaign:'Lucid Dream Challenge',              description:'Lucid dream category heavy users — highest premium intent' },
  { id:3,  icon:'🌑', name:'Nightmare Heavy Users',         color:C.red,     users:85,  growth:'+5%',   growthPositive:true,  engagement:'High',      revStars:4, conversion:21, risk:'Medium',   campaign:'Nightmare Therapy Partner',          description:'Nightmare category dominant — high AI report purchase intent' },
  { id:4,  icon:'✨', name:'Spiritual Dreamers',            color:C.violet,  users:48,  growth:'+18%',  growthPositive:true,  engagement:'High',      revStars:4, conversion:28, risk:'Low',      campaign:'Meditation Bundle Pre-Launch',       description:'Spiritual/symbolic category focus — meditation bundle candidates' },
  { id:5,  icon:'🔥', name:'High Engagement Users',         color:C.orange,  users:124, growth:'+8%',   growthPositive:true,  engagement:'Very High', revStars:4, conversion:22, risk:'Low',      campaign:'Creator Boost Campaign',             description:'Top 20% by likes/comments received — potential creators' },
  { id:6,  icon:'👁', name:'Silent Readers',                color:'#3E3E62', users:186, growth:'-3%',   growthPositive:false, engagement:'Low',       revStars:2, conversion:4,  risk:'High',     campaign:'Re-activation Campaign',             description:'Reads but rarely posts — churn risk, need re-engagement' },
  { id:7,  icon:'🌱', name:'New Users (< 30 days)',         color:C.green,   users:34,  growth:'+100%', growthPositive:true,  engagement:'Medium',    revStars:3, conversion:18, risk:'Medium',   campaign:'Onboarding flow + welcome email',    description:'Recent joiners in onboarding window — critical first 30 days' },
  { id:8,  icon:'💤', name:'Dormant Users (> 60 days)',     color:C.dim,     users:142, growth:'0%',    growthPositive:true,  engagement:'Very Low',  revStars:1, conversion:2,  risk:'Critical', campaign:'Re-activation Campaign',             description:'No activity > 60 days — recovery campaign urgently needed' },
  { id:9,  icon:'💎', name:'Likely Premium Buyers',         color:C.gold,    users:68,  growth:'+15%',  growthPositive:true,  engagement:'High',      revStars:5, conversion:38, risk:'Low',      campaign:'Premium Conversion Drive',           description:'5+ dreams, 10+ saves, recently active — highest purchase intent' },
  { id:10, icon:'🧠', name:'Likely AI Report Buyers',       color:C.purple,  users:46,  growth:'+22%',  growthPositive:true,  engagement:'High',      revStars:5, conversion:34, risk:'Low',      campaign:'AI Report Launch Pack',              description:'Multiple AI analyses triggered — report purchase intent detected' },
  { id:11, icon:'⚠',  name:'High Report Risk Users',        color:C.red,     users:23,  growth:'+8%',   growthPositive:true,  engagement:'Medium',    revStars:2, conversion:5,  risk:'Critical', campaign:'None — monitor for policy violations', description:'Reports filed or received — flagged for moderation attention' },
  { id:12, icon:'🎨', name:'Creator Candidates',            color:C.pink,    users:12,  growth:'+50%',  growthPositive:true,  engagement:'Very High', revStars:4, conversion:45, risk:'Low',      campaign:'Creator Boost Campaign',             description:'Top engagement scores, consistent quality content, fan base forming' },
  { id:13, icon:'🇹🇷', name:'Turkey Segment',              color:C.orange,  users:280, growth:'+6%',   growthPositive:true,  engagement:'Very High', revStars:3, conversion:8,  risk:'Low',      campaign:'Local premium offer in Turkish',     description:'Largest country segment — high engagement, lower projected ARPU' },
  { id:14, icon:'🌍', name:'International Premium Segment', color:C.cyan,    users:156, growth:'+34%',  growthPositive:true,  engagement:'High',      revStars:5, conversion:22, risk:'Low',      campaign:'English Premium Conversion Drive',   description:'Tier-1 country users (DE/US/JP/UK/CA/FR) — highest ARPU at $4.20–8.40' },
  { id:15, icon:'📱', name:'Mobile-First Users',            color:C.violet,  users:394, growth:'+12%',  growthPositive:true,  engagement:'High',      revStars:4, conversion:18, risk:'Low',      campaign:'App Store premium + push notification', description:'Primary mobile users — push notification conversion channel' },
];

const TOP_3_SEGMENTS = BUSINESS_SEGMENTS.filter(s => [2, 9, 12].includes(s.id));

// ── Geographic & Device Data ───────────────────────────────────────────────────

const GEO_DATA = [
  { country:'Turkey',     flag:'🇹🇷', pct:49, users:279, engagement:'Very High', arpu:'$0.80', priority:'Volume'  },
  { country:'Germany',    flag:'🇩🇪', pct:9,  users:51,  engagement:'High',      arpu:'$6.20', priority:'Premium' },
  { country:'USA',        flag:'🇺🇸', pct:9,  users:51,  engagement:'High',      arpu:'$8.40', priority:'Premium' },
  { country:'Japan',      flag:'🇯🇵', pct:9,  users:51,  engagement:'High',      arpu:'$5.80', priority:'Premium' },
  { country:'France',     flag:'🇫🇷', pct:6,  users:34,  engagement:'Medium',    arpu:'$4.20', priority:'Growth'  },
  { country:'UK',         flag:'🇬🇧', pct:6,  users:34,  engagement:'Medium',    arpu:'$5.10', priority:'Growth'  },
  { country:'Others',     flag:'🌐',  pct:12, users:69,  engagement:'Low',       arpu:'$1.20', priority:'Monitor' },
];

const DEVICE_DATA = [
  { device:'Mobile',  icon:'📱', pct:69, color:C.violet },
  { device:'Desktop', icon:'🖥',  pct:28, color:C.cyan   },
  { device:'Tablet',  icon:'📲', pct:3,  color:C.gold   },
];

// ── Segment Intelligence Data ──────────────────────────────────────────────────

interface MonetScore { premium:number; ads:number; creator:number; reports:number; meditation:number; sponsorship:number }
interface OppScore   { revenue:number; growth:number; virality:number; premium:number; retention:number; total:number }
interface SegmentIntel {
  monthlyRev:string; ltv:string; premConv:number; adRev:string; creatorRev:string; sponsorScore:number;
  healthScore:number; growthLabel:string; stabilityLabel:string; churnLabel:string; churnColor:string;
  emotion:string; archetype:string; symbol:string; freq:string;
  lucid:number; nightmare:number; avgLength:string; complexity:string;
  why:string; strategy:string; nextAction:string; uplift:string; confidence:number;
  monet:MonetScore; opp:OppScore;
  sponsors:{ name:string; match:number; category:string }[];
  trend:number[]; forecast:[number,number,number];
}

const INTEL: Record<string, SegmentIntel> = {
  'Power Dreamers': {
    monthlyRev:'$420', ltv:'$84', premConv:34, adRev:'$168', creatorRev:'$84', sponsorScore:88,
    healthScore:82, growthLabel:'Steady', stabilityLabel:'Stable', churnLabel:'Low', churnColor:C.green,
    emotion:'Joy', archetype:'Hero', symbol:'Flying', freq:'4.2×/wk',
    lucid:12, nightmare:8, avgLength:'280 words', complexity:'High',
    why:'Core advocates with 5+ weekly dreams — platform\'s most reliable engagement engine and highest long-term retention.',
    strategy:'Premium subscription first, then creator program. High LTV justifies premium onboarding investment.',
    nextAction:'Launch Premium Conversion Drive — 88% AI confidence for purchase within 14 days.',
    uplift:'+$180/mo', confidence:88,
    monet:{ premium:92, ads:78, creator:84, reports:72, meditation:54, sponsorship:82 },
    opp:{ revenue:85, growth:72, virality:78, premium:88, retention:90, total:83 },
    sponsors:[{ name:'Notion', match:92, category:'Productivity' },{ name:'Calm', match:88, category:'Wellness' },{ name:'Headspace', match:84, category:'Wellness' }],
    trend:[72,76,78,80,82,84], forecast:[90,108,132],
  },
  'Lucid Seekers': {
    monthlyRev:'$84', ltv:'$240', premConv:42, adRev:'$32', creatorRev:'$48', sponsorScore:96,
    healthScore:96, growthLabel:'Accelerating', stabilityLabel:'Stable', churnLabel:'Very Low', churnColor:C.green,
    emotion:'Curiosity', archetype:'Explorer', symbol:'Door', freq:'7.2×/wk',
    lucid:100, nightmare:2, avgLength:'420 words', complexity:'Very High',
    why:'Only segment with 100% lucid dream rate. Highest premium intent (42%) and highest LTV ($240). Niche but extremely loyal.',
    strategy:'Premium AI reports (Lucid Dream Analysis) + exclusive Lucid Content Library. Charge premium tier pricing.',
    nextAction:'Launch Lucid Dream Challenge campaign — projected 1.07× ROAS, best in portfolio.',
    uplift:'+$120/mo', confidence:94,
    monet:{ premium:98, ads:54, creator:72, reports:94, meditation:68, sponsorship:88 },
    opp:{ revenue:72, growth:94, virality:82, premium:96, retention:92, total:87 },
    sponsors:[{ name:'BetterSleep', match:96, category:'Sleep' },{ name:'Calm', match:92, category:'Wellness' },{ name:'Headspace', match:88, category:'Wellness' }],
    trend:[10,11,12,13,15,16], forecast:[20,28,42],
  },
  'Nightmare Heavy Users': {
    monthlyRev:'$85', ltv:'$52', premConv:21, adRev:'$170', creatorRev:'$34', sponsorScore:72,
    healthScore:58, growthLabel:'Slowing', stabilityLabel:'Volatile', churnLabel:'Medium', churnColor:C.gold,
    emotion:'Fear', archetype:'Shadow', symbol:'Dark Figure', freq:'3.1×/wk',
    lucid:8, nightmare:72, avgLength:'380 words', complexity:'High',
    why:'72% nightmare rate creates strong demand for AI therapy reports. High distress = high intervention value.',
    strategy:'AI Nightmare Analysis Reports ($4.99) + Wellness brand partnerships. Brand safety checklist must clear first.',
    nextAction:'Complete brand safety review (currently 71% — need 85%) then launch Nightmare Therapy Partner.',
    uplift:'+$180/mo', confidence:82,
    monet:{ premium:62, ads:68, creator:28, reports:96, meditation:82, sponsorship:56 },
    opp:{ revenue:74, growth:48, virality:42, premium:62, retention:58, total:57 },
    sponsors:[{ name:'BetterSleep', match:82, category:'Sleep' },{ name:'Headspace', match:78, category:'Wellness' },{ name:'Reflectly', match:72, category:'Mental Health' }],
    trend:[80,81,82,83,84,85], forecast:[87,92,98],
  },
  'Spiritual Dreamers': {
    monthlyRev:'$144', ltv:'$96', premConv:28, adRev:'$96', creatorRev:'$48', sponsorScore:84,
    healthScore:78, growthLabel:'Accelerating', stabilityLabel:'Stable', churnLabel:'Low', churnColor:C.green,
    emotion:'Peace', archetype:'Sage', symbol:'Temple', freq:'3.4×/wk',
    lucid:8, nightmare:4, avgLength:'220 words', complexity:'Medium',
    why:'Spiritual content correlates with meditation intent — natural product-market fit for the Meditation Bundle.',
    strategy:'Meditation Bundle ($2.99/mo add-on) + premium spiritual content library. Cross-sell with premium.',
    nextAction:'Pre-launch Meditation Bundle sign-up — collect payment intent before product ships.',
    uplift:'+$96/mo', confidence:86,
    monet:{ premium:82, ads:72, creator:58, reports:64, meditation:98, sponsorship:88 },
    opp:{ revenue:78, growth:82, virality:68, premium:78, retention:84, total:78 },
    sponsors:[{ name:'Calm', match:94, category:'Wellness' },{ name:'Headspace', match:90, category:'Wellness' },{ name:'BetterSleep', match:82, category:'Sleep' }],
    trend:[38,40,43,46,47,48], forecast:[56,72,96],
  },
  'High Engagement Users': {
    monthlyRev:'$248', ltv:'$60', premConv:22, adRev:'$372', creatorRev:'$124', sponsorScore:86,
    healthScore:76, growthLabel:'Steady', stabilityLabel:'Stable', churnLabel:'Low', churnColor:C.green,
    emotion:'Excitement', archetype:'Hero', symbol:'Journey', freq:'3.8×/wk',
    lucid:10, nightmare:14, avgLength:'240 words', complexity:'Medium',
    why:'Largest quality segment by engagement volume. Primary driver of social sharing and ad impression inventory.',
    strategy:'Feed native advertising + Creator Program recruitment. Top 5 by engagement → Creator Beta.',
    nextAction:'Identify top 10 by engagement score — invite to Creator Boost Campaign beta.',
    uplift:'+$240/mo', confidence:84,
    monet:{ premium:68, ads:92, creator:88, reports:58, meditation:42, sponsorship:84 },
    opp:{ revenue:82, growth:68, virality:92, premium:68, retention:78, total:78 },
    sponsors:[{ name:'Nike', match:88, category:'Lifestyle' },{ name:'Apple Music', match:84, category:'Music' },{ name:'Spotify', match:82, category:'Music' }],
    trend:[110,114,118,120,122,124], forecast:[132,148,168],
  },
  'Silent Readers': {
    monthlyRev:'$18', ltv:'$18', premConv:4, adRev:'$36', creatorRev:'$0', sponsorScore:42,
    healthScore:28, growthLabel:'Declining', stabilityLabel:'Fragile', churnLabel:'High', churnColor:C.red,
    emotion:'Sadness', archetype:'Shadow', symbol:'Mirror', freq:'1.2×/wk',
    lucid:2, nightmare:28, avgLength:'80 words', complexity:'Low',
    why:'Largest single segment (186 users). Currently at -3% growth with High churn risk. Stops the bleed = biggest single recovery.',
    strategy:'Re-engagement email sequence + push notification with personalized dream highlights.',
    nextAction:'Send "We Missed Your Dreams" campaign — CPA $5, highest email CTR at 8.2%.',
    uplift:'+$80/mo if 25% reactivated', confidence:72,
    monet:{ premium:18, ads:42, creator:8, reports:24, meditation:48, sponsorship:22 },
    opp:{ revenue:28, growth:18, virality:18, premium:22, retention:24, total:22 },
    sponsors:[{ name:'Reflectly', match:52, category:'Mental Health' },{ name:'BetterSleep', match:48, category:'Sleep' },{ name:'Calm', match:44, category:'Wellness' }],
    trend:[196,194,192,190,188,186], forecast:[184,178,170],
  },
  'New Users (< 30 days)': {
    monthlyRev:'$0', ltv:'$72', premConv:18, adRev:'$0', creatorRev:'$0', sponsorScore:58,
    healthScore:72, growthLabel:'Accelerating', stabilityLabel:'Volatile', churnLabel:'Medium', churnColor:C.gold,
    emotion:'Surprise', archetype:'Child', symbol:'Unknown', freq:'1.8×/wk',
    lucid:4, nightmare:18, avgLength:'140 words', complexity:'Low',
    why:'Critical 30-day onboarding window. Each converted new user has $72 LTV. +100% growth rate = platform is healthy.',
    strategy:'Aggressive onboarding optimization — 7-day habit formation, premium trial offer on day 5.',
    nextAction:'A/B test "Day 5 Premium Trial" offer — target users who posted 3+ dreams.',
    uplift:'+$104/mo if 18% converted', confidence:78,
    monet:{ premium:84, ads:32, creator:22, reports:48, meditation:58, sponsorship:38 },
    opp:{ revenue:58, growth:98, virality:48, premium:74, retention:52, total:66 },
    sponsors:[{ name:'Headspace', match:68, category:'Wellness' },{ name:'Calm', match:64, category:'Wellness' },{ name:'Notion', match:58, category:'Productivity' }],
    trend:[8,12,18,24,30,34], forecast:[42,62,88],
  },
  'Dormant Users (> 60 days)': {
    monthlyRev:'$0', ltv:'$0', premConv:2, adRev:'$0', creatorRev:'$0', sponsorScore:18,
    healthScore:12, growthLabel:'Stagnant', stabilityLabel:'Fragile', churnLabel:'Critical', churnColor:C.red,
    emotion:'Unknown', archetype:'Shadow', symbol:'None', freq:'0.1×/wk',
    lucid:0, nightmare:18, avgLength:'60 words', complexity:'Very Low',
    why:'142 users represent $0 current revenue but $10,224 in potential LTV if reactivated at avg $72 each.',
    strategy:'Email reactivation sequence only. No paid ads. Personal trigger: "Your dream from 60 days ago..."',
    nextAction:'Validate email deliverability first (30% may have bounced) then launch 3-email sequence.',
    uplift:'+$120/mo if 25% return', confidence:62,
    monet:{ premium:12, ads:18, creator:4, reports:18, meditation:28, sponsorship:12 },
    opp:{ revenue:18, growth:12, virality:12, premium:14, retention:14, total:14 },
    sponsors:[{ name:'Reflectly', match:28, category:'Mental Health' },{ name:'BetterSleep', match:22, category:'Sleep' },{ name:'Calm', match:18, category:'Wellness' }],
    trend:[145,144,143,142,142,142], forecast:[142,138,132],
  },
  'Likely Premium Buyers': {
    monthlyRev:'$181', ltv:'$124', premConv:38, adRev:'$68', creatorRev:'$0', sponsorScore:82,
    healthScore:88, growthLabel:'Accelerating', stabilityLabel:'Stable', churnLabel:'Low', churnColor:C.green,
    emotion:'Joy', archetype:'Hero', symbol:'Light', freq:'4.8×/wk',
    lucid:14, nightmare:8, avgLength:'320 words', complexity:'High',
    why:'Closest to purchase event. 5+ dreams + 10+ saves + active within 7 days = 88% AI confidence for conversion.',
    strategy:'Direct premium conversion. Offer 7-day free trial or 30% launch discount. Priority: launch NOW.',
    nextAction:'Start Premium Conversion Drive — highest ROAS-adjusted revenue in portfolio at $181/mo.',
    uplift:'+$181/mo', confidence:92,
    monet:{ premium:98, ads:72, creator:54, reports:82, meditation:68, sponsorship:78 },
    opp:{ revenue:92, growth:78, virality:72, premium:98, retention:88, total:86 },
    sponsors:[{ name:'Notion', match:88, category:'Productivity' },{ name:'Apple Music', match:84, category:'Music' },{ name:'Calm', match:82, category:'Wellness' }],
    trend:[48,54,58,62,66,68], forecast:[76,92,112],
  },
  'Likely AI Report Buyers': {
    monthlyRev:'$98', ltv:'$52', premConv:34, adRev:'$46', creatorRev:'$0', sponsorScore:78,
    healthScore:84, growthLabel:'Accelerating', stabilityLabel:'Stable', churnLabel:'Low', churnColor:C.green,
    emotion:'Curiosity', archetype:'Sage', symbol:'Eye', freq:'3.2×/wk',
    lucid:12, nightmare:18, avgLength:'360 words', complexity:'Very High',
    why:'Self-directed analysis intent — triggered 2+ AI analyses, viewed report preview. $4.99 purchase within reach.',
    strategy:'AI Report Launch Pack with Archetype Report as lead product (highest intent at 34%).',
    nextAction:'Switch to "AI Dream Report — $4.99" creative (Variant C) — projected +22% ROAS.',
    uplift:'+$98/mo', confidence:90,
    monet:{ premium:78, ads:62, creator:42, reports:98, meditation:48, sponsorship:68 },
    opp:{ revenue:84, growth:82, virality:62, premium:78, retention:82, total:78 },
    sponsors:[{ name:'OpenAI', match:88, category:'AI' },{ name:'Notion', match:82, category:'Productivity' },{ name:'Apple Music', match:72, category:'Music' }],
    trend:[32,36,38,42,44,46], forecast:[54,68,88],
  },
  'High Report Risk Users': {
    monthlyRev:'$0', ltv:'$0', premConv:5, adRev:'$0', creatorRev:'$0', sponsorScore:0,
    healthScore:14, growthLabel:'Uncertain', stabilityLabel:'Fragile', churnLabel:'High', churnColor:C.red,
    emotion:'Anger', archetype:'Shadow', symbol:'Weapon', freq:'2.4×/wk',
    lucid:4, nightmare:48, avgLength:'180 words', complexity:'Medium',
    why:'Policy risk segment. Any ad placement near this content = brand safety violation. Quarantine first.',
    strategy:'Moderation + early intervention program. Not a monetization target — a risk mitigation priority.',
    nextAction:'Activate automated NSFW flagging + human moderation queue for all 23 users.',
    uplift:'$0 direct — risk avoided', confidence:96,
    monet:{ premium:12, ads:8, creator:4, reports:14, meditation:22, sponsorship:0 },
    opp:{ revenue:8, growth:18, virality:8, premium:12, retention:18, total:13 },
    sponsors:[],
    trend:[20,21,22,22,23,23], forecast:[24,26,28],
  },
  'Creator Candidates': {
    monthlyRev:'$54', ltv:'$480', premConv:45, adRev:'$24', creatorRev:'$240', sponsorScore:94,
    healthScore:92, growthLabel:'Accelerating', stabilityLabel:'Stable', churnLabel:'Very Low', churnColor:C.green,
    emotion:'Excitement', archetype:'Hero', symbol:'Stage', freq:'8.4×/wk',
    lucid:18, nightmare:12, avgLength:'520 words', complexity:'Very High',
    why:'Viral amplifiers — top 4.2% CTR, most shares/saves. Creator monetization unlocks $240/mo creator rev per user.',
    strategy:'Creator Program beta → revenue sharing → sponsored dream placements. Highest LTV segment ($480).',
    nextAction:'Invite all 12 to Creator Boost Campaign beta — offer first-mover revenue share terms.',
    uplift:'+$240/mo creator rev + viral acquisition', confidence:88,
    monet:{ premium:88, ads:68, creator:98, reports:72, meditation:42, sponsorship:94 },
    opp:{ revenue:82, growth:94, virality:98, premium:88, retention:92, total:91 },
    sponsors:[{ name:'Spotify', match:96, category:'Music' },{ name:'Nike', match:92, category:'Lifestyle' },{ name:'Apple Music', match:90, category:'Music' }],
    trend:[6,7,8,9,11,12], forecast:[16,24,38],
  },
  'Turkey Segment': {
    monthlyRev:'$224', ltv:'$24', premConv:8, adRev:'$280', creatorRev:'$56', sponsorScore:64,
    healthScore:64, growthLabel:'Steady', stabilityLabel:'Stable', churnLabel:'Medium', churnColor:C.gold,
    emotion:'Joy', archetype:'Hero', symbol:'Home', freq:'2.8×/wk',
    lucid:6, nightmare:14, avgLength:'180 words', complexity:'Low',
    why:'Volume base (280 users = 49% of platform). High ad revenue via CPM × volume even at low ARPU.',
    strategy:'Local pricing (₺49/mo premium) + Turkish-language ad campaigns. Volume beats ARPU here.',
    nextAction:'Launch ₺49/mo premium offer with Turkish UI — convert top 22 by behavior score.',
    uplift:'+$180/mo local premium conversion', confidence:76,
    monet:{ premium:52, ads:88, creator:48, reports:42, meditation:38, sponsorship:58 },
    opp:{ revenue:74, growth:58, virality:68, premium:48, retention:64, total:62 },
    sponsors:[{ name:'Samsung', match:72, category:'Tech' },{ name:'Nike', match:68, category:'Lifestyle' },{ name:'Spotify', match:64, category:'Music' }],
    trend:[258,264,268,274,278,280], forecast:[290,312,352],
  },
  'International Premium Segment': {
    monthlyRev:'$540', ltv:'$240', premConv:22, adRev:'$312', creatorRev:'$78', sponsorScore:92,
    healthScore:88, growthLabel:'Accelerating', stabilityLabel:'Stable', churnLabel:'Low', churnColor:C.green,
    emotion:'Curiosity', archetype:'Sage', symbol:'Globe', freq:'3.2×/wk',
    lucid:10, nightmare:10, avgLength:'260 words', complexity:'High',
    why:'DE/US/JP/UK/CA/FR users pay $4.20–$8.40 ARPU. At 22% conversion rate this is the highest total revenue segment.',
    strategy:'English premium conversion + premium ad placements. eCPM 1.4–2.4× vs Turkish segment.',
    nextAction:'Launch English Premium Conversion Drive immediately — highest absolute revenue potential.',
    uplift:'+$312/mo', confidence:90,
    monet:{ premium:94, ads:90, creator:68, reports:82, meditation:72, sponsorship:92 },
    opp:{ revenue:94, growth:88, virality:72, premium:94, retention:88, total:87 },
    sponsors:[{ name:'Apple Music', match:94, category:'Music' },{ name:'Calm', match:92, category:'Wellness' },{ name:'OpenAI', match:90, category:'AI' }],
    trend:[108,122,134,144,152,156], forecast:[172,208,264],
  },
  'Mobile-First Users': {
    monthlyRev:'$394', ltv:'$48', premConv:18, adRev:'$591', creatorRev:'$78', sponsorScore:84,
    healthScore:72, growthLabel:'Steady', stabilityLabel:'Stable', churnLabel:'Medium', churnColor:C.gold,
    emotion:'Excitement', archetype:'Explorer', symbol:'Phone', freq:'2.4×/wk',
    lucid:8, nightmare:16, avgLength:'160 words', complexity:'Low',
    why:'69% of all users. Primary channel for push notification campaigns and in-feed advertising.',
    strategy:'Push notification optimization + in-app advertising. A/B test notification timing (7am vs 9pm).',
    nextAction:'A/B test push notification send time — "7am dream share" vs "9pm dream record" prompt.',
    uplift:'+$240/mo notification-driven conversion', confidence:82,
    monet:{ premium:72, ads:94, creator:58, reports:52, meditation:62, sponsorship:78 },
    opp:{ revenue:84, growth:72, virality:74, premium:68, retention:68, total:73 },
    sponsors:[{ name:'Samsung', match:88, category:'Tech' },{ name:'Spotify', match:86, category:'Music' },{ name:'Apple Music', match:84, category:'Music' }],
    trend:[338,352,366,378,388,394], forecast:[412,448,502],
  },
};

// ── AI Dynamic Segments (Preserved + Enhanced) ────────────────────────────────

const AI_SEGMENTS = [
  { icon:'💎', name:'Likely Premium Buyers',  color:C.gold,   users:68, conversion:38, estimatedRevenue:'$181/mo', profile:'5+ dreams, 10+ saves, active within 7 days', action:'Launch Premium Conversion Drive immediately' },
  { icon:'🧠', name:'Likely AI Report Buyers',color:C.purple, users:46, conversion:34, estimatedRevenue:'$98/mo',  profile:'Triggered 2+ AI analyses, viewed report preview', action:'Send AI Report Launch Pack with limited offer' },
  { icon:'🎨', name:'Creator Candidates',     color:C.pink,   users:12, conversion:45, estimatedRevenue:'$54/mo',  profile:'Top engagement scores, consistent quality content', action:'Invite to Creator Boost Campaign beta program' },
];

// ── Heatmap + Journey + Funnel Data ───────────────────────────────────────────

const HEATMAP_CATEGORIES = [
  { label:'Highest Revenue',       icon:'💰', color:C.green,  top:[
    { name:'Intl Premium',   score:94, val:'$540/mo' },
    { name:'Mobile-First',   score:84, val:'$394/mo' },
    { name:'Power Dreamers', score:85, val:'$420/mo' },
  ]},
  { label:'Fastest Growth',        icon:'🚀', color:C.cyan,   top:[
    { name:'New Users',     score:98, val:'+100%'  },
    { name:'Creator Cands', score:94, val:'+50%'   },
    { name:'Lucid Seekers', score:82, val:'+28%'   },
  ]},
  { label:'Highest Retention',     icon:'🔒', color:C.purple, top:[
    { name:'Power Dreamers', score:90, val:'90% ret' },
    { name:'Creator Cands',  score:92, val:'92% ret' },
    { name:'Lucid Seekers',  score:92, val:'92% ret' },
  ]},
  { label:'Highest Premium Intent',icon:'👑', color:C.gold,   top:[
    { name:'Likely Premium', score:98, val:'38% conv' },
    { name:'Lucid Seekers',  score:96, val:'42% conv' },
    { name:'Creator Cands',  score:88, val:'45% conv' },
  ]},
  { label:'Highest Ad Value',      icon:'📺', color:C.orange, top:[
    { name:'Mobile-First',   score:94, val:'$591/mo' },
    { name:'High Engmt',     score:92, val:'$372/mo' },
    { name:'Turkey',         score:88, val:'$280/mo' },
  ]},
  { label:'Highest Creator Pot.',  icon:'🎨', color:C.pink,   top:[
    { name:'Creator Cands',  score:98, val:'LTV $480' },
    { name:'High Engmt',     score:88, val:'88 score' },
    { name:'Power Dreamers', score:84, val:'84 score' },
  ]},
];

const JOURNEY_STAGES = [
  { label:'Visitor',     icon:'👤', count:'~1,000', color:C.dim,    note:'Estimated MAU pool' },
  { label:'New User',    icon:'🌱', count:'34',     color:C.green,  note:'< 30 days old'      },
  { label:'Dream Writer',icon:'✍', count:'284',    color:C.cyan,   note:'5+ dreams posted'   },
  { label:'Engaged',     icon:'🔥', count:'208',    color:C.orange, note:'Top 20% engagement' },
  { label:'Premium',     icon:'💎', count:'0',      color:C.gold,   note:'Launch pending'     },
  { label:'Creator',     icon:'🎨', count:'12',     color:C.pink,   note:'Content creators'   },
  { label:'Ambassador',  icon:'⭐', count:'~5',     color:C.violet, note:'Top advocates'      },
];

const FUNNEL = [
  { stage:'Registered',       count:569, pct:100, color:C.purple },
  { stage:'Has Any Dream',    count:420, pct:74,  color:C.cyan   },
  { stage:'5+ Dreams',        count:284, pct:50,  color:C.green  },
  { stage:'10+ Saves',        count:68,  pct:12,  color:C.gold   },
  { stage:'AI Analysis View', count:46,  pct:8,   color:C.orange },
  { stage:'Premium Purchase', count:0,   pct:0,   color:C.pink   },
  { stage:'Creator Program',  count:0,   pct:0,   color:C.violet },
];

const RELATIONSHIP_SEGS = ['Power Dreamers','Lucid Seekers','Spiritual Dreamers','High Engagement','Likely Premium'];
const RELATIONSHIP_MATRIX: Record<string, Record<string, number>> = {
  'Power Dreamers':    { 'Lucid Seekers':28, 'Spiritual Dreamers':34, 'High Engagement':62, 'Likely Premium':58 },
  'Lucid Seekers':     { 'Power Dreamers':28, 'Spiritual Dreamers':18, 'High Engagement':22, 'Likely Premium':36 },
  'Spiritual Dreamers':{ 'Power Dreamers':34, 'Lucid Seekers':18, 'High Engagement':24, 'Likely Premium':28 },
  'High Engagement':   { 'Power Dreamers':62, 'Lucid Seekers':22, 'Spiritual Dreamers':24, 'Likely Premium':44 },
  'Likely Premium':    { 'Power Dreamers':58, 'Lucid Seekers':36, 'Spiritual Dreamers':28, 'High Engagement':44 },
};

// ── Sub-components (Preserved) ─────────────────────────────────────────────────

function BusinessSegmentCard({ seg }: { seg: BusinessSegment }) {
  const intel = INTEL[seg.name];
  return (
    <div className="dc-card p-4 space-y-3 flex flex-col">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{seg.icon}</span>
          <div className="min-w-0">
            <p className="text-dc-text text-[11px] font-bold leading-tight truncate">{seg.name}</p>
            <p className="text-dc-muted text-[9px] mt-0.5 leading-relaxed line-clamp-2">{seg.description}</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 font-mono"
          style={{ background:seg.growthPositive?'rgba(56,214,138,0.12)':'rgba(255,74,94,0.12)', color:seg.growthPositive?C.green:C.red }}>
          {seg.growth}
        </span>
      </div>

      {/* User count */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold font-mono leading-none" style={{ color: seg.color }}>{seg.users}</p>
          <p className="text-dc-muted text-[9px] mt-0.5">users · {seg.engagement} engagement</p>
        </div>
        <div className="flex items-center gap-2">
          {intel && <OppRing score={intel.opp.total} color={seg.color} />}
          <RiskBadge level={seg.risk} />
        </div>
      </div>

      {/* Revenue stars */}
      <div className="flex items-center justify-between">
        <span className="text-dc-muted text-[9px] font-semibold uppercase tracking-wider">Revenue</span>
        <Stars filled={seg.revStars} />
      </div>

      {/* Conversion bar */}
      <ConversionBar pct={seg.conversion} color={seg.color} />

      {/* Intelligence row (new) */}
      {intel && (
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
          <div>
            <p className="text-[8px] text-dc-muted">Monthly Rev</p>
            <p className="text-[10px] font-bold font-mono" style={{ color:C.green }}>{intel.monthlyRev}</p>
          </div>
          <div>
            <p className="text-[8px] text-dc-muted">LTV</p>
            <p className="text-[10px] font-bold font-mono" style={{ color:C.cyan }}>{intel.ltv}</p>
          </div>
          <div>
            <p className="text-[8px] text-dc-muted">Sponsor ⚡</p>
            <p className="text-[10px] font-bold font-mono" style={{ color:C.violet }}>{intel.sponsorScore}</p>
          </div>
        </div>
      )}

      {/* Trend sparkline + campaign */}
      {intel && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] italic leading-tight flex-1" style={{ color: seg.color }}>
            {seg.campaign}
          </p>
          <Sparkline data={intel.trend} color={seg.color} />
        </div>
      )}
      {!intel && (
        <p className="text-[9px] italic leading-tight" style={{ color: seg.color }}>
          Campaign: {seg.campaign}
        </p>
      )}
    </div>
  );
}

function BehaviorCard({ seg, totalUsers }: { seg: BehaviorSegment; totalUsers: number }) {
  const pct = totalUsers > 0 ? Math.round((seg.count / totalUsers) * 100) : seg.pct;
  return (
    <div className="dc-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{seg.icon}</span>
          <div>
            <p className="text-dc-text text-xs font-bold leading-tight">{seg.label}</p>
            <p className="text-dc-muted text-[9px] mt-0.5 leading-relaxed">{seg.description}</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded shrink-0"
          style={{ background:`${seg.color}15`, color:seg.color, border:`1px solid ${seg.color}30` }}>
          {seg.badge}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold font-mono" style={{ color:seg.color }}>{seg.count}</span>
          <span className="text-dc-muted text-xs font-mono">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(pct,100)}%`, background:seg.color }} />
        </div>
      </div>
      {seg.avgDreams !== undefined && (
        <p className="text-[10px] text-dc-muted">Avg {seg.avgDreams} dreams/user</p>
      )}
    </div>
  );
}

function ArchetypeRow({ a }: { a: ArchetypeSegment }) {
  const NAMES: Record<string,string> = { shadow:'Shadow', child:'Child', guide:'Guide', unknown:'Unknown', wise_elder:'Wise Elder', hero:'Hero', trickster:'Trickster', anima:'Anima', animus:'Animus', persona:'Persona' };
  const REV:   Record<string,{ note:string; color:string }> = {
    shadow:    { note:'High report intent',  color:C.red    },
    hero:      { note:'Premium intent',      color:C.gold   },
    anima:     { note:'Premium intent',      color:C.violet },
    animus:    { note:'Premium intent',      color:C.purple },
    child:     { note:'Onboarding target',   color:C.green  },
    guide:     { note:'High report intent',  color:C.cyan   },
    wise_elder:{ note:'Premium intent',      color:C.gold   },
    trickster: { note:'Engagement-first',    color:C.orange },
    persona:   { note:'Creator candidate',   color:C.pink   },
    unknown:   { note:'Monitor',             color:C.dim    },
  };
  const label = NAMES[a.archetype] ?? a.archetype;
  const rev   = REV[a.archetype];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background:'#A78BFA' }} />
      <div className="flex-1 min-w-0">
        <p className="text-dc-text text-xs font-semibold">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-dc-muted text-[10px]">{a.activation_count} activations · Avg confidence {a.avg_confidence}%</p>
        </div>
        {rev && <p className="text-[9px] mt-0.5" style={{ color:rev.color }}>{rev.note}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-dc-text text-sm font-bold font-mono">{a.user_count}</p>
        <p className="text-dc-muted text-[9px]">users</p>
      </div>
    </div>
  );
}

function EmotionBar({ e, max }: { e: EmotionSegment; max: number }) {
  const NAMES:   Record<string,string> = { joy:'Joy', fear:'Fear', sadness:'Sadness', anger:'Anger', surprise:'Surprise', love:'Love', anxiety:'Anxiety', confusion:'Confusion', peace:'Peace', curiosity:'Curiosity', disgust:'Disgust', excitement:'Excitement' };
  const COLORS:  Record<string,string> = { joy:C.gold, fear:C.red, sadness:C.cyan, anger:C.orange, surprise:'#A78BFA', love:C.red, anxiety:C.gold, confusion:C.dim, peace:C.green, curiosity:C.cyan, disgust:C.orange, excitement:C.gold };
  const REV:     Record<string,string> = { joy:'Social sharing', fear:'Therapy reports', sadness:'AI report', anger:'AI report', surprise:'Feature unlock', love:'Community', anxiety:'Therapy reports', confusion:'AI report', peace:'Meditation', curiosity:'Premium feature', disgust:'Moderation flag', excitement:'Creator' };
  const label   = NAMES[e.emotion]  ?? e.emotion;
  const color   = COLORS[e.emotion] ?? C.cyan;
  const revenue = REV[e.emotion]    ?? '';
  const pct     = max > 0 ? Math.round((e.user_count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0">
        <p className="text-dc-text text-xs font-semibold">{label}</p>
        {revenue && <p className="text-[9px]" style={{ color }}>{revenue}</p>}
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full" style={{ width:`${pct}%`, background:color }} />
      </div>
      <p className="text-dc-text text-xs font-mono w-8 text-right shrink-0">{e.user_count}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Segments() {
  const [stratSeg, setStratSeg]   = useState<string>('Likely Premium Buyers');
  const [dreamSeg, setDreamSeg]   = useState<string>('Lucid Seekers');
  const [sponsorSeg, setSponsorSeg] = useState<string>('Creator Candidates');

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['user-segments'], queryFn: fetchUserSegments, staleTime: 10 * 60_000,
  });

  const maxEmotion = data?.emotionSegments.reduce((m,e) => Math.max(m,e.user_count), 0) ?? 0;
  const THcls = 'text-[9px] font-bold uppercase tracking-widest text-dc-muted py-2 px-3 text-left whitespace-nowrap';
  const TDcls = 'text-[10px] text-dc-text py-2 px-3 border-b border-white/[0.04]';

  const activeStrat   = INTEL[stratSeg];
  const activeDNA     = INTEL[dreamSeg];
  const activeSponsor = INTEL[sponsorSeg];

  const totalMonthlyRev = Object.values(INTEL).reduce((s, v) => {
    const n = parseInt(v.monthlyRev.replace(/[^0-9]/g, ''), 10);
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  const MONET_CHANNELS: (keyof MonetScore)[] = ['premium','ads','creator','reports','meditation','sponsorship'];
  const MONET_COLORS: Record<keyof MonetScore, string> = { premium:C.gold, ads:C.orange, creator:C.pink, reports:C.purple, meditation:C.cyan, sponsorship:C.violet };

  return (
    <div className="section-business relative">
      <Header
        title="Audience Intelligence Center"
        subtitle="AI-powered segment strategy, revenue intelligence and behavioral analytics"
        section="business"
        actions={
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
              style={{ background:'rgba(90,90,132,0.12)', color:C.dim, border:'1px solid rgba(90,90,132,0.25)', cursor:'not-allowed' }}>
              Export — Coming Soon
            </button>
            <button onClick={() => void refetch()}
              className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
              style={{ background:'rgba(167,139,250,0.08)', color:'#A78BFA', border:'1px solid rgba(167,139,250,0.25)' }}>
              {isFetching ? '...' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {isFetching && !data && (
          <div className="flex items-center justify-center h-40 text-dc-muted text-sm animate-pulse">Computing segments...</div>
        )}
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Failed to load segment data.</div>}

        {/* ── 1. Executive AI Brief ──────────────────────────────────────── */}
        <div className="dc-card overflow-hidden" style={{ borderColor:`${C.violet}25`, borderWidth:'1px' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:C.violet }}>Executive AI Brief</p>
              <p className="text-dc-muted text-[9px] mt-0.5">Generated from behavioral data · All revenue ⚡ projected</p>
            </div>
            <span className="text-[9px] font-bold px-2 py-1 rounded" style={{ background:`${C.violet}15`, color:C.violet, border:`1px solid ${C.violet}30` }}>AI INTELLIGENCE</span>
          </div>
          <div className="grid grid-cols-5 divide-x" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            {[
              { label:'Fastest Growing',           icon:'🚀', value:'New Users',            sub:'+100% MoM · 34 users', color:C.green,  },
              { label:'Highest Value',              icon:'💰', value:'Intl Premium',          sub:'$540/mo · ARPU $8.40', color:C.gold,   },
              { label:'Highest Risk',               icon:'🚨', value:'Dormant + Risk Users',  sub:'165 users, $0 revenue', color:C.red,   },
              { label:'Best Opportunity',           icon:'⚡', value:'Likely Premium Buyers', sub:'Launch NOW · 92% conf', color:C.cyan,  },
              { label:'Revenue If Actioned',        icon:'📈', value:`+$1,415/mo`,            sub:'vs $${totalMonthlyRev} current', color:C.pink, },
            ].map(b => (
              <div key={b.label} className="px-4 py-3 flex flex-col gap-1">
                <p className="text-[8px] font-bold uppercase tracking-widest text-dc-muted">{b.icon} {b.label}</p>
                <p className="text-sm font-bold" style={{ color:b.color }}>{b.value}</p>
                <p className="text-[9px] text-dc-muted">{b.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. KPI Summary ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Total Users',         value:'569',             color:C.purple, sub:'platform-wide'        },
              { label:'Total Segments',      value:'15',              color:C.cyan,   sub:'business defined'     },
              { label:'Avg Conv. Potential', value:'18.4%',           color:C.gold,   sub:'across all segments'  },
              { label:'⚡ Proj. Revenue',    value:`$${totalMonthlyRev.toLocaleString()}/mo`, color:C.green,  sub:'current pipeline'     },
            ].map(kpi => (
              <div key={kpi.label} className="dc-card p-5 space-y-1">
                <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest">{kpi.label}</p>
                <p className="text-3xl font-bold font-mono" style={{ color:kpi.color }}>{kpi.value}</p>
                <p className="text-dc-muted text-[10px]">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Top 3 */}
          <div className="dc-card p-5">
            <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest mb-3">Top 3 Highest-Value Segments</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TOP_3_SEGMENTS.map((seg, idx) => (
                <div key={seg.id} className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background:`${seg.color}08`, border:`1px solid ${seg.color}20` }}>
                  <span className="text-2xl shrink-0">{idx===0?'🥇':idx===1?'🥈':'🥉'}</span>
                  <div className="flex-1">
                    <p className="text-dc-text text-xs font-bold">{seg.name}</p>
                    <p className="text-[9px] mt-0.5" style={{ color:seg.color }}>
                      {seg.users} users · {seg.conversion}% conv · <Stars filled={seg.revStars} />
                    </p>
                    {INTEL[seg.name] && (
                      <p className="text-[8px] mt-0.5" style={{ color:C.green }}>
                        ⚡ {INTEL[seg.name].monthlyRev}/mo · LTV {INTEL[seg.name].ltv}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. Opportunity Heatmap ─────────────────────────────────────── */}
        <div>
          <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest mb-3">Opportunity Heatmap — Where to Invest</p>
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
            {HEATMAP_CATEGORIES.map(cat => (
              <div key={cat.label} className="dc-card p-4 space-y-3" style={{ borderColor:`${cat.color}20`, borderWidth:'1px' }}>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color:cat.color }}>{cat.icon} {cat.label}</p>
                </div>
                <div className="space-y-2">
                  {cat.top.map((t,i) => (
                    <div key={t.name} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-dc-text">{i===0?'🥇':i===1?'🥈':'🥉'} {t.name}</span>
                        <span className="text-[9px] font-mono font-bold" style={{ color:cat.color }}>{t.val}</span>
                      </div>
                      <MiniBar pct={t.score} color={cat.color} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. User Journey + Conversion Funnel ───────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* User Journey */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">User Lifecycle Journey</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Movement between lifecycle stages</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-0 overflow-x-auto pb-2">
                {JOURNEY_STAGES.map((s, i) => (
                  <div key={s.label} className="flex items-center shrink-0">
                    <div className="flex flex-col items-center gap-1 min-w-[72px]">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2"
                        style={{ borderColor:s.color, background:`${s.color}12` }}>
                        {s.icon}
                      </div>
                      <p className="text-[9px] font-bold text-center" style={{ color:s.color }}>{s.label}</p>
                      <p className="text-lg font-bold font-mono text-center" style={{ color:s.color }}>{s.count}</p>
                      <p className="text-[7px] text-dc-muted text-center">{s.note}</p>
                    </div>
                    {i < JOURNEY_STAGES.length-1 && (
                      <div className="flex items-center shrink-0 w-6 -mt-8">
                        <div className="w-full h-px" style={{ background:`rgba(255,255,255,0.12)` }} />
                        <span className="text-dc-muted text-[10px] ml-0.5">›</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
                <p className="text-[9px] text-dc-muted leading-relaxed">
                  <span style={{ color:C.red }}>Critical gap:</span> 0 Premium users despite 68 likely buyers — launch Premium Drive to unlock this stage.
                  <span style={{ color:C.green }}> Creator Program</span> at 12 users shows viral path is already forming.
                </p>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Monetization Conversion Funnel</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Registration → Premium — ⚡ projected</p>
            </div>
            <div className="p-5 space-y-2">
              {FUNNEL.map((f, i) => {
                const w = Math.max(f.pct, 4);
                const dropPct = i > 0 ? Math.round(((FUNNEL[i-1].count - f.count) / Math.max(FUNNEL[i-1].count,1)) * 100) : 0;
                return (
                  <div key={f.stage}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-dc-text font-semibold">{f.stage}</span>
                      <div className="flex items-center gap-2">
                        {i > 0 && dropPct > 0 && <span className="text-[8px]" style={{ color:C.red }}>↓{dropPct}%</span>}
                        <span className="text-[9px] font-mono font-bold" style={{ color:f.color }}>{f.count.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-4 rounded flex items-center px-2" style={{ width:`${w}%`, background:`${f.color}22`, border:`1px solid ${f.color}40`, minWidth:'60px' }}>
                      <span className="text-[8px] font-bold font-mono" style={{ color:f.color }}>{f.pct}%</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-[9px] text-dc-muted pt-1 italic">
                Largest drop: Registration → Has Dream (26%). Onboarding must trigger first dream post within 24h.
              </p>
            </div>
          </div>
        </div>

        {/* ── 5. Business Segments Grid ──────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest px-1">
            Segment Intelligence Grid — 15 AI-Scored Segments (ring = opportunity score)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {BUSINESS_SEGMENTS.map(seg => <BusinessSegmentCard key={seg.id} seg={seg} />)}
          </div>
        </div>

        {/* ── 6. AI Dynamic Segments (preserved + enhanced) ─────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">AI-Derived High-Value Segments</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">Computed from behavioral signals + AI analysis — highest purchase intent detected</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            {AI_SEGMENTS.map(seg => (
              <div key={seg.name} className="space-y-3 p-4 rounded-xl"
                style={{ background:`${seg.color}08`, border:`1px solid ${seg.color}20` }}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{seg.icon}</span>
                  <div>
                    <p className="text-dc-text text-xs font-bold">{seg.name}</p>
                    <p className="text-dc-muted text-[9px] mt-0.5">{seg.profile}</p>
                  </div>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-dc-muted">{seg.users} users</span>
                  <span className="font-bold font-mono" style={{ color:seg.color }}>Est. {seg.estimatedRevenue}</span>
                </div>
                <ConversionBar pct={seg.conversion} color={seg.color} />
                <p className="text-[9px] italic" style={{ color:seg.color }}>→ {seg.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7. AI Strategy Panel ───────────────────────────────────────── */}
        <div className="dc-card overflow-hidden" style={{ borderColor:`${C.gold}20`, borderWidth:'1px' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-dc-text text-sm font-bold">AI Strategy Intelligence</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Why this segment matters · How to monetize · What to do now</p>
            </div>
          </div>
          {/* Segment tabs */}
          <div className="flex gap-1 p-3 flex-wrap border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            {BUSINESS_SEGMENTS.map(s => (
              <button key={s.name} onClick={()=>setStratSeg(s.name)}
                className="text-[8px] font-bold px-2 py-1 rounded transition-all"
                style={ stratSeg===s.name
                  ? { background:`${s.color}20`, color:s.color, border:`1px solid ${s.color}40` }
                  : { background:'rgba(255,255,255,0.04)', color:'#555', border:'1px solid rgba(255,255,255,0.06)' }
                }>
                {s.icon} {s.name.split(' ').slice(0,2).join(' ')}
              </button>
            ))}
          </div>
          {activeStrat && (
            <div className="p-5 grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="rounded-lg p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color:C.cyan }}>Why This Segment Matters</p>
                  <p className="text-[11px] text-dc-text leading-relaxed">{activeStrat.why}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color:C.purple }}>Recommended Strategy</p>
                  <p className="text-[11px] text-dc-text leading-relaxed">{activeStrat.strategy}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background:`rgba(56,214,138,0.05)`, border:`1px solid rgba(56,214,138,0.18)` }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color:C.green }}>Best Next Action</p>
                  <p className="text-[11px] text-dc-text leading-relaxed">{activeStrat.nextAction}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:'Monthly Rev',      value:activeStrat.monthlyRev,   color:C.green  },
                    { label:'LTV',              value:activeStrat.ltv,          color:C.cyan   },
                    { label:'Ad Revenue',       value:activeStrat.adRev,        color:C.orange },
                    { label:'Creator Rev',      value:activeStrat.creatorRev,   color:C.pink   },
                    { label:'Expected Uplift',  value:activeStrat.uplift,       color:C.gold   },
                    { label:'AI Confidence',    value:`${activeStrat.confidence}%`, color:C.violet },
                  ].map(m => (
                    <div key={m.label} className="dc-card px-3 py-2">
                      <p className="text-[8px] text-dc-muted uppercase tracking-widest">{m.label}</p>
                      <p className="text-sm font-bold font-mono mt-0.5" style={{ color:m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color:C.gold }}>Health Indicators</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label:'Growth',    value:activeStrat.growthLabel,    color:activeStrat.growthLabel==='Accelerating'?C.green:activeStrat.growthLabel==='Declining'||activeStrat.growthLabel==='Stagnant'?C.red:C.gold },
                      { label:'Stability', value:activeStrat.stabilityLabel, color:activeStrat.stabilityLabel==='Stable'?C.green:activeStrat.stabilityLabel==='Volatile'?C.gold:C.red },
                      { label:'Churn',     value:activeStrat.churnLabel,     color:activeStrat.churnColor },
                    ].map(h => (
                      <div key={h.label} className="p-2 rounded" style={{ background:`${h.color}10` }}>
                        <p className="text-[8px] text-dc-muted">{h.label}</p>
                        <p className="text-[9px] font-bold mt-0.5" style={{ color:h.color }}>{h.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color:C.violet }}>Opportunity Score</p>
                  <div className="space-y-1.5">
                    {(['revenue','growth','virality','premium','retention'] as const).map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[9px] text-dc-muted w-16 shrink-0 capitalize">{k}</span>
                        <div className="flex-1 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width:`${activeStrat.opp[k]}%`, background:C.violet }} />
                        </div>
                        <span className="text-[8px] font-mono w-5 text-right shrink-0" style={{ color:C.violet }}>{activeStrat.opp[k]}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                      <span className="text-[9px] font-bold text-dc-text">Total Score</span>
                      <span className="text-sm font-bold font-mono" style={{ color:C.violet }}>{activeStrat.opp.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 8. Dream DNA Analytics ─────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-dc-text text-sm font-bold">Dream DNA Analytics</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Behavioral dream signature per segment — DreamCloud's data moat</p>
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {BUSINESS_SEGMENTS.slice(0,8).map(s => (
                <button key={s.name} onClick={()=>setDreamSeg(s.name)}
                  className="text-[8px] font-bold px-2 py-1 rounded transition-all"
                  style={ dreamSeg===s.name
                    ? { background:`${s.color}20`, color:s.color, border:`1px solid ${s.color}40` }
                    : { background:'rgba(255,255,255,0.04)', color:'#555', border:'1px solid rgba(255,255,255,0.06)' }
                  }>
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
          {/* DNA table — all segments */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Segment</th>
                  <th className={THcls}>Emotion</th>
                  <th className={THcls}>Archetype</th>
                  <th className={THcls}>Symbol</th>
                  <th className={THcls}>Freq</th>
                  <th className={THcls}>Lucid %</th>
                  <th className={THcls}>Nightmare %</th>
                  <th className={THcls}>Avg Length</th>
                  <th className={THcls}>Complexity</th>
                </tr>
              </thead>
              <tbody>
                {BUSINESS_SEGMENTS.map(s => {
                  const d = INTEL[s.name];
                  const isActive = s.name === dreamSeg;
                  return (
                    <tr key={s.name}
                      onClick={()=>setDreamSeg(s.name)}
                      className="cursor-pointer hover:bg-white/[0.015] transition-colors"
                      style={ isActive ? { background:`${s.color}08` } : undefined }>
                      <td className={TDcls}>
                        <span className="text-[10px] font-semibold">{s.icon} {s.name.split(' ').slice(0,3).join(' ')}</span>
                      </td>
                      <td className={TDcls}><span className="text-[10px]" style={{ color:C.pink }}>{d?.emotion??'—'}</span></td>
                      <td className={TDcls}><span className="text-[10px]" style={{ color:C.violet }}>{d?.archetype??'—'}</span></td>
                      <td className={TDcls}><span className="text-[10px] text-dc-muted">{d?.symbol??'—'}</span></td>
                      <td className={TDcls}><span className="text-[10px] font-mono" style={{ color:C.cyan }}>{d?.freq??'—'}</span></td>
                      <td className={TDcls}>
                        {d && <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px]" style={{ color:C.cyan }}>{d.lucid}%</span>
                          <div className="w-10 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width:`${d.lucid}%`, background:C.cyan }} />
                          </div>
                        </div>}
                      </td>
                      <td className={TDcls}>
                        {d && <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px]" style={{ color:C.red }}>{d.nightmare}%</span>
                          <div className="w-10 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width:`${d.nightmare}%`, background:C.red }} />
                          </div>
                        </div>}
                      </td>
                      <td className={TDcls}><span className="text-[9px] text-dc-muted">{d?.avgLength??'—'}</span></td>
                      <td className={TDcls}>
                        {d && <span className="text-[9px] font-bold" style={{ color:d.complexity==='Very High'?C.violet:d.complexity==='High'?C.purple:d.complexity==='Medium'?C.cyan:C.dim }}>
                          {d.complexity}
                        </span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Selected segment detail */}
          {activeDNA && (
            <div className="px-5 py-4 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color:BUSINESS_SEGMENTS.find(s=>s.name===dreamSeg)?.color??C.purple }}>
                Dream DNA Detail — {dreamSeg}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label:'Dominant Emotion',  value:activeDNA.emotion,    color:C.pink   },
                  { label:'Dominant Archetype',value:activeDNA.archetype,  color:C.violet },
                  { label:'Core Symbol',       value:activeDNA.symbol,     color:C.cyan   },
                  { label:'Dream Frequency',   value:activeDNA.freq,       color:C.green  },
                  { label:'Lucid Rate',        value:`${activeDNA.lucid}%`,       color:C.cyan   },
                  { label:'Nightmare Rate',    value:`${activeDNA.nightmare}%`,   color:C.red    },
                  { label:'Avg Dream Length',  value:activeDNA.avgLength,  color:C.gold   },
                  { label:'Content Complexity',value:activeDNA.complexity, color:C.purple },
                ].map(m=>(
                  <div key={m.label} className="p-2 rounded" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[8px] text-dc-muted">{m.label}</p>
                    <p className="text-[11px] font-bold mt-0.5" style={{ color:m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 9. Predictive AI Forecast 30/90/180 ───────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Predictive AI Forecast</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">30 / 90 / 180 day projected user growth per segment — ⚡ AI estimated from growth rates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Segment</th>
                  <th className={THcls}>Current</th>
                  <th className={THcls}>30 Day</th>
                  <th className={THcls}>90 Day</th>
                  <th className={THcls}>180 Day</th>
                  <th className={THcls}>Trend</th>
                  <th className={THcls}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {BUSINESS_SEGMENTS.map(s => {
                  const d = INTEL[s.name];
                  if (!d) return null;
                  const isUp = d.forecast[2] > s.users;
                  return (
                    <tr key={s.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="text-[10px] font-semibold">{s.icon} {s.name.split(' ').slice(0,3).join(' ')}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">{s.users}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px] font-bold" style={{ color:s.color }}>{d.forecast[0]}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px] font-bold" style={{ color:s.color }}>{d.forecast[1]}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px] font-bold" style={{ color:s.color }}>{d.forecast[2]}</span></td>
                      <td className={TDcls}><Sparkline data={[...d.trend, d.forecast[0], d.forecast[1], d.forecast[2]]} color={s.color} /></td>
                      <td className={TDcls}>
                        <span className="text-[9px] font-bold" style={{ color:isUp?C.green:C.red }}>
                          {isUp?'▲ Growing':'▼ Shrinking'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 10. Monetization Recommendation Matrix ─────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Monetization Recommendation Matrix</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">AI score per channel per segment (0–100). Higher = stronger fit</p>
            <div className="flex items-center gap-4 mt-2">
              {MONET_CHANNELS.map(ch => (
                <div key={ch} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background:MONET_COLORS[ch] }} />
                  <span className="text-[8px] text-dc-muted capitalize">{ch}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Segment</th>
                  <th className={THcls} style={{ color:MONET_COLORS.premium }}>Premium</th>
                  <th className={THcls} style={{ color:MONET_COLORS.ads }}>Ads</th>
                  <th className={THcls} style={{ color:MONET_COLORS.creator }}>Creator</th>
                  <th className={THcls} style={{ color:MONET_COLORS.reports }}>AI Reports</th>
                  <th className={THcls} style={{ color:MONET_COLORS.meditation }}>Meditation</th>
                  <th className={THcls} style={{ color:MONET_COLORS.sponsorship }}>Sponsor</th>
                  <th className={THcls}>Best Channel</th>
                </tr>
              </thead>
              <tbody>
                {BUSINESS_SEGMENTS.map(s => {
                  const d = INTEL[s.name];
                  if (!d) return null;
                  const best = (Object.entries(d.monet) as [keyof MonetScore, number][]).reduce((a,b) => b[1]>a[1]?b:a);
                  return (
                    <tr key={s.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="text-[10px] font-semibold">{s.icon} {s.name.split(' ').slice(0,2).join(' ')}</span></td>
                      {MONET_CHANNELS.map(ch => (
                        <td key={ch} className={TDcls}>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] w-6 shrink-0" style={{ color:MONET_COLORS[ch] }}>{d.monet[ch]}</span>
                            <div className="w-8 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width:`${d.monet[ch]}%`, background:MONET_COLORS[ch] }} />
                            </div>
                          </div>
                        </td>
                      ))}
                      <td className={TDcls}>
                        <span className="text-[9px] font-bold capitalize px-1.5 py-0.5 rounded"
                          style={{ background:`${MONET_COLORS[best[0] as keyof MonetScore]}15`, color:MONET_COLORS[best[0] as keyof MonetScore] }}>
                          {best[0]} ({best[1]})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 11. Sponsor Matching Engine ────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-dc-text text-sm font-bold">Sponsor Matching Engine</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">AI-computed brand compatibility based on dream content + segment behavior</p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {BUSINESS_SEGMENTS.filter(s=>INTEL[s.name]?.sponsors.length).map(s=>(
                <button key={s.name} onClick={()=>setSponsorSeg(s.name)}
                  className="text-[8px] font-bold px-2 py-1 rounded transition-all"
                  style={ sponsorSeg===s.name
                    ? { background:`${s.color}20`, color:s.color, border:`1px solid ${s.color}40` }
                    : { background:'rgba(255,255,255,0.04)', color:'#555', border:'1px solid rgba(255,255,255,0.06)' }
                  }>
                  {s.icon} {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          {activeSponsor && (
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                {(() => { const seg = BUSINESS_SEGMENTS.find(s=>s.name===sponsorSeg); return seg ? <><span className="text-2xl">{seg.icon}</span><div><p className="text-dc-text font-bold">{seg.name}</p><p className="text-dc-muted text-[10px]">{seg.users} users · Sponsor Score: <span style={{ color:C.violet }}>{activeSponsor.sponsorScore}</span></p></div></> : null; })()}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {activeSponsor.sponsors.length > 0 ? activeSponsor.sponsors.map(sp => (
                  <div key={sp.name} className="p-4 rounded-xl space-y-3"
                    style={{ background:`${C.violet}06`, border:`1px solid ${C.violet}18` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-dc-text text-xs font-bold">{sp.name}</p>
                        <p className="text-dc-muted text-[9px]">{sp.category}</p>
                      </div>
                      <span className="text-[10px] font-bold font-mono shrink-0" style={{ color:C.violet }}>{sp.match}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width:`${sp.match}%`, background:C.violet }} />
                    </div>
                    <p className="text-[8px] italic" style={{ color:C.violet }}>
                      → Best placement: Dream Detail Card
                    </p>
                  </div>
                )) : (
                  <div className="col-span-3 p-4 text-center">
                    <p className="text-dc-muted text-sm">No sponsors available for this segment — brand safety review required.</p>
                  </div>
                )}
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ background:'rgba(255,184,0,0.06)', border:`1px solid rgba(255,184,0,0.18)` }}>
                <p className="text-[9px] text-dc-muted italic">
                  Overall Sponsor Score: <span style={{ color:C.gold }}>{activeSponsor.sponsorScore}/100</span> ·
                  Segment sponsor match computed from dream content safety (71% platform avg), emotion profile,
                  archetype alignment, and advertiser category exclusions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── 12. Segment Relationship Matrix ───────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Segment Relationship Graph</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">Overlap % between high-value segments — higher overlap = cross-sell opportunity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Segment ↕ / Segment →</th>
                  {RELATIONSHIP_SEGS.map(r=><th key={r} className={THcls}>{r.split(' ').slice(0,2).join(' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {RELATIONSHIP_SEGS.map(rowSeg => (
                  <tr key={rowSeg} className="hover:bg-white/[0.015]">
                    <td className={TDcls}><span className="text-[10px] font-semibold">{rowSeg.split(' ').slice(0,2).join(' ')}</span></td>
                    {RELATIONSHIP_SEGS.map(colSeg => {
                      if (rowSeg===colSeg) return <td key={colSeg} className={TDcls}><span className="text-dc-muted text-[9px]">—</span></td>;
                      const pct = RELATIONSHIP_MATRIX[rowSeg]?.[colSeg] ?? 0;
                      const color = pct>=50?C.green:pct>=30?C.cyan:pct>=15?C.gold:C.dim;
                      return (
                        <td key={colSeg} className={TDcls}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold" style={{ color }}>{pct}%</span>
                            <div className="w-8 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width:`${pct}%`, background:color }} />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] text-dc-muted italic">Power Dreamers ↔ High Engagement (62%) and Likely Premium (58%) highest overlap — ideal bundled campaign targets.</p>
          </div>
        </div>

        {/* API Sections (preserved) */}
        {data && (
          <>
            {data.behaviorSegments.length > 0 && (
              <div className="space-y-3">
                <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest px-1">Behavioral Segments — Live API Data</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {data.behaviorSegments.map(seg => <BehaviorCard key={seg.id} seg={seg} totalUsers={data.totalUsers} />)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="dc-card overflow-hidden">
                <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                  <h3 className="text-dc-text text-sm font-bold">Archetype Segments</h3>
                  <p className="text-dc-muted text-[10px] mt-0.5">Dream figure archetypes — with revenue relevance per type</p>
                </div>
                <div className="px-5 py-2">
                  {data.archetypeSegments.length===0
                    ? <p className="text-dc-muted text-xs py-4 text-center">No archetype data available</p>
                    : data.archetypeSegments.map(a=><ArchetypeRow key={a.archetype} a={a} />)
                  }
                </div>
              </div>
              <div className="dc-card p-5 space-y-4">
                <div>
                  <h3 className="text-dc-text text-sm font-bold">Dominant Emotion Distribution</h3>
                  <p className="text-dc-muted text-[10px] mt-0.5">Most frequent emotion per user — with revenue relevance note</p>
                </div>
                {data.emotionSegments.length===0
                  ? <p className="text-dc-muted text-xs text-center py-4">No emotion data available</p>
                  : <div className="space-y-3">{data.emotionSegments.map(e=><EmotionBar key={e.emotion} e={e} max={maxEmotion} />)}</div>
                }
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 dc-card overflow-hidden">
                <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                  <h3 className="text-dc-text text-sm font-bold">Geographic Breakdown</h3>
                  <p className="text-dc-muted text-[10px] mt-0.5">Country distribution with monetization priority</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                        {['Country','Share','Users','Engagement','Est. ARPU','Priority'].map(h=>(
                          <th key={h} className="text-left text-dc-muted text-[9px] font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GEO_DATA.map(row => {
                        const pc: Record<string,string> = { Premium:C.gold, Volume:C.green, Growth:C.cyan, Monitor:C.dim };
                        return (
                          <tr key={row.country} className="border-b last:border-0 transition-colors hover:bg-white/[0.02]" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
                            <td className="px-4 py-3 text-dc-text font-semibold">{row.flag} {row.country}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
                                  <div className="h-full rounded-full" style={{ width:`${row.pct}%`, background:C.purple }} />
                                </div>
                                <span className="text-dc-muted font-mono text-[10px]">{row.pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-dc-text font-mono">{row.users}</td>
                            <td className="px-4 py-3 text-dc-muted">{row.engagement}</td>
                            <td className="px-4 py-3 font-mono font-bold" style={{ color:C.green }}>{row.arpu}</td>
                            <td className="px-4 py-3">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                                style={{ color:pc[row.priority]??C.dim, background:`${pc[row.priority]??C.dim}15` }}>
                                {row.priority}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="dc-card p-5 space-y-5">
                <div>
                  <h3 className="text-dc-text text-sm font-bold">Device Breakdown</h3>
                  <p className="text-dc-muted text-[10px] mt-0.5">Primary access channel per user</p>
                </div>
                <div className="space-y-4">
                  {DEVICE_DATA.map(d=>(
                    <div key={d.device} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-dc-text text-xs font-semibold">{d.icon} {d.device}</span>
                        <span className="font-bold font-mono text-sm" style={{ color:d.color }}>{d.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width:`${d.pct}%`, background:d.color }} />
                      </div>
                      <p className="text-dc-muted text-[9px]">~{Math.round(569*d.pct/100)} users</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                  <p className="text-dc-muted text-[9px] leading-relaxed">
                    Mobile-first strategy recommended. Push notifications primary conversion channel for {Math.round(569*0.69)} users.
                  </p>
                </div>
              </div>
            </div>

            {/* Historical Timeline */}
            <div className="dc-card overflow-hidden">
              <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                <h3 className="text-dc-text text-sm font-bold">Historical Timeline — Segment Trend Evolution</h3>
                <p className="text-dc-muted text-[10px] mt-0.5">6-month user count evolution per segment — ⚡ simulated from growth rates</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                      <th className={THcls}>Segment</th>
                      {['Jan','Feb','Mar','Apr','May','Jun'].map(m=><th key={m} className={THcls}>{m}</th>)}
                      <th className={THcls}>Trend</th>
                      <th className={THcls}>∆ 6M</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUSINESS_SEGMENTS.map(s => {
                      const d = INTEL[s.name];
                      if (!d) return null;
                      const first = d.trend[0], last = d.trend[d.trend.length-1];
                      const delta = last - first;
                      return (
                        <tr key={s.name} className="hover:bg-white/[0.015]">
                          <td className={TDcls}><span className="text-[10px] font-semibold">{s.icon} {s.name.split(' ').slice(0,2).join(' ')}</span></td>
                          {d.trend.map((v,i)=>(
                            <td key={i} className={TDcls}><span className="font-mono text-[10px]">{v}</span></td>
                          ))}
                          <td className={TDcls}><Sparkline data={d.trend} color={s.color} /></td>
                          <td className={TDcls}>
                            <span className="font-mono text-[10px] font-bold" style={{ color:delta>=0?C.green:C.red }}>
                              {delta>=0?'+':''}{delta}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Executive Summary Footer */}
            <div className="dc-card p-5 space-y-4" style={{ borderColor:`${C.violet}25`, borderWidth:'1px' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:C.violet }}>Intelligence Summary</p>
              <div className="grid grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Immediate Actions</p>
                  {[
                    { label:'Launch Premium Drive',  color:C.gold   },
                    { label:'Creator Beta Invite',   color:C.pink   },
                    { label:'Activate Re-Engagement',color:C.cyan   },
                    { label:'Brand Safety Audit',    color:C.red    },
                  ].map(r=>(
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:r.color }} />
                      <span className="text-[9px] font-semibold" style={{ color:r.color }}>{r.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Revenue Unlocks</p>
                  {[
                    { label:'Premium Conv ($181/mo)',   color:C.green  },
                    { label:'AI Reports ($98/mo)',      color:C.purple },
                    { label:'Creator Program ($240/mo)',color:C.pink   },
                    { label:'Nightmare Ads ($640/mo)',  color:C.gold   },
                  ].map(r=>(
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="text-[9px] font-bold" style={{ color:r.color }}>+</span>
                      <span className="text-[9px]" style={{ color:r.color }}>{r.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Top Opportunities</p>
                  {[
                    { label:'Intl Premium: $540/mo',      color:C.cyan   },
                    { label:'Mobile Push: +$240/mo',       color:C.violet },
                    { label:'Spiritual + Meditation',      color:C.purple },
                    { label:'Lucid → Premium path',        color:C.green  },
                  ].map(r=>(
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:r.color }} />
                      <span className="text-[9px]" style={{ color:r.color }}>{r.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Risk Mitigation</p>
                  {[
                    { label:'Dormant: 142 users at risk',  color:C.red  },
                    { label:'Silent: -3% declining',       color:C.red  },
                    { label:'Report Risk: quarantine',     color:C.red  },
                    { label:'Brand safety: 71% → 85%',    color:C.gold },
                  ].map(r=>(
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="text-[9px]" style={{ color:r.color }}>⚠ {r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
                <p className="text-[11px] text-dc-text leading-relaxed">
                  <span style={{ color:C.green }}>$1,415/mo additional revenue</span> is achievable if all 4 immediate actions are executed within 30 days.
                  Priority order: (1) Premium Conversion Drive — 92% AI confidence, (2) Creator Beta — highest LTV at $480/user,
                  (3) Re-engagement — stops the largest churn bleed (328 at-risk users),
                  (4) Brand safety audit — unlocks $640/mo Nightmare Therapy Partner campaign.
                </p>
              </div>
            </div>

            <p className="text-dc-muted/50 text-[10px] text-right font-mono">
              API data as of {new Date(data.computedAt).toLocaleString('en-US')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
