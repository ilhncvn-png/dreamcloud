import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchCampaigns } from '../api/admin.api';
import type { PlacementZone } from '../api/admin.api';

const C = {
  green:'#38D68A', gold:'#FFB800', purple:'#7B6FFF', cyan:'#00CFFF',
  pink:'#FF4D8F', red:'#FF4A5E', orange:'#FF8C00', violet:'#CC80FF', dim:'#5A5A84',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type CampaignStatus = 'ACTIVE' | 'PLANNED' | 'DRAFT' | 'PAUSED' | 'FUTURE';

interface Campaign {
  name: string; type: string; status: CampaignStatus;
  budget: number; spend: number; start: string; end: string;
  segment: string; segmentSize: number | string; placements: string[];
  proj: {
    impressions?: string; ctr?: string; conversions?: number;
    cpa?: string; revenue?: string; roas?: string;
    reach?: string; openRate?: string; returns?: number;
    sends?: string; views?: string; cpm?: string;
  };
  aiRec: string;
}

interface AudienceInfo {
  size: number | string; reach: string; freq: string; overlap: string;
  retention: string; avgSession: string; dreamsPerUser: number;
  convPotential: number; quality: number;
}

interface DreamIntel {
  avgLen: string; emotion: number; lucid: number; nightmare: number;
  positive: number; recurring: number; resonance: number;
  archetypes: { name: string; pct: number; color: string }[];
}

interface CreativeVariant { label: string; ctr: string; roas: string; conv: number; winner: boolean; }

interface AutomationCfg {
  autoPause: boolean; autoBudget: boolean; autoDupe: boolean;
  autoRefresh: boolean; autoEnd: boolean; autoExpand: boolean; autoFreq: boolean;
}

interface CampaignExtra {
  healthScore: number; healthLabel: string; healthColor: string;
  spark: number[];
  daysRem: number; dailyBudget: string; budgetHealth: 'good' | 'warn' | 'risk';
  team: { owner: string; reviewer: string; approver: string; lastEdited: string };
  audience: AudienceInfo;
  dreamIntel: DreamIntel;
  creatives: CreativeVariant[];
  topDream: { title: string; ctr: string; readTime: string; shares: number; saves: number; comments: number };
  competitor: { ourCTR: string; indCTR: string; ourCPM: string; indCPM: string; rating: string; ratingColor: string };
  automation: AutomationCfg;
  timeline: { stage: string; date: string; done: boolean }[];
  revenue: { total: string; premSubs: number; adRev: string; retention: string; ltv: string };
  insights: { type: 'positive' | 'warning' | 'critical'; text: string; lift: string; conf: number; action: string }[];
}

// ── Campaign Data ─────────────────────────────────────────────────────────────

const CAMPAIGNS: Campaign[] = [
  {
    name:'Premium Conversion Drive', type:'Premium conversion', status:'PLANNED',
    budget:500, spend:0, start:'2026-07-15', end:'2026-08-14',
    segment:'Likely Premium Buyers', segmentSize:68,
    placements:['Feed Native','Dream Detail'],
    proj:{ impressions:'3,200', ctr:'2.1%', conversions:12, cpa:'$41.67', revenue:'$480', roas:'0.96×' },
    aiRec:'Start with 5+ saved dreams segment — 88% confidence for premium.',
  },
  {
    name:'AI Report Launch Pack', type:'AI report promotion', status:'PLANNED',
    budget:200, spend:0, start:'2026-07-20', end:'2026-08-19',
    segment:'AI Report Intent Users', segmentSize:46,
    placements:['Dream Detail Sponsored Card'],
    proj:{ impressions:'1,800', ctr:'2.8%', conversions:18, cpa:'$11.11', revenue:'$90', roas:'0.45×' },
    aiRec:'Lead with Archetype Report — highest intent at 34%.',
  },
  {
    name:'Lucid Dream Challenge', type:'Engagement + conversion', status:'DRAFT',
    budget:300, spend:0, start:'2026-08-01', end:'2026-08-31',
    segment:'Lucid Seekers', segmentSize:16,
    placements:['Explore Sponsored Card'],
    proj:{ impressions:'2,400', ctr:'3.4%', conversions:22, cpa:'$13.64', revenue:'$320', roas:'1.07×' },
    aiRec:'Lucid segment shows 3.2× conversion rate — highest value per impression.',
  },
  {
    name:'Nightmare Therapy Partner', type:'Brand campaign (wellness brand)', status:'PAUSED',
    budget:800, spend:0, start:'TBD', end:'TBD',
    segment:'Nightmare Heavy Users', segmentSize:'~85',
    placements:['Dream Detail','Explore'],
    proj:{ impressions:'4,200', ctr:'1.6%', conversions:8, cpa:'$100', revenue:'$640', roas:'0.80×' },
    aiRec:'Pause: brand safety score must reach 85% before nightmare-context ads.',
  },
  {
    name:'Creator Boost Campaign', type:'Creator promotion', status:'FUTURE',
    budget:150, spend:0, start:'2026-09-01', end:'2026-09-30',
    segment:'Creator Candidates', segmentSize:12,
    placements:['Creator Profile Sponsorship'],
    proj:{ impressions:'900', ctr:'4.2%', conversions:6, cpa:'$25', revenue:'$120', roas:'0.80×' },
    aiRec:'Identify top 5 creators by engagement first.',
  },
  {
    name:'Re-activation Campaign', type:'Retention / re-activation', status:'DRAFT',
    budget:120, spend:0, start:'2026-07-25', end:'2026-08-24',
    segment:'Dormant Users', segmentSize:'~142',
    placements:['Email Digest','Push'],
    proj:{ reach:'2,800', openRate:'8.2%', returns:24, cpa:'$5', revenue:'$0' },
    aiRec:'Use "We missed your dreams" message — high emotional resonance.',
  },
  {
    name:'Meditation Bundle Pre-Launch', type:'Product launch', status:'FUTURE',
    budget:250, spend:0, start:'2026-10-01', end:'2026-10-31',
    segment:'Spiritual Dreamers + Beautiful category', segmentSize:'—',
    placements:['Meditation/Sleep Section'],
    proj:{ impressions:'1,600', ctr:'2.2%', conversions:14, cpa:'$17.86', revenue:'$112', roas:'0.45×' },
    aiRec:'Wait for meditation content library — current content volume insufficient.',
  },
  {
    name:'Weekly Dream Digest Sponsorship', type:'Sponsored newsletter', status:'PLANNED',
    budget:80, spend:0, start:'2026-07-01', end:'2026-09-30',
    segment:'All active subscribers', segmentSize:284,
    placements:['Weekly Digest Sponsorship'],
    proj:{ sends:'1,200', openRate:'28%', views:'336', cpm:'$4.80', revenue:'$5.76' },
    aiRec:'First sponsor integration — use trusted wellness brand only.',
  },
];

// ── Campaign Intelligence Data ─────────────────────────────────────────────────

const CAMPAIGN_EXTRA: Record<string, CampaignExtra> = {
  'Premium Conversion Drive': {
    healthScore:74, healthLabel:'Good', healthColor:C.cyan, spark:[1.8,1.9,2.0,2.0,2.1,2.1,2.1],
    daysRem:30, dailyBudget:'$16.67', budgetHealth:'good',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:68, reach:'4,200', freq:'1.2×', overlap:'12%', retention:'78%', avgSession:'4:32', dreamsPerUser:3.8, convPotential:38, quality:84 },
    dreamIntel:{ avgLen:'245 words', emotion:72, lucid:4, nightmare:8, positive:68, recurring:22, resonance:78, archetypes:[{name:'Hero',pct:28,color:C.orange},{name:'Explorer',pct:24,color:C.cyan},{name:'Sage',pct:22,color:C.purple},{name:'Shadow',pct:18,color:C.dim},{name:'Other',pct:8,color:'#444'}] },
    creatives:[
      {label:'"Upgrade Your Dream World"',      ctr:'2.1%',roas:'0.96×',conv:12,winner:true  },
      {label:'"Premium Dreams Deserve More"',   ctr:'1.8%',roas:'0.84×',conv:9, winner:false },
    ],
    topDream:{ title:'"A Night of Infinite Light"', ctr:'3.2%', readTime:'2:34', shares:28, saves:45, comments:12 },
    competitor:{ ourCTR:'2.1%', indCTR:'1.4%', ourCPM:'$4.20', indCPM:'$5.80', rating:'Above Average', ratingColor:C.cyan },
    automation:{ autoPause:false, autoBudget:true, autoDupe:false, autoRefresh:false, autoEnd:true, autoExpand:false, autoFreq:true },
    timeline:[{stage:'Created',date:'2026-06-28',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'2026-07-14',done:false},{stage:'Running',date:'2026-07-15',done:false},{stage:'Optimized',date:'Auto',done:false},{stage:'Completed',date:'2026-08-14',done:false}],
    revenue:{ total:'$480', premSubs:12, adRev:'$240', retention:'+8%', ltv:'$18.40' },
    insights:[
      { type:'positive', text:'Lucid Seekers sub-segment shows 3.2× higher CTR than base.', lift:'+$84/mo', conf:88, action:'Increase Lucid Seeker targeting weight' },
      { type:'warning', text:'Budget pacing projects 100% spend with only 88% efficiency.', lift:'Save $60', conf:76, action:'Enable auto-pause at 95% budget' },
    ],
  },
  'AI Report Launch Pack': {
    healthScore:62, healthLabel:'Needs Attention', healthColor:C.gold, spark:[2.4,2.5,2.6,2.7,2.8,2.8,2.8],
    daysRem:30, dailyBudget:'$6.67', budgetHealth:'good',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:46, reach:'1,800', freq:'1.4×', overlap:'8%', retention:'72%', avgSession:'5:12', dreamsPerUser:4.2, convPotential:34, quality:79 },
    dreamIntel:{ avgLen:'312 words', emotion:81, lucid:12, nightmare:18, positive:58, recurring:35, resonance:84, archetypes:[{name:'Sage',pct:38,color:C.purple},{name:'Explorer',pct:28,color:C.cyan},{name:'Shadow',pct:22,color:C.dim},{name:'Hero',pct:12,color:C.orange}] },
    creatives:[
      {label:'"Discover Your Dream Archetype"', ctr:'2.8%',roas:'0.45×',conv:18,winner:false},
      {label:'"Your Subconscious Story"',        ctr:'2.2%',roas:'0.38×',conv:14,winner:false},
      {label:'"AI Dream Report — $4.99"',        ctr:'3.1%',roas:'0.52×',conv:20,winner:true },
    ],
    topDream:{ title:'"The Mirror Dream"', ctr:'3.8%', readTime:'3:12', shares:42, saves:68, comments:18 },
    competitor:{ ourCTR:'2.8%', indCTR:'1.4%', ourCPM:'$6.40', indCPM:'$5.80', rating:'Excellent', ratingColor:C.green },
    automation:{ autoPause:true, autoBudget:false, autoDupe:false, autoRefresh:true, autoEnd:true, autoExpand:false, autoFreq:true },
    timeline:[{stage:'Created',date:'2026-06-28',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'2026-07-19',done:false},{stage:'Running',date:'2026-07-20',done:false},{stage:'Optimized',date:'Auto',done:false},{stage:'Completed',date:'2026-08-19',done:false}],
    revenue:{ total:'$90', premSubs:0, adRev:'$45', retention:'+4%', ltv:'$5.00' },
    insights:[
      { type:'critical', text:'ROAS 0.45× — below breakeven. Creative refresh required.', lift:'+22% ROAS', conf:82, action:'Switch to direct price offer variant (Variant C)' },
      { type:'positive', text:'Archetype Report shows highest purchase intent at 34%.', lift:'+$12/mo', conf:91, action:'Lead with Archetype creative in next cycle' },
    ],
  },
  'Lucid Dream Challenge': {
    healthScore:95, healthLabel:'Excellent', healthColor:C.green, spark:[3.0,3.1,3.2,3.3,3.4,3.4,3.4],
    daysRem:31, dailyBudget:'$9.68', budgetHealth:'good',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:16, reach:'2,400', freq:'2.1×', overlap:'3%', retention:'91%', avgSession:'6:48', dreamsPerUser:7.2, convPotential:42, quality:92 },
    dreamIntel:{ avgLen:'428 words', emotion:91, lucid:100, nightmare:4, positive:84, recurring:48, resonance:96, archetypes:[{name:'Explorer',pct:42,color:C.cyan},{name:'Hero',pct:28,color:C.orange},{name:'Sage',pct:18,color:C.purple},{name:'Other',pct:12,color:'#444'}] },
    creatives:[
      {label:'"Master Your Lucid Dreams"',         ctr:'3.4%',roas:'1.07×',conv:22,winner:true  },
      {label:'"Join the Lucid Dream Challenge"',   ctr:'2.9%',roas:'0.94×',conv:18,winner:false },
    ],
    topDream:{ title:'"Flying Over Crystal Lakes"', ctr:'4.8%', readTime:'4:20', shares:64, saves:92, comments:34 },
    competitor:{ ourCTR:'3.4%', indCTR:'1.4%', ourCPM:'$4.80', indCPM:'$5.80', rating:'Top 10%', ratingColor:C.green },
    automation:{ autoPause:false, autoBudget:true, autoDupe:true, autoRefresh:false, autoEnd:true, autoExpand:true, autoFreq:true },
    timeline:[{stage:'Created',date:'2026-06-28',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'2026-07-31',done:false},{stage:'Running',date:'2026-08-01',done:false},{stage:'Optimized',date:'Auto',done:false},{stage:'Completed',date:'2026-08-31',done:false}],
    revenue:{ total:'$320', premSubs:0, adRev:'$160', retention:'+12%', ltv:'$14.54' },
    insights:[
      { type:'positive', text:'Only campaign projecting positive ROAS (1.07×) — launch this first.', lift:'$320 revenue', conf:95, action:'Prioritize for first live campaign slot' },
      { type:'positive', text:'Lowest CPA ($13.64) in portfolio — most efficient spend.', lift:'No optimization needed', conf:91, action:'Expand lucid segment if possible' },
    ],
  },
  'Nightmare Therapy Partner': {
    healthScore:41, healthLabel:'Poor', healthColor:C.red, spark:[2.0,1.9,1.8,1.7,1.6,1.6,1.6],
    daysRem:0, dailyBudget:'$26.67', budgetHealth:'risk',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:'~85', reach:'4,200', freq:'1.8×', overlap:'24%', retention:'65%', avgSession:'3:24', dreamsPerUser:3.1, convPotential:21, quality:58 },
    dreamIntel:{ avgLen:'380 words', emotion:88, lucid:6, nightmare:72, positive:28, recurring:42, resonance:64, archetypes:[{name:'Shadow',pct:54,color:C.dim},{name:'Child',pct:22,color:C.violet},{name:'Hero',pct:16,color:C.orange},{name:'Other',pct:8,color:'#444'}] },
    creatives:[
      {label:'"Transform Your Nightmares"', ctr:'1.6%',roas:'0.80×',conv:8,winner:true  },
      {label:'"Heal Through Dream Work"',   ctr:'1.4%',roas:'0.72×',conv:7,winner:false },
    ],
    topDream:{ title:'"The Dark Corridor"', ctr:'2.4%', readTime:'3:48', shares:18, saves:24, comments:42 },
    competitor:{ ourCTR:'1.6%', indCTR:'1.4%', ourCPM:'$5.20', indCPM:'$5.80', rating:'Average', ratingColor:C.gold },
    automation:{ autoPause:true, autoBudget:false, autoDupe:false, autoRefresh:false, autoEnd:false, autoExpand:false, autoFreq:true },
    timeline:[{stage:'Created',date:'2026-06-10',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'TBD',done:false},{stage:'Running',date:'TBD',done:false},{stage:'Optimized',date:'TBD',done:false},{stage:'Completed',date:'TBD',done:false}],
    revenue:{ total:'$640', premSubs:0, adRev:'$480', retention:'+2%', ltv:'$80.00' },
    insights:[
      { type:'critical', text:'Brand safety at 71% — below 85% required threshold for nightmare-context ads.', lift:'Risk: $640 revenue', conf:97, action:'Complete NSFW detection + Ad Review Workflow first' },
      { type:'warning', text:'Nightmare context may increase negative user feedback by 28%.', lift:'Risk avoided', conf:88, action:'Add pre-screen sentiment filter' },
    ],
  },
  'Creator Boost Campaign': {
    healthScore:88, healthLabel:'Excellent', healthColor:C.green, spark:[3.8,3.9,4.0,4.1,4.2,4.2,4.2],
    daysRem:30, dailyBudget:'$5.00', budgetHealth:'good',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:12, reach:'900', freq:'2.8×', overlap:'2%', retention:'88%', avgSession:'8:15', dreamsPerUser:8.4, convPotential:45, quality:90 },
    dreamIntel:{ avgLen:'520 words', emotion:78, lucid:18, nightmare:12, positive:76, recurring:28, resonance:88, archetypes:[{name:'Hero',pct:36,color:C.orange},{name:'Sage',pct:28,color:C.purple},{name:'Explorer',pct:24,color:C.cyan},{name:'Other',pct:12,color:'#444'}] },
    creatives:[
      {label:'"Support DreamCloud Creators"', ctr:'4.2%',roas:'0.80×',conv:6,winner:true  },
      {label:'"Follow the Best Dreamers"',    ctr:'3.6%',roas:'0.68×',conv:5,winner:false },
    ],
    topDream:{ title:'"Felix\'s Latest Lucid Journey"', ctr:'5.2%', readTime:'5:12', shares:82, saves:124, comments:56 },
    competitor:{ ourCTR:'4.2%', indCTR:'1.4%', ourCPM:'$4.40', indCPM:'$5.80', rating:'Top 5%', ratingColor:C.green },
    automation:{ autoPause:false, autoBudget:true, autoDupe:true, autoRefresh:false, autoEnd:true, autoExpand:true, autoFreq:true },
    timeline:[{stage:'Created',date:'2026-06-28',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'2026-08-31',done:false},{stage:'Running',date:'2026-09-01',done:false},{stage:'Optimized',date:'Auto',done:false},{stage:'Completed',date:'2026-09-30',done:false}],
    revenue:{ total:'$120', premSubs:0, adRev:'$0', retention:'+6%', ltv:'$20.00' },
    insights:[
      { type:'positive', text:'4.2% CTR — highest in portfolio. Top 5% vs industry (1.4% avg).', lift:'+$48/mo', conf:91, action:'Expand creator roster from 5 to 10+ creators' },
      { type:'warning', text:'Small segment (12 users) — high frequency risk. Cap exposures.', lift:'Save $30', conf:84, action:'Set frequency cap at 2× impressions per user' },
    ],
  },
  'Re-activation Campaign': {
    healthScore:57, healthLabel:'Needs Attention', healthColor:C.gold, spark:[7.8,8.0,8.1,8.1,8.2,8.2,8.2],
    daysRem:30, dailyBudget:'$4.00', budgetHealth:'warn',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:'~142', reach:'2,800', freq:'1.0×', overlap:'0%', retention:'32%', avgSession:'0:45', dreamsPerUser:0.2, convPotential:8, quality:42 },
    dreamIntel:{ avgLen:'0 words (dormant)', emotion:45, lucid:2, nightmare:18, positive:42, recurring:15, resonance:38, archetypes:[{name:'Unknown',pct:48,color:C.dim},{name:'Shadow',pct:28,color:'#444'},{name:'Child',pct:24,color:C.violet}] },
    creatives:[
      {label:'"We Missed Your Dreams"',    ctr:'8.2%',roas:'—',conv:24,winner:true  },
      {label:'"Your Dream Journal Awaits"',ctr:'6.8%',roas:'—',conv:18,winner:false },
    ],
    topDream:{ title:'N/A — dormant segment', ctr:'—', readTime:'—', shares:0, saves:0, comments:0 },
    competitor:{ ourCTR:'8.2%', indCTR:'2.1%', ourCPM:'—', indCPM:'—', rating:'Excellent (Email)', ratingColor:C.green },
    automation:{ autoPause:false, autoBudget:false, autoDupe:false, autoRefresh:false, autoEnd:true, autoExpand:false, autoFreq:false },
    timeline:[{stage:'Created',date:'2026-06-28',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'2026-07-24',done:false},{stage:'Running',date:'2026-07-25',done:false},{stage:'Optimized',date:'Auto',done:false},{stage:'Completed',date:'2026-08-24',done:false}],
    revenue:{ total:'$0', premSubs:0, adRev:'$0', retention:'+retention only', ltv:'$18.40' },
    insights:[
      { type:'warning', text:'30% of dormant users may have permanently churned — validate emails first.', lift:'Save $36', conf:72, action:'Run email validity check before campaign launch' },
      { type:'positive', text:'CPA $5 is the lowest in portfolio for re-engagement.', lift:'$120 retention value', conf:79, action:'Scale to all 142 dormant users when validated' },
    ],
  },
  'Meditation Bundle Pre-Launch': {
    healthScore:53, healthLabel:'Needs Attention', healthColor:C.gold, spark:[2.0,2.1,2.1,2.2,2.2,2.2,2.2],
    daysRem:31, dailyBudget:'$8.06', budgetHealth:'good',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:'—', reach:'1,600', freq:'1.1×', overlap:'18%', retention:'74%', avgSession:'5:40', dreamsPerUser:2.8, convPotential:22, quality:68 },
    dreamIntel:{ avgLen:'184 words', emotion:62, lucid:8, nightmare:4, positive:82, recurring:32, resonance:74, archetypes:[{name:'Innocent',pct:34,color:C.green},{name:'Sage',pct:28,color:C.purple},{name:'Explorer',pct:24,color:C.cyan},{name:'Child',pct:14,color:C.violet}] },
    creatives:[
      {label:'"Sleep Better with DreamCloud"', ctr:'2.2%',roas:'0.45×',conv:14,winner:true  },
      {label:'"Guided Meditation Dreams"',     ctr:'1.9%',roas:'0.38×',conv:12,winner:false },
    ],
    topDream:{ title:'"Peaceful Garden Dream"', ctr:'2.8%', readTime:'3:24', shares:34, saves:58, comments:14 },
    competitor:{ ourCTR:'2.2%', indCTR:'1.4%', ourCPM:'$7.20', indCPM:'$5.80', rating:'Above Average', ratingColor:C.cyan },
    automation:{ autoPause:true, autoBudget:false, autoDupe:false, autoRefresh:false, autoEnd:true, autoExpand:false, autoFreq:true },
    timeline:[{stage:'Created',date:'2026-06-28',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'2026-09-30',done:false},{stage:'Running',date:'2026-10-01',done:false},{stage:'Optimized',date:'Auto',done:false},{stage:'Completed',date:'2026-10-31',done:false}],
    revenue:{ total:'$112', premSubs:0, adRev:'$56', retention:'+3%', ltv:'$8.00' },
    insights:[
      { type:'warning', text:'Meditation content library has < 50 tracks — insufficient for sponsored content.', lift:'Risk of poor experience', conf:84, action:'Wait for 200+ meditation tracks before launch' },
      { type:'warning', text:'ROAS 0.45× below breakeven. Needs wellness sponsor to offset ad cost.', lift:'+22% ROAS if sponsored', conf:76, action:'Source Calm or Headspace as first sponsor' },
    ],
  },
  'Weekly Dream Digest Sponsorship': {
    healthScore:72, healthLabel:'Good', healthColor:C.cyan, spark:[24,25,26,27,28,28,28],
    daysRem:94, dailyBudget:'$0.85', budgetHealth:'good',
    team:{ owner:'Admin', reviewer:'Admin', approver:'Admin', lastEdited:'2026-06-28' },
    audience:{ size:284, reach:'1,200', freq:'4.0×', overlap:'40%', retention:'82%', avgSession:'2:10', dreamsPerUser:2.1, convPotential:18, quality:74 },
    dreamIntel:{ avgLen:'268 words', emotion:68, lucid:6, nightmare:12, positive:72, recurring:24, resonance:70, archetypes:[{name:'Explorer',pct:32,color:C.cyan},{name:'Hero',pct:28,color:C.orange},{name:'Sage',pct:24,color:C.purple},{name:'Shadow',pct:16,color:C.dim}] },
    creatives:[
      {label:'"Weekly Dream Highlights"',  ctr:'28%', roas:'—',conv:336,winner:true  },
      {label:'"Your Dream Week Recap"',    ctr:'24%', roas:'—',conv:288,winner:false },
    ],
    topDream:{ title:'"Top Dreams This Week"', ctr:'4.2%', readTime:'1:48', shares:48, saves:72, comments:22 },
    competitor:{ ourCTR:'28%', indCTR:'21%', ourCPM:'$4.80', indCPM:'$5.80', rating:'Above Average', ratingColor:C.cyan },
    automation:{ autoPause:false, autoBudget:false, autoDupe:false, autoRefresh:true, autoEnd:false, autoExpand:false, autoFreq:false },
    timeline:[{stage:'Created',date:'2026-06-28',done:true},{stage:'Approved',date:'Pending',done:false},{stage:'Scheduled',date:'2026-06-30',done:false},{stage:'Running',date:'2026-07-01',done:false},{stage:'Optimized',date:'Auto',done:false},{stage:'Completed',date:'2026-09-30',done:false}],
    revenue:{ total:'$5.76', premSubs:0, adRev:'$5.76', retention:'+1%', ltv:'$0.02' },
    insights:[
      { type:'positive', text:'28% open rate — 1.33× industry average (21%). Strong delivery channel.', lift:'$5.76/send', conf:88, action:'Increase send frequency to 2×/week' },
      { type:'warning', text:'Revenue $5.76/send is low — source premium wellness sponsor.', lift:'+$20/send potential', conf:79, action:'Partner with Headspace for first paid sponsorship' },
    ],
  },
};

