import Header from '../components/Header';

const ROLES = [
  { id: 'super_admin',     label: 'Süper Admin',      color: 'text-dc-primary' },
  { id: 'admin',           label: 'Admin',             color: 'text-purple-400' },
  { id: 'moderator',       label: 'Moderatör',         color: 'text-dc-warning' },
  { id: 'analyst',         label: 'Analist',           color: 'text-dc-success' },
  { id: 'growth_manager',  label: 'Büyüme Müdürü',    color: 'text-orange-400' },
  { id: 'support_agent',   label: 'Destek Ajanı',      color: 'text-sky-400' },
  { id: 'finance_manager', label: 'Finans Müdürü',     color: 'text-emerald-400' },
];

const PERMISSION_GROUPS = [
  {
    label: 'Kullanıcı Yönetimi',
    perms: [
      { id: 'users.view',         label: 'Kullanıcıları Görüntüle' },
      { id: 'users.edit',         label: 'Kullanıcı Düzenle' },
      { id: 'users.ban',          label: 'Ban Uygula' },
      { id: 'users.delete',       label: 'Kullanıcı Sil' },
    ],
  },
  {
    label: 'İçerik Yönetimi',
    perms: [
      { id: 'dreams.view',        label: 'Rüyaları Görüntüle' },
      { id: 'dreams.hide',        label: 'Rüya Gizle' },
      { id: 'dreams.feature',     label: 'Öne Çıkar' },
      { id: 'dreams.delete',      label: 'Rüya Sil' },
    ],
  },
  {
    label: 'Moderasyon',
    perms: [
      { id: 'reports.view',       label: 'Raporları Gör' },
      { id: 'reports.resolve',    label: 'Rapor Çöz' },
      { id: 'moderation.full',    label: 'Tam Moderasyon' },
    ],
  },
  {
    label: 'Analitik',
    perms: [
      { id: 'analytics.view',     label: 'Analitikleri Gör' },
      { id: 'analytics.export',   label: 'Dışa Aktar' },
      { id: 'community.health',   label: 'Topluluk Sağlığı' },
    ],
  },
  {
    label: 'Çalışan & Sistem',
    perms: [
      { id: 'employees.view',     label: 'Çalışanları Gör' },
      { id: 'employees.manage',   label: 'Çalışan Yönet' },
      { id: 'system.settings',    label: 'Sistem Ayarları' },
      { id: 'system.logs',        label: 'Admin Logları' },
    ],
  },
  {
    label: 'Gelir & Büyüme',
    perms: [
      { id: 'revenue.view',       label: 'Gelir Görüntüle' },
      { id: 'campaigns.manage',   label: 'Kampanya Yönet' },
      { id: 'advertising.manage', label: 'Reklam Yönet' },
    ],
  },
];

