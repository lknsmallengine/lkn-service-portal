import Link from 'next/link';
import { getDriverNames, getPickupSchedule, getProfile } from '@/lib/data';
import { requireStaff } from '@/lib/auth';

export default async function PrintableRouteSheet({
  searchParams
}: {
  searchParams?: { route_date?: string; driver?: string };
}) {
  await requireStaff();
  const routeDate = searchParams?.route_date || '';
  const driver = searchParams?.driver || '';
  const [loadedStops, profile, driverNames] = await Promise.all([getPickupSchedule(routeDate || undefined), getProfile(), getDriverNames()]);
  const allStops = driver ? loadedStops.filter((stop) => (stop.driver_name || '') === driver) : loadedStops;
  const availableDates = Array.from(new Set((await getPickupSchedule()).map((stop) => stop.route_date).filter(Boolean))).sort();
  const grouped = allStops.reduce<Record<string, typeof allStops>>((acc, stop) => {
    const key = stop.route_date || 'Unscheduled';
    acc[key] ||= [];
    acc[key].push(stop);
    return acc;
  }, {});

  return (
    <main className="container">
      <header className="header no-print">
        <div>
          <div className="badge">Printable route sheet</div>
          <h1 className="title" style={{ marginTop: 10 }}>Pickup / delivery route sheet</h1>
          <div className="small subtle">Prepared for {profile?.full_name || 'LKN staff'} • Use your browser print dialog to print or save as PDF.</div>
          <div className="small subtle">{routeDate ? `Filtered to ${routeDate}` : 'Showing all route days'}{driver ? ` • Driver: ${driver}` : ''}</div>
          <div className="small subtle">Stops: {allStops.length} • Pickups: {allStops.filter((stop) => stop.stop_type === 'pickup').length} • Deliveries: {allStops.filter((stop) => stop.stop_type === 'delivery').length}</div>
        </div>
        <div className="stack-sm" style={{ alignItems: 'flex-end' }}>
          <div className="badge">Print: Cmd/Ctrl + P</div>
          <form method="get" className="form-row">
            <select name="route_date" defaultValue={routeDate}>
              <option value="">All route dates</option>
              {availableDates.map((date) => <option key={date} value={date!}>{date}</option>)}
            </select>
            <select name="driver" defaultValue={driver}><option value="">All drivers</option>{driverNames.map((driverName) => <option key={driverName} value={driverName}>{driverName}</option>)}</select>
            <button className="btn ghost" type="submit">Filter</button>
          </form>
          <Link className="btn ghost" href="/admin">Back to admin</Link>
        </div>
      </header>
      {driver ? <section className="card" style={{ marginTop: 16 }}><strong>Driver summary</strong><div className="small subtle" style={{ marginTop: 8 }}>{driver} has {allStops.length} scheduled stops in this print set.</div></section> : null}
      {Object.entries(grouped).map(([date, items]) => (
        <section className="card" key={date} style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>{date}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>Window</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Equipment</th>
                <th>Address</th>
                <th>Driver</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...items].sort((a, b) => (a.route_sequence || 999) - (b.route_sequence || 999)).map((stop) => (
                <tr key={stop.id}>
                  <td>{stop.route_sequence || '—'}</td>
                  <td>{stop.stop_window || '—'}</td>
                  <td>{stop.stop_type}</td>
                  <td>
                    <strong>{stop.customer_name}</strong>
                    <div className="small subtle">{stop.request_number}</div>
                  </td>
                  <td>{stop.customer_phone || '—'}</td>
                  <td>{stop.equipment_name}</td>
                  <td>{stop.address || '—'}</td>
                  <td>{stop.driver_name || '—'}</td>
                  <td>{stop.route_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {!Object.keys(grouped).length ? <div className="card" style={{ marginTop: 16 }}>No route stops found for this filter.</div> : null}
      <style>{`@media print { .no-print { display: none; } body { background: white; } .container { max-width: none; padding: 0; } .card { box-shadow: none; border: 1px solid #ddd; } }`}</style>
    </main>
  );
}
