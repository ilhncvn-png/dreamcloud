import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchAdvertising } from '../api/admin.api';
import type { AdSafetyCheck } from '../api/admin.api';

const C = {
  green:  '#38D68A', gold:   '#FFB800', purple: '#7B6FFF',
  cyan:   '#00CFFF', pink:   '#FF4D8F', red:    '#FF4A5E',
  orange: '#FF8C00', violet: '#CC80FF', dim:    '#5A5A84',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type AdvStatus   = 'ACTIVE' | 'PAUSED' | 'PENDING';
type NetStatus   = 'CONNECTED' | 'PENDING' | 'DISABLED';
type QueueSt     = 'PENDING' | 'APPROVED' | 'REJECTED';
type CampaignSt  = 'ACTIVE' | 'PLANNED' | 'PAUSED';
type ABWinner    = 'A' | 'B' | 'PENDING';
type StageSt     = 'DONE' | 'CURRENT' | 'PENDING';
type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type SortKey     = 'roas' | 'revenue' | 'ctr' | 'spend';

interface Advertiser {
  name: string; logo: string; status: AdvStatus; campaign: string;
  budget: string; spend: string; impressions: string; ctr: string;
  revenue: string; safety: string; safetyColor: string;
}
interface AdNetwork {
  name: string; status: NetStatus; share: string;
  lastSync: string; fillRate: string; latency: string;
}
interface QueueEntry {
  advertiser: string; status: QueueSt; category: string;
  reason: string; moderator: string; date: string;
}
interface TopCampaign {
  name: string; advertiser: string; budget: string; spend: string;
  ctr: string; conv: string; cpa: string; revenue: string;
  roas: string; roasNum: number; revenueNum: number; ctrNum: number; spendNum: number;
  status: CampaignSt;
}
interface ABTest {
  name: string;
  a: { label: string; ctr: string; imp: string };
  b: { label: string; ctr: string; imp: string };
  winner: ABWinner; rec: string;
}
interface Creator {
  name: string; handle: string; revenue: string; followers: string;
  ctr: string; engagement: string; satisfaction: string; value: string;
}
interface ForecastTier {
  users: string; revenue: string; cpm: string;
  fillRate: string; advertisers: number; profit: string;
}
interface TimelineStage {
  name: string; status: StageSt; readiness: number; detail: string;
}
interface QualityRow {
  placement: string; quality: number; relevance: number; ctr: number;
  experience: number; safety: number; overall: number; color: string;
}
interface RevSource { label: string; pct: number; revenue: string; growth: string; color: string; }
interface ExecKpi   { label: string; value: string; sub: string; color: string; proj: boolean; spark: number[]; }
interface AiInsight { text: string; confidence: number; impact: ImpactLevel; lift: string; priority: string; action: string; color: string; }
interface StaticPlacement {
  id: string; name: string; description: string;
  status: 'DESIGN_READY' | 'PLANNED' | 'FUTURE';
  estImpressions: string; estCPM: string; safetyLabel: string;
  safetyColor: string; audience: string; heatPct: number; heatColor: string;
}
interface SafetyItem { label: string; status: 'PASS' | 'PENDING' | 'FAIL'; detail: string; score: number; }
interface KpiMetric  { label: string; value: string; sub?: string; color: string; projected: boolean; }
interface TargetingState {
  adsEnabled: boolean; ageSafety: boolean; nightmareExclusion: boolean;
  sensitiveExclusion: boolean; countryTargeting: 'all' | 'tier1' | 'custom';
  languageTargeting: 'all' | 'en-tr' | 'custom';
  excludeViolence: boolean; excludeNSFW: boolean; excludeSelfHarm: boolean;
  frequencyCap: number;
}

// ── Static data ───────────────────────────────────────────────────────────────

const ADVERTISERS: Advertiser[] = [
  { name:'Spotify',     logo:'🎵', status:'ACTIVE',  campaign:'Dream Mood Playlist',   budget:'$2,400', spend:'$1,847', impressions:'28,400', ctr:'2.4%', revenue:'$1,240', safety:'A',  safetyColor:C.green  },
  { name:'Nike',        logo:'✓',  status:'ACTIVE',  campaign:'Move with Your Dreams', budget:'$4,000', spend:'$2,920', impressions:'42,100', ctr:'1.9%', revenue:'$2,180', safety:'A+', safetyColor:C.green  },
  { name:'Calm',        logo:'☁',  status:'ACTIVE',  campaign:'Sleep Story Dreams',    budget:'$1,600', spend:'$1,430', impressions:'18,200', ctr:'3.1%', revenue:'$980',   safety:'A+', safetyColor:C.green  },
  { name:'Headspace',   logo:'🧘', status:'PENDING', campaign:'Mindful Dreaming',      budget:'$1,800', spend:'$0',     impressions:'—',      ctr:'—',    revenue:'—',      safety:'A',  safetyColor:C.green  },
  { name:'BetterSleep', logo:'💤', status:'PENDING', campaign:'Deep Sleep Program',    budget:'$1,200', spend:'$0',     impressions:'—',      ctr:'—',    revenue:'—',      safety:'A',  safetyColor:C.green  },
  { name:'Samsung',     logo:'📱', status:'PAUSED',  campaign:'Galaxy Night Mode',     budget:'$3,000', spend:'$890',   impressions:'11,200', ctr:'1.2%', revenue:'$420',   safety:'B',  safetyColor:C.gold   },
  { name:'Apple Music', logo:'🎵', status:'PENDING', campaign:'Dreams Playlist',       budget:'$2,000', spend:'$0',     impressions:'—',      ctr:'—',    revenue:'—',      safety:'A+', safetyColor:C.green  },
  { name:'OpenAI',      logo:'🤖', status:'ACTIVE',  campaign:'AI Dream Analysis',     budget:'$5,000', spend:'$3,210', impressions:'62,400', ctr:'2.8%', revenue:'$3,890', safety:'A+', safetyColor:C.green  },
  { name:'Notion',      logo:'📝', status:'PAUSED',  campaign:'Dream Journal',         budget:'$800',   spend:'$240',   impressions:'3,800',  ctr:'1.8%', revenue:'$180',   safety:'A',  safetyColor:C.green  },
];

const AD_NETWORKS: AdNetwork[] = [
  { name:'Google AdMob',          status:'PENDING',   share:'30%', lastSync:'Never',       fillRate:'—', latency:'—'     },
  { name:'AppLovin',              status:'PENDING',   share:'25%', lastSync:'Never',       fillRate:'—', latency:'—'     },
  { name:'Unity Ads',             status:'DISABLED',  share:'35%', lastSync:'Never',       fillRate:'—', latency:'—'     },
  { name:'Meta Audience Network', status:'PENDING',   share:'32%', lastSync:'Never',       fillRate:'—', latency:'—'     },
  { name:'IronSource',            status:'DISABLED',  share:'28%', lastSync:'Never',       fillRate:'—', latency:'—'     },
  { name:'Amazon Ads',            status:'PENDING',   share:'20%', lastSync:'Never',       fillRate:'—', latency:'—'     },
  { name:'Direct Sales',          status:'CONNECTED', share:'0%',  lastSync:'2026-06-28',  fillRate:'—', latency:'<50ms' },
  { name:'Sponsor Marketplace',   status:'CONNECTED', share:'15%', lastSync:'2026-06-28',  fillRate:'—', latency:'<80ms' },
];

const APPROVAL_QUEUE: QueueEntry[] = [
  { advertiser:'Spotify',       status:'PENDING',  category:'Music / Wellness',  reason:'Awaiting brand safety review',          moderator:'Admin', date:'2026-07-01' },
  { advertiser:'Nike',          status:'APPROVED', category:'Sports / Fashion',  reason:'Passes all safety criteria',             moderator:'Admin', date:'2026-06-15' },
  { advertiser:'Casino Ads',    status:'REJECTED', category:'Gambling',          reason:'Gambling content not permitted',          moderator:'Admin', date:'2026-06-10' },
  { advertiser:'Alcohol Brand', status:'REJECTED', category:'Alcohol',           reason:'Alcohol advertising prohibited',           moderator:'Admin', date:'2026-06-08' },
  { advertiser:'Crypto Gamble', status:'REJECTED', category:'Gambling / Crypto', reason:'Gambling + unregulated crypto assets',    moderator:'Admin', date:'2026-06-05' },
];

const TOP_CAMPAIGNS: TopCampaign[] = [
  { name:'AI Dream Analysis',    advertiser:'OpenAI',  budget:'$5,000', spend:'$3,210', ctr:'2.8%', conv:'340', cpa:'$9.44',  revenue:'$3,890', roas:'1.21×', roasNum:1.21, revenueNum:3890, ctrNum:2.8, spendNum:3210, status:'ACTIVE' },
  { name:'Dream Mood Playlist',  advertiser:'Spotify', budget:'$2,400', spend:'$1,847', ctr:'2.4%', conv:'180', cpa:'$10.26', revenue:'$1,240', roas:'0.67×', roasNum:0.67, revenueNum:1240, ctrNum:2.4, spendNum:1847, status:'ACTIVE' },
  { name:'Sleep Story Dreams',   advertiser:'Calm',    budget:'$1,600', spend:'$1,430', ctr:'3.1%', conv:'165', cpa:'$8.67',  revenue:'$980',   roas:'0.69×', roasNum:0.69, revenueNum:980,  ctrNum:3.1, spendNum:1430, status:'ACTIVE' },
  { name:'Move with Your Dreams',advertiser:'Nike',    budget:'$4,000', spend:'$2,920', ctr:'1.9%', conv:'210', cpa:'$13.90', revenue:'$2,180', roas:'0.75×', roasNum:0.75, revenueNum:2180, ctrNum:1.9, spendNum:2920, status:'ACTIVE' },
  { name:'Galaxy Night Mode',    advertiser:'Samsung', budget:'$3,000', spend:'$890',   ctr:'1.2%', conv:'48',  cpa:'$18.54', revenue:'$420',   roas:'0.47×', roasNum:0.47, revenueNum:420,  ctrNum:1.2, spendNum:890,  status:'PAUSED' },
  { name:'Dream Journal',        advertiser:'Notion',  budget:'$800',   spend:'$240',   ctr:'1.8%', conv:'28',  cpa:'$8.57',  revenue:'$180',   roas:'0.75×', roasNum:0.75, revenueNum:180,  ctrNum:1.8, spendNum:240,  status:'PAUSED' },
];

const AB_TESTS: ABTest[] = [
  {
    name:'Feed vs. Dream Detail Placement',
    a:{ label:'Feed Native',             ctr:'1.8%', imp:'4,200' },
    b:{ label:'Dream Detail Sponsored',  ctr:'2.4%', imp:'3,100' },
    winner:'B', rec:'Dream Detail has 33% higher CTR — shift 60% of budget there.',
  },
  {
    name:'Morning vs. Evening Delivery',
    a:{ label:'Morning (6–12)',    ctr:'1.2%', imp:'1,800' },
    b:{ label:'Evening (19–23)',   ctr:'2.1%', imp:'2,400' },
    winner:'B', rec:'Evening delivery 75% better — configure time-based scheduling.',
  },
  {
    name:'Wellness vs. Tech Brands',
    a:{ label:'Wellness (Calm/Headspace)', ctr:'3.1%', imp:'2,200' },
    b:{ label:'Tech (Samsung)',            ctr:'1.2%', imp:'1,800' },
    winner:'A', rec:'Wellness brands 2.6× better CTR — prioritize wellness advertisers.',
  },
];

const CREATORS: Creator[] = [
  { name:'Felix',  handle:'@felix_dreams',  revenue:'$240/mo', followers:'842', ctr:'3.4%', engagement:'18%', satisfaction:'4.8/5', value:'$2,400/yr' },
  { name:'Yuki',   handle:'@yuki_dreams',   revenue:'$180/mo', followers:'628', ctr:'2.8%', engagement:'22%', satisfaction:'4.9/5', value:'$1,800/yr' },
  { name:'Luna',   handle:'@luna_cosmic',   revenue:'$160/mo', followers:'520', ctr:'3.1%', engagement:'19%', satisfaction:'4.7/5', value:'$1,620/yr' },
  { name:'Lena',   handle:'@lena_berlin',   revenue:'$120/mo', followers:'445', ctr:'2.2%', engagement:'15%', satisfaction:'4.6/5', value:'$1,200/yr' },
  { name:'Aria',   handle:'@aria_dreams',   revenue:'$90/mo',  followers:'380', ctr:'2.6%', engagement:'17%', satisfaction:'4.5/5', value:'$900/yr'   },
];

const FORECAST: ForecastTier[] = [
  { users:'10K',  revenue:'$8,400',    cpm:'$7.20', fillRate:'72%', advertisers:15,  profit:'$6,720'   },
  { users:'50K',  revenue:'$32,000',   cpm:'$6.80', fillRate:'78%', advertisers:48,  profit:'$26,240'  },
  { users:'100K', revenue:'$68,000',   cpm:'$6.40', fillRate:'82%', advertisers:90,  profit:'$56,760'  },
  { users:'250K', revenue:'$180,000',  cpm:'$6.00', fillRate:'87%', advertisers:200, profit:'$151,200' },
  { users:'500K', revenue:'$340,000',  cpm:'$5.60', fillRate:'91%', advertisers:380, profit:'$289,000' },
  { users:'1M',   revenue:'$640,000',  cpm:'$5.20', fillRate:'94%', advertisers:720, profit:'$550,400' },
];

const TIMELINE: TimelineStage[] = [
  { name:'Preparation',   status:'CURRENT', readiness:71, detail:'Brand safety, inventory design, legal review' },
  { name:'Integration',   status:'PENDING', readiness:0,  detail:'Stripe, AdMob, AppLovin SDK integration'        },
  { name:'Soft Launch',   status:'PENDING', readiness:0,  detail:'Internal test with 3–5 premium advertisers'     },
  { name:'Beta',          status:'PENDING', readiness:0,  detail:'100-user beta with ad targeting enabled'        },
  { name:'Regional',      status:'PENDING', readiness:0,  detail:'TR + DE + US markets, 3 ad networks'            },
  { name:'Global Launch', status:'PENDING', readiness:0,  detail:'All markets, full ad network stack'             },
  { name:'Optimization',  status:'PENDING', readiness:0,  detail:'ML bidding, predictive targeting'               },
];

const QUALITY_ROWS: QualityRow[] = [
  { placement:'Meditation / Sleep', quality:94, relevance:91, ctr:86, experience:93, safety:98, overall:92, color:C.cyan   },
  { placement:'Weekly Digest',      quality:90, relevance:88, ctr:92, experience:89, safety:95, overall:91, color:C.green  },
  { placement:'Dream Detail Card',  quality:87, relevance:84, ctr:80, experience:80, safety:88, overall:84, color:C.purple },
  { placement:'Feed Native Ad',     quality:82, relevance:78, ctr:74, experience:85, safety:91, overall:82, color:C.orange },
  { placement:'Creator Profile',    quality:80, relevance:82, ctr:75, experience:82, safety:90, overall:82, color:C.pink   },
  { placement:'Explore Sponsored',  quality:75, relevance:72, ctr:68, experience:79, safety:88, overall:76, color:C.violet },
];

const REV_SOURCES: RevSource[] = [
  { label:'Feed Ads',            pct:28, revenue:'$1,176', growth:'+12%', color:C.purple  },
  { label:'Dream Detail Ads',    pct:24, revenue:'$1,008', growth:'+18%', color:C.cyan    },
  { label:'Explore Ads',         pct:16, revenue:'$672',   growth:'+22%', color:C.orange  },
  { label:'Creator Sponsorship', pct:12, revenue:'$504',   growth:'+35%', color:C.pink    },
  { label:'Meditation Sponsor',  pct:8,  revenue:'$336',   growth:'+28%', color:C.green   },
  { label:'Weekly Digest',       pct:6,  revenue:'$252',   growth:'+8%',  color:C.gold    },
  { label:'Featured Dreams',     pct:4,  revenue:'$168',   growth:'+15%', color:C.violet  },
  { label:'Direct Deals',        pct:2,  revenue:'$84',    growth:'+5%',  color:C.dim     },
];

const EXEC_KPIS: ExecKpi[] = [
  { label:'Est. Monthly Revenue', value:'$4,200',  sub:'projected at launch',     color:C.pink,   proj:true,  spark:[0,1,3,6,10,16,22,30,4200].map(v=>v/42)    },
  { label:'Est. Annual Revenue',  value:'$50,400', sub:'projected Year 1',        color:C.green,  proj:true,  spark:[0,2,5,10,18,28,42,50]                      },
  { label:'Fill Rate',            value:'74%',     sub:'0% today → 74% at launch',color:C.gold,   proj:true,  spark:[0,5,10,25,40,55,68,74]                     },
  { label:'Active Campaigns',     value:'8',       sub:'projected at launch',     color:C.purple, proj:true,  spark:[0,0,1,2,3,5,6,8]                           },
  { label:'Active Advertisers',   value:'9',       sub:'5 pending approval',      color:C.cyan,   proj:false, spark:[2,3,4,5,6,7,8,9]                           },
  { label:'Pending Advertisers',  value:'5',       sub:'in review queue',         color:C.gold,   proj:false, spark:[1,1,2,3,4,5,5,5]                           },
  { label:'Total Inventory',      value:'12,400',  sub:'monthly impressions',     color:C.violet, proj:true,  spark:[8,9,10,10,11,12,12,12].map(v=>v*1000)      },
  { label:'Brand Safety Score',   value:'71%',     sub:'target 85% pre-launch',   color:C.gold,   proj:false, spark:[55,58,62,65,68,70,71,71]                   },
  { label:'Avg CPM',              value:'$4.20',   sub:'dream-context premium',   color:C.green,  proj:true,  spark:[3,3.2,3.5,3.8,4,4.1,4.2,4.2]              },
  { label:'Avg CTR',              value:'1.8%',    sub:'across all placements',   color:C.orange, proj:true,  spark:[1.2,1.4,1.5,1.6,1.7,1.8,1.8,1.8]          },
  { label:'eCPM',                 value:'$3.10',   sub:'effective CPM',           color:C.purple, proj:true,  spark:[1.8,2.0,2.3,2.6,2.8,3.0,3.1,3.1]          },
  { label:'Est. ROAS',            value:'2.4×',    sub:'return on ad spend',      color:C.cyan,   proj:true,  spark:[1.2,1.5,1.8,2.0,2.1,2.3,2.4,2.4]          },
];

const AI_INSIGHTS: AiInsight[] = [
  { text:'Feed ads perform 34% better after 21:00 — schedule delivery in evening hours.',                   confidence:89, impact:'HIGH',     lift:'+$420/mo',      priority:'P1', action:'Configure time-based ad scheduling',                color:C.orange },
  { text:'Lucid Dream readers have 3.4× above-average sponsor engagement — highest value segment.',         confidence:91, impact:'HIGH',     lift:'+$680/mo',      priority:'P1', action:'Create premium Lucid Dream sponsorship tier',       color:C.cyan   },
  { text:'Nightmare-tagged content must remain excluded — brand safety critical before any live campaign.', confidence:97, impact:'CRITICAL', lift:'Risk avoided',  priority:'P1', action:'Verify nightmare exclusion engine before live date', color:C.red    },
  { text:'Meditation sponsorship shows highest retention — 68% lower skip rate than feed placements.',      confidence:84, impact:'MEDIUM',   lift:'+$280/mo',      priority:'P2', action:'Launch meditation section as first pilot campaign',  color:C.green  },
  { text:'Explore inventory is under-utilized — 2,800 impressions with no demand currently allocated.',     confidence:79, impact:'MEDIUM',   lift:'+$340/mo',      priority:'P2', action:'Open Explore to direct brand sponsorships',         color:C.purple },
  { text:'Expected monthly ad revenue after full network integration: $4,250.',                             confidence:82, impact:'HIGH',     lift:'Baseline target',priority:'P1', action:'Complete Stripe + AdMob integration sprint',        color:C.gold   },
];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  DESIGN_READY: { label:'Design Ready', color:C.green  },
  PLANNED:      { label:'Planned',      color:C.gold   },
  FUTURE:       { label:'Future Phase', color:C.dim    },
  ACTIVE:       { label:'Active',       color:C.green  },
};

