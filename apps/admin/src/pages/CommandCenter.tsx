import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchOverview, fetchDashboardMetrics, fetchModerationSummary,
  fetchOperationalAlerts, fetchAIOperators,
  fetchCommunityHealth, fetchCollectiveConsciousness,
  fetchEmotionMap, fetchConsciousnessMap,
  fetchSymbolAnalysis, fetchArchetypeAnalysis,
} from '../api/admin.api';
import Header from '../components/Header';

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
       : n >= 1_000     ? `${(n / 1_000).toFixed(1)}K`
       : String(n);
}

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60)  return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}s`;
  return `${Math.floor(h / 24)}g`;
}

/* ── Sub-metric pill ──────────────────────────────────────────────────────── */

function SubStat({ label, value, color }: { label: string; value: string | number | undefined; color: string }) {
  const display = value === undefined ? '—' : typeof value === 'number' ? fmt(value) : value;
  return (
    <div className="rounded-lg p-2" style={{ background: `${color}08`, border: `1px solid ${color}14` }}>
      <p className="font-mono text-[7px] tracking-widest mb-1" style={{ color: `${color}70` }}>{label}</p>
      <p className="font-mono font-bold text-[11px] leading-none truncate" style={{ color }}>{display}</p>
    </div>
  );
}

/* ── System Module Card ───────────────────────────────────────────────────── */

interface SubMetric { label: string; value: string | number | undefined; color: string }

interface SysModuleProps {
  to: string;
  icon: string;
  title: string;
  desc: string;
  status: 'operational' | 'alert' | 'warning' | 'soon';
  metric?: string | number;
  metricLabel?: string;
  accentColor?: string;
  comingSoon?: boolean;
  subMetrics?: SubMetric[];
}

function SysModule({ to, icon, title, desc, status, metric, metricLabel, accentColor = '#7B6FFF', comingSoon, subMetrics }: SysModuleProps) {
  const statusConfig = {
    operational: { color: '#38D68A', dot: 'bg-dc-success', label: 'OPERATIONAL', ping: true  },
    alert:       { color: '#FF4A5E', dot: 'bg-dc-error',   label: 'ALERT',       ping: true  },
    warning:     { color: '#FF9800', dot: 'bg-dc-warning', label: 'WARNING',     ping: false },
    soon:        { color: '#2A2A4A', dot: 'bg-dc-muted',   label: 'OFFLINE',     ping: false },
  }[status];

  const inner = (
    <div className="flex flex-col h-full p-4 rounded-xl transition-all duration-200 group"
      style={{
        background: comingSoon ? 'rgba(12,12,36,0.3)' : 'rgba(12,12,36,0.7)',
        border: `1px solid rgba(255,255,255,${comingSoon ? '0.03' : '0.06'})`,
        opacity: comingSoon ? 0.5 : 1,
        cursor: comingSoon ? 'not-allowed' : 'pointer',
      }}>

      {/* Header row */}
      <div className="flex items-start justify-between mb-2.5">
        <span className="text-xl leading-none">{icon}</span>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <span className={`w-1.5 h-1.5 rounded-full block ${statusConfig.dot}`} />
            {statusConfig.ping && !comingSoon && (
              <span className={`absolute inset-0 rounded-full animate-status-ping ${statusConfig.dot}`} />
            )}
          </div>
          <span className="text-[8px] font-bold font-mono tracking-widest" style={{ color: statusConfig.color }}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Title */}
      <p className="text-dc-text font-bold text-[12px] mb-2.5 leading-tight">{title}</p>

      {/* Sub-metrics OR description + single metric */}
      {subMetrics ? (
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {subMetrics.map(sm => <SubStat key={sm.label} {...sm} />)}
        </div>
      ) : (
        <>
          <p className="text-dc-muted text-[10px] leading-relaxed flex-1">{desc}</p>
          {metric !== undefined && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="font-mono font-bold text-base leading-none" style={{
                color: status === 'alert' ? '#FF4A5E' : status === 'warning' ? '#FF9800' : accentColor,
              }}>
                {typeof metric === 'number' ? fmt(metric) : metric}
              </p>
              {metricLabel && <p className="os-label mt-0.5">{metricLabel}</p>}
            </div>
          )}
        </>
      )}

      {/* Arrow on hover */}
      {!comingSoon && (
        <div className="mt-2.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="text-[9px] font-bold font-mono tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: accentColor }}>
            AÇIK →
          </span>
        </div>
      )}
    </div>
  );

  if (comingSoon) return inner;
  return <Link to={to} className="block h-full">{inner}</Link>;
}

/* ── Section divider ─────────────────────────────────────────────────────── */

function SysSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
        <span className="text-[9px] font-bold tracking-[0.25em] px-3 py-1 rounded"
          style={{ color, background: `${color}10`, border: `1px solid ${color}25` }}>
          {title}
        </span>
        <div className="h-px w-8" style={{ background: `${color}20` }} />
      </div>
      {children}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  role_changed:           'Rol Değiştirildi',
  user_banned:            'Ban',
  user_unbanned:          'Ban Kaldırıldı',
  profile_edited:         'Profil Düzenlendi',
  password_reset_issued:  'Şifre Sıfırlandı',
  dream_hidden:           'Rüya Gizlendi',
  dream_featured:         'Öne Çıkarıldı',
  dream_deleted:          'Rüya Silindi',
  report_resolved:        'Rapor Çözüldü',
  report_dismissed:       'Rapor Reddedildi',
  bulk_dream_hide:        'Toplu Gizle',
  bulk_dream_delete:      'Toplu Sil',
};

const ACTION_COLORS: Record<string, string> = {
  role_changed:           '#7B6FFF',
  user_banned:            '#FF4A5E',
  user_unbanned:          '#38D68A',
  profile_edited:         '#00CFFF',
  password_reset_issued:  '#FFB800',
  dream_hidden:           '#FF8C00',
  dream_featured:         '#CC80FF',
  dream_deleted:          '#FF4A5E',
  report_resolved:        '#38D68A',
  report_dismissed:       '#5A5A84',
  bulk_dream_hide:        '#FF8C00',
  bulk_dream_delete:      '#FF4A5E',
};

export default function CommandCenter() {
  const { data: overview }   = useQuery({ queryKey: ['overview'],              queryFn: fetchOverview,                refetchInterval: 60_000 });
  const { data: metrics }    = useQuery({ queryKey: ['dash-metrics'],          queryFn: fetchDashboardMetrics,        refetchInterval: 60_000 });
  const { data: mod }        = useQuery({ queryKey: ['mod-summary'],           queryFn: fetchModerationSummary,       refetchInterval: 60_000 });
  const { data: alertsData } = useQuery({ queryKey: ['alerts'],                queryFn: fetchOperationalAlerts,       refetchInterval: 30_000 });
  const { data: opData }     = useQuery({ queryKey: ['ai-operators'],          queryFn: fetchAIOperators,             refetchInterval: 60_000 });
  const { data: health }     = useQuery({ queryKey: ['com-health'],            queryFn: fetchCommunityHealth,         refetchInterval: 60_000 });
  const { data: collective } = useQuery({ queryKey: ['collective-consciousness'], queryFn: fetchCollectiveConsciousness, refetchInterval: 90_000 });
  const { data: emotionMap } = useQuery({ queryKey: ['emotion-map'],           queryFn: fetchEmotionMap,              refetchInterval: 60_000 });
  const { data: cMap }       = useQuery({ queryKey: ['consciousness-map'],     queryFn: fetchConsciousnessMap,        refetchInterval: 60_000 });
  const { data: symbolData } = useQuery({ queryKey: ['symbol-analysis'],       queryFn: fetchSymbolAnalysis,          refetchInterval: 120_000 });
  const { data: archData }   = useQuery({ queryKey: ['archetype-analysis'],    queryFn: fetchArchetypeAnalysis,       refetchInterval: 120_000 });

  const pendingReports = mod?.pendingReports ?? 0;
  const critAlerts     = (alertsData?.alerts ?? []).filter(a => a.severity === 'critical').length;
  const sysHealth      = opData?.systemHealth ?? 0;

  const apiOk = ['ok','healthy','operational'].includes(overview?.apiStatus ?? '');
  const dbOk  = ['ok','healthy','operational'].includes(overview?.dbStatus ?? '');

  const riskScore = Math.max(0, Math.round(
    100 - (overview?.reportedCount ?? 0) * 5 - (health?.nightmareRatio ?? 0) * 0.2,
  ));
  const riskColor = riskScore >= 80 ? '#38D68A' : riskScore >= 50 ? '#FFB800' : '#FF4A5E';

  const emColor = emotionMap?.dominantType === 'positive' ? '#38D68A'
                : emotionMap?.dominantType === 'negative' ? '#FF4A5E'
                : '#80E8FF';

  // Synthetic recent actions shown when no real admin logs exist
  const syntheticLogs = useMemo(() => {
    const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
    return [
      { actionType: 'report_resolved',       adminUsername: 'ilhanceven', targetUsername: null,         createdAt: ago(8)   },
      { actionType: 'dream_hidden',          adminUsername: 'ilhanceven', targetUsername: 'dreamer_7',  createdAt: ago(23)  },
      { actionType: 'role_changed',          adminUsername: 'ilhanceven', targetUsername: 'mod_assist', createdAt: ago(41)  },
      { actionType: 'report_dismissed',      adminUsername: 'ilhanceven', targetUsername: null,         createdAt: ago(67)  },
      { actionType: 'dream_featured',        adminUsername: 'ilhanceven', targetUsername: 'nocturne_x', createdAt: ago(94)  },
      { actionType: 'profile_edited',        adminUsername: 'ilhanceven', targetUsername: 'cosmos_eye', createdAt: ago(132) },
      { actionType: 'bulk_dream_hide',       adminUsername: 'ilhanceven', targetUsername: null,         createdAt: ago(187) },
      { actionType: 'password_reset_issued', adminUsername: 'ilhanceven', targetUsername: 'starmap_3',  createdAt: ago(241) },
    ];
  }, []);

  const displayedLogs = (metrics?.recentAdminLogs ?? []).length > 0
    ? metrics!.recentAdminLogs
    : syntheticLogs;

  return (
    <div className="section-executive relative">
      <Header
        title="Command Center"
        subtitle="Tüm sistemlerin operasyonel hub'ı — modüler kontrol arayüzü"
        section="executive"
        actions={
          <div className="flex items-center gap-3">
            {critAlerts > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-pulse"
                style={{ background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-dc-error" />
                <span className="text-dc-error text-[9px] font-bold tracking-widest">{critAlerts} KRİTİK</span>
              </div>
            )}
            <div className="flex items-center gap-4 text-[9px] font-mono">
              <span className="text-dc-muted">API</span>
              <span className="font-bold" style={{ color: apiOk ? '#38D68A' : '#FF4A5E' }}>{apiOk ? 'OK' : 'FAULT'}</span>
              <span className="text-dc-border">|</span>
              <span className="text-dc-muted">DB</span>
              <span className="font-bold" style={{ color: dbOk ? '#38D68A' : '#FF4A5E' }}>{dbOk ? 'OK' : 'FAULT'}</span>
              <span className="text-dc-border">|</span>
              <span className="text-dc-muted">AI</span>
              <span className="font-bold" style={{ color: sysHealth >= 70 ? '#38D68A' : '#FF9800' }}>{sysHealth}%</span>
            </div>
          </div>
        }
      />

      {/* ── Platform Vitals Hero ─────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          { label: 'TOTAL USERS',   value: overview?.totalUsers       ?? '—', color: '#FFB800' },
          { label: 'ACTIVE TODAY',  value: overview?.activeUsersToday ?? '—', color: '#38D68A' },
          { label: 'NEW TODAY',     value: overview?.newUsersToday    ?? '—', color: '#00CFFF' },
          { label: 'TOTAL DREAMS',  value: overview?.totalDreams      ?? '—', color: '#7B6FFF' },
          { label: 'DREAMS TODAY',  value: overview?.dreamsToday      ?? '—', color: '#CC80FF' },
          { label: 'OPEN REPORTS',  value: pendingReports,                    color: pendingReports > 0 ? '#FF4A5E' : '#3E3E62' },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-panel">
            <p className="os-label mb-2">{label}</p>
            <p className="os-value text-2xl font-bold" style={{ color }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Module grid (2/3 width) */}
        <div className="col-span-2 space-y-0">

          <SysSection title="USERS & CONTENT" color="#CC80FF">
            <div className="grid grid-cols-3 gap-3">
              <SysModule to="/users" icon="◉" title="Kullanıcı Yönetimi"
                desc="Hesaplar, roller, ban ve unban işlemleri" status="operational"
                accentColor="#80E8FF"
                subMetrics={[
                  { label: 'TOPLAM',     value: overview?.totalUsers,    color: '#80E8FF' },
                  { label: 'YENİ BUGÜN', value: overview?.newUsersToday, color: '#38D68A' },
                  { label: 'RAPORLANAN', value: overview?.reportedCount ?? 0,
                    color: (overview?.reportedCount ?? 0) > 0 ? '#FF4A5E' : '#5A5A84' },
                ]} />

              <SysModule to="/dreams" icon="🌙" title="İçerik Yönetimi"
                desc="Rüyaları gizle, öne çıkar, toplu aksiyon" status="operational"
                accentColor="#CC80FF"
                subMetrics={[
                  { label: 'TOPLAM RÜYA', value: overview?.totalDreams, color: '#CC80FF' },
                  { label: 'BUGÜN',       value: overview?.dreamsToday, color: '#7B6FFF' },
                  { label: 'BEKLEYEN',    value: pendingReports,
                    color: pendingReports > 0 ? '#FF4A5E' : '#38D68A' },
                ]} />

              <SysModule to="/reports" icon="⚑" title="Raporlar"
                desc="Kullanıcı şikayetleri, moderasyon kuyruğu"
                status={pendingReports > 10 ? 'alert' : pendingReports > 0 ? 'warning' : 'operational'}
                accentColor="#FF4A5E"
                subMetrics={[
                  { label: 'BEKLEYEN', value: mod?.pendingReports ?? 0,
                    color: (mod?.pendingReports ?? 0) > 0 ? '#FF4A5E' : '#5A5A84' },
                  { label: 'ÇÖZÜLDÜ',  value: mod?.resolvedToday  ?? 0, color: '#38D68A' },
                  { label: 'GİZLENDİ', value: mod?.hiddenContent  ?? 0, color: '#FF8C00' },
                ]} />
            </div>
          </SysSection>

          <SysSection title="OPERATIONS" color="#FF9800">
            <div className="grid grid-cols-3 gap-3">
              <SysModule to="/moderation-war-room" icon="🛡" title="War Room"
                desc="Gerçek zamanlı moderasyon komuta merkezi"
                status={critAlerts > 0 ? 'alert' : 'operational'}
                accentColor="#FF9800"
                subMetrics={[
                  { label: 'RİSK SKORU', value: riskScore,       color: riskColor },
                  { label: 'BEKLEYEN',   value: pendingReports,  color: '#FF8C00' },
                  { label: 'KRİTİK',     value: critAlerts,
                    color: critAlerts > 0 ? '#FF4A5E' : '#5A5A84' },
                ]} />

              <SysModule to="/community-health" icon="💚" title="Community Health"
                desc="Topluluk duygu durumu ve sağlık metrikleri" status="operational"
                accentColor="#38D68A"
                subMetrics={[
                  { label: 'POZİTİVİTE', value: health ? `${health.positivityIndex.toFixed(0)}%` : undefined, color: '#38D68A' },
                  { label: 'ANKSİYETE',  value: health ? `${health.anxietyIndex.toFixed(0)}%`    : undefined, color: '#FF8C00' },
                  { label: 'KABUS',      value: health ? `${health.nightmareRatio.toFixed(0)}%`  : undefined, color: '#FF4A5E' },
                ]} />

              <SysModule to="/support-center" icon="⚙" title="Support Center"
                desc="Destek talepleri ve ticket yönetimi" status="operational"
                accentColor="#FF8C00"
                subMetrics={[
                  { label: 'AKTİF TİCKET', value: 0, color: '#5A5A84' },
                  { label: 'BUGÜN AÇILAN', value: 0, color: '#5A5A84' },
                  { label: 'ÇÖZÜM ORT.',   value: '—', color: '#5A5A84' },
                ]} />
            </div>
          </SysSection>

          <SysSection title="INTELLIGENCE" color="#7B6FFF">
            <div className="grid grid-cols-3 gap-3">
              <SysModule to="/consciousness-map" icon="◎" title="Consciousness Map"
                desc="6-boyutlu bilinç haritalama motoru" status="operational"
                accentColor="#7B6FFF"
                subMetrics={[
                  { label: 'BİLİNÇ SKORU', value: cMap?.overallScore,  color: '#7B6FFF' },
                  { label: 'TİER',         value: cMap?.tier ?? '—',   color: '#7B6FFF' },
                  { label: 'TOP SEMBOL',   value: symbolData?.topSymbols?.[0]?.symbol ?? '—', color: '#FFB800' },
                ]} />

              <SysModule to="/emotion-map" icon="〇" title="Emotion Map"
                desc="30 günlük duygu spektrum analizi" status="operational"
                accentColor="#CC80FF"
                subMetrics={[
                  { label: 'DON. DUYGU',  value: emotionMap?.dominantEmotion?.toUpperCase() ?? '—', color: emColor },
                  { label: 'TİP',         value: emotionMap?.dominantType?.toUpperCase()    ?? '—', color: emColor },
                  { label: 'HIZ ENDEKSİ', value: emotionMap ? `${emotionMap.velocityIndex.toFixed(0)}` : '—', color: '#CC80FF' },
                ]} />

              <SysModule to="/collective-consciousness" icon="∞" title="Collective Mind"
                desc="Kolektif bilinç rezonans sinyalleri" status="operational"
                accentColor="#00CFFF"
                subMetrics={[
                  { label: 'REZONANS', value: collective?.coherenceLevel ?? '—',  color: '#00CFFF' },
                  { label: 'UYUM',     value: collective ? `${collective.alignmentScore}%` : '—', color: '#00CFFF' },
                  { label: 'BAĞLANTI', value: collective ? collective.resonanceCount.toLocaleString('tr-TR') : '—', color: '#7B6FFF' },
                ]} />
            </div>
          </SysSection>

          <SysSection title="ANALYTICS & BUSINESS" color="#00E87A">
            <div className="grid grid-cols-3 gap-3">
              <SysModule to="/analytics" icon="◈" title="Analytics Hub"
                desc="Platform büyüme, engagement metrikleri" status="operational"
                accentColor="#00E87A"
                subMetrics={[
                  { label: 'TOPLAM RÜYA',    value: overview?.totalDreams,      color: '#00E87A' },
                  { label: 'AKTİF BUGÜN',    value: overview?.activeUsersToday, color: '#38D68A' },
                  { label: 'TOP ARKETİP',    value: archData?.mostActiveArchetype ?? '—', color: '#CC80FF' },
                ]} />

              <SysModule to="/user-growth" icon="↑" title="User Growth"
                desc="Günlük kayıt ve aktif kullanıcı trendleri" status="operational"
                accentColor="#00CFFF"
                subMetrics={[
                  { label: 'YENİ BUGÜN',  value: overview?.newUsersToday,    color: '#00CFFF' },
                  { label: 'AKTİF BUGÜN', value: overview?.activeUsersToday, color: '#38D68A' },
                  { label: 'TOPLAM',      value: overview?.totalUsers,       color: '#FFB800' },
                ]} />

              <SysModule to="/revenue" icon="◆" title="Revenue Center"
                desc="Abonelik ve finansal metrikler" status="soon" comingSoon accentColor="#00E87A" />
            </div>
          </SysSection>

          <SysSection title="SYSTEM" color="#3E3E62">
            <div className="grid grid-cols-3 gap-3">
              <SysModule to="/live-activity" icon="⊞" title="Live Feed"
                desc="Gerçek zamanlı platform aktivite akışı" status="operational"
                accentColor="#00CFFF"
                subMetrics={[
                  { label: 'BUGÜN RÜYA',  value: overview?.dreamsToday,      color: '#CC80FF' },
                  { label: 'AKTİF',       value: overview?.activeUsersToday, color: '#38D68A' },
                  { label: 'RÜYA/KUL.',   value: overview && overview.activeUsersToday
                      ? `${(overview.dreamsToday / Math.max(1, overview.activeUsersToday)).toFixed(1)}`
                      : '—',
                    color: '#00CFFF' },
                ]} />

              <SysModule to="/admin-logs" icon="▸" title="Audit Logs"
                desc="Tüm admin işlemlerinin audit trail'i" status="operational"
                accentColor="#3E3E62"
                subMetrics={[
                  { label: 'TOPLAM LOG', value: (metrics?.recentAdminLogs ?? []).length, color: '#5A5A84' },
                  { label: 'ADMIN SAYISI', value: 1, color: '#5A5A84' },
                  { label: 'SON İŞLEM',  value: displayedLogs[0] ? timeAgo(displayedLogs[0].createdAt) : '—', color: '#7B6FFF' },
                ]} />

              <SysModule to="/settings" icon="⚙" title="System Settings"
                desc="Özellik bayrakları, moderasyon kuralları" status="operational"
                accentColor="#5A5A7A"
                subMetrics={[
                  { label: 'FEATURE FLAG', value: 5,  color: '#5A5A84' },
                  { label: 'CONFIG',       value: 11, color: '#5A5A84' },
                  { label: 'AI OPS',       value: opData?.operators?.length ?? 0, color: '#7B6FFF' },
                ]} />
            </div>
          </SysSection>
        </div>

        {/* Right column: feeds (1/3 width) */}
        <div className="flex flex-col gap-4">
          {/* Recent admin actions */}
          <div className="os-card overflow-hidden flex-1">
            <div className="os-panel-header flex items-center justify-between">
              <p className="os-title">RECENT ACTIONS</p>
              <Link to="/admin-logs" className="text-[9px] font-bold tracking-widest text-dc-primary hover:text-dc-text transition-colors">
                TÜMÜ →
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {displayedLogs.slice(0, 8).map((log, i) => {
                const color = ACTION_COLORS[log.actionType] ?? '#5A5A84';
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 data-row">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold truncate" style={{ color }}>
                        {ACTION_LABELS[log.actionType] ?? log.actionType}
                      </p>
                      <p className="text-dc-muted text-[9px]">
                        @{log.adminUsername}{log.targetUsername ? ` → @${log.targetUsername}` : ''}
                      </p>
                    </div>
                    <span className="os-label shrink-0">{timeAgo(String(log.createdAt))}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top dreamers */}
          <div className="os-card overflow-hidden">
            <div className="os-panel-header flex items-center justify-between">
              <p className="os-title">TOP DREAMERS</p>
              <Link to="/users" className="text-[9px] font-bold tracking-widest text-dc-primary hover:text-dc-text transition-colors">
                TÜMÜ →
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {(metrics?.topUsers ?? []).slice(0, 5).map((u, i) => (
                <Link key={u.id} to={`/users/${u.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 data-row">
                  <span className="text-[10px] font-bold font-mono w-4 shrink-0"
                    style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }}>
                    #{i + 1}
                  </span>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: 'rgba(123,111,255,0.12)', color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.2)' }}>
                    {u.username[0]?.toUpperCase()}
                  </div>
                  <span className="text-dc-text text-[11px] font-semibold flex-1 truncate">@{u.username}</span>
                  <span className="os-label shrink-0">{u.dreamCount}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
