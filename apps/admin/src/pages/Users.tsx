import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api/admin.api';
import type { AdminUser } from '../types/admin.types';
import Header from '../components/Header';
import Table, { Pagination } from '../components/Table';
import Badge from '../components/Badge';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-dc-border"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-dc-primary/20 border border-dc-border flex items-center justify-center text-xs font-bold text-dc-primary uppercase">
      {name.charAt(0)}
    </div>
  );
}

// ── Sort header button ─────────────────────────────────────────────────────────

type SortKey = 'created' | 'lastLogin' | 'username' | 'email' | 'dreamCount';

function SortBtn({
  label, col, current, dir, onClick,
}: {
  label: string;
  col: SortKey;
  current: SortKey;
  dir: 'asc' | 'desc';
  onClick: (col: SortKey) => void;
}) {
  const active = current === col;
  return (
    <button
      onClick={() => onClick(col)}
      className="flex items-center gap-1 text-left hover:text-dc-text transition-colors"
    >
      {label}
      <span className={`text-xs ${active ? 'text-dc-primary' : 'text-dc-border'}`}>
        {active ? (dir === 'desc' ? '↓' : '↑') : '↕'}
      </span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Users() {
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('');
  const [statusFilter, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [sortBy, setSortBy]   = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [inputVal, setInputVal] = useState('');

  const handleSort = useCallback((col: SortKey) => {
    if (col === sortBy) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  }, [sortBy]);

  const applySearch = useCallback(() => {
    setSearch(inputVal.trim());
    setPage(1);
  }, [inputVal]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter, statusFilter, sortBy, sortDir],
    queryFn: () => fetchUsers(
      page, 20, search,
      roleFilter || undefined,
      (statusFilter || undefined) as 'active' | 'inactive' | undefined,
      sortBy, sortDir,
    ),
    staleTime: 30_000,
  });

  const columns = [
    {
      key: 'user',
      header: 'Kullanıcı',
      render: (r: AdminUser) => (
        <div className="flex items-center gap-3">
          <Avatar src={r.avatarUrl} name={r.username} />
          <div className="min-w-0">
            <Link
              to={`/users/${r.id}`}
              className="text-dc-text font-semibold text-sm hover:text-dc-primary transition-colors block truncate max-w-[160px]"
            >
              {r.displayName || r.username}
            </Link>
            <p className="text-dc-muted text-xs truncate max-w-[160px]">@{r.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: (
        <SortBtn label="E-posta" col="email" current={sortBy} dir={sortDir} onClick={handleSort} />
      ),
      render: (r: AdminUser) => (
        <span className="text-dc-muted text-xs font-mono">{r.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      width: '110px',
      render: (r: AdminUser) => <Badge value={r.role} variant="role" />,
    },
    {
      key: 'status',
      header: 'Durum',
      width: '90px',
      render: (r: AdminUser) => (
        <Badge value={r.isActive ? 'active' : 'inactive'} variant="status" />
      ),
    },
    {
      key: 'dreams',
      header: (
        <SortBtn label="Rüya" col="dreamCount" current={sortBy} dir={sortDir} onClick={handleSort} />
      ),
      width: '70px',
      render: (r: AdminUser) => (
        <span className="text-dc-text text-sm font-semibold">{r.dreamCount}</span>
      ),
    },
    {
      key: 'followers',
      header: 'Takipçi',
      width: '70px',
      render: (r: AdminUser) => (
        <span className="text-dc-muted text-sm">{r.followerCount}</span>
      ),
    },
    {
      key: 'lastLogin',
      header: (
        <SortBtn label="Son Giriş" col="lastLogin" current={sortBy} dir={sortDir} onClick={handleSort} />
      ),
      width: '110px',
      render: (r: AdminUser) => (
        <span className="text-xs text-dc-muted">{formatDate(r.lastLoginAt)}</span>
      ),
    },
    {
      key: 'created',
      header: (
        <SortBtn label="Kayıt" col="created" current={sortBy} dir={sortDir} onClick={handleSort} />
      ),
      width: '110px',
      render: (r: AdminUser) => (
        <span className="text-xs text-dc-muted">{formatDate(r.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (r: AdminUser) => (
        <Link
          to={`/users/${r.id}`}
          className="text-dc-primary text-xs font-medium hover:underline whitespace-nowrap"
        >
          Detay →
        </Link>
      ),
    },
  ];

  const activeUsers   = (data?.items ?? []).filter(u => u.isActive).length;
  const adminUsers    = (data?.items ?? []).filter(u => u.role !== 'user').length;
  const totalDreams   = (data?.items ?? []).reduce((s, u) => s + (u.dreamCount ?? 0), 0);

  return (
    <div className="section-content relative">
      <Header
        title="Kullanıcılar"
        subtitle={`Toplam ${(data?.total ?? 0).toLocaleString()} kullanıcı`}
        section="content"
        actions={
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <span className="text-[9px] font-mono font-bold tracking-widest" style={{ color: '#CC80FF' }}>CONTENT</span>
          </div>
        }
      />

      {/* ── HERO: User overview ─────────────────────────────────────────────── */}
      <div className="os-card p-5 mb-5" style={{
        background: 'linear-gradient(135deg, rgba(18,8,36,0.98) 0%, rgba(10,8,28,0.98) 100%)',
        border:     '1px solid rgba(204,128,255,0.12)',
        boxShadow:  '0 0 40px rgba(204,128,255,0.03), 0 4px 24px rgba(0,0,0,0.5)',
      }}>
        <div className="flex items-stretch gap-5">
          <div className="shrink-0 pr-5" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="os-label mb-1">TOPLAM KULLANICI</p>
            <p className="font-mono font-black text-4xl" style={{ color: '#CC80FF' }}>{(data?.total ?? 0).toLocaleString()}</p>
          </div>
          {[
            { label: 'AKTİF (BU SAYFA)', value: activeUsers,  color: '#38D68A' },
            { label: 'YÖNETİCİ',         value: adminUsers,   color: '#7B6FFF' },
            { label: 'TOPLAM RÜYA',       value: totalDreams,  color: '#FFB800' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col gap-1.5 px-5 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="os-label">{label}</p>
              <p className="font-mono font-black text-2xl" style={{ color }}>{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="flex gap-2 flex-1 min-w-[240px]">
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="İsim, e-posta veya kullanıcı adı..."
            className="flex-1 bg-dc-surface border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm placeholder-dc-muted focus:outline-none focus:border-dc-primary transition-colors"
          />
          <button
            onClick={applySearch}
            className="bg-dc-primary hover:bg-dc-primary/80 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Ara
          </button>
          {search && (
            <button
              onClick={() => { setInputVal(''); setSearch(''); setPage(1); }}
              className="text-dc-muted hover:text-dc-text text-sm px-3 py-2 rounded-lg border border-dc-border transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="bg-dc-surface border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary transition-colors"
        >
          <option value="">Tüm Roller</option>
          <option value="user">Kullanıcı</option>
          <option value="moderator">Moderatör</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Süper Admin</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatus(e.target.value as '' | 'active' | 'inactive'); setPage(1); }}
          className="bg-dc-surface border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary transition-colors"
        >
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif / Banlı</option>
        </select>
      </div>

      <Table
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(r) => r.id}
        loading={isLoading}
      />
      <Pagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPage={setPage}
      />
    </div>
  );
}