const SAFETY_CFG: Record<string, { label: string; color: string; icon: string }> = {
  PASS:    { label:'Pass',    color:C.green, icon:'◉' },
  PENDING: { label:'Pending', color:C.gold,  icon:'◌' },
  FAIL:    { label:'Failed',  color:C.red,   icon:'✕' },
};

const STATIC_PLACEMENTS: StaticPlacement[] = [
  { id:'feed-native',       name:'Feed Native Ad',              description:'In-feed between dreams',         status:'DESIGN_READY', estImpressions:'4,200 imp/mo', estCPM:'$5.20', safetyLabel:'Safe',                  safetyColor:C.green, audience:'All active dreamers; high relevance context',           heatPct:90, heatColor:C.purple  },
  { id:'dream-detail-card', name:'Dream Detail Sponsored Card', description:'Below dream content',            status:'DESIGN_READY', estImpressions:'3,100 imp/mo', estCPM:'$6.40', safetyLabel:'Sensitive — check nightmare', safetyColor:C.gold,  audience:'Exclude nightmare-tagged; brand check required',        heatPct:78, heatColor:C.cyan    },
  { id:'explore-sponsored', name:'Explore Sponsored Card',      description:'Sponsored content in Explore',  status:'PLANNED',      estImpressions:'2,800 imp/mo', estCPM:'$4.80', safetyLabel:'Safe',                  safetyColor:C.green, audience:'Discovery-mode users; high intent',                     heatPct:65, heatColor:C.orange  },
  { id:'weekly-digest',     name:'Weekly Digest Sponsorship',   description:'Email digest bottom placement', status:'PLANNED',      estImpressions:'400 sends/mo', estCPM:'$12.00',safetyLabel:'Safe',                  safetyColor:C.green, audience:'Subscribed users; high open-rate segment',              heatPct:55, heatColor:C.gold    },
  { id:'meditation-sleep',  name:'Meditation / Sleep Section',  description:'Sleep music section sponsor',   status:'FUTURE',       estImpressions:'800 imp/mo',   estCPM:'$7.20', safetyLabel:'Very Safe',             safetyColor:C.cyan,  audience:'Wellness-oriented users; premium context',              heatPct:42, heatColor:C.green   },
  { id:'creator-profile',   name:'Creator Profile Sponsorship', description:'Sponsored creator highlight',   status:'FUTURE',       estImpressions:'1,100 imp/mo', estCPM:'$4.40', safetyLabel:'Safe',                  safetyColor:C.green, audience:'Followers of featured creators',                        heatPct:38, heatColor:C.pink    },
];

