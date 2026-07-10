import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchRevenueDashboard } from '../api/admin.api';
import type { GrowthWeekPoint, TopEngager } from '../api/admin.api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function weekLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
}

const PROJ = '#FFB800';
const GREEN = '#38D68A';
const PURPLE = '#7B6FFF';
const CYAN = '#00CFFF';
const PINK = '#FF4D8F';
const RED = '#FF4A5E';
const ORANGE = '#FF8C00';
const VIOLET = '#CC80FF';

// ── Projected Badge ────────────────────────────────────────────────────────────

function ProjBadge() {
  return (
    <span
      className="text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ml-1"
      style={{ background: 'rgba(255,184,0,0.12)', color: PROJ, border: `1px solid rgba(255,184,0,0.25)` }}
    >
      PROJ
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  projected?: boolean;
  delta?: string;
}

function KpiCard({ label, value, sub, color = GREEN, projected = false, delta }: KpiProps) {
  return (
    <div className="dc-card p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <p className="text-dc-muted text-[9px] font-bold uppercase tracking-widest leading-tight flex-1 min-w-0 truncate">
          {label}
        </p>
        {projected && <ProjBadge />}
      </div>
      <div className="flex items-end gap-1.5 flex-wrap">
        <span className="text-xl font-bold font-mono leading-none" style={{ color }}>
          {projected ? '⚡ ' : ''}{value}
        </span>
        {delta && (
          <span className="text-[10px] font-bold mb-0.5" style={{ color: GREEN }}>
            {delta}
          </span>
        )}
      </div>
      {sub && <p className="text-dc-muted text-[9px] leading-snug">{sub}</p>}
    </div>
  );
}

// ── Payment Status Banner ─────────────────────────────────────────────────────

function PaymentStatusBanner({ status }: { status: string }) {
  const pending = status === 'NOT_INTEGRATED';
  const color = pending ? '#7B6FFF' : GREEN;
  return (
    <div
      className="dc-card p-4 flex items-center gap-4"
      style={{ borderColor: `${color}30`, borderWidth: '1px' }}
    >
      <div className="text-2xl shrink-0" style={{ color }}>
        {pending ? '◎' : '◈'}
      </div>
      <div className="flex-1">
        <p className="text-dc-text text-sm font-bold">
          {pending ? 'Payment Integration Pending' : 'Payment System Active'}
        </p>
        <p className="text-dc-muted text-xs mt-0.5">
          {pending
            ? 'Once Stripe or RevenueCat is integrated, real revenue data will appear here.'
            : 'Payment system is live — all metrics are real-time.'}
        </p>
      </div>
      <span
        className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg"
        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
      >
        {pending ? 'INTEGRATION REQUIRED' : 'ACTIVE'}
      </span>
    </div>
  );
}

// ── Readiness Bar ──────────────────────────────────────────────────────────────

function ReadinessBar({ label, pct, color = PURPLE }: { label: string; pct: number; color?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-dc-muted text-[10px]">{label}</span>
        <span className="text-[10px] font-bold font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-dc-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Growth Chart ──────────────────────────────────────────────────────────────

function GrowthChart({ rows }: { rows: GrowthWeekPoint[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map(r => r.dreams), 1);
  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Weekly Dream Volume</h3>
      <div className="flex items-end gap-1.5 h-24 pt-2">
        {rows.map((r, i) => {
          const h = Math.max(4, Math.round((r.dreams / max) * 88));
          const isLast = i === rows.length - 1;
          return (
            <div key={r.week} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${h}px`, background: isLast ? GREEN : 'rgba(56,214,138,0.35)' }}
              />
              <p className="text-[8px] text-dc-muted font-mono whitespace-nowrap">{weekLabel(r.week)}</p>
              <div className="absolute bottom-full mb-6 hidden group-hover:block z-10 pointer-events-none">
                <div
                  className="bg-dc-surface border text-[10px] px-2 py-1 rounded whitespace-nowrap"
                  style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  {r.dreams} dreams
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top Engagers Panel ────────────────────────────────────────────────────────

function TopEngagersPanel({ rows }: { rows: TopEngager[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map(r => r.dream_count), 1);
  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Top Content Creators</h3>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={r.username} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-dc-muted font-mono w-4 shrink-0">#{i + 1}</span>
            <div className="w-24 shrink-0">
              <p className="text-dc-text text-xs font-semibold truncate">@{r.username}</p>
            </div>
            <div className="flex-1 h-1.5 bg-dc-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round((r.dream_count / max) * 100)}%`, background: GREEN }}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-mono text-dc-text w-16 text-right">{r.dream_count} dreams</span>
              <span className="text-[10px] font-mono w-12 text-right" style={{ color: PROJ }}>
                {r.likes_received} ❤
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-dc-muted text-[10px] font-bold uppercase tracking-widest px-1 pt-2">
      {children}
    </p>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RevenueCenter() {
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['revenue-dashboard'],
    queryFn: fetchRevenueDashboard,
    staleTime: 5 * 60_000,
  });

  const us = data?.userStats;
  const ds = data?.dreamStats;
  const es = data?.engagementStats;

  return (
    <div className="section-business relative">
      <Header
        title="Revenue Center"
        subtitle="Platform monetization readiness & projected business metrics"
        section="business"
        actions={
          <button
            onClick={() => void refetch()}
            className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
            style={{ background: 'rgba(56,214,138,0.08)', color: GREEN, border: `1px solid rgba(56,214,138,0.25)` }}
          >
            {isFetching ? '...' : 'Refresh'}
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-5">
        {/* Projected mode banner */}
        <div
          className="rounded-xl px-5 py-3 flex items-center gap-3"
          style={{
            background: 'rgba(255,184,0,0.07)',
            border: `1px solid rgba(255,184,0,0.3)`,
          }}
        >
          <span style={{ color: PROJ }} className="text-lg shrink-0">⚡</span>
          <p className="text-[11px] font-bold" style={{ color: PROJ }}>
            PROJECTED MODE — Payment integration pending. All revenue figures are projections based
            on current platform data (569 users · 5,318 dreams · ~284 MAU · 5,445 likes · 2,467 comments).
          </p>
        </div>

        {isFetching && !data && (
          <div className="flex items-center justify-center h-32 text-dc-muted text-sm animate-pulse">
            Loading revenue data…
          </div>
        )}
        {isError && (
          <div className="dc-card p-5 text-center text-dc-muted text-sm">Failed to load data.</div>
        )}

        {data && (
          <>
            <PaymentStatusBanner status={data.revenue.paymentStatus} />

            {/* ── Section 2: KPI Grid ──────────────────────────────────────── */}
            <SectionHeading>Revenue KPIs — Projected</SectionHeading>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <KpiCard label="Total Revenue" value="$353" sub="$0 actual / $353 proj" color={PINK} projected />
              <KpiCard label="MRR" value="$353" sub="Monthly Recurring Revenue" color={GREEN} projected />
              <KpiCard label="ARR" value="$4,236" sub="Annualised run rate" color={GREEN} projected />
              <KpiCard label="ARPU" value="$0.62" sub="Per active user / mo" color={PROJ} projected />
              <KpiCard label="LTV" value="$18.40" sub="Lifetime value" color={VIOLET} projected />
              <KpiCard label="CAC" value="$1.20" sub="Customer acq. cost" color={CYAN} projected />
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <KpiCard label="LTV / CAC" value="15.3×" sub="Healthy > 3×" color={GREEN} projected delta="+15.3×" />
              <KpiCard label="Gross Margin" value="87%" sub="AI + infra costs" color={GREEN} projected />
              <KpiCard label="Premium Users" value="28" sub="0 actual / 28 proj" color={PURPLE} projected />
              <KpiCard label="Trial Users" value="18" sub="0 actual / 18 proj" color={VIOLET} projected />
              <KpiCard label="Conversion" value="4.9%" sub="0% actual / 4.9% proj" color={PROJ} projected />
              <KpiCard label="Churn" value="3.2%" sub="0% actual / 3.2% proj" color={RED} projected />
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <KpiCard label="Subscription Rev" value="$280" sub="Premium monthly" color={PURPLE} projected />
              <KpiCard label="AI Report Rev" value="$48" sub="Report packs" color={CYAN} projected />
              <KpiCard label="Ad Revenue" value="$25" sub="Inventory ready" color={ORANGE} projected />
              <KpiCard label="Campaign Rev" value="$0" sub="Brands not live yet" color={RED} />
              <KpiCard label="Refund Rate" value="< 1%" sub="Estimated" color={GREEN} projected />
              <KpiCard label="Total Pipeline" value="$3,200" sub="90-day optimistic" color={PROJ} projected />
            </div>

            {/* ── Section 3: Monetization Readiness Score ──────────────────── */}
            <SectionHeading>Monetization Readiness Score</SectionHeading>
            <div className="dc-card p-5 space-y-4">
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-5xl font-bold font-mono" style={{ color: PROJ }}>72%</p>
                  <p className="text-dc-muted text-xs mt-1">Overall readiness</p>
                </div>
                <div className="flex-1 h-4 bg-dc-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '72%', background: `linear-gradient(90deg, ${PURPLE}, ${PROJ})` }}
                  />
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold" style={{ color: GREEN }}>Strong foundation</p>
                  <p className="text-dc-muted text-[9px]">Missing: payment + email</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                <ReadinessBar label="User Base Size" pct={60} color={CYAN} />
                <ReadinessBar label="Engagement Level" pct={85} color={GREEN} />
                <ReadinessBar label="Premium Intent" pct={65} color={PURPLE} />
                <ReadinessBar label="Content Volume" pct={78} color={PROJ} />
                <ReadinessBar label="Ad Inventory" pct={70} color={ORANGE} />
                <ReadinessBar label="Payment Integration" pct={5} color={RED} />
                <ReadinessBar label="Campaign Infrastructure" pct={68} color={VIOLET} />
                <ReadinessBar label="AI Report Readiness" pct={80} color={CYAN} />
              </div>
              <div
                className="text-[10px] rounded-lg px-4 py-2.5"
                style={{ background: 'rgba(255,74,94,0.08)', border: `1px solid rgba(255,74,94,0.25)`, color: RED }}
              >
                <span className="font-bold">Missing before launch:</span> Payment integration (Stripe / RevenueCat) · Email service
                verification · 2FA security hardening
              </div>
            </div>

            {/* ── Section 4: Revenue Model Panel ──────────────────────────── */}
            <SectionHeading>Revenue Model — 10 Streams</SectionHeading>
            <div className="dc-card p-4 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-dc-muted uppercase tracking-wider">
                    {['Model', 'Status', 'Est. MRR', 'Integration Needed', 'Risk', 'Priority', 'Launch Ready'].map(h => (
                      <th key={h} className="text-left pb-2 pr-4 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {[
                    ['Freemium (base)', 'ACTIVE', '—', 'None', 'Low', '—', '✓'],
                    ['Premium Monthly ($9.99)', 'PLANNED', '$280', 'Stripe', 'Low', '#1', '85%'],
                    ['Premium Annual ($79.99)', 'PLANNED', '$73', 'Stripe', 'Low', '#2', '85%'],
                    ['AI Dream Report Pack ($4.99)', 'PLANNED', '$48', 'Stripe + AI', 'Low', '#3', '80%'],
                    ['Lucid Dream Coaching ($29/mo)', 'PLANNED', '$120', 'Stripe + Content', 'Medium', '#4', '60%'],
                    ['Creator Boost ($19.99)', 'FUTURE', '$95', 'Ad system', 'Medium', '#6', '40%'],
                    ['Sponsored Dream Placement', 'FUTURE', '$150', 'Ad system', 'Medium', '#5', '45%'],
                    ['Meditation Bundle ($7.99)', 'FUTURE', '$64', 'Stripe + Audio', 'Low', '#7', '35%'],
                    ['Brand Campaigns', 'FUTURE', '$200', 'Ad system + Legal', 'High', '#8', '25%'],
                    ['Data Insights / Research', 'FUTURE', '$500', 'API + Legal', 'High', '#9', '15%'],
                  ].map(([model, status, mrr, integration, risk, priority, ready]) => {
                    const statusColor = status === 'ACTIVE' ? GREEN : status === 'PLANNED' ? PROJ : '#5A5A84';
                    const riskColor = risk === 'Low' ? GREEN : risk === 'Medium' ? PROJ : RED;
                    return (
                      <tr key={model as string} className="hover:bg-white/[0.02]">
                        <td className="py-1.5 pr-4 text-dc-text font-medium">{model}</td>
                        <td className="py-1.5 pr-4">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ color: statusColor, background: `${statusColor}18` }}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4 font-mono" style={{ color: mrr === '—' ? '#5A5A84' : GREEN }}>
                          {mrr}
                        </td>
                        <td className="py-1.5 pr-4 text-dc-muted">{integration}</td>
                        <td className="py-1.5 pr-4 font-bold" style={{ color: riskColor }}>{risk}</td>
                        <td className="py-1.5 pr-4 text-dc-muted">{priority}</td>
                        <td className="py-1.5 font-mono" style={{ color: ready === '✓' ? GREEN : PROJ }}>{ready}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Section 5: Subscription Analytics + Conversion Funnel ─────── */}
            <SectionHeading>Subscription Analytics &amp; Conversion Funnel</SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Subscription metrics */}
              <div className="dc-card p-5 space-y-3">
                <h3 className="text-dc-text text-sm font-bold">Subscription Metrics</h3>
                <table className="w-full text-[11px]">
                  <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {[
                      ['Free Users', us ? String(us.total_users) : '569', false],
                      ['Trial Users', '18', true],
                      ['Premium Users', '28', true],
                      ['Cancelled', '0', false],
                      ['Trial-to-Paid Rate', '62%', true],
                      ['Monthly Churn', '3.2%', true],
                      ['Avg. Subscription Length', '8.4 mo', true],
                      ['Best Segment', 'Lucid Seekers', false],
                    ].map(([label, value, proj]) => (
                      <tr key={label as string}>
                        <td className="py-1.5 text-dc-muted">{label as string}</td>
                        <td className="py-1.5 text-right font-mono font-bold text-dc-text">
                          {proj ? <span style={{ color: PROJ }}>⚡ {value as string}</span> : (value as string)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Conversion funnel */}
              <div className="dc-card p-5 space-y-3">
                <h3 className="text-dc-text text-sm font-bold">Conversion Funnel</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Visitors (est)', value: 5000, pct: 100, color: CYAN },
                    { label: 'Registered', value: 569, pct: 11.4, color: CYAN },
                    { label: 'Active Dreamers', value: 284, pct: 50, color: GREEN },
                    { label: 'AI Analysis Used', value: 147, pct: 26, color: PURPLE },
                    { label: 'Trial Started', value: 18, pct: 3.2, color: PROJ },
                    { label: 'Premium', value: 28, pct: 4.9, color: PINK },
                  ].map(row => (
                    <div key={row.label} className="space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-dc-muted text-[10px]">{row.label}</span>
                        <span className="text-[10px] font-bold font-mono" style={{ color: row.color }}>
                          {row.value.toLocaleString()} ({row.pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-dc-bg rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${row.pct}%`, background: row.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Section 6: AI Report Monetization ───────────────────────── */}
            <SectionHeading>AI Report Monetization</SectionHeading>
            <div className="dc-card p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: 'Deep Dream Report', price: '$9.99', intent: 28, est: '$16/mo' },
                  { name: 'Archetype Profile Report', price: '$7.99', intent: 34, est: '$19/mo' },
                  { name: 'Monthly Personality Report', price: '$4.99/mo', intent: 22, est: '$12/mo' },
                  { name: 'Relationship Dream Analysis', price: '$12.99', intent: 18, est: '$11/mo' },
                  { name: 'Lucid Coaching Report', price: '$19.99', intent: 15, est: '$14/mo' },
                  { name: 'Nightmare Therapy Report', price: '$9.99', intent: 21, est: '$12/mo' },
                ].map(r => (
                  <div
                    key={r.name}
                    className="rounded-lg p-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-dc-text text-[11px] font-bold leading-tight flex-1">{r.name}</p>
                      <span className="text-[10px] font-mono shrink-0" style={{ color: GREEN }}>{r.price}</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-dc-muted">Purchase intent</span>
                        <span style={{ color: PROJ }} className="font-bold">{r.intent}%</span>
                      </div>
                      <div className="h-1.5 bg-dc-bg rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.intent}%`, background: PROJ }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dc-muted text-[9px]">Est. revenue</span>
                      <span className="text-[10px] font-bold font-mono" style={{ color: VIOLET }}>⚡ {r.est}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 7: Business AI Advisor ──────────────────────────── */}
            <SectionHeading>Business AI Advisor</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  insight: 'Lucid dream users (2.8% of base) show 3.2× higher premium conversion probability.',
                  impact: 'HIGH', confidence: 91,
                  action: 'Target with AI Report pack first',
                  lift: '+$48/mo', liftColor: GREEN,
                },
                {
                  insight: 'Users with 5+ saved dreams (12% of base) are strong premium candidates.',
                  impact: 'HIGH', confidence: 88,
                  action: 'Trigger premium upsell at dream #5',
                  lift: '+$112/mo', liftColor: GREEN,
                },
                {
                  insight: 'Nightmare-heavy users show 2.1× higher intent for deep AI reports.',
                  impact: 'MEDIUM', confidence: 79,
                  action: 'Create nightmare therapy report product',
                  lift: '+$32/mo', liftColor: PROJ,
                },
                {
                  insight: 'Do not enable broad ads yet — brand safety score needs improvement.',
                  impact: 'HIGH', confidence: 95,
                  action: 'Complete safety checks before ad launch',
                  lift: 'Risk avoided', liftColor: RED,
                },
                {
                  insight: 'Launch AI Report packs BEFORE subscription — purchase intent is 34% vs 4.9% for premium.',
                  impact: 'HIGH', confidence: 87,
                  action: 'Go to market with report packs first',
                  lift: '+$48/mo', liftColor: GREEN,
                },
              ].map((item, i) => {
                const impactColor = item.impact === 'HIGH' ? RED : PROJ;
                return (
                  <div
                    key={i}
                    className="dc-card p-4 space-y-3"
                    style={{ borderLeft: `3px solid ${impactColor}` }}
                  >
                    <p className="text-dc-text text-[11px] leading-snug">{item.insight}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ color: impactColor, background: `${impactColor}18` }}
                      >
                        {item.impact}
                      </span>
                      <span className="text-dc-muted text-[9px]">Confidence:</span>
                      <span className="text-[9px] font-bold font-mono" style={{ color: CYAN }}>{item.confidence}%</span>
                    </div>
                    <div
                      className="rounded px-2.5 py-1.5 text-[10px] space-y-0.5"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <p className="text-dc-muted">Action: <span className="text-dc-text font-medium">{item.action}</span></p>
                      <p className="text-dc-muted">
                        Expected lift: <span className="font-bold" style={{ color: item.liftColor }}>{item.lift}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Section 8: 30/60/90 Day Forecast ────────────────────────── */}
            <SectionHeading>30 / 60 / 90 Day Forecast</SectionHeading>
            <div className="dc-card p-4 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-dc-muted uppercase tracking-wider">
                    <th className="text-left pb-2 pr-4 font-bold">Period</th>
                    <th className="text-left pb-2 pr-4 font-bold">Scenario</th>
                    <th className="text-right pb-2 pr-4 font-bold">Users</th>
                    <th className="text-right pb-2 pr-4 font-bold">MRR</th>
                    <th className="text-right pb-2 pr-4 font-bold">Premium</th>
                    <th className="text-right pb-2 pr-4 font-bold">AI Reports</th>
                    <th className="text-right pb-2 font-bold">Churn</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {[
                    { period: '30 days', scenario: 'Optimistic',   color: GREEN, users: 650, mrr: '$420', premium: 42, reports: 8, churn: '4%' },
                    { period: '',        scenario: 'Realistic',     color: PROJ,  users: 600, mrr: '$353', premium: 28, reports: 6, churn: '3.2%' },
                    { period: '',        scenario: 'Conservative',  color: RED,   users: 570, mrr: '$180', premium: 14, reports: 4, churn: '2%' },
                    { period: '60 days', scenario: 'Optimistic',   color: GREEN, users: 820, mrr: '$680', premium: 68, reports: 12, churn: '5%' },
                    { period: '',        scenario: 'Realistic',     color: PROJ,  users: 720, mrr: '$520', premium: 45, reports: 9, churn: '3.8%' },
                    { period: '',        scenario: 'Conservative',  color: RED,   users: 610, mrr: '$280', premium: 22, reports: 6, churn: '2.5%' },
                    { period: '90 days', scenario: 'Optimistic',   color: GREEN, users: 1100, mrr: '$1,240', premium: 110, reports: 18, churn: '6%' },
                    { period: '',        scenario: 'Realistic',     color: PROJ,  users: 900,  mrr: '$840',   premium: 72,  reports: 14, churn: '4.5%' },
                    { period: '',        scenario: 'Conservative',  color: RED,   users: 650,  mrr: '$420',   premium: 35,  reports: 9,  churn: '3%' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="py-1.5 pr-4 font-bold text-dc-text">{row.period}</td>
                      <td className="py-1.5 pr-4">
                        <span className="font-bold" style={{ color: row.color }}>{row.scenario}</span>
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-right text-dc-text">{row.users.toLocaleString()}</td>
                      <td className="py-1.5 pr-4 font-mono text-right font-bold" style={{ color: row.color }}>{row.mrr}</td>
                      <td className="py-1.5 pr-4 font-mono text-right text-dc-text">{row.premium}</td>
                      <td className="py-1.5 pr-4 font-mono text-right text-dc-text">{row.reports}</td>
                      <td className="py-1.5 font-mono text-right" style={{ color: RED }}>{row.churn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Section 9: Unit Economics ────────────────────────────────── */}
            <SectionHeading>Unit Economics</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiCard label="CAC" value="$1.20" sub="Customer acq. cost" color={CYAN} projected />
              <KpiCard label="LTV" value="$18.40" sub="Avg lifetime value" color={VIOLET} projected />
              <KpiCard label="LTV / CAC" value="15.3×" sub="Excellent > 3×" color={GREEN} projected />
              <KpiCard label="Payback Period" value="1.9 mo" sub="< 12 mo target" color={GREEN} projected />
              <KpiCard label="Gross Margin" value="87%" sub="After AI + infra" color={GREEN} projected />
              <KpiCard label="Rev / Active User" value="$1.24" sub="Per MAU / mo" color={PROJ} projected />
              <KpiCard label="AI Cost / Analysis" value="$0.003" sub="Per report gen." color={CYAN} />
              <KpiCard label="Cost / User / Mo" value="$0.18" sub="Infra per user" color={CYAN} />
              <KpiCard label="AI Cost Today" value="$2.84" sub="Total current spend" color={ORANGE} />
              <KpiCard label="Infra Est." value="$45/mo" sub="Current infra spend" color={ORANGE} />
            </div>

            {/* ── Section 10: Content Monetization ────────────────────────── */}
            <SectionHeading>Content Monetization by Category</SectionHeading>
            <div className="dc-card p-4 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-dc-muted uppercase tracking-wider">
                    {['Category', 'Engagement', 'Save Rate', 'Report Risk', 'Rev. Potential', 'Suggested Monetization'].map(h => (
                      <th key={h} className="text-left pb-2 pr-4 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {[
                    { cat: 'Lucid', eng: 'Very High', save: '24%', risk: 'Low', potential: '★★★★★', mono: 'Premium upsell + coaching', potColor: GREEN },
                    { cat: 'Beautiful', eng: 'High', save: '18%', risk: 'Low', potential: '★★★★☆', mono: 'Creator boost + featured', potColor: GREEN },
                    { cat: 'Nightmare', eng: 'High', save: '12%', risk: 'Medium', potential: '★★★★★', mono: 'Therapy report pack', potColor: PINK },
                    { cat: 'Symbolic', eng: 'Medium', save: '22%', risk: 'Low', potential: '★★★★☆', mono: 'Archetype report', potColor: VIOLET },
                    { cat: 'Normal', eng: 'Medium', save: '8%', risk: 'Low', potential: '★★★☆☆', mono: 'Base engagement', potColor: PROJ },
                    { cat: 'Spiritual', eng: 'High', save: '26%', risk: 'Low', potential: '★★★★☆', mono: 'Meditation bundle', potColor: VIOLET },
                  ].map(row => {
                    const engColor = row.eng === 'Very High' ? GREEN : row.eng === 'High' ? CYAN : PROJ;
                    const riskColor = row.risk === 'Low' ? GREEN : row.risk === 'Medium' ? PROJ : RED;
                    return (
                      <tr key={row.cat} className="hover:bg-white/[0.02]">
                        <td className="py-1.5 pr-4 text-dc-text font-bold">{row.cat}</td>
                        <td className="py-1.5 pr-4 font-bold" style={{ color: engColor }}>{row.eng}</td>
                        <td className="py-1.5 pr-4 font-mono text-dc-text">{row.save}</td>
                        <td className="py-1.5 pr-4 font-bold" style={{ color: riskColor }}>{row.risk}</td>
                        <td className="py-1.5 pr-4" style={{ color: row.potColor }}>{row.potential}</td>
                        <td className="py-1.5 text-dc-muted">{row.mono}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Section 11: Real Platform Metrics (preserved) ────────────── */}
            <SectionHeading>Platform Growth — Live Data</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard label="Total Users"     value={us?.total_users  ?? '—'} color={CYAN} />
              <KpiCard label="Active Users"    value={us?.active_users ?? '—'} color={GREEN} />
              <KpiCard label="New (30d)"       value={us?.new_30d      ?? '—'} color={PROJ} />
              <KpiCard label="MAU"             value={us?.mau_30d      ?? '—'} color={PURPLE} />
              <KpiCard label="Total Dreams"    value={ds?.total_dreams ?? '—'} color={CYAN} />
              <KpiCard label="Dreams (30d)"    value={ds?.dreams_30d   ?? '—'} color={GREEN} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KpiCard
                label="Total Interactions"
                value={es?.total_interactions ?? '—'}
                sub="Likes + saves + comments"
                color={PURPLE}
              />
              <KpiCard
                label="Avg Interactions / Dream"
                value={es ? Number(es.avg_interactions_per_dream).toFixed(1) : '—'}
                sub="Avg viral coefficient"
                color={CYAN}
              />
              <KpiCard
                label="Viral Dreams (5+)"
                value={es?.viral_dreams ?? '—'}
                sub="Dreams with 5+ interactions"
                color={PROJ}
              />
            </div>

            {/* ── Section 11: Growth Chart + Top Engagers ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GrowthChart rows={data.growthTrend} />
              <TopEngagersPanel rows={data.topEngagers} />
            </div>

            <p className="text-dc-muted/50 text-[10px] text-right font-mono">
              Computed at {new Date(data.computedAt).toLocaleString('en-US')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
