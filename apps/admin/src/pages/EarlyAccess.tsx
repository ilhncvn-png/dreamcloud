import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWaitlist,
  markWaitlistContacted,
  deleteWaitlistEntry,
  waitlistCsvUrl,
} from '../api/waitlist.api';
import type { WaitlistEntry } from '../types/waitlist.types';
import Header from '../components/Header';
import Table, { Pagination } from '../components/Table';

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusPill({ contacted }: { contacted: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border ${
        contacted
          ? 'bg-dc-success/15 text-dc-success border-dc-success/30'
          : 'bg-dc-warning/15 text-dc-warning border-dc-warning/30'
      }`}
    >
      {contacted ? '● İletişime Geçildi' : '● Bekliyor'}
    </span>
  );
}

export default function EarlyAccess() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const qc = useQueryClient();

  const debounce = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as Record<string, number>)['_ea_debounce']);
    (window as unknown as Record<string, number>)['_ea_debounce'] = window.setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['waitlist', page, debouncedSearch],
    queryFn: () => fetchWaitlist(page, 50, debouncedSearch || undefined),
  });

  const toggleContacted = useMutation({
    mutationFn: ({ id, isContacted }: { id: string; isContacted: boolean }) =>
      markWaitlistContacted(id, isContacted),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  const doDelete = useMutation({
    mutationFn: (id: string) => deleteWaitlistEntry(id),
    onSuccess: () => {
      setConfirmDelete(null);
      void qc.invalidateQueries({ queryKey: ['waitlist'] });
    },
  });

  const handleCsvExport = () => {
    const stored = localStorage.getItem('dc_admin_auth');
    if (!stored) return;
    const { accessToken } = JSON.parse(stored) as { accessToken: string };
    const url = waitlistCsvUrl();
    void fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'waitlist.csv';
        link.click();
      });
  };

  const items: WaitlistEntry[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const columns = [
    {
      key: 'email',
      header: 'E-Posta',
      render: (entry: WaitlistEntry) => (
        <span className="font-mono text-sm text-dc-text">{entry.email}</span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      width: '160px',
      render: (entry: WaitlistEntry) => <StatusPill contacted={entry.isContacted} />,
    },
    {
      key: 'createdAt',
      header: 'Kayıt Tarihi',
      width: '140px',
      render: (entry: WaitlistEntry) => (
        <span className="text-dc-text-muted text-sm">{formatDate(entry.createdAt)}</span>
      ),
    },
    {
      key: 'contactedAt',
      header: 'İletişim Tarihi',
      width: '160px',
      render: (entry: WaitlistEntry) => (
        <span className="text-dc-text-muted text-sm">{formatDateTime(entry.contactedAt)}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notlar',
      render: (entry: WaitlistEntry) => (
        <span className="text-dc-text-muted text-sm max-w-[180px] truncate block">
          {entry.notes ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'İşlem',
      width: '180px',
      render: (entry: WaitlistEntry) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              toggleContacted.mutate({ id: entry.id, isContacted: !entry.isContacted });
            }}
            disabled={toggleContacted.isPending}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
              entry.isContacted
                ? 'border-dc-border text-dc-text-muted hover:border-dc-primary hover:text-dc-primary'
                : 'border-dc-success/30 text-dc-success hover:bg-dc-success/10'
            }`}
          >
            {entry.isContacted ? 'Geri Al' : 'Tamamlandı'}
          </button>
          <button
            onClick={() => {
              setConfirmDelete(entry.id);
            }}
            className="text-xs px-2.5 py-1 rounded-md border border-dc-error/30 text-dc-error hover:bg-dc-error/10 transition-colors"
          >
            Sil
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Early Access"
        subtitle={`${total.toLocaleString()} email kayıtlı`}
        actions={
          <button
            onClick={handleCsvExport}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md
                       bg-dc-primary/10 border border-dc-primary/25 text-dc-primary
                       hover:bg-dc-primary/20 transition-colors"
          >
            CSV Export
          </button>
        }
      />

      {/* Search + Stats */}
      <div className="px-6 py-3 border-b border-dc-border flex items-center gap-8">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            debounce(e.target.value);
          }}
          placeholder="E-posta ara..."
          className="bg-dc-surface border border-dc-border rounded-lg px-3 py-2
                     text-sm text-dc-text placeholder-dc-text-muted focus:outline-none
                     focus:border-dc-primary transition-colors w-64"
        />
        <div className="flex gap-6">
          {[
            { label: 'Toplam', value: total },
            { label: 'İletişime Geçildi', value: items.filter((i) => i.isContacted).length },
            { label: 'Bekliyor', value: items.filter((i) => !i.isContacted).length },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-dc-text">{s.value}</div>
              <div className="text-[11px] text-dc-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <Table<WaitlistEntry>
          columns={columns}
          data={items}
          keyExtractor={(e) => e.id}
          loading={isLoading}
          emptyMessage="Henüz kayıt yok."
        />

        {pages > 1 && <Pagination page={page} pages={pages} total={total} onPage={setPage} />}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-dc-surface border border-dc-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-dc-text mb-2">Kaydı Sil</h3>
            <p className="text-sm text-dc-text-muted mb-5">
              Bu e-posta adresi listeden kalıcı olarak silinecek. Onaylıyor musunuz?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 text-sm rounded-lg border border-dc-border text-dc-text-muted hover:text-dc-text transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  doDelete.mutate(confirmDelete);
                }}
                disabled={doDelete.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-dc-error/20 border border-dc-error/40 text-dc-error hover:bg-dc-error/30 transition-colors"
              >
                {doDelete.isPending ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