const BRAND_SAFETY_ITEMS: SafetyItem[] = [
  { label:'Positive Content Filter',     status:'PASS',    score:100, detail:'Content quality scoring active — filters low-quality submissions.' },
  { label:'Nightmare Content Exclusion', status:'PASS',    score:100, detail:'Nightmare-tagged dreams excluded from all ad placements.' },
  { label:'Content Moderation Active',   status:'PASS',    score:100, detail:'Moderation pipeline live and reviewing all submissions.' },
  { label:'Brand Keyword Filter',        status:'PASS',    score:95,  detail:'Blocklist of 320 brand-unsafe keywords active.' },
  { label:'Age Gate (18+)',              status:'PASS',    score:100, detail:'18+ enforcement enabled at account creation.' },
  { label:'Child Safety (COPPA)',        status:'PASS',    score:100, detail:'18+ gate satisfies COPPA. No under-18 registration permitted.' },
  { label:'AI Moderation Layer',         status:'PASS',    score:90,  detail:'Claude-based dream analysis flags inappropriate content automatically.' },
  { label:'NSFW Detection (AI)',         status:'PENDING', score:30,  detail:'AI NSFW model not deployed — integration scheduled for next sprint.' },
  { label:'Sensitive Content Tags',      status:'PENDING', score:40,  detail:'Tagging pipeline training; ETA 3 weeks.' },
  { label:'GDPR Compliance',             status:'PENDING', score:50,  detail:'Legal counsel review in progress; cookie consent not yet implemented.' },
  { label:'Legal Compliance Review',     status:'PENDING', score:45,  detail:'GDPR + CCPA checklist in progress with external counsel.' },
  { label:'Ad Review Workflow',          status:'FAIL',    score:0,   detail:'Manual review queue not set up — required before first campaign.' },
];