// ── Config & Static ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<CampaignStatus | string, { label: string; color: string }> = {
  ACTIVE:  { label:'Active',   color:C.green  },
  PLANNED: { label:'Planned',  color:C.cyan   },
  DRAFT:   { label:'Draft',    color:C.purple },
  PAUSED:  { label:'Paused',   color:C.gold   },
  FUTURE:  { label:'Future',   color:C.violet },
};

const ZONE_STATUS_CFG: Record<string, { color: string; label: string }> = {
  READY:   { color:C.green, label:'Ready'       },
  PLANNED: { color:C.gold,  label:'Planned'     },
  FUTURE:  { color:C.purple,label:'Future Phase'},
};

const ALL_STATUSES = ['ALL','ACTIVE','PLANNED','DRAFT','PAUSED','FUTURE'] as const;
type FilterStatus = typeof ALL_STATUSES[number];

const CAMPAIGN_TYPES  = ['Premium Conv','AI Report','Brand','Retention','Creator Boost'];
const SEGMENTS        = ['Power Dreamers','Lucid Seekers','Nightmare Users','All Users','Likely Premium'];
const PLACEMENT_OPTIONS = ['Feed','Dream Detail','Explore','Email Digest'];

const AUTO_LABELS: { key: keyof AutomationCfg; label: string }[] = [
  { key:'autoPause',   label:'Auto Pause'      },
  { key:'autoBudget',  label:'Auto Budget ↑'   },
  { key:'autoDupe',    label:'Auto Duplicate'   },
  { key:'autoRefresh', label:'Auto Creative'    },
  { key:'autoEnd',     label:'Auto End'         },
  { key:'autoExpand',  label:'Auto Expand'      },
  { key:'autoFreq',    label:'Freq Control'     },
];

