
import { approveEstimate, addChecklistTaskAction, addCommunicationLogEntry, addTimelineEntry, requestCallbackAction, toggleChecklistTaskAction } from '@/lib/actions';
import { getEstimateLineItems, getLatestCallbackRequest, getPickupStopByRequestId, getRequestById, getRequestCommunications, getRequestMedia, getRequestTaskChecklist, getRequestTimeline, getRequestProfitRowById } from '@/lib/data';
import { StatusPill } from '@/components/StatusPill';
import { MediaGallery } from '@/components/MediaGallery';
import { getCurrentRoleName } from '@/lib/auth';
import { notFound } from 'next/navigation';

export default async function RequestDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { success?: string; error?: string };
}) {
  const roleName = await getCurrentRoleName();
  const isStaff = ['admin', 'service_manager', 'service_writer'].includes(roleName);
  const [request, media, timeline, communications, pickupStop, estimateLineItems, callbackRequest, profitRow, checklistItems] = await Promise.all([
    getRequestById(params.id),
    getRequestMedia(params.id),
    getRequestTimeline(params.id),
    getRequestCommunications(params.id),
    getPickupStopByRequestId(params.id),
    getEstimateLineItems(params.id),
    getLatestCallbackRequest(params.id),
    getRequestProfitRowById(params.id),
    getRequestTaskChecklist(params.id)
  ]);
  if (!request) return notFound();

  const estimateTotal = estimateLineItems.length
    ? estimateLineItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
    : request.estimate_total || 0;

  return (
    <div className="grid grid-2">
      <section className="card">
        <div className="header">
          <div>
            <div className="badge">{request.request_number}</div>
            <h2 style={{ marginBottom: 0 }}>{request.equipment_name}</h2>
          </div>
          <StatusPill status={request.status} />
        </div>
        {searchParams?.success ? <div className="badge" style={{ marginBottom: 12 }}>Success: {searchParams.success}</div> : null}
        {searchParams?.error ? <div className="badge" style={{ marginBottom: 12, background: '#4a1d1d' }}>Error: {searchParams.error}</div> : null}
        <p className="subtle">{request.issue_description}</p>

        {isStaff && profitRow ? (
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <strong>Request profitability snapshot</strong>
            <div className="grid grid-4" style={{ marginTop: 10 }}>
              <div><div className="small subtle">Revenue</div><strong>${profitRow.total_revenue.toFixed(2)}</strong></div>
              <div><div className="small subtle">Gross profit</div><strong>${profitRow.gross_profit.toFixed(2)}</strong></div>
              <div><div className="small subtle">Gross margin</div><strong>{profitRow.gross_margin_percent.toFixed(1)}%</strong></div>
              <div><div className="small subtle">Parts margin</div><strong>${profitRow.parts_margin.toFixed(2)}</strong></div>
            </div>
            <div className="small subtle" style={{ marginTop: 10 }}>Labor margin ${profitRow.labor_margin.toFixed(2)} • Fees ${profitRow.fees.toFixed(2)} • Discounts ${profitRow.discounts.toFixed(2)} • Tax ${profitRow.tax.toFixed(2)}</div>
          </div>
        ) : null}
        {isStaff ? (
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <div className="header" style={{ alignItems: 'flex-start' }}>
              <div>
                <strong>Internal task checklist</strong>
                <div className="small subtle" style={{ marginTop: 6 }}>Track shop-side follow-ups, approvals, and delivery prep without losing steps. Build 23 can auto-seed template tasks based on request type.</div>
              </div>
            </div>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              {checklistItems.length ? checklistItems.map((item) => (
                <form key={item.id} action={toggleChecklistTaskAction} className="card" style={{ padding: 12 }}>
                  <input type="hidden" name="task_id" value={item.id} />
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="title" value={item.title} />
                  <input type="hidden" name="make_complete" value={item.is_complete ? 'false' : 'true'} />
                  <div className="header">
                    <div>
                      <strong>{item.title}</strong>
                      <div className="small subtle">{item.assigned_role || 'unassigned role'} • {item.is_complete ? 'Completed' : 'Open task'}{item.completed_by ? ` • ${item.completed_by}` : ''}</div>
                    </div>
                    <button className="btn ghost" type="submit">{item.is_complete ? 'Re-open' : 'Complete'}</button>
                  </div>
                </form>
              )) : <div className="small subtle">No checklist items yet.</div>}
            </div>
            <form action={addChecklistTaskAction} className="stack-sm" style={{ marginTop: 14 }}>
              <input type="hidden" name="request_id" value={request.id} />
              <input type="hidden" name="request_number" value={request.request_number} />
              <input name="title" placeholder="Add internal task" />
              <select name="assigned_role" defaultValue="service_writer">
                <option value="service_writer">service_writer</option>
                <option value="service_manager">service_manager</option>
                <option value="driver">driver</option>
                <option value="tech">tech</option>
                <option value="admin">admin</option>
              </select>
              <button className="btn ghost" type="submit">Add checklist task</button>
            </form>
          </div>
        ) : null}

        {pickupStop ? (
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <strong>Pickup / delivery status</strong>
            <div className="small subtle" style={{ marginTop: 8 }}>
              {pickupStop.stop_type === 'pickup' ? 'Pickup' : 'Delivery'} • {pickupStop.route_status}
              {pickupStop.route_sequence ? ` • Stop #${pickupStop.route_sequence}` : ''}
            </div>
            <div className="small subtle">
              {pickupStop.route_date || 'Date pending'} {pickupStop.stop_window ? `• ${pickupStop.stop_window}` : ''}
            </div>
            <div className="small subtle">{pickupStop.address || 'Address pending'}</div>
            {pickupStop.driver_name ? <div className="small subtle">Driver: {pickupStop.driver_name}</div> : null}
          </div>
        ) : request.pickup_required ? (
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <strong>Pickup / delivery status</strong>
            <div className="small subtle" style={{ marginTop: 8 }}>Pickup requested. Your route stop has not been scheduled yet.</div>
          </div>
        ) : null}
        <div className="grid">
          <div className="card" style={{ padding: 14 }}>
            <strong>Request history</strong>
            <table className="table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.created_at).toLocaleString()}</td>
                    <td>{event.event_type}</td>
                    <td>{event.status || '—'}</td>
                    <td>{event.created_by || 'LKN team'}</td>
                    <td>{event.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isStaff ? (
              <form action={addTimelineEntry} className="stack-sm" style={{ marginTop: 14 }}>
                <input type="hidden" name="request_id" value={request.id} />
                <input type="hidden" name="request_number" value={request.request_number} />
                <strong>Add timeline entry</strong>
                <div className="form-row">
                  <input name="event_type" placeholder="status_changed or tech_note" defaultValue="tech_note" />
                  <input name="status" placeholder="Optional status" />
                </div>
                <textarea name="note" rows={3} placeholder="Internal or customer-facing timeline note" />
                <select name="visibility" defaultValue="internal">
                  <option value="internal">internal</option>
                  <option value="customer">customer</option>
                </select>
                <button className="btn ghost" type="submit">Add timeline entry</button>
              </form>
            ) : null}
          </div>
          <div className="card" style={{ padding: 14 }}>
            <strong>Customer communication log</strong>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              {communications.map((item) => (
                <div key={item.id} className="card" style={{ padding: 12 }}>
                  <div className="small subtle">{new Date(item.created_at).toLocaleString()} • {item.direction} • {item.channel}</div>
                  {item.subject ? <div><strong>{item.subject}</strong></div> : null}
                  <div>{item.message}</div>
                  <div className="small subtle">{item.sent_by || 'LKN team'}</div>
                </div>
              ))}
            </div>
            {isStaff ? (
              <form action={addCommunicationLogEntry} className="stack-sm" style={{ marginTop: 14 }}>
                <input type="hidden" name="request_id" value={request.id} />
                <input type="hidden" name="customer_id" value={request.customer_id || ''} />
                <strong>Add communication entry</strong>
                <div className="form-row">
                  <select name="channel" defaultValue="phone">
                    <option value="sms">sms</option>
                    <option value="email">email</option>
                    <option value="phone">phone</option>
                    <option value="in_app">in_app</option>
                  </select>
                  <select name="direction" defaultValue="outbound">
                    <option value="outbound">outbound</option>
                    <option value="inbound">inbound</option>
                  </select>
                </div>
                <input name="subject" placeholder="Optional subject" />
                <textarea name="message" rows={3} placeholder="What was said, promised, or confirmed" required />
                <button className="btn ghost" type="submit">Add communication log</button>
              </form>
            ) : null}
          </div>
          <div className="card" style={{ padding: 14 }}>
            <strong>Uploaded photos and videos</strong>
            <div style={{ marginTop: 10 }}>
              <MediaGallery items={media} />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Estimate</h2>
        <p className="subtle">Review estimate details and respond quickly so your repair keeps moving.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {estimateLineItems.length ? estimateLineItems.map((line) => (
              <tr key={line.id}>
                <td>{line.line_type}</td>
                <td>{line.description}</td>
                <td>{line.quantity ?? '—'}</td>
                <td>${Number(line.total_price || 0).toFixed(2)}</td>
              </tr>
            )) : (
              <tr>
                <td>labor</td>
                <td>Pending estimate line items</td>
                <td>—</td>
                <td>${estimateTotal.toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3}><strong>Total</strong></td>
              <td><strong>${estimateTotal.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <form action={approveEstimate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <input type="hidden" name="request_id" value={request.id} />
          <input type="hidden" name="request_number" value={request.request_number} />
          <input type="hidden" name="customer_id" value={request.customer_id || ''} />
          <button className="btn" name="decision" value="approved">Approve estimate</button>
          <button className="btn secondary" name="decision" value="declined">Decline</button>
        </form>

        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <strong>Request callback</strong>
          <div className="small subtle" style={{ marginTop: 8 }}>
            {callbackRequest
              ? `Latest request: ${callbackRequest.preferred_contact || 'phone'} • ${callbackRequest.status} • ${new Date(callbackRequest.created_at).toLocaleString()}`
              : 'Need to talk through the estimate or service plan? Request a callback here.'}
          </div>
          <form action={requestCallbackAction} className="stack-sm" style={{ marginTop: 12 }}>
            <input type="hidden" name="request_id" value={request.id} />
            <input type="hidden" name="request_number" value={request.request_number} />
            <input type="hidden" name="customer_id" value={request.customer_id || ''} />
            <input type="hidden" name="redirect_to" value={`/dashboard/requests/${request.id}`} />
            <select name="preferred_contact" defaultValue="phone">
              <option value="phone">Phone call</option>
              <option value="sms">Text message</option>
              <option value="email">Email</option>
            </select>
            <textarea name="note" rows={3} placeholder="Anything you want us to know before we call?" />
            <button className="btn ghost" type="submit">Request callback</button>
          </form>
        </div>
      </section>
    </div>
  );
}
