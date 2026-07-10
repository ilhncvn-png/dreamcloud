interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
  sub?: string;
}

export default function StatCard({ label, value, icon, accent = 'text-dc-primary', sub }: StatCardProps) {
  return (
    <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dc-muted text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-3xl font-extrabold ${accent}`}>{value}</p>
          {sub && <p className="text-dc-muted text-xs mt-1">{sub}</p>}
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}