const ALERTS = [
  { color:C.red,    icon:'🚨', text:'Nightmare Therapy Partner: health score 41 (Poor) — brand safety insufficient. Action required before launch.' },
  { color:C.gold,   icon:'⚠',  text:'Lucid Dream Challenge is in DRAFT — highest ROAS projected (1.07×). Approve and schedule immediately.' },
  { color:C.orange, icon:'⚡',  text:'AI Report Launch Pack: ROAS 0.45× below breakeven. Switch to Variant C ("AI Dream Report — $4.99").' },
  { color:C.purple, icon:'💡',  text:'Creator Boost Campaign: 4.2% CTR (highest portfolio). Low budget ($150) — consider increasing to $300.' },
];

// ── Micro-components ──────────────────────────────────────────────────────────

function HealthRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 15, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 19 19)" />
        <text x="19" y="23" textAnchor="middle" fontSize="9" fontWeight="bold" fill={color}>{score}</text>
      </svg>
      <span className="text-[7px] font-bold uppercase tracking-tight" style={{ color }}>{label}</span>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const n = data.length;
  if (n < 2) return null;
  const max = Math.max(...data, 1);
  const W = 64, H = 18;
  const pts = data.map((v, i) => `${(i/(n-1))*W},${H-(v/max)*H*0.85}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="opacity-70 shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Pill({ label, color = C.purple }: { label: string; color?: string }) {
  return (
    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background:`${color}14`, color, border:`1px solid ${color}28` }}>
      {label}
    </span>
  );
}

function Stat({ label, value, color = 'var(--dc-text)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className="text-dc-muted text-[9px] uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-[11px] font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label:status, color:C.dim };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded shrink-0"
      style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
      style={{ background:'rgba(0,207,255,0.08)', color:C.cyan, border:'1px solid rgba(0,207,255,0.18)' }}>
      {type}
    </span>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full" style={{ width:`${pct}%`, background:color }} />
    </div>
  );
}

// ── Enhanced CampaignCard ─────────────────────────────────────────────────────

function CampaignCard({ c, selected, onSelect, compareMode }: {
  c: Campaign; selected: boolean; onSelect: () => void; compareMode: boolean;
}) {
  const extra = CAMPAIGN_EXTRA[c.name];
  const [showAuto, setShowAuto] = useState(false);
  const [automation, setAutomation] = useState<AutomationCfg>(
    extra?.automation ?? { autoPause:false, autoBudget:false, autoDupe:false, autoRefresh:false, autoEnd:false, autoExpand:false, autoFreq:false }
  );

  const spendPct = c.budget > 0 ? Math.min(100, (c.spend / c.budget) * 100) : 0;
  const hasImpressions = !!c.proj.impressions;
  const hasReach = !!c.proj.reach;
  const hasSends = !!c.proj.sends;

  function toggleAuto(key: keyof AutomationCfg) {
    setAutomation(p => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="dc-card p-4 space-y-3 flex flex-col"
      style={ selected ? { borderColor:`${C.cyan}50`, borderWidth:'1px' } : undefined }>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {compareMode && (
              <input type="checkbox" checked={selected} onChange={onSelect}
                className="w-3.5 h-3.5 accent-cyan-400 shrink-0 cursor-pointer" />
            )}
            <p className="text-dc-text text-sm font-bold leading-tight">{c.name}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <TypeBadge type={c.type} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {extra && <HealthRing score={extra.healthScore} label={extra.healthLabel} color={extra.healthColor} />}
          <StatusBadge status={c.status} />
        </div>
      </div>

      {/* Budget / Spend with sparkline */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:'10px' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-dc-muted text-[9px] uppercase tracking-widest">Budget / Spend</span>
          <div className="flex items-center gap-2">
            {extra && <Sparkline data={extra.spark} color={extra.healthColor} />}
            <span className="text-dc-text text-[10px] font-mono font-bold">
              ${c.spend.toLocaleString()} / ${c.budget.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width:`${spendPct}%`, background:spendPct>0?C.green:'rgba(56,214,138,0.25)' }} />
        </div>
        {extra && (
          <div className="flex items-center gap-4 mt-1">
            <span className="text-[8px] text-dc-muted">{extra.daysRem}d remaining</span>
            <span className="text-[8px] text-dc-muted">Daily: {extra.dailyBudget}</span>
            <span className="text-[8px] font-bold" style={{ color:extra.budgetHealth==='good'?C.green:extra.budgetHealth==='warn'?C.gold:C.red }}>
              {extra.budgetHealth==='good'?'On Track':extra.budgetHealth==='warn'?'Watch':'At Risk'}
            </span>
          </div>
        )}
      </div>

      {/* Projected metrics */}
      <div className="grid grid-cols-3 gap-2" style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:'10px' }}>
        {hasImpressions && <>
          <Stat label="Impressions" value={c.proj.impressions!} color={C.cyan} />
          <Stat label="CTR"         value={c.proj.ctr!}         color={C.green} />
          <Stat label="Conversions" value={c.proj.conversions!} color={C.gold} />
          <Stat label="CPA"         value={c.proj.cpa!}         color={C.orange} />
          <Stat label="Revenue"     value={c.proj.revenue!}     color={C.green} />
          <Stat label="ROAS"        value={c.proj.roas!} color={c.proj.roas && parseFloat(c.proj.roas)>=1?C.green:C.red} />
        </>}
        {hasReach && <>
          <Stat label="Reach"    value={c.proj.reach!}     color={C.cyan}   />
          <Stat label="Open Rate" value={c.proj.openRate!} color={C.green}  />
          <Stat label="Returns"  value={c.proj.returns!}   color={C.gold}   />
          <Stat label="CPA"      value={c.proj.cpa!}       color={C.orange} />
          <Stat label="Revenue"  value={c.proj.revenue!}   color={C.green}  />
        </>}
        {hasSends && <>
          <Stat label="Sends"     value={c.proj.sends!}    color={C.cyan}   />
          <Stat label="Open Rate" value={c.proj.openRate!} color={C.green}  />
          <Stat label="Views"     value={c.proj.views!}    color={C.gold}   />
          <Stat label="CPM"       value={c.proj.cpm!}      color={C.orange} />
          <Stat label="Revenue"   value={c.proj.revenue!}  color={C.green}  />
        </>}
      </div>

      {/* Segment + Placements */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:'10px' }}>
        <p className="text-dc-muted text-[9px] uppercase tracking-widest mb-1.5">Segment</p>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <Pill label={`${c.segment} (${c.segmentSize})`} color={C.purple} />
        </div>
        <p className="text-dc-muted text-[9px] uppercase tracking-widest mb-1.5">Placements</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {c.placements.map(p => <Pill key={p} label={p} color={C.violet} />)}
        </div>
      </div>

      {/* Dates + Team */}
      <div className="grid grid-cols-2 gap-2" style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:'10px' }}>
        <Stat label="Start" value={c.start} />
        <Stat label="End"   value={c.end}   />
      </div>
      {extra && (
        <div className="flex items-center gap-4 text-[8px] text-dc-muted">
          <span>👤 {extra.team.owner}</span>
          <span>✔ {extra.team.reviewer}</span>
          <span>Edited: {extra.team.lastEdited}</span>
        </div>
      )}

      {/* AI Recommendation */}
      <div className="rounded-lg px-3 py-2"
        style={{ background:'rgba(255,184,0,0.06)', border:'1px solid rgba(255,184,0,0.18)' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color:C.gold }}>AI Recommendation</p>
        <p className="text-[10px] italic leading-relaxed" style={{ color:'rgba(255,255,255,0.65)' }}>"{c.aiRec}"</p>
      </div>

      {/* Campaign Timeline (compact) */}
      {extra && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:'10px' }}>
          <div className="flex items-center gap-0">
            {extra.timeline.map((t, i) => {
              const isLast = i === extra.timeline.length - 1;
              return (
                <div key={t.stage} className="flex items-center flex-1">
                  <div title={`${t.stage}: ${t.date}`}
                    className="w-2.5 h-2.5 rounded-full shrink-0 border z-10"
                    style={{ background:t.done?C.green:'transparent', borderColor:t.done?C.green:'rgba(255,255,255,0.2)' }} />
                  {!isLast && <div className="flex-1 h-px" style={{ background:t.done?C.green:'rgba(255,255,255,0.08)' }} />}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            {extra.timeline.map(t => (
              <span key={t.stage} className="text-[7px] text-dc-muted/50 flex-1 first:text-left last:text-right text-center">{t.stage}</span>
            ))}
          </div>
        </div>
      )}

      {/* Automation (collapsible) */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:'8px' }}>
        <button type="button" onClick={() => setShowAuto(!showAuto)}
          className="w-full flex items-center justify-between text-[9px] text-dc-muted hover:text-dc-text transition-colors">
          <span className="font-bold uppercase tracking-widest">Automation</span>
          <span>{showAuto?'▲':'▼'}</span>
        </button>
        {showAuto && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {AUTO_LABELS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => toggleAuto(key)}
                className="flex items-center justify-between text-[9px] py-0.5"
                style={{ color:automation[key]?C.green:C.dim }}>
                <span>{label}</span>
                <span className="font-bold">{automation[key]?'ON':'OFF'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {['Edit','View','Duplicate'].map(action => (
          <button key={action} disabled
            className="text-[10px] font-semibold px-3 py-1.5 rounded opacity-40 cursor-not-allowed"
            style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.08)' }}>
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

function ZoneRow({ z }: { z: PlacementZone }) {
  const cfg = ZONE_STATUS_CFG[z.status] ?? { color:C.dim, label:z.status };
  const labelMap: Record<string,string> = {
    'Rüya Akışı':'Dream Feed','Rüya Detayı':'Dream Detail','Keşfet':'Explore',
    'Arketip':'Archetype','Profil':'Profile','E-posta':'Email Digest',
  };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background:cfg.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-dc-text text-xs font-semibold">{labelMap[z.label] ?? z.label}</p>
        <p className="text-dc-muted text-[10px]">{z.reach}</p>
      </div>
      <span className="text-[9px] font-bold px-2 py-0.5 rounded shrink-0"
        style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}30` }}>
        {cfg.label}
      </span>
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const [placements, setPlacements] = useState<string[]>([]);
  const toggle = (p: string) => setPlacements(prev => prev.includes(p)?prev.filter(x=>x!==p):[...prev,p]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}>
      <div className="dc-card w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-dc-text font-bold text-base">Create Campaign</h3>
            <p className="text-dc-muted text-xs mt-0.5">Configure your campaign parameters</p>
          </div>
          <button onClick={onClose} className="text-dc-muted hover:text-dc-text transition-colors text-lg leading-none px-2 py-1 rounded" style={{ background:'rgba(255,255,255,0.05)' }}>✕</button>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }} />
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-dc-muted block mb-1">Campaign Name</label>
            <input type="text" placeholder="e.g. Summer Dream Push" className="w-full px-3 py-2 rounded-lg text-sm text-dc-text"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', outline:'none' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-dc-muted block mb-1">Campaign Type</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm text-dc-text"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', outline:'none' }}>
                <option value="">Select type…</option>
                {CAMPAIGN_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-dc-muted block mb-1">Target Segment</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm text-dc-text"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', outline:'none' }}>
                <option value="">Select segment…</option>
                {SEGMENTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-dc-muted block mb-1">Budget ($)</label>
            <input type="number" placeholder="0" min={0} className="w-full px-3 py-2 rounded-lg text-sm text-dc-text"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', outline:'none' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-dc-muted block mb-1">Start Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm text-dc-text"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', colorScheme:'dark' }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-dc-muted block mb-1">End Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm text-dc-text"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', colorScheme:'dark' }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-dc-muted block mb-2">Placement</label>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_OPTIONS.map(p => {
                const active = placements.includes(p);
                return (
                  <button key={p} type="button" onClick={() => toggle(p)}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={active?{ background:'rgba(0,207,255,0.15)', color:C.cyan, border:'1px solid rgba(0,207,255,0.35)' }:{ background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.08)' }}>
            Close
          </button>
          <button disabled className="text-sm font-bold px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
            style={{ background:'rgba(56,214,138,0.15)', color:C.green, border:`1px solid rgba(56,214,138,0.3)` }}>
            Create (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Campaigns() {
  const [filter, setFilter]             = useState<FilterStatus>('ALL');
  const [showCreate, setShowCreate]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedSet, setSelectedSet]   = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode]   = useState(false);
  const [showAlerts, setShowAlerts]     = useState(true);
  const [activeInsight, setActiveInsight] = useState(0);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['campaigns'], queryFn: fetchCampaigns, staleTime: 10*60_000,
  });

  const filtered = CAMPAIGNS.filter(c => {
    if (filter !== 'ALL' && c.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
        || c.segment.toLowerCase().includes(q) || c.placements.some(p=>p.toLowerCase().includes(q));
    }
    return true;
  });

  const statusCounts = ALL_STATUSES.slice(1).reduce<Record<string,number>>((acc,s) => {
    acc[s] = CAMPAIGNS.filter(c=>c.status===s).length; return acc;
  }, {});

  const totalBudget  = CAMPAIGNS.reduce((s,c)=>s+c.budget,0);
  const activeCount  = statusCounts['ACTIVE']  ?? 0;
  const plannedCount = statusCounts['PLANNED'] ?? 0;
  const draftCount   = statusCounts['DRAFT']   ?? 0;
  const pausedCount  = statusCounts['PAUSED']  ?? 0;
  const futureCount  = statusCounts['FUTURE']  ?? 0;

  const selectedPair = [...selectedSet].slice(0,2);
  const compA = CAMPAIGNS.find(c=>c.name===selectedPair[0]);
  const compB = CAMPAIGNS.find(c=>c.name===selectedPair[1]);

  function toggleSelect(name: string) {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { if (next.size < 2) next.add(name); }
      return next;
    });
  }

  const THcls = 'text-[9px] font-bold uppercase tracking-widest text-dc-muted py-2 px-3 text-left whitespace-nowrap';
  const TDcls = 'text-[10px] text-dc-text py-2 px-3 border-b border-white/[0.04]';

  const insightCampaign = CAMPAIGNS[activeInsight];
  const insightExtra    = insightCampaign ? CAMPAIGN_EXTRA[insightCampaign.name] : undefined;

  return (
    <div className="section-business relative">
      {showCreate && <CreateModal onClose={()=>setShowCreate(false)} />}

      <Header
        title="Campaign Intelligence Center"
        subtitle="Dream-powered campaign management and AI optimization"
        section="business"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background:'rgba(255,184,0,0.12)', color:C.gold, border:`1px solid rgba(255,184,0,0.25)` }}>
              PRE-LAUNCH
            </span>
            <button onClick={()=>{ setCompareMode(!compareMode); setSelectedSet(new Set()); }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
              style={ compareMode
                ? { background:`rgba(0,207,255,0.15)`, color:C.cyan, border:`1px solid rgba(0,207,255,0.35)` }
                : { background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)' }
              }>
              ⇄ Compare
            </button>
            <button onClick={()=>setShowCreate(true)}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{ background:'rgba(56,214,138,0.15)', color:C.green, border:`1px solid rgba(56,214,138,0.3)` }}>
              + Create Campaign
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Could not load data.</div>}

        {/* ── AI Priority Alerts ────────────────────────────────────────── */}
        {showAlerts && (
          <div className="dc-card overflow-hidden" style={{ borderColor:`${C.red}25`, borderWidth:'1px' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:C.red }}>Campaigns Requiring Attention</p>
              <button type="button" onClick={()=>setShowAlerts(false)} className="text-dc-muted text-xs hover:text-dc-text">Dismiss</button>
            </div>
            <div className="divide-y" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
              {ALERTS.map((a,i)=>(
                <div key={i} className="px-5 py-2.5 flex items-start gap-3 hover:bg-white/[0.015]">
                  <span className="text-sm shrink-0 mt-0.5">{a.icon}</span>
                  <p className="text-[10px] text-dc-text leading-relaxed flex-1">{a.text}</p>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded shrink-0"
                    style={{ background:`${a.color}15`, color:a.color, border:`1px solid ${a.color}30` }}>ACTION</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Executive Overview ────────────────────────────────────────── */}
        <div>
          <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest mb-3">Executive Overview — ⚡ Projected Pipeline</p>
          <div className="grid grid-cols-4 xl:grid-cols-7 gap-3">
            {[
              { label:'Active',        value:activeCount,                   color:C.green  },
              { label:'Planned',       value:plannedCount,                  color:C.cyan   },
              { label:'Draft',         value:draftCount,                    color:C.purple },
              { label:'Paused',        value:pausedCount,                   color:C.gold   },
              { label:'Future',        value:futureCount,                   color:C.violet },
              { label:'Total Budget',  value:`$${totalBudget.toLocaleString()}`, color:C.pink },
              { label:'Total Spend',   value:'$0',                          color:C.dim    },
            ].map(s=>(
              <div key={s.label} className="dc-card px-3 py-2.5 text-center">
                <p className="text-dc-muted text-[9px] uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-lg font-bold font-mono" style={{ color:s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 xl:grid-cols-7 gap-3 mt-3">
            {[
              { label:'Proj. Revenue',  value:'$1,167.76', color:C.green,  proj:true  },
              { label:'Overall ROAS',   value:'0.74×',     color:C.gold,   proj:true  },
              { label:'Avg CTR',        value:'2.9%',      color:C.cyan,   proj:true  },
              { label:'Avg CPM',        value:'$4.80',     color:C.purple, proj:true  },
              { label:'Avg CPA',        value:'$21.54',    color:C.orange, proj:true  },
              { label:'Avg Engagement', value:'18%',       color:C.green,  proj:true  },
              { label:'Avg Read Time',  value:'2:34',      color:C.violet, proj:false },
            ].map(s=>(
              <div key={s.label} className="dc-card px-3 py-2.5 text-center">
                <p className="text-dc-muted text-[9px] uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-lg font-bold font-mono" style={{ color:s.color }}>{s.value}</p>
                {s.proj && <span className="inline-block text-[7px] font-bold px-1 py-px rounded mt-0.5"
                  style={{ background:`${C.purple}15`, color:C.purple, border:`1px solid ${C.purple}30` }}>⚡ PROJ</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Smart Search + Filter ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <input type="text" placeholder="Search campaigns, types, segments, placements…"
            value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            className="flex-1 min-w-48 px-3 py-1.5 rounded-lg text-xs text-dc-text outline-none"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }} />
          {ALL_STATUSES.map(s => {
            const cfg = s==='ALL' ? { color:C.cyan } : STATUS_CFG[s] ?? { color:C.dim };
            const count = s==='ALL' ? CAMPAIGNS.length : (statusCounts[s] ?? 0);
            return (
              <button key={s} onClick={()=>setFilter(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={filter===s ? { background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}40` }
                  : { background:'rgba(255,255,255,0.02)', color:'rgba(255,255,255,0.35)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <span>{s==='ALL'?'All':(STATUS_CFG[s]?.label??s)}</span>
                <span className="text-[10px] font-mono px-1 rounded" style={{ background:filter===s?`${cfg.color}20`:'rgba(255,255,255,0.05)' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Bulk Actions */}
        {selectedSet.size > 0 && (
          <div className="dc-card px-5 py-3 flex items-center gap-3" style={{ borderColor:`${C.cyan}30`, borderWidth:'1px' }}>
            <span className="text-[10px] font-bold" style={{ color:C.cyan }}>{selectedSet.size} selected</span>
            {['Pause','Resume','Duplicate','Archive','Export','Increase Budget','Decrease Budget'].map(a=>(
              <button key={a} type="button" disabled
                className="text-[9px] font-bold px-2.5 py-1 rounded opacity-50 cursor-not-allowed"
                style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)' }}>
                {a}
              </button>
            ))}
            <button type="button" onClick={()=>setSelectedSet(new Set())} className="ml-auto text-[9px] text-dc-muted hover:text-dc-text">Clear</button>
          </div>
        )}

        {/* Platform context from API */}
        {data?.platformContext && (
          <div className="dc-card p-4 flex items-center gap-4" style={{ borderColor:'rgba(0,207,255,0.15)', borderWidth:'1px' }}>
            <div className="flex-1">
              <p className="text-dc-text text-xs font-bold mb-0.5">Platform Addressable Audience</p>
              <p className="text-dc-muted text-[10px]">All campaigns target verified DreamCloud users. No real ad spend yet.</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-dc-muted text-[9px] uppercase tracking-widest">Addressable</p>
              <p className="text-2xl font-bold font-mono" style={{ color:C.cyan }}>{data.platformContext.addressable_audience}</p>
              <p className="text-dc-muted text-[9px]">active users</p>
            </div>
          </div>
        )}

        {/* Campaign Cards */}
        {compareMode && selectedSet.size < 2 && (
          <div className="dc-card p-4 text-center" style={{ borderColor:`${C.cyan}25`, borderWidth:'1px' }}>
            <p className="text-[11px] text-dc-muted">Select <span style={{ color:C.cyan }}>2 campaigns</span> to compare side-by-side ({selectedSet.size}/2 selected)</p>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="dc-card p-10 text-center"><p className="text-dc-muted text-sm">No campaigns match current filters.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(c => (
              <CampaignCard key={c.name} c={c} selected={selectedSet.has(c.name)} onSelect={()=>toggleSelect(c.name)} compareMode={compareMode} />
            ))}
          </div>
        )}

        {/* Campaign Comparison */}
        {compareMode && compA && compB && (() => {
          const eA = CAMPAIGN_EXTRA[compA.name];
          const eB = CAMPAIGN_EXTRA[compB.name];
          const rows: { label: string; a: string; b: string; aColor?: string; bColor?: string }[] = [
            { label:'Health Score', a:`${eA?.healthScore??'—'}`, b:`${eB?.healthScore??'—'}`, aColor:eA?.healthColor, bColor:eB?.healthColor },
            { label:'CTR',          a:compA.proj.ctr??compA.proj.openRate??'—', b:compB.proj.ctr??compB.proj.openRate??'—', aColor:C.cyan, bColor:C.cyan },
            { label:'ROAS',         a:compA.proj.roas??'—', b:compB.proj.roas??'—' },
            { label:'Revenue',      a:compA.proj.revenue??'—', b:compB.proj.revenue??'—', aColor:C.pink, bColor:C.pink },
            { label:'Budget',       a:`$${compA.budget}`, b:`$${compB.budget}`, aColor:C.gold, bColor:C.gold },
            { label:'Audience Q.',  a:`${eA?.audience.quality??'—'}`, b:`${eB?.audience.quality??'—'}` },
            { label:'Resonance',    a:`${eA?.dreamIntel.resonance??'—'}%`, b:`${eB?.dreamIntel.resonance??'—'}%`, aColor:C.violet, bColor:C.violet },
            { label:'Top Dream CTR',a:eA?.topDream.ctr??'—', b:eB?.topDream.ctr??'—', aColor:C.cyan, bColor:C.cyan },
          ];
          return (
            <div className="dc-card overflow-hidden" style={{ borderColor:`${C.cyan}30`, borderWidth:'1px' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                <h3 className="text-dc-text text-sm font-bold">Campaign Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                      <th className={THcls}>Metric</th>
                      <th className={`${THcls} text-center`} style={{ color:eA?.healthColor }}>{compA.name}</th>
                      <th className={`${THcls} text-center`} style={{ color:eB?.healthColor }}>{compB.name}</th>
                      <th className={THcls}>Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.label} className="hover:bg-white/[0.015]">
                        <td className={TDcls}>{r.label}</td>
                        <td className={`${TDcls} text-center font-mono font-bold`} style={{ color:r.aColor }}>{r.a}</td>
                        <td className={`${TDcls} text-center font-mono font-bold`} style={{ color:r.bColor }}>{r.b}</td>
                        <td className={TDcls}>
                          <span className="text-[9px] font-bold" style={{ color:C.green }}>
                            {r.a>r.b?compA.name.split(' ')[0]:r.b>r.a?compB.name.split(' ')[0]:'Tie'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── AI Campaign Insights ──────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">AI Campaign Insights</h3>
            <div className="flex items-center gap-1">
              {CAMPAIGNS.map((c,i) => {
                const extra = CAMPAIGN_EXTRA[c.name];
                return (
                  <button key={c.name} onClick={()=>setActiveInsight(i)}
                    className="text-[8px] font-bold px-2 py-1 rounded transition-all"
                    style={ activeInsight===i
                      ? { background:`${extra?.healthColor??C.purple}20`, color:extra?.healthColor??C.purple, border:`1px solid ${extra?.healthColor??C.purple}40` }
                      : { background:'rgba(255,255,255,0.04)', color:'#666', border:'1px solid rgba(255,255,255,0.06)' }
                    }>
                    {c.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
          {insightExtra && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <HealthRing score={insightExtra.healthScore} label={insightExtra.healthLabel} color={insightExtra.healthColor} />
                <div>
                  <p className="text-dc-text text-sm font-bold">{insightCampaign?.name}</p>
                  <p className="text-dc-muted text-[10px]">{insightCampaign?.type} · {insightCampaign?.status}</p>
                </div>
              </div>
              <div className="space-y-2">
                {insightExtra.insights.map((ins,i) => (
                  <div key={i} className="rounded-lg p-3"
                    style={{ background:ins.type==='positive'?'rgba(56,214,138,0.06)':ins.type==='warning'?'rgba(255,184,0,0.06)':'rgba(255,74,94,0.06)',
                      borderLeft:`2px solid ${ins.type==='positive'?C.green:ins.type==='warning'?C.gold:C.red}` }}>
                    <p className="text-dc-text text-[11px] leading-snug">{ins.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] font-bold" style={{ color:ins.type==='positive'?C.green:ins.type==='warning'?C.gold:C.red }}>
                        {ins.type==='positive'?'✓ Opportunity':ins.type==='warning'?'⚠ Warning':'🚨 Critical'}
                      </span>
                      <span className="text-[9px] text-dc-muted">Lift: <span style={{ color:C.green }}>{ins.lift}</span></span>
                      <span className="text-[9px] text-dc-muted">Confidence: <span style={{ color:insightExtra.healthColor }}>{ins.conf}%</span></span>
                    </div>
                    <p className="text-[9px] text-dc-muted mt-1 italic">→ {ins.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Campaign Health + Audience Quality ───────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Health Dashboard */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Campaign Health Dashboard</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">AI score: CTR + ROAS + engagement + brand safety</p>
            </div>
            <table className="w-full">
              <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Campaign</th>
                <th className={THcls}>Score</th>
                <th className={THcls}>Trend</th>
                <th className={THcls}>Status</th>
              </tr></thead>
              <tbody>
                {CAMPAIGNS.map(c => {
                  const e = CAMPAIGN_EXTRA[c.name];
                  return (
                    <tr key={c.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="text-[10px] font-semibold">{c.name.split(' ').slice(0,3).join(' ')}</span></td>
                      <td className={TDcls}>
                        <span className="font-mono text-[10px] font-bold" style={{ color:e?.healthColor }}>{e?.healthScore??'—'}</span>
                      </td>
                      <td className={TDcls}>{e && <Sparkline data={e.spark} color={e.healthColor} />}</td>
                      <td className={TDcls}>{e && <span className="text-[9px] font-bold" style={{ color:e.healthColor }}>{e.healthLabel}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Audience Quality */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Audience Quality</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Retention · Session · Dreams/User · Conv Potential</p>
            </div>
            <table className="w-full">
              <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Campaign</th>
                <th className={THcls}>Reach</th>
                <th className={THcls}>Retention</th>
                <th className={THcls}>Dreams</th>
                <th className={THcls}>Quality</th>
              </tr></thead>
              <tbody>
                {CAMPAIGNS.map(c => {
                  const e = CAMPAIGN_EXTRA[c.name];
                  return (
                    <tr key={c.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="text-[10px] font-semibold">{c.name.split(' ').slice(0,2).join(' ')}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">{e?.audience.reach??'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.green }}>{e?.audience.retention??'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">{e?.audience.dreamsPerUser??'—'}</span></td>
                      <td className={TDcls}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold" style={{ color:C.cyan }}>{e?.audience.quality??'—'}</span>
                          {e && <MiniBar pct={e.audience.quality} color={C.cyan} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Dream Intelligence ────────────────────────────────────────── */}
        <div className="dc-card overflow-hidden" style={{ borderColor:`${C.violet}20`, borderWidth:'1px' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Dream Intelligence</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">DreamCloud's competitive advantage — every campaign scored by dream content metrics</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Campaign</th>
                <th className={THcls}>Avg Length</th>
                <th className={THcls}>Emotion</th>
                <th className={THcls}>Lucid %</th>
                <th className={THcls}>Nightmare %</th>
                <th className={THcls}>Positive %</th>
                <th className={THcls}>Recurring %</th>
                <th className={THcls}>Resonance</th>
                <th className={THcls}>Top Archetype</th>
              </tr></thead>
              <tbody>
                {CAMPAIGNS.map(c => {
                  const d = CAMPAIGN_EXTRA[c.name]?.dreamIntel;
                  return (
                    <tr key={c.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="text-[10px] font-semibold">{c.name.split(' ').slice(0,2).join(' ')}</span></td>
                      <td className={TDcls}><span className="text-[9px] text-dc-muted">{d?.avgLen??'—'}</span></td>
                      <td className={TDcls}>
                        {d && <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px]" style={{ color:C.pink }}>{d.emotion}</span>
                          <MiniBar pct={d.emotion} color={C.pink} />
                        </div>}
                      </td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.cyan }}>{d?`${d.lucid}%`:'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.red }}>{d?`${d.nightmare}%`:'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.green }}>{d?`${d.positive}%`:'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.violet }}>{d?`${d.recurring}%`:'—'}</span></td>
                      <td className={TDcls}>
                        {d && <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold" style={{ color:C.violet }}>{d.resonance}</span>
                          <MiniBar pct={d.resonance} color={C.violet} />
                        </div>}
                      </td>
                      <td className={TDcls}>
                        {d?.archetypes[0] && (
                          <span className="text-[9px] font-bold" style={{ color:d.archetypes[0].color }}>
                            {d.archetypes[0].name} {d.archetypes[0].pct}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Creative Performance + Best Content ──────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Creative A/B */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Creative Performance</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">⚡ Projected A/B test results</p>
            </div>
            <div className="divide-y" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
              {CAMPAIGNS.map(c => {
                const e = CAMPAIGN_EXTRA[c.name];
                if (!e) return null;
                const winner = e.creatives.find(v=>v.winner);
                return (
                  <div key={c.name} className="px-5 py-2.5">
                    <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-1.5">{c.name.split(' ').slice(0,3).join(' ')}</p>
                    <div className="space-y-1">
                      {e.creatives.map((v,i)=>(
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[8px] font-bold shrink-0" style={{ color:v.winner?C.green:C.dim }}>{v.winner?'★':'○'}</span>
                          <span className="text-[9px] text-dc-text flex-1 truncate">{v.label}</span>
                          <span className="font-mono text-[9px] shrink-0" style={{ color:C.cyan }}>{v.ctr}</span>
                          <span className="font-mono text-[9px] shrink-0" style={{ color:v.winner?C.green:C.gold }}>{v.roas}</span>
                        </div>
                      ))}
                    </div>
                    {winner && <p className="text-[8px] text-dc-muted mt-1 italic">Winner: {winner.label.slice(0,32)}…</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best Performing Content */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Best Performing Content</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">Top sponsored dream per campaign</p>
            </div>
            <div className="divide-y" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
              {CAMPAIGNS.map(c => {
                const e = CAMPAIGN_EXTRA[c.name];
                if (!e) return null;
                return (
                  <div key={c.name} className="px-5 py-2.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center text-sm"
                      style={{ background:`${e.healthColor}15` }}>🌙</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-dc-text truncate">{e.topDream.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] text-dc-muted">CTR <span style={{ color:C.cyan }}>{e.topDream.ctr}</span></span>
                        <span className="text-[8px] text-dc-muted">{e.topDream.readTime}</span>
                        <span className="text-[8px] text-dc-muted">♥ {e.topDream.saves}</span>
                        <span className="text-[8px] text-dc-muted">↗ {e.topDream.shares}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Revenue Attribution + Competitor Benchmarks ───────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue Attribution */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Revenue Attribution</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">⚡ Projected per campaign</p>
            </div>
            <table className="w-full">
              <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Campaign</th>
                <th className={THcls}>Total</th>
                <th className={THcls}>Ad Rev</th>
                <th className={THcls}>Retention</th>
                <th className={THcls}>LTV</th>
              </tr></thead>
              <tbody>
                {CAMPAIGNS.map(c => {
                  const e = CAMPAIGN_EXTRA[c.name];
                  return (
                    <tr key={c.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="text-[10px]">{c.name.split(' ').slice(0,2).join(' ')}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px] font-bold" style={{ color:C.pink }}>{e?.revenue.total??'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">{e?.revenue.adRev??'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.green }}>{e?.revenue.retention??'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.violet }}>{e?.revenue.ltv??'—'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Competitor Benchmarks */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <h3 className="text-dc-text text-sm font-bold">Competitor Benchmarks</h3>
              <p className="text-dc-muted text-[10px] mt-0.5">DreamCloud vs industry average — ⚡ AI estimated</p>
            </div>
            <table className="w-full">
              <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Campaign</th>
                <th className={THcls}>Our CTR</th>
                <th className={THcls}>Ind. CTR</th>
                <th className={THcls}>Our CPM</th>
                <th className={THcls}>Rating</th>
              </tr></thead>
              <tbody>
                {CAMPAIGNS.map(c => {
                  const e = CAMPAIGN_EXTRA[c.name];
                  return (
                    <tr key={c.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="text-[10px]">{c.name.split(' ').slice(0,2).join(' ')}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]" style={{ color:C.cyan }}>{e?.competitor.ourCTR??'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px] text-dc-muted">{e?.competitor.indCTR??'—'}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">{e?.competitor.ourCPM??'—'}</span></td>
                      <td className={TDcls}><span className="text-[9px] font-bold" style={{ color:e?.competitor.ratingColor }}>{e?.competitor.rating??'—'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Budget Pacing ─────────────────────────────────────────────── */}
        <div className="dc-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-dc-text text-sm font-bold">Budget Pacing</h3>
            <p className="text-dc-muted text-[10px] mt-0.5">All campaigns at $0 spend (pre-launch) — projected daily budget shown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <th className={THcls}>Campaign</th>
                <th className={THcls}>Budget</th>
                <th className={THcls}>Spend</th>
                <th className={THcls}>Used</th>
                <th className={THcls}>Days Rem.</th>
                <th className={THcls}>Daily Budget</th>
                <th className={THcls}>Health</th>
              </tr></thead>
              <tbody>
                {CAMPAIGNS.map(c => {
                  const e = CAMPAIGN_EXTRA[c.name];
                  const pct = c.budget>0?Math.min(100,(c.spend/c.budget)*100):0;
                  const hColor = e?.budgetHealth==='good'?C.green:e?.budgetHealth==='warn'?C.gold:C.red;
                  return (
                    <tr key={c.name} className="hover:bg-white/[0.015]">
                      <td className={TDcls}><span className="font-semibold text-[10px]">{c.name.split(' ').slice(0,3).join(' ')}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">${c.budget}</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">${c.spend}</span></td>
                      <td className={TDcls}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px]">{pct.toFixed(0)}%</span>
                          <div className="w-16 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.07)' }}>
                            <div className="h-1 rounded-full" style={{ width:`${pct}%`, background:pct>80?C.red:C.green }} />
                          </div>
                        </div>
                      </td>
                      <td className={TDcls}><span className="font-mono text-[10px]">{e?.daysRem??'—'}d</span></td>
                      <td className={TDcls}><span className="font-mono text-[10px]">{e?.dailyBudget??'—'}</span></td>
                      <td className={TDcls}><span className="text-[9px] font-bold" style={{ color:hColor }}>{e?.budgetHealth==='good'?'✓ On Track':e?.budgetHealth==='warn'?'⚠ Watch':'🚨 At Risk'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Export Center ─────────────────────────────────────────────── */}
        <div className="dc-card p-5">
          <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest mb-3">Export Center</p>
          <div className="flex items-center gap-2 flex-wrap">
            {['CSV','Excel','PDF','Executive Report','Sponsor Report','AI Summary','Weekly Report','Monthly Report'].map(fmt=>(
              <button key={fmt} type="button" disabled
                className="text-[10px] font-bold px-3 py-2 rounded-lg opacity-50 cursor-not-allowed"
                style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)' }}>
                ↓ {fmt}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-dc-muted mt-2">Export functionality available after payment integration launch.</p>
        </div>

        {/* Placement Zones from API */}
        {data?.placementZones && data.placementZones.length > 0 && (
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h3 className="text-dc-text text-sm font-bold">Ad Placement Zones</h3>
                <p className="text-dc-muted text-[10px] mt-0.5">Available inventory from platform</p>
              </div>
              <span className="text-[9px] font-bold px-2 py-1 rounded"
                style={{ background:'rgba(56,214,138,0.1)', color:C.green, border:`1px solid rgba(56,214,138,0.2)` }}>
                {data.placementZones.length} zones
              </span>
            </div>
            <div className="px-5 py-2">
              {data.placementZones.map((z:PlacementZone)=><ZoneRow key={z.id} z={z} />)}
            </div>
          </div>
        )}

        {isFetching && !data && (
          <div className="flex items-center justify-center h-20 text-dc-muted text-sm animate-pulse">Loading…</div>
        )}

        {/* ── Executive Footer ──────────────────────────────────────────── */}
        <div className="dc-card p-5 space-y-4" style={{ borderColor:`${C.purple}25`, borderWidth:'1px' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:C.violet }}>Executive Summary</p>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Campaign Leaders</p>
              {[
                { label:'Best Health',    value:'Lucid Dream Challenge',    color:C.green  },
                { label:'Highest CTR',    value:'Creator Boost (4.2%)',     color:C.cyan   },
                { label:'Highest ROAS',   value:'Lucid Dream (1.07×)',      color:C.purple },
                { label:'Most Revenue',   value:'Nightmare Partner ($640)', color:C.pink   },
              ].map(r=>(
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-dc-muted shrink-0">{r.label}</span>
                  <span className="text-[9px] font-bold text-right" style={{ color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Risks</p>
              {[
                { label:'Worst Health',    value:'Nightmare Partner (41)',   color:C.red    },
                { label:'Biggest Risk',   value:'Brand safety below 85%',   color:C.red    },
                { label:'Underperforming',value:'AI Report ROAS 0.45×',     color:C.gold   },
                { label:'Low Audience',   value:'Creator (12 users only)',   color:C.gold   },
              ].map(r=>(
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-dc-muted shrink-0">{r.label}</span>
                  <span className="text-[9px] font-bold text-right" style={{ color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Dream Intelligence</p>
              {[
                { label:'Highest Resonance', value:'Lucid Dream (96%)',       color:C.violet },
                { label:'Best Archetype',    value:'Explorer (Lucid)',        color:C.cyan   },
                { label:'Most Shared',       value:'Creator Boost (82 shares)',color:C.pink  },
                { label:'Best Read Time',    value:'Creator (5:12)',          color:C.green  },
              ].map(r=>(
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-dc-muted shrink-0">{r.label}</span>
                  <span className="text-[9px] font-bold text-right" style={{ color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest">Revenue</p>
              {[
                { label:'Proj. This Month',  value:'$0 (pre-launch)',        color:C.dim    },
                { label:'Proj. At Launch',   value:'$1,167.76/mo',          color:C.green  },
                { label:'Best Opportunity',  value:'Premium Drive (88% AI)', color:C.gold   },
                { label:'Proj. ROAS',        value:'0.74× average',         color:C.orange },
              ].map(r=>(
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-dc-muted shrink-0">{r.label}</span>
                  <span className="text-[9px] font-bold text-right" style={{ color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
            <p className="text-[9px] text-dc-muted font-bold uppercase tracking-widest mb-1">AI Final Recommendation</p>
            <p className="text-[11px] text-dc-text leading-relaxed">
              Launch <span style={{ color:C.green }}>Lucid Dream Challenge</span> first — only campaign projecting positive ROAS (1.07×) with Excellent health score (95).
              Complete <span style={{ color:C.gold }}>brand safety checklist</span> to unblock the Nightmare Therapy Partner ($640 revenue).
              Switch <span style={{ color:C.cyan }}>AI Report Launch Pack</span> to Variant C ("AI Dream Report — $4.99") — projected +22% ROAS improvement.
              The <span style={{ color:C.violet }}>Creator Boost Campaign</span> has the highest CTR in the portfolio (4.2%) — increase budget from $150 to $300.
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