const KPI_METRICS: KpiMetric[] = [
  { label:'Total Inventory',    value:'12,400',  sub:'monthly impressions',      color:C.purple, projected:true  },
  { label:'Available',          value:'10,800',  sub:'87% of inventory',         color:C.cyan,   projected:true  },
  { label:'Fill Rate',          value:'0%',      sub:'→ 68% proj at launch',     color:C.pink,   projected:true  },
  { label:'CPM',                value:'$4.20',   sub:'dream-context premium',    color:C.green,  projected:true  },
  { label:'CPC',                value:'$0.38',   sub:'cost per click',           color:C.green,  projected:true  },
  { label:'CTR',                value:'1.8%',    sub:'click-through rate',       color:C.gold,   projected:true  },
  { label:'Est. Ad Revenue',    value:'$25/mo',  sub:'projected first month',    color:C.orange, projected:true  },
  { label:'Brand Safety Score', value:'71%',     sub:'target: 85% pre-launch',  color:C.gold,   projected:false },
];

// ── Micro-components ──────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const n = data.length;
  if (n < 2) return null;
  const max = Math.max(...data, 1);
  const W = 56, H = 24;
  const pts = data.map((v, i) =>
    `${(i / (n - 1)) * W},${H - (v / max) * H * 0.8 + H * 0.05}`
  ).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="opacity-60 shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{ background: value ? C.green : 'rgba(255,255,255,0.12)' }}>
      <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono font-bold w-6 text-right shrink-0" style={{ color }}>{value}</span>
      <div className="w-12 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-1 rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3">
      <div>
        <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest">{title}</p>
        {sub && <p className="text-[9px] text-dc-muted/60 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function KpiCard({ metric }: { metric: KpiMetric }) {
  return (
    <div className="dc-card p-4 text-center space-y-1">
      <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest">{metric.label}</p>
      <p className="text-xl font-bold font-mono" style={{ color: metric.color }}>{metric.value}</p>
      {metric.sub && <p className="text-[9px] text-dc-muted leading-relaxed">{metric.sub}</p>}
      {metric.projected && (
        <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(123,111,255,0.15)', color: C.purple, border: '1px solid rgba(123,111,255,0.3)' }}>
          ⚡ PROJ
        </span>
      )}
    </div>
  );
}

function AudienceCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="dc-card p-4 text-center">
      <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono" style={{ color }}>{value.toLocaleString()}</p>
      <p className="text-[9px] text-dc-muted mt-1">live data</p>
    </div>
  );
}

function PlacementCard({ p, enabled, onToggle }: { p: StaticPlacement; enabled: boolean; onToggle: () => void }) {
  const cfg = STATUS_CFG[p.status] ?? { label: p.status, color: C.dim };
  return (
    <div className="dc-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-dc-text text-xs font-bold">{p.name}</p>
          <p className="text-dc-muted text-[10px] mt-0.5">{p.description}</p>
        </div>
        <Pill label={cfg.label} color={cfg.color} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">⚡ Est. Impressions</p>
          <p className="text-xs font-mono font-bold text-dc-text mt-0.5">{p.estImpressions}</p>
        </div>
        <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">⚡ Est. CPM</p>
          <p className="text-xs font-mono font-bold text-dc-text mt-0.5">{p.estCPM}</p>
        </div>
      </div>
      <p className="text-[10px] text-dc-muted leading-relaxed">{p.audience}</p>
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.safetyColor }} />
          <span className="text-[9px] font-bold" style={{ color: p.safetyColor }}>{p.safetyLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-dc-muted">{enabled ? 'Enabled' : 'Disabled'}</span>
          <Toggle value={enabled} onChange={onToggle} />
        </div>
      </div>
    </div>
  );
}

