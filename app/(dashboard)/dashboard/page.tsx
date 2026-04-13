
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import { getNotifications, getPickupSchedule, getRequests } from '@/lib/data';
import Link from 'next/link';

export default async function DashboardPage() {
  const [requests, notifications, pickupStops] = await Promise.all([getRequests(), getNotifications(), getPickupSchedule()]);

  return (
    <div className="grid">
      <section className="grid grid-3">
        <KpiCard label="Active requests" value={requests.length} />
        <KpiCard label="Awaiting approval" value={requests.filter(r => r.status.includes('Estimate')).length} />
        <KpiCard label="Unread updates" value={notifications.length} />
      </section>

      <section className="card">
        <div className="header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Active repairs</h2>
            <div className="subtle small">Track jobs, review estimates, and stay out of phone tag.</div>
          </div>
          <Link className="btn" href="/dashboard/requests">Request service</Link>
        </div>
        <div className="grid">
          {requests.map((request) => {
            const stop = pickupStops.find((item) => item.request_id === request.id);
            return (
              <div key={request.id} className="card" style={{ padding: 14 }}>
                <div className="header" style={{ marginBottom: 8 }}>
                  <div>
                    <strong>{request.equipment_name}</strong>
                    <div className="small subtle">{request.request_number}</div>
                  </div>
                  <StatusPill status={request.status} />
                </div>
                <p className="small subtle">{request.issue_description}</p>
                {stop ? <div className="small subtle" style={{ marginBottom: 10 }}>Pickup / delivery: {stop.route_status} {stop.route_date ? `• ${stop.route_date}` : ''}</div> : null}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link className="btn secondary" href={`/dashboard/requests/${request.id}`}>View details</Link>
                  {request.status === 'Estimate Sent' ? <Link className="btn" href={`/dashboard/requests/${request.id}`}>Review estimate</Link> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Recent updates</h2>
        <div className="grid">
          {notifications.map((n) => (
            <div key={n.id} className="card" style={{ padding: 14 }}>
              <strong>{n.title}</strong>
              <p className="small subtle">{n.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
