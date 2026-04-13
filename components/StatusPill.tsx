export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let className = 'status neutral';
  if (normalized.includes('estimate') || normalized.includes('waiting')) className = 'status warn';
  if (normalized.includes('repair') || normalized.includes('completed') || normalized.includes('approved')) className = 'status';
  return <span className={className}>{status}</span>;
}