function SafetyRow({ check }: { check: AdSafetyCheck }) {
  const cfg = SAFETY_CFG[check.status] ?? { label: check.status, color: C.dim, icon: '○' };
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="text-sm shrink-0 mt-0.5" style={{ color: cfg.color }}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-dc-text text-xs font-semibold">{check.label}</p>
        <p className="text-dc-muted text-[10px] mt-0.5 leading-relaxed">{check.detail}</p>
      </div>
      <Pill label={cfg.label} color={cfg.color} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Advertising() {
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['advertising-overview'],
    queryFn:  fetchAdvertising,
    staleTime: 10 * 60_000,
  });

  const [placementEnabled, setPlacementEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STATIC_PLACEMENTS.map(p => [p.id, false])),
  );
  const [targeting, setTargeting] = useState<TargetingState>({
    adsEnabled:false, ageSafety:true, nightmareExclusion:true, sensitiveExclusion:true,
    countryTargeting:'all', languageTargeting:'all',
    excludeViolence:true, excludeNSFW:true, excludeSelfHarm:true, frequencyCap:3,
  });
  const [sortBy, setSortBy] = useState<SortKey>('roas');

  const passCount    = data?.safetyChecks.filter(c => c.status === 'PASS').length    ?? 0;
  const pendingCount = data?.safetyChecks.filter(c => c.status === 'PENDING').length ?? 0;
  const failCount    = data?.safetyChecks.filter(c => c.status === 'FAIL').length    ?? 0;

  const brandSafetyScore = Math.round(
    BRAND_SAFETY_ITEMS.reduce((s, i) => s + i.score, 0) / BRAND_SAFETY_ITEMS.length
  );

  const sortedCampaigns = [...TOP_CAMPAIGNS].sort((a, b) => {
    if (sortBy === 'roas')    return b.roasNum    - a.roasNum;
    if (sortBy === 'revenue') return b.revenueNum - a.revenueNum;
    if (sortBy === 'ctr')     return b.ctrNum     - a.ctrNum;
    return b.spendNum - a.spendNum;
  });

  function togglePlacement(id: string) { setPlacementEnabled(p => ({ ...p, [id]: !p[id] })); }
  function setT<K extends keyof TargetingState>(k: K, v: TargetingState[K]) { setTargeting(p => ({ ...p, [k]: v })); }

  const advStatusColor: Record<AdvStatus, string>   = { ACTIVE:C.green, PAUSED:C.gold, PENDING:C.dim   };
  const netStatusColor:  Record<NetStatus, string>   = { CONNECTED:C.green, PENDING:C.gold, DISABLED:C.dim };
  const queueColor:      Record<QueueSt, string>     = { APPROVED:C.green, PENDING:C.gold, REJECTED:C.red };
  const impactColor:     Record<ImpactLevel, string> = { LOW:C.green, MEDIUM:C.gold, HIGH:C.orange, CRITICAL:C.red };

  const THcls = 'text-[9px] font-bold uppercase tracking-widest text-dc-muted py-2 px-2 text-left whitespace-nowrap';
  const TDcls = 'text-[10px] text-dc-text py-2 px-2 border-b border-white/[0.04] last:border-0';

  return (
    <div className="section-business relative">
      <Header
        title="Advertising Center"
        subtitle="Ad placements, revenue intelligence, and campaign performance"
        section="business"
        actions={
          <button onClick={() => void refetch()}
            className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
            style={{ background:'rgba(255,184,0,0.08)', color:C.gold, border:'1px solid rgba(255,184,0,0.25)' }}>
            {isFetching ? '…' : 'Refresh'}
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {isFetching && !data && (
          <div className="flex items-center justify-center h-40 text-dc-muted text-sm animate-pulse">Loading advertising data…</div>
        )}
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Could not load data.</div>}

        {/* ── 1. Launch Readiness Banner ────────────────────────────────── */}
        <div className="dc-card p-5 space-y-4" style={{ borderColor:'rgba(255,184,0,0.3)', borderWidth:'1px' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl" style={{ color:C.gold }}>⚡</div>
              <div>
                <p className="text-dc-text text-sm font-bold">Ad System — Preparation Mode</p>
                <p className="text-dc-muted text-xs mt-0.5">Placements designed · Brand safety: {brandSafetyScore}% · Payment integration pending</p>
              </div>
            </div>
            <Pill label="PREPARATION MODE" color={C.gold} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-dc-muted">Launch Readiness</span>
              <span className="text-xs font-bold font-mono" style={{ color:C.gold }}>71%</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background:'rgba(255,255,255,0.07)' }}>
              <div className="h-2 rounded-full" style={{ width:'71%', background:'linear-gradient(90deg,#FFB800,#FF8C00)' }} />
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label:'Placement Design', pct:100, color:C.green  },
                { label:'Brand Safety',     pct:71,  color:C.gold   },
                { label:'Ad Integration',   pct:0,   color:C.red    },
                { label:'Legal & Compliance',pct:40, color:C.gold   },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-dc-muted">{item.label}</span>
                    <span className="text-[9px] font-mono font-bold" style={{ color:item.color }}>{item.pct}%</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background:'rgba(255,255,255,0.07)' }}>
                    <div className="h-1 rounded-full" style={{ width:`${item.pct}%`, background:item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. Executive Business Summary ────────────────────────────── */}
        <div>
          <SectionTitle title="Executive Business Summary — ⚡ Projected Pipeline" sub="All revenue figures are simulations based on current platform data and planned ad network integrations" />
          <div className="grid grid-cols-4 xl:grid-cols-6 gap-3">
            {EXEC_KPIS.map(k => (
              <div key={k.label} className="dc-card p-3 space-y-1">
                <p className="text-dc-muted text-[9px] font-bold uppercase tracking-widest leading-tight">{k.label}</p>
                <div className="flex items-end justify-between gap-1">
                  <p className="text-base font-bold font-mono leading-none" style={{ color:k.color }}>{k.value}</p>
                  <Sparkline data={k.spark} color={k.color} />
                </div>
                <p className="text-[8px] text-dc-muted leading-tight">{k.sub}</p>
                {k.proj && (
                  <span className="inline-block text-[7px] font-bold px-1 py-px rounded"
                    style={{ background:`${C.purple}15`, color:C.purple, border:`1px solid ${C.purple}30` }}>⚡ PROJ</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. KPI Inventory Row ──────────────────────────────────────── */}
        <div>
          <SectionTitle title="Ad Inventory Metrics — ⚡ Projected" />
          <div className="grid grid-cols-4 gap-3 xl:grid-cols-8">
            {KPI_METRICS.map(m => <KpiCard key={m.label} metric={m} />)}
          </div>
        </div>

        {/* ── 4. Audience from API ─────────────────────────────────────── */}
        {data && (
          <div>
            <SectionTitle title="Addressable Audience — Live Data" />
            <div className="grid grid-cols-3 gap-4">
              <AudienceCard label="Total Reach"    value={data.audienceReach.total}   color={C.cyan}  />
              <AudienceCard label="Monthly Active" value={data.audienceReach.monthly} color={C.green} />
              <AudienceCard label="Weekly Active"  value={data.audienceReach.weekly}  color={C.gold}  />
            </div>
          </div>
        )}

        {/* ── 5. Active Advertisers ─────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-dc-text text-sm font-bold">Active Advertisers</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">⚡ Simulated advertiser pipeline — 4 active, 3 pending, 2 paused</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill label="4 Active" color={C.green} />
              <Pill label="3 Pending" color={C.gold} />
              <Pill label="2 Paused" color={C.dim} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Advertiser</th>
                  <th className={THcls}>Status</th>
                  <th className={THcls}>Campaign</th>
                  <th className={THcls}>Budget</th>
                  <th className={THcls}>Spend</th>
                  <th className={THcls}>Impressions</th>
                  <th className={THcls}>CTR</th>
                  <th className={THcls}>Revenue</th>
                  <th className={THcls}>Safety</th>
                  <th className={THcls}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ADVERTISERS.map(a => (
                  <tr key={a.name} className="hover:bg-white/[0.015] transition-colors">
                    <td className={TDcls}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{a.logo}</span>
                        <span className="font-semibold text-dc-text text-xs">{a.name}</span>
                      </div>
                    </td>
                    <td className={TDcls}><Pill label={a.status} color={advStatusColor[a.status]} /></td>
                    <td className={TDcls}><span className="text-[9px] text-dc-muted">{a.campaign}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{a.budget}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:a.status==='ACTIVE'?C.green:undefined }}>{a.spend}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{a.impressions}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:a.ctr!=='—'?C.cyan:undefined }}>{a.ctr}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:a.revenue!=='—'?C.pink:undefined }}>{a.revenue}</span></td>
                    <td className={TDcls}><span className="text-[10px] font-bold" style={{ color:a.safetyColor }}>{a.safety}</span></td>
                    <td className={TDcls}>
                      <div className="flex items-center gap-1">
                        {(['View','Pause','Edit'] as const).map(lbl => (
                          <button key={lbl} type="button"
                            className="text-[8px] font-bold px-2 py-0.5 rounded transition-all"
                            style={{ background:'rgba(255,255,255,0.05)', color:'#888', border:'1px solid rgba(255,255,255,0.08)' }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6. Revenue Breakdown + Inventory Heatmap ─────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue Breakdown */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Revenue Sources</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">⚡ Projected — $4,200/mo total at launch</p>
            </div>
            <div className="px-5 py-3 space-y-2">
              {REV_SOURCES.map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-[10px] text-dc-muted w-36 shrink-0">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background:'rgba(255,255,255,0.07)' }}>
                    <div className="h-2 rounded-full" style={{ width:`${s.pct}%`, background:s.color }} />
                  </div>
                  <span className="text-[9px] font-mono w-8 text-right" style={{ color:s.color }}>{s.pct}%</span>
                  <span className="text-[9px] font-mono w-14 text-right text-dc-muted">{s.revenue}</span>
                  <span className="text-[9px] font-bold w-10 text-right" style={{ color:C.green }}>{s.growth}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Heatmap */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Inventory Heatmap</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Placement value by demand, CTR, and revenue potential</p>
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {STATIC_PLACEMENTS.map(p => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-dc-muted truncate">{p.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-dc-muted">{p.estImpressions}</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color:p.heatColor }}>{p.estCPM}</span>
                    </div>
                  </div>
                  <div className="w-full h-3 rounded" style={{ background:'rgba(255,255,255,0.05)' }}>
                    <div className="h-3 rounded transition-all"
                      style={{ width:`${p.heatPct}%`, background:`linear-gradient(90deg,${p.heatColor}80,${p.heatColor})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 7. Advertising AI Advisor ─────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Advertising AI Advisor</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">Expected monthly ad revenue after full integration: <span style={{ color:C.green }}>$4,250</span></p>
          </div>
          <div className="grid grid-cols-3 gap-0">
            {AI_INSIGHTS.map((ins, i) => (
              <div key={i} className="p-4 border-b border-r last:border-r-0 transition-colors hover:bg-white/[0.015]"
                style={{ borderColor:'rgba(255,255,255,0.05)', borderLeftWidth:'2px', borderLeftColor:ins.color }}>
                <p className="text-dc-text text-[11px] leading-snug mb-2">{ins.text}</p>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <Pill label={ins.impact} color={impactColor[ins.impact]} />
                  <Pill label={ins.priority} color={C.purple} />
                  <span className="text-[9px] text-dc-muted">Conf: <span style={{ color:ins.color }}>{ins.confidence}%</span></span>
                </div>
                <p className="text-[9px] text-dc-muted">Revenue lift: <span style={{ color:C.green }} className="font-bold">{ins.lift}</span></p>
                <p className="text-[9px] text-dc-muted mt-0.5 italic">{ins.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 8. Ad Networks + Approval Queue ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Ad Networks */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Ad Network Manager</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">2 connected · 4 pending · 2 disabled</p>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Network</th>
                  <th className={THcls}>Status</th>
                  <th className={THcls}>Rev Share</th>
                  <th className={THcls}>Last Sync</th>
                  <th className={THcls}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {AD_NETWORKS.map(n => (
                  <tr key={n.name} className="hover:bg-white/[0.015]">
                    <td className={TDcls}><span className="text-[10px] font-semibold">{n.name}</span></td>
                    <td className={TDcls}><Pill label={n.status} color={netStatusColor[n.status]} /></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{n.share}</span></td>
                    <td className={TDcls}><span className="text-[9px] text-dc-muted">{n.lastSync}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:n.status==='CONNECTED'?C.green:undefined }}>{n.latency}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Approval Queue */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Advertiser Approval Queue</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">1 pending · 1 approved · 3 rejected</p>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Advertiser</th>
                  <th className={THcls}>Status</th>
                  <th className={THcls}>Category</th>
                  <th className={THcls}>Reason</th>
                  <th className={THcls}>Date</th>
                </tr>
              </thead>
              <tbody>
                {APPROVAL_QUEUE.map(q => (
                  <tr key={q.advertiser} className="hover:bg-white/[0.015]">
                    <td className={TDcls}><span className="text-[10px] font-semibold">{q.advertiser}</span></td>
                    <td className={TDcls}><Pill label={q.status} color={queueColor[q.status]} /></td>
                    <td className={TDcls}><span className="text-[9px] text-dc-muted">{q.category}</span></td>
                    <td className={TDcls}><span className="text-[9px] text-dc-muted leading-tight">{q.reason}</span></td>
                    <td className={TDcls}><span className="text-[9px] font-mono text-dc-muted">{q.date}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 9. Campaign Performance ───────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-dc-text text-sm font-bold">Top Campaign Performance</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">⚡ Simulated performance data — click column headers to sort</p>
            </div>
            <div className="flex items-center gap-1">
              {(['roas','revenue','ctr','spend'] as SortKey[]).map(k => (
                <button key={k} type="button" onClick={() => setSortBy(k)}
                  className="text-[9px] font-bold px-2 py-1 rounded transition-all"
                  style={ sortBy===k
                    ? { background:`${C.purple}20`, color:C.purple, border:`1px solid ${C.purple}40` }
                    : { background:'rgba(255,255,255,0.05)', color:'#666', border:'1px solid rgba(255,255,255,0.08)' }
                  }>
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Campaign</th>
                  <th className={THcls}>Advertiser</th>
                  <th className={THcls}>Status</th>
                  <th className={THcls}>Budget</th>
                  <th className={THcls}>Spend</th>
                  <th className={THcls}>CTR</th>
                  <th className={THcls}>Conv.</th>
                  <th className={THcls}>CPA</th>
                  <th className={THcls}>Revenue</th>
                  <th className={THcls}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map(c => (
                  <tr key={c.name} className="hover:bg-white/[0.015]">
                    <td className={TDcls}><span className="font-semibold text-[10px]">{c.name}</span></td>
                    <td className={TDcls}><span className="text-[9px] text-dc-muted">{c.advertiser}</span></td>
                    <td className={TDcls}><Pill label={c.status} color={c.status==='ACTIVE'?C.green:C.gold} /></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{c.budget}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{c.spend}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.cyan }}>{c.ctr}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{c.conv}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{c.cpa}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.pink }}>{c.revenue}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px] font-bold" style={{ color:c.roasNum>=1?C.green:C.gold }}>{c.roas}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 10. A/B Tests + Sponsored Dreams ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* A/B Tests */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">A/B Test Center</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">⚡ Projected test results based on segment analysis</p>
            </div>
            <div className="divide-y" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
              {AB_TESTS.map((t, i) => (
                <div key={i} className="px-5 py-4 space-y-3">
                  <p className="text-dc-text text-[11px] font-semibold">{t.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([['A', t.a] as const, ['B', t.b] as const]).map(([v, side]) => (
                      <div key={v} className="rounded-lg p-2.5 relative"
                        style={{ background:'rgba(255,255,255,0.03)', border: t.winner===v ? `1px solid ${C.green}40` : '1px solid transparent' }}>
                        {t.winner===v && <span className="absolute top-1 right-1 text-[8px] font-bold" style={{ color:C.green }}>WINNER</span>}
                        <p className="text-[9px] text-dc-muted font-bold">Variant {v} · {side.label}</p>
                        <p className="text-base font-bold font-mono mt-1" style={{ color:t.winner===v?C.green:C.gold }}>{side.ctr}</p>
                        <p className="text-[8px] text-dc-muted">{side.imp} imp</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-dc-muted italic" style={{ borderLeft:`2px solid ${C.gold}`, paddingLeft:'8px' }}>
                    AI Rec: {t.rec}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sponsored Dreams */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Sponsored Dreams</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">DreamCloud's highest-value ad format — native content sponsorship</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'Active', value:'8',    color:C.green  },
                  { label:'Pending',value:'12',   color:C.gold   },
                  { label:'Revenue',value:'$120/mo', color:C.pink },
                ].map(m => (
                  <div key={m.label} className="dc-card p-3 text-center space-y-1">
                    <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">{m.label}</p>
                    <p className="text-sm font-bold font-mono" style={{ color:m.color }}>{m.value}</p>
                    <span className="inline-block text-[7px] font-bold px-1 py-px rounded"
                      style={{ background:`${C.purple}15`, color:C.purple, border:`1px solid ${C.purple}30` }}>⚡ PROJ</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'Avg CTR',       value:'3.2%' },
                  { label:'Avg Read Time', value:'2:34' },
                  { label:'Approval Rate', value:'84%'  },
                ].map(m => (
                  <div key={m.label} className="rounded-lg p-2 text-center" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <p className="text-[9px] text-dc-muted font-bold">{m.label}</p>
                    <p className="text-xs font-mono font-bold text-dc-text mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-3 space-y-1" style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.cyan}20` }}>
                <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Top Performing Sponsored Dream</p>
                <p className="text-dc-text text-xs font-semibold">"A Night of Infinite Light"</p>
                <p className="text-[9px] text-dc-muted">Sponsored by <span style={{ color:C.cyan }}>Calm</span> · 4.8% CTR · 3:42 avg read time · 96% positive feedback</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 11. Creator Economy ───────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Creator Economy</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">⚡ Top sponsored creators — projected earnings based on follower/engagement data</p>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Creator</th>
                <th className={THcls}>Handle</th>
                <th className={THcls}>Revenue</th>
                <th className={THcls}>Followers</th>
                <th className={THcls}>CTR</th>
                <th className={THcls}>Engagement</th>
                <th className={THcls}>Satisfaction</th>
                <th className={THcls}>Projected Value</th>
              </tr>
            </thead>
            <tbody>
              {CREATORS.map(c => (
                <tr key={c.name} className="hover:bg-white/[0.015]">
                  <td className={TDcls}><span className="font-semibold text-[10px]">{c.name}</span></td>
                  <td className={TDcls}><span className="text-[9px] text-dc-muted font-mono">{c.handle}</span></td>
                  <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.pink }}>{c.revenue}</span></td>
                  <td className={TDcls}><span className="font-mono text-[10px]">{c.followers}</span></td>
                  <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.cyan }}>{c.ctr}</span></td>
                  <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.orange }}>{c.engagement}</span></td>
                  <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.gold }}>{c.satisfaction}</span></td>
                  <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.green }}>{c.value}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 12. Placement Control Center ─────────────────────────────── */}
        <div>
          <SectionTitle title="Ad Placement Control Center" sub="Enable or disable individual placements before launch" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STATIC_PLACEMENTS.map(p => (
              <PlacementCard key={p.id} p={p} enabled={placementEnabled[p.id] ?? false} onToggle={() => togglePlacement(p.id)} />
            ))}
          </div>
        </div>

        {/* ── 13. Targeting Controls ────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Targeting Controls</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">Configure audience targeting and brand safety filters before launch.</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-center justify-between py-2 border-b md:col-span-2" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
              <div>
                <p className="text-dc-text text-xs font-bold">Ads Enabled</p>
                <p className="text-dc-muted text-[10px]">Master toggle — activates all placements when ready</p>
              </div>
              <Toggle value={targeting.adsEnabled} onChange={v => setT('adsEnabled', v)} />
            </div>
            {([
              { key:'ageSafety'as const,          label:'Age Safety',                    desc:'18+ only — restrict to adult-verified accounts' },
              { key:'nightmareExclusion'as const,  label:'Nightmare Content Exclusion',   desc:'Exclude ads from nightmare-tagged dreams'        },
              { key:'sensitiveExclusion'as const,  label:'Sensitive Dream Exclusion',     desc:'Exclude ads from sensitive-topic dreams'         },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-dc-text text-xs font-semibold">{label}</p>
                  <p className="text-dc-muted text-[9px]">{desc}</p>
                </div>
                <Toggle value={targeting[key] as boolean} onChange={v => setT(key, v)} />
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-dc-text text-xs font-semibold">Country Targeting</p>
                <p className="text-dc-muted text-[9px]">Geographic audience scope</p>
              </div>
              <select value={targeting.countryTargeting} onChange={e => setT('countryTargeting', e.target.value as TargetingState['countryTargeting'])}
                className="text-xs font-mono rounded-lg px-3 py-1.5 outline-none"
                style={{ background:'rgba(255,255,255,0.06)', color:'#c4c4d4', border:'1px solid rgba(255,255,255,0.1)' }}>
                <option value="all">All Countries</option>
                <option value="tier1">Tier-1 Only</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-dc-text text-xs font-semibold">Language Targeting</p>
                <p className="text-dc-muted text-[9px]">Content language filter</p>
              </div>
              <select value={targeting.languageTargeting} onChange={e => setT('languageTargeting', e.target.value as TargetingState['languageTargeting'])}
                className="text-xs font-mono rounded-lg px-3 py-1.5 outline-none"
                style={{ background:'rgba(255,255,255,0.06)', color:'#c4c4d4', border:'1px solid rgba(255,255,255,0.1)' }}>
                <option value="all">All Languages</option>
                <option value="en-tr">EN + TR</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="py-1.5 md:col-span-2">
              <p className="text-dc-text text-xs font-semibold mb-2">Category Exclusions</p>
              <div className="flex items-center gap-3">
                {([
                  { key:'excludeViolence'as const, label:'Violence' },
                  { key:'excludeNSFW'as const,     label:'NSFW'     },
                  { key:'excludeSelfHarm'as const,  label:'Self-harm'},
                ]).map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setT(key, !targeting[key])}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all"
                    style={targeting[key]
                      ? { background:'rgba(56,214,138,0.15)', color:C.green, border:`1px solid rgba(56,214,138,0.35)` }
                      : { background:'rgba(255,255,255,0.05)', color:'#5A5A84', border:'1px solid rgba(255,255,255,0.08)' }
                    }>
                    {targeting[key] ? '✓' : '○'} {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-dc-text text-xs font-semibold">Frequency Cap</p>
                <p className="text-dc-muted text-[9px]">Max ad exposures per user per day</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setT('frequencyCap', Math.max(1, targeting.frequencyCap-1))}
                  className="w-6 h-6 rounded text-dc-muted font-bold text-sm flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.07)' }}>−</button>
                <span className="text-dc-text text-sm font-mono font-bold w-6 text-center">{targeting.frequencyCap}</span>
                <button type="button" onClick={() => setT('frequencyCap', Math.min(10, targeting.frequencyCap+1))}
                  className="w-6 h-6 rounded text-dc-muted font-bold text-sm flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.07)' }}>+</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 14. Brand Safety Intelligence ─────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-dc-text text-sm font-bold">Brand Safety Intelligence</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Target 85% before launch · Missing {85-brandSafetyScore}% · 3 items blocking launch</p>
            </div>
            <div className="flex items-center gap-3">
              <Pill label={`${brandSafetyScore < 85 ? '⚠' : '✓'} ${brandSafetyScore}% Safety`} color={brandSafetyScore >= 85 ? C.green : C.gold} />
            </div>
          </div>
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-dc-muted font-bold uppercase tracking-widest">Progress to Launch Threshold (85%)</span>
              <span className="text-[10px] font-mono font-bold" style={{ color:C.gold }}>{brandSafetyScore} / 85</span>
            </div>
            <div className="w-full h-2 rounded-full mb-4" style={{ background:'rgba(255,255,255,0.07)' }}>
              <div className="h-2 rounded-full" style={{ width:`${(brandSafetyScore/85)*100}%`, background:'linear-gradient(90deg,#FFB800,#FF8C00)' }} />
            </div>
            <div className="grid grid-cols-2 gap-x-8">
              {BRAND_SAFETY_ITEMS.map((item, i) => {
                const cfg = SAFETY_CFG[item.status] ?? { label:item.status, color:C.dim, icon:'○' };
                return (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
                    <span className="text-sm shrink-0 mt-0.5" style={{ color:cfg.color }}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-dc-text text-[10px] font-semibold">{item.label}</p>
                      <p className="text-dc-muted text-[9px] mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ScoreBar value={item.score} color={cfg.color} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-5 pb-4" />
        </div>

        {/* ── 15. Revenue Forecast ──────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Revenue Forecast by User Scale</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">⚡ Projected — based on industry CPM benchmarks and current platform engagement rates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th className={THcls}>Users</th>
                  <th className={THcls}>Monthly Revenue</th>
                  <th className={THcls}>Avg CPM</th>
                  <th className={THcls}>Fill Rate</th>
                  <th className={THcls}>Advertisers Needed</th>
                  <th className={THcls}>Projected Profit</th>
                  <th className={THcls}>Revenue / User</th>
                </tr>
              </thead>
              <tbody>
                {FORECAST.map((f, i) => (
                  <tr key={f.users} className="hover:bg-white/[0.015]"
                    style={{ background: i===0 ? 'rgba(255,184,0,0.04)' : undefined }}>
                    <td className={TDcls}>
                      <span className="font-bold font-mono" style={{ color: i===0?C.gold:C.cyan }}>{f.users}</span>
                      {i===0 && <span className="ml-1.5 text-[8px] font-bold" style={{ color:C.gold }}>← NOW</span>}
                    </td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.pink }}>{f.revenue}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{f.cpm}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{f.fillRate}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]">{f.advertisers}</span></td>
                    <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.green }}>{f.profit}</span></td>
                    <td className={TDcls}>
                      <span className="font-mono text-[10px]" style={{ color:C.violet }}>
                        ${(parseInt(f.revenue.replace(/[$,]/g,'')) / parseInt(f.users.replace('K','000').replace('M','000000'))).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 16. Monetization Timeline ─────────────────────────────────── */}
        <div className="dc-card p-5">
          <SectionTitle title="Monetization Timeline — Roadmap to Revenue" />
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {TIMELINE.map((stage, i) => {
              const color = stage.status==='DONE'?C.green : stage.status==='CURRENT'?C.gold : C.dim;
              const isLast = i === TIMELINE.length-1;
              return (
                <div key={stage.name} className="flex items-start flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className="flex items-center w-full">
                      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center border-2 z-10"
                        style={{ background:stage.status==='CURRENT'?`${color}20`:'transparent', borderColor:color }}>
                        <span className="text-[9px] font-bold" style={{ color }}>{stage.status==='DONE'?'✓':i+1}</span>
                      </div>
                      {!isLast && <div className="flex-1 h-0.5 mt-0" style={{ background:stage.status==='DONE'?C.green:'rgba(255,255,255,0.1)' }} />}
                    </div>
                    <div className="mt-2 px-1 text-center">
                      <p className="text-[10px] font-bold" style={{ color }}>{stage.name}</p>
                      <p className="text-[8px] text-dc-muted mt-0.5 leading-tight">{stage.detail}</p>
                      {stage.readiness > 0 && <p className="text-[9px] font-mono mt-1" style={{ color }}>{stage.readiness}%</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 17. Ad Quality Score ──────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Ad Quality Score by Placement</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">⚡ Projected scores — quality, relevance, CTR, experience, safety, overall</p>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Placement</th>
                <th className={THcls}>Quality</th>
                <th className={THcls}>Relevance</th>
                <th className={THcls}>CTR</th>
                <th className={THcls}>Experience</th>
                <th className={THcls}>Safety</th>
                <th className={`${THcls} font-black`}>Overall</th>
              </tr>
            </thead>
            <tbody>
              {QUALITY_ROWS.map(r => (
                <tr key={r.placement} className="hover:bg-white/[0.015]">
                  <td className={TDcls}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background:r.color }} />
                      <span className="text-[10px] font-semibold">{r.placement}</span>
                    </div>
                  </td>
                  <td className={TDcls}><ScoreBar value={r.quality}    color={C.purple} /></td>
                  <td className={TDcls}><ScoreBar value={r.relevance}  color={C.cyan}   /></td>
                  <td className={TDcls}><ScoreBar value={r.ctr}        color={C.orange} /></td>
                  <td className={TDcls}><ScoreBar value={r.experience} color={C.violet} /></td>
                  <td className={TDcls}><ScoreBar value={r.safety}     color={C.green}  /></td>
                  <td className={TDcls}><ScoreBar value={r.overall}    color={r.color}  /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 18. API Safety Checks ─────────────────────────────────────── */}
        {data && (
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Safety & Compliance Checks</h3>
              <div className="flex items-center gap-2">
                {passCount    > 0 && <Pill label={`${passCount} Passed`}    color={C.green} />}
                {pendingCount > 0 && <Pill label={`${pendingCount} Pending`} color={C.gold}  />}
                {failCount    > 0 && <Pill label={`${failCount} Failed`}     color={C.red}   />}
              </div>
            </div>
            <div className="px-5 py-1">
              {data.safetyChecks.map((c, i) => <SafetyRow key={i} check={c} />)}
            </div>
          </div>
        )}

        {/* ── 19. Executive Footer ──────────────────────────────────────── */}
        <div className="dc-card p-5 space-y-4" style={{ borderColor:`${C.purple}25`, borderWidth:'1px' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:C.violet }}>Executive Summary</p>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Top Placement by Quality</p>
              {QUALITY_ROWS.slice(0,3).map((r,i) => (
                <div key={r.placement} className="flex items-center justify-between">
                  <span className="text-[10px] text-dc-text">#{i+1} {r.placement}</span>
                  <span className="text-[10px] font-bold font-mono" style={{ color:r.color }}>{r.overall}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Top Advertiser by Revenue</p>
              {ADVERTISERS.filter(a=>a.revenue!=='—').sort((a,b)=>parseInt(b.revenue.replace(/[$,]/g,''))-parseInt(a.revenue.replace(/[$,]/g,''))).slice(0,3).map((a,i) => (
                <div key={a.name} className="flex items-center justify-between">
                  <span className="text-[10px] text-dc-text">#{i+1} {a.name}</span>
                  <span className="text-[10px] font-bold font-mono" style={{ color:C.pink }}>{a.revenue}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Business Metrics</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-dc-muted">Projected Next Month</span>
                <span className="text-[10px] font-bold" style={{ color:C.green }}>$4,250</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-dc-muted">Highest CTR Placement</span>
                <span className="text-[10px] font-bold" style={{ color:C.cyan }}>Weekly Digest (92)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-dc-muted">Avg Session Ad Value</span>
                <span className="text-[10px] font-bold" style={{ color:C.violet }}>$0.014</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
            <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest mb-1">AI Overall Recommendation</p>
            <p className="text-[11px] text-dc-text leading-relaxed">
              Complete <span style={{ color:C.gold }}>Ad Review Workflow</span> and <span style={{ color:C.gold }}>GDPR compliance</span> to reach 85% brand safety — the only two blockers before soft launch.
              Prioritize <span style={{ color:C.cyan }}>wellness advertisers</span> (Calm, Headspace) for the first campaign cycle: they show 2.6× higher CTR and align perfectly with DreamCloud's content.
              Target the <span style={{ color:C.purple }}>Lucid Seekers segment</span> first — 3.4× sponsor engagement above platform average.
            </p>
          </div>
        </div>

        {data && (
          <p className="text-dc-muted/50 text-[10px] text-right font-mono">
            as of {new Date(data.computedAt).toLocaleString('en-US')}
          </p>
        )}
      </div>
    </div>
  );
}
