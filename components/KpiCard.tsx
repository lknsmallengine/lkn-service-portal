export function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="subtle small">{label}</div>
      <div className="kpi">{value}</div>
    </div>
  );
}