// Permission matrix — which roles have which permissions
const MATRIX: Record<string, Record<string, boolean>> = {
  'users.view':         { super_admin: true,  admin: true,  moderator: true,  analyst: true,  growth_manager: false, support_agent: true,  finance_manager: false },
  'users.edit':         { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'users.ban':          { super_admin: true,  admin: true,  moderator: true,  analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'users.delete':       { super_admin: true,  admin: false, moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'dreams.view':        { super_admin: true,  admin: true,  moderator: true,  analyst: true,  growth_manager: true,  support_agent: true,  finance_manager: false },
  'dreams.hide':        { super_admin: true,  admin: true,  moderator: true,  analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'dreams.feature':     { super_admin: true,  admin: true,  moderator: true,  analyst: false, growth_manager: true,  support_agent: false, finance_manager: false },
  'dreams.delete':      { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'reports.view':       { super_admin: true,  admin: true,  moderator: true,  analyst: true,  growth_manager: false, support_agent: true,  finance_manager: false },
  'reports.resolve':    { super_admin: true,  admin: true,  moderator: true,  analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'moderation.full':    { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'analytics.view':     { super_admin: true,  admin: true,  moderator: false, analyst: true,  growth_manager: true,  support_agent: false, finance_manager: true  },
  'analytics.export':   { super_admin: true,  admin: true,  moderator: false, analyst: true,  growth_manager: false, support_agent: false, finance_manager: true  },
  'community.health':   { super_admin: true,  admin: true,  moderator: true,  analyst: true,  growth_manager: true,  support_agent: false, finance_manager: false },
  'employees.view':     { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'employees.manage':   { super_admin: true,  admin: false, moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'system.settings':    { super_admin: true,  admin: false, moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'system.logs':        { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: false, support_agent: false, finance_manager: false },
  'revenue.view':       { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: true,  support_agent: false, finance_manager: true  },
  'campaigns.manage':   { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: true,  support_agent: false, finance_manager: false },
  'advertising.manage': { super_admin: true,  admin: true,  moderator: false, analyst: false, growth_manager: true,  support_agent: false, finance_manager: false },
};

export default function RolePermissions() {
  return (
    <div className="section-system relative">
      <Header
        title="Rol & Yetki Matrisi"
        subtitle="7 rol × tüm özellikler — görsel yetki haritası"
        section="system"
        actions={
          <span className="px-3 py-1.5 text-xs font-bold bg-dc-warning/10 border border-dc-warning/30 text-dc-warning rounded-lg">
            Görsel — Salt Okunur
          </span>
        }
      />

      <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="border-b border-dc-border bg-dc-surface-high">
          <div className="grid gap-0" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
            <div className="px-4 py-3 text-[10px] font-bold text-dc-muted uppercase tracking-widest">
              Yetki
            </div>
            {ROLES.map(r => (
              <div key={r.id} className="px-2 py-3 text-center border-l border-dc-border">
                <p className={`text-[10px] font-bold ${r.color} truncate`}>{r.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Permission rows */}
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-4 py-2 bg-dc-bg/60 border-b border-dc-border">
              <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">{group.label}</p>
            </div>
            {group.perms.map((perm) => (
              <div
                key={perm.id}
                className="border-b border-dc-border last:border-0 hover:bg-white/2 transition-colors"
                style={{ display: 'grid', gridTemplateColumns: '200px repeat(7, 1fr)' }}
              >
                <div className="px-4 py-3 flex items-center">
                  <span className="text-dc-secondary text-xs">{perm.label}</span>
                </div>
                {ROLES.map(r => {
                  const has = MATRIX[perm.id]?.[r.id] ?? false;
                  return (
                    <div key={r.id} className="border-l border-dc-border flex items-center justify-center py-3">
                      {has ? (
                        <span className="w-5 h-5 rounded-full bg-dc-success/20 border border-dc-success/40 flex items-center justify-center text-dc-success text-[10px] font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-dc-bg border border-dc-border flex items-center justify-center text-dc-muted text-[10px]">
                          —
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-5 bg-dc-surface border border-dc-border rounded-xl p-5">
        <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-3">Rol Açıklamaları</p>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(r => (
            <div key={r.id} className="flex items-center gap-2.5 py-2 border-b border-dc-border last:border-0">
              <span className={`text-xs font-bold ${r.color} w-32 shrink-0`}>{r.label}</span>
              <span className="text-dc-muted text-[11px]">
                {r.id === 'super_admin'     && 'Tüm yetkiler — sistem sahibi'}
                {r.id === 'admin'           && 'Kullanıcı, içerik ve moderasyon yönetimi'}
                {r.id === 'moderator'       && 'İçerik inceleme ve rapor yönetimi'}
                {r.id === 'analyst'         && 'Analitik ve raporlama erişimi'}
                {r.id === 'growth_manager'  && 'Büyüme, kampanya ve reklam yönetimi'}
                {r.id === 'support_agent'   && 'Kullanıcı desteği ve ticket yönetimi'}
                {r.id === 'finance_manager' && 'Gelir, raporlama ve finansal veriler'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
