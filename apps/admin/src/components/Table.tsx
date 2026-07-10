import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'Veri bulunamadı',
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-dc-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dc-border bg-dc-surface-high">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-dc-muted"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-dc-border last:border-0 bg-dc-surface">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-dc-surface-high rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-dc-muted bg-dc-surface"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-dc-border last:border-0 bg-dc-surface hover:bg-dc-surface-high transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-dc-secondary">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, pages, total, onPage }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-dc-secondary">
      <span>Toplam {total} kayıt</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg bg-dc-surface border border-dc-border disabled:opacity-30 hover:bg-dc-surface-high disabled:cursor-not-allowed transition-colors"
        >
          ← Önceki
        </button>
        <span className="px-3 py-1.5 text-dc-muted">
          {page} / {pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1.5 rounded-lg bg-dc-surface border border-dc-border disabled:opacity-30 hover:bg-dc-surface-high disabled:cursor-not-allowed transition-colors"
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
}
