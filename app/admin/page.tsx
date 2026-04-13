import Link from 'next/link';
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import {
  getAdminQueueRequests,
  getAllCallbackRequests,
  getAllEstimateLineItems,
  getPickupSchedule,
  getProfile,
  getRetryableSyncLogs,
  getStaffMembers,
  getStaffLinkInvites,
  getSyncLogAudits,
  getStaffQueuePreference,
  getRequestProfitRows,
  getSyncLogs,
  getDriverNames,
  getChecklistTemplates,
  getNotificationTemplates,
  getNotificationSendLogs
} from '@/lib/data';
import { AuthStatus } from '@/components/AuthStatus';
import { getCurrentStaffMember, requireStaff } from '@/lib/auth';
import {
  bulkUpdateRequestStatuses,
  createStaffLinkInviteAction,
  resendStaffLinkInviteAction,
  revokeStaffLinkInviteAction,
  saveChecklistTemplateAction,
  deleteChecklistTemplateAction,
  deleteEstimateLineItem,
  duplicateRouteDayAction,
  retrySyncLogAction,
  saveAdminQueuePreferenceAction,
  saveEstimateLineItem,
  saveStaffMemberAction,
  saveSyncLogDeadLetterNote,
  updateCallbackRequestStatus,
  updateRequestStatus,
  updateSyncLogRetryState,
  upsertPickupStop,
  deactivateStaffMemberAction,
  deleteStaffMemberAction
} from '@/lib/actions';
import { flyntlokRequestFieldMap, outboundFieldMappings } from '@/lib/flyntlok-map';
import { calculateEstimateBreakdown, formatMoney } from '@/lib/estimate-utils';
import { suggestOptimizedRoute } from '@/lib/route-helpers';

const statusOptions = [
  'Request Received',
  'Checked In',
  'Diagnosing',
  'Estimate Sent',
  'Approved',
  'Waiting on Parts',
  'In Repair',
  'Completed',
  'Ready for Pickup',
  'Delivered',
  'Closed'
];


export default async function AdminPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string; route_date?: string; sync_status?: string; sync_provider?: string; callback_status?: string; view?: string };
}) {
  await requireStaff();

  const routeDate = searchParams?.route_date || '';
  const syncStatus = searchParams?.sync_status || 'all';
  const syncProvider = searchParams?.sync_provider || 'all';
  const callbackStatus = searchParams?.callback_status || 'all';
  const savedView = searchParams?.view || 'all';

  const profileForPrefs = await getProfile();
  const [requests, profile, pickupStops, callbackRequests, estimateLineItems, retryableLogs, staffMembers, staffInvites, syncLogAudits, savedQueuePreference, profitRows, syncLogs, currentStaffMember, driverNames, checklistTemplates, notificationTemplates, notificationSendLogs] = await Promise.all([
    getAdminQueueRequests(),
    Promise.resolve(profileForPrefs),
    getPickupSchedule(routeDate || undefined),
    getAllCallbackRequests(),
    getAllEstimateLineItems(),
    getRetryableSyncLogs({ status: syncStatus, provider: syncProvider }),
    getStaffMembers(),
    getStaffLinkInvites(),
    getSyncLogAudits(),
    getStaffQueuePreference(profileForPrefs?.email || null),
    getRequestProfitRows(),
    getSyncLogs(),
    getCurrentStaffMember(),
    getDriverNames(),
    getChecklistTemplates(),
    getNotificationTemplates(),
    getNotificationSendLogs(25)
  ]);

  const savedViews = [
    { key: 'all', label: 'All open', filter: (request: any) => true },
    { key: 'awaiting-approval', label: 'Awaiting approval', filter: (request: any) => request.status === 'Estimate Sent' },
    { key: 'pickup-today', label: 'Pickup required', filter: (request: any) => request.pickup_required },
    { key: 'ready', label: 'Ready for pickup', filter: (request: any) => request.status === 'Ready for Pickup' }
  ];
  const effectiveView = savedView === 'all' && savedQueuePreference ? savedQueuePreference : savedView;
  const activeSavedView = savedViews.find((item) => item.key === effectiveView) || savedViews[0];
  const filteredRequests = requests.filter(activeSavedView.filter);
  const filteredCallbackRequests = callbackRequests.filter((item) => callbackStatus === 'all' ? true : item.status === callbackStatus);
  const pickupRequests = requests.filter((request) => request.pickup_required);
  const routeDates = Array.from(new Set((await getPickupSchedule()).map((stop) => stop.route_date).filter(Boolean))).sort();
  const routeSuggestions = suggestOptimizedRoute(pickupStops);
  const estimateSummaryByRequest = requests.reduce((acc, request) => {
    const items = estimateLineItems.filter((item) => item.request_id === request.id);
    acc[request.id] = calculateEstimateBreakdown(items);
    return acc;
  }, {} as Record<string, ReturnType<typeof calculateEstimateBreakdown>>);

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="badge">Admin operations</div>
          <h1 className="title" style={{ marginTop: 10 }}>Service dashboard</h1>
          <div className="small subtle">Build 25 wires branded templates into live notification paths, adds editable notification templates, sends invite emails, and tightens the admin operations layout for launch prep.</div>
          <div className="small subtle">Signed in as {profile?.email || 'staff user'}{currentStaffMember ? ` • linked to ${currentStaffMember.full_name} (${currentStaffMember.role})` : ' • no linked staff record yet'}</div>
        </div>
        <AuthStatus />
      </header>

      {searchParams?.success ? <div className="badge" style={{ marginBottom: 16 }}>Success: {searchParams.success}</div> : null}
      {searchParams?.error ? <div className="badge" style={{ marginBottom: 16, background: '#4a1d1d' }}>Error: {searchParams.error}</div> : null}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Build 21 operations layer</h2>
            <div className="small subtle">This pass links live auth users to staff records, surfaces request profitability deeper in the workflow, sharpens driver dispatch exports, and adds per-log webhook audit views.</div>
          </div>
          <form action={saveAdminQueuePreferenceAction} className="stack-sm" style={{ minWidth: 260 }}>
            <input type="hidden" name="email" value={profile?.email || ''} />
            <label className="small subtle">Default queue view for {profile?.email || 'staff user'}</label>
            <select name="default_queue_view" defaultValue={activeSavedView.key}>
              {savedViews.map((view) => <option key={view.key} value={view.key}>{view.label}</option>)}
            </select>
            <button className="btn ghost" type="submit">Save default view</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Request profit view</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Labor and parts margin snapshot for the current request queue. Costs use explicit line-item costs when present and fall back to simple operating assumptions when they are not.</div>
          <table className="table">
            <thead><tr><th>Request</th><th>Labor margin</th><th>Parts margin</th><th>Total revenue</th><th>Gross profit</th><th>Gross margin %</th></tr></thead>
            <tbody>
              {profitRows.map((row) => (
                <tr key={row.request_id}>
                  <td><strong>{row.request_number}</strong><div className="small subtle">{row.equipment_name}</div></td>
                  <td>{formatMoney(row.labor_margin)}</td>
                  <td>{formatMoney(row.parts_margin)}</td>
                  <td>{formatMoney(row.total_revenue)}</td>
                  <td><strong>{formatMoney(row.gross_profit)}</strong></td>
                  <td>{row.gross_margin_percent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-4">
        <KpiCard label="Open requests" value={filteredRequests.length} />
        <KpiCard label="Estimate lines" value={estimateLineItems.length} />
        <KpiCard label="Callback requests" value={filteredCallbackRequests.filter((item) => item.status !== 'completed').length} />
        <KpiCard label="Retry queue" value={retryableLogs.length} />
        <KpiCard label="Gross profit queued" value={formatMoney(profitRows.reduce((sum, row) => sum + row.gross_profit, 0))} />
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Request queue</h2>
            <div className="small subtle">Cleaner staff workflow with customer contact info, notes, bulk updates, and saved queue views.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {savedViews.map((view) => (
                <Link key={view.key} className={`btn ${activeSavedView.key === view.key ? '' : 'ghost'}`} href={`/admin?view=${encodeURIComponent(view.key)}`}>{view.label}</Link>
              ))}
            </div>
          </div>
          <form action={bulkUpdateRequestStatuses} className="stack-sm" style={{ minWidth: 280 }}>
            <label className="small subtle">Bulk status update (comma-separated request IDs or numbers)</label>
            <textarea name="request_identifiers" rows={3} placeholder="req_1, LKN-1024" />
            <select name="status" defaultValue="In Repair">
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <textarea name="admin_notes" rows={2} placeholder="Optional note applied to all selected requests" />
            <button className="btn" type="submit">Apply bulk update</button>
          </form>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Equipment</th>
              <th>Status</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <strong>{request.request_number}</strong>
                  <div className="small subtle">{request.customer_address || '—'}</div>
                </td>
                <td>{request.customer_name || '—'}</td>
                <td>
                  <div>{request.customer_phone || '—'}</div>
                  <div className="small subtle">{request.customer_email || '—'}</div>
                </td>
                <td>{request.equipment_name}</td>
                <td><StatusPill status={request.status} /></td>
                <td>
                  <form action={updateRequestStatus} className="stack-sm" style={{ minWidth: 240 }}>
                    <input type="hidden" name="request_id" value={request.id} />
                    <input type="hidden" name="request_number" value={request.request_number} />
                    <input type="hidden" name="customer_id" value={request.customer_id || ''} />
                    <input type="hidden" name="customer_phone" value={request.customer_phone || ''} />
                    <input type="hidden" name="customer_email" value={request.customer_email || ''} />
                    <input type="hidden" name="equipment_name" value={request.equipment_name} />
                    <select name="status" defaultValue={request.status}>
                      {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <textarea name="admin_notes" rows={2} defaultValue={request.admin_notes || ''} placeholder="Optional note" />
                    <button className="btn ghost" type="submit">Save status</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

            <section className="card" style={{ marginTop: 16 }}>
        <div className="header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Notification templates</h2>
            <div className="small subtle">Edit the email templates used by live status updates, route updates, and staff invites. Tokens supported here include {{request_number}}, {{equipment_name}}, {{status}}, {{admin_notes}}, {{route_date}}, {{stop_window}}, {{invite_url}}, and {{role}}.</div>
          </div>
          <div className="badge">Build 25</div>
        </div>
        <div className="grid grid-2">
          {notificationTemplates.map((template) => (
            <form key={template.id} action={saveNotificationTemplateAction} className="card stack-sm">
              <input type="hidden" name="id" value={template.id} />
              <input type="hidden" name="template_key" value={template.template_key} />
              <input type="hidden" name="channel" value={template.channel} />
              <div><strong>{template.template_key}</strong><div className="small subtle">{template.channel}</div></div>
              <input name="subject_template" defaultValue={template.subject_template || ''} placeholder="Subject template" />
              <textarea name="body_template" rows={6} defaultValue={template.body_template} />
              <label className="small subtle"><input type="checkbox" name="active" defaultChecked={template.active !== false} value="true" /> Active</label>
              <button className="btn ghost" type="submit">Save template</button>
            </form>
          ))}
          <form action={saveNotificationTemplateAction} className="card stack-sm">
            <h3 style={{ marginTop: 0 }}>Add template</h3>
            <input name="template_key" placeholder="template key" />
            <select name="channel" defaultValue="email"><option value="email">email</option><option value="sms">sms</option></select>
            <input name="subject_template" placeholder="Subject template" />
            <textarea name="body_template" rows={6} placeholder="HTML or text body with {{tokens}}" />
            <label className="small subtle"><input type="checkbox" name="active" defaultChecked value="true" /> Active</label>
            <button className="btn" type="submit">Create template</button>
          </form>
        </div>
      </section>


      <section className="card" style={{ marginTop: 16 }}>
        <div className="header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Recent notification sends</h2>
            <div className="small subtle">Build 26 adds per-template send logging so you can see what fired, through which channel, and whether it ran in demo or live mode.</div>
          </div>
          <div className="badge">Build 26</div>
        </div>
        <table className="table">
          <thead><tr><th>When</th><th>Template</th><th>Channel</th><th>Recipient</th><th>Status</th></tr></thead>
          <tbody>
            {notificationSendLogs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td><strong>{log.template_key || 'manual'}</strong><div className="small subtle">{log.subject || '—'}</div></td>
                <td>{log.channel}</td>
                <td>{log.recipient || '—'}</td>
                <td>{log.provider_status || log.send_mode || 'queued'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

<section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Staff onboarding and account linking</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Create invite tokens so each staff login can be linked to the correct staff record after signup.</div>
          <form action={createStaffLinkInviteAction} className="stack-sm" style={{ marginBottom: 16 }}>
            <input name="invited_by" defaultValue={currentStaffMember?.full_name || profile?.full_name || 'LKN Admin'} hidden readOnly />
            <div className="form-row">
              <input type="email" name="email" placeholder="staff email" />
              <select name="role" defaultValue="service_writer">
                <option value="admin">admin</option>
                <option value="service_manager">service_manager</option>
                <option value="service_writer">service_writer</option>
                <option value="driver">driver</option>
              </select>
            </div>
            <button className="btn ghost" type="submit">Create invite token</button>
          </form>
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Token</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {staffInvites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{invite.role}</td>
                  <td><div><code>{invite.invite_token}</code></div><div className="small subtle">/accept-invite?token={invite.invite_token}&email={encodeURIComponent(invite.email)}</div></td>
                  <td>{invite.accepted_at ? `Accepted ${new Date(invite.accepted_at).toLocaleDateString()}` : invite.revoked_at ? `Revoked ${new Date(invite.revoked_at).toLocaleDateString()}` : `Open until ${invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : '—'}`}</td>
                  <td>
                    <div className="stack-sm">
                      <form action={resendStaffLinkInviteAction}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <input type="hidden" name="email" value={invite.email} />
                        <input type="hidden" name="invited_by" value={currentStaffMember?.full_name || profile?.full_name || 'LKN Admin'} />
                        <button className="btn ghost" type="submit" disabled={Boolean(invite.accepted_at)}>Resend</button>
                      </form>
                      <form action={revokeStaffLinkInviteAction}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <input type="hidden" name="email" value={invite.email} />
                        <button className="btn secondary" type="submit" disabled={Boolean(invite.accepted_at) || Boolean(invite.revoked_at)}>Revoke</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Checklist templates</h2>
              <div className="small subtle">Edit the default internal task checklist that gets seeded when a customer creates each type of request.</div>
            </div>
          </div>
          <form action={saveChecklistTemplateAction} className="card" style={{ padding: 14, marginBottom: 12 }}>
            <div className="grid grid-2">
              <label>Request type<input name="request_type" placeholder="Repair" /></label>
              <label>Assigned role
                <select name="assigned_role" defaultValue="service_writer">
                  <option value="service_writer">service_writer</option>
                  <option value="service_manager">service_manager</option>
                  <option value="driver">driver</option>
                  <option value="tech">tech</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label>Template task<input name="title" placeholder="Collect serial photo and complaint details" /></label>
              <label>Sort order<input type="number" name="sort_order" defaultValue={1} /></label>
            </div>
            <button className="btn ghost" type="submit">Add checklist template</button>
          </form>
          <div className="stack-sm">
            {checklistTemplates.map((template) => (
              <div key={template.id} className="card" style={{ padding: 14 }}>
                <form action={saveChecklistTemplateAction} className="grid grid-2">
                  <input type="hidden" name="id" value={template.id} />
                  <label>Request type<input name="request_type" defaultValue={template.request_type} /></label>
                  <label>Assigned role<input name="assigned_role" defaultValue={template.assigned_role || ''} /></label>
                  <label>Title<input name="title" defaultValue={template.title} /></label>
                  <label>Sort order<input type="number" name="sort_order" defaultValue={template.sort_order || 1} /></label>
                  <label>Active
                    <select name="active" defaultValue={template.active === false ? 'false' : 'true'}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                  <div className="header" style={{ alignItems: 'end' }}>
                    <button className="btn ghost" type="submit">Save template</button>
                  </div>
                </form>
                <form action={deleteChecklistTemplateAction} style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={template.id} />
                  <input type="hidden" name="request_type" value={template.request_type} />
                  <button className="btn secondary" type="submit">Delete</button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Staff management</h2>
              <div className="small subtle">Real staff table scaffold with queue defaults, roles, active status, and auth link tracking.</div>
            </div>
          </div>
          <div className="stack-sm">
            {staffMembers.map((member) => (
              <div key={member.id}>
              <form key={member.id} action={saveStaffMemberAction} className="card">
                <input type="hidden" name="id" value={member.id} />
                <div className="grid grid-2">
                  <label>Full name<input name="full_name" defaultValue={member.full_name} /></label>
                  <label>Email<input name="email" defaultValue={member.email || ''} /></label>
                  <label>Phone<input name="phone" defaultValue={member.phone || ''} /></label>
                  <label>Auth user ID<input name="auth_user_id" defaultValue={member.auth_user_id || ''} placeholder="Supabase auth user id" /></label>
                  <label>Role
                    <select name="role" defaultValue={member.role}>
                      <option value="admin">admin</option>
                      <option value="service_manager">service_manager</option>
                      <option value="service_writer">service_writer</option>
                      <option value="driver">driver</option>
                    </select>
                  </label>
                  <label>Default queue view
                    <select name="default_queue_view" defaultValue={member.default_queue_view || 'all'}>
                      {savedViews.map((view) => <option key={view.key} value={view.key}>{view.label}</option>)}
                    </select>
                  </label>
                  <label>Active
                    <select name="active" defaultValue={member.active === false ? 'false' : 'true'}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <button className="btn ghost" type="submit">Save staff member</button>
                </div>
              </form>
              <div className="form-row" style={{ marginTop: 8 }}>
                <form action={deactivateStaffMemberAction}>
                  <input type="hidden" name="id" value={member.id} />
                  <button className="btn ghost" type="submit">Deactivate</button>
                </form>
                <form action={deleteStaffMemberAction}>
                  <input type="hidden" name="id" value={member.id} />
                  <button className="btn ghost" type="submit">Delete</button>
                </form>
              </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Estimate totals and pricing summary</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Auto-calculated subtotal, fees, discounts, tax, and final total from line items.</div>
          <table className="table">
            <thead><tr><th>Request</th><th>Subtotal</th><th>Fees</th><th>Discounts</th><th>Tax</th><th>Total</th></tr></thead>
            <tbody>
              {requests.map((request) => { const summary = estimateSummaryByRequest[request.id]; return (
                <tr key={request.id + '-estimate-summary'}>
                  <td><strong>{request.request_number}</strong><div className="small subtle">{request.equipment_name}</div></td>
                  <td>{formatMoney(summary.subtotal)}</td>
                  <td>{formatMoney(summary.fees)}</td>
                  <td>-{formatMoney(summary.discounts)}</td>
                  <td>{formatMoney(summary.tax)}</td>
                  <td><strong>{formatMoney(summary.total)}</strong></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Callback management board</h2>
              <div className="small subtle">Assign ownership so callback requests do not get lost in the shuffle.</div>
            </div>
            <form method="get" className="form-row">
              <select name="callback_status" defaultValue={callbackStatus}>
                <option value="all">All statuses</option>
                <option value="requested">requested</option>
                <option value="acknowledged">acknowledged</option>
                <option value="completed">completed</option>
              </select>
              <button className="btn ghost" type="submit">Filter</button>
            </form>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Preferred contact</th>
                <th>Assignment</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredCallbackRequests.length ? filteredCallbackRequests.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.request_number}</strong>
                    <div className="small subtle">{new Date(item.created_at).toLocaleString()}</div>
                    <div className="small subtle">{item.note || '—'}</div>
                  </td>
                  <td>{item.preferred_contact || 'phone'}</td>
                  <td>
                    <div>{item.assigned_to || 'Unassigned'}</div>
                    <div className="small subtle">{item.assigned_at ? `Assigned ${new Date(item.assigned_at).toLocaleString()}` : 'No owner yet'}</div>
                    <StatusPill status={item.status} />
                  </td>
                  <td>
                    <form action={updateCallbackRequestStatus} className="stack-sm" style={{ minWidth: 220 }}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="request_id" value={item.request_id} />
                      <input type="hidden" name="request_number" value={item.request_number} />
                      <select name="assigned_to" defaultValue={item.assigned_to || ''}>
                        <option value="">Unassigned</option>
                        {staffMembers.map((member) => <option key={member.id} value={member.full_name}>{member.full_name} · {member.role}</option>)}
                      </select>
                      <div className="form-row">
                        <select name="status" defaultValue={item.status}>
                          <option value="requested">requested</option>
                          <option value="acknowledged">acknowledged</option>
                          <option value="completed">completed</option>
                        </select>
                        <button className="btn ghost" type="submit">Save</button>
                      </div>
                    </form>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4}>No callback requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Failed webhook retry queue</h2>
              <div className="small subtle">Filter failures and attach dead-letter notes before retrying.</div>
            </div>
            <form method="get" className="stack-sm" style={{ minWidth: 240 }}>
              <select name="sync_status" defaultValue={syncStatus}>
                <option value="all">All statuses</option>
                <option value="failed">failed</option>
                <option value="received">received</option>
                <option value="processed">processed</option>
              </select>
              <select name="sync_provider" defaultValue={syncProvider}>
                <option value="all">All providers</option>
                <option value="flyntlok">flyntlok</option>
                <option value="zapier">zapier</option>
                <option value="stripe">stripe</option>
              </select>
              <button className="btn ghost" type="submit">Apply filters</button>
            </form>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Event</th>
                <th>Retry</th>
                <th>State</th>
                <th>Dead-letter note</th>
              </tr>
            </thead>
            <tbody>
              {retryableLogs.length ? retryableLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.provider}</strong>
                    <div className="small subtle">{log.request_number || 'No request #'}</div>
                  </td>
                  <td>
                    {log.event_type}
                    <div className="small subtle">{log.error_message || (typeof log.response_status === 'number' ? `HTTP ${log.response_status}` : 'No error captured')}</div>
                    <div className="small subtle">{typeof log.retry_count === 'number' ? `Retries ${log.retry_count}` : 'No retries yet'}{log.last_attempt_at ? ` • Last attempt ${new Date(log.last_attempt_at).toLocaleString()}` : ''}</div>
                  </td>
                  <td>
                    <StatusPill status={log.status} />
                    <form action={retrySyncLogAction} style={{ marginTop: 8 }}>
                      <input type="hidden" name="sync_log_id" value={log.id} />
                      <button className="btn ghost" type="submit">Retry now</button>
                    </form>
                  </td>
                  <td>
                    <form action={updateSyncLogRetryState} className="stack-sm" style={{ minWidth: 160 }}>
                      <input type="hidden" name="sync_log_id" value={log.id} />
                      <select name="retry_state" defaultValue={log.retry_state || 'open'}>
                        <option value="open">open</option>
                        <option value="resolved">resolved</option>
                        <option value="do_not_retry">do_not_retry</option>
                      </select>
                      <button className="btn ghost" type="submit">Save state</button>
                    </form>
                    <div className="small subtle">{log.resolved_at ? `Resolved ${new Date(log.resolved_at).toLocaleString()} by ${log.resolved_by || 'staff'}` : 'Open retry state'}</div>
                  </td>
                  <td>
                    <form action={saveSyncLogDeadLetterNote} className="stack-sm" style={{ minWidth: 220 }}>
                      <input type="hidden" name="sync_log_id" value={log.id} />
                      <textarea name="dead_letter_note" rows={3} defaultValue={log.dead_letter_note || ''} placeholder="Reason, next step, or owner" />
                      <button className="btn ghost" type="submit">Save note</button>
                    </form>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}>No failed webhooks in queue.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="header">
          <div>
            <h2 style={{ marginTop: 0 }}>Estimate line item manager</h2>
            <div className="small subtle">Build 16 adds true inline edit so staff can revise labor, parts, and fees without deleting rows first.</div>
          </div>
        </div>
        <div className="grid grid-2">
          {requests.map((request) => {
            const lines = estimateLineItems.filter((line) => line.request_id === request.id);
            return (
              <div className="card" key={request.id} style={{ padding: 14 }}>
                <div className="header" style={{ marginBottom: 10 }}>
                  <div>
                    <strong>{request.request_number}</strong>
                    <div className="small subtle">{request.equipment_name} • {request.customer_name || 'Customer'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusPill status={request.status} />
                    <div className="small subtle" style={{ marginTop: 6 }}>Estimate total ${(lines.reduce((sum, line) => sum + (line.line_type === 'discount' ? -1 : 1) * Number(line.total_price || 0), 0)).toFixed(2)}</div>
                  </div>
                </div>
                <div className="stack-sm" style={{ marginBottom: 12 }}>
                  {lines.length ? lines.map((line) => (
                    <form action={saveEstimateLineItem} key={line.id} className="card" style={{ padding: 12 }}>
                      <input type="hidden" name="id" value={line.id} />
                      <input type="hidden" name="request_id" value={request.id} />
                      <input type="hidden" name="request_number" value={request.request_number} />
                      <div className="form-row">
                        <select name="line_type" defaultValue={line.line_type}>
                          <option value="labor">labor</option>
                          <option value="part">part</option>
                          <option value="fee">fee</option>
                          <option value="discount">discount</option>
                          <option value="note">note</option>
                        </select>
                        <input type="number" name="sort_order" placeholder="Sort" defaultValue={line.sort_order || 0} />
                      </div>
                      <input name="description" defaultValue={line.description} required />
                      <div className="form-row">
                        <input type="number" step="0.01" name="quantity" placeholder="Qty" defaultValue={line.quantity ?? 1} />
                        <input type="number" step="0.01" name="unit_price" placeholder="Unit price" defaultValue={line.unit_price ?? 0} />
                        <input type="number" step="0.01" name="total_price" placeholder="Total" defaultValue={line.total_price ?? 0} />
                      </div>
                      <div className="form-row">
                        <select name="customer_visible" defaultValue={String(line.customer_visible ?? true)}>
                          <option value="true">Customer visible</option>
                          <option value="false">Internal only</option>
                        </select>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn ghost" type="submit">Update line</button>
                          <button className="btn secondary" formAction={deleteEstimateLineItem} type="submit">Delete</button>
                        </div>
                      </div>
                    </form>
                  )) : <div className="small subtle">No estimate lines yet.</div>}
                </div>
                <form action={saveEstimateLineItem} className="stack-sm">
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="request_number" value={request.request_number} />
                  <div className="form-row">
                    <select name="line_type" defaultValue="labor">
                      <option value="labor">labor</option>
                      <option value="part">part</option>
                      <option value="fee">fee</option>
                      <option value="discount">discount</option>
                      <option value="note">note</option>
                    </select>
                    <input type="number" name="sort_order" placeholder="Sort" defaultValue={lines.length + 1} />
                  </div>
                  <input name="description" placeholder="New line item description" required />
                  <div className="form-row">
                    <input type="number" step="0.01" name="quantity" placeholder="Qty" defaultValue={1} />
                    <input type="number" step="0.01" name="unit_price" placeholder="Unit price" defaultValue={0} />
                    <input type="number" step="0.01" name="total_price" placeholder="Total" defaultValue={0} />
                  </div>
                  <select name="customer_visible" defaultValue="true">
                    <option value="true">Customer visible</option>
                    <option value="false">Internal only</option>
                  </select>
                  <button className="btn ghost" type="submit">Add line item</button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Staff onboarding and account linking</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Create invite tokens so each staff login can be linked to the correct staff record after signup.</div>
          <form action={createStaffLinkInviteAction} className="stack-sm" style={{ marginBottom: 16 }}>
            <input name="invited_by" defaultValue={currentStaffMember?.full_name || profile?.full_name || 'LKN Admin'} hidden readOnly />
            <div className="form-row">
              <input type="email" name="email" placeholder="staff email" />
              <select name="role" defaultValue="service_writer">
                <option value="admin">admin</option>
                <option value="service_manager">service_manager</option>
                <option value="service_writer">service_writer</option>
                <option value="driver">driver</option>
              </select>
            </div>
            <button className="btn ghost" type="submit">Create invite token</button>
          </form>
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Token</th><th>Status</th></tr></thead>
            <tbody>
              {staffInvites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{invite.role}</td>
                  <td><div><code>{invite.invite_token}</code></div><div className="small subtle">/accept-invite?token={invite.invite_token}&email={encodeURIComponent(invite.email)}</div></td>
                  <td>{invite.accepted_at ? `Accepted ${new Date(invite.accepted_at).toLocaleDateString()}` : `Open until ${invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : '—'}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Staff management</h2>
              <div className="small subtle">Real staff table scaffold with queue defaults, roles, active status, and auth link tracking.</div>
            </div>
          </div>
          <div className="stack-sm">
            {staffMembers.map((member) => (
              <div key={member.id}>
              <form key={member.id} action={saveStaffMemberAction} className="card">
                <input type="hidden" name="id" value={member.id} />
                <div className="grid grid-2">
                  <label>Full name<input name="full_name" defaultValue={member.full_name} /></label>
                  <label>Email<input name="email" defaultValue={member.email || ''} /></label>
                  <label>Phone<input name="phone" defaultValue={member.phone || ''} /></label>
                  <label>Auth user ID<input name="auth_user_id" defaultValue={member.auth_user_id || ''} placeholder="Supabase auth user id" /></label>
                  <label>Role
                    <select name="role" defaultValue={member.role}>
                      <option value="admin">admin</option>
                      <option value="service_manager">service_manager</option>
                      <option value="service_writer">service_writer</option>
                      <option value="driver">driver</option>
                    </select>
                  </label>
                  <label>Default queue view
                    <select name="default_queue_view" defaultValue={member.default_queue_view || 'all'}>
                      {savedViews.map((view) => <option key={view.key} value={view.key}>{view.label}</option>)}
                    </select>
                  </label>
                  <label>Active
                    <select name="active" defaultValue={member.active === false ? 'false' : 'true'}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                </div>
                <button className="btn ghost" type="submit">Save staff member</button>
              </form>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Estimate totals and pricing summary</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Auto-calculated subtotal, fees, discounts, tax, and final total from line items.</div>
          <table className="table">
            <thead><tr><th>Request</th><th>Subtotal</th><th>Fees</th><th>Discounts</th><th>Tax</th><th>Total</th></tr></thead>
            <tbody>
              {requests.map((request) => { const summary = estimateSummaryByRequest[request.id]; return (
                <tr key={request.id + '-estimate-summary'}>
                  <td><strong>{request.request_number}</strong><div className="small subtle">{request.equipment_name}</div></td>
                  <td>{formatMoney(summary.subtotal)}</td>
                  <td>{formatMoney(summary.fees)}</td>
                  <td>-{formatMoney(summary.discounts)}</td>
                  <td>{formatMoney(summary.tax)}</td>
                  <td><strong>{formatMoney(summary.total)}</strong></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Pickup and delivery board</h2>
              <div className="small subtle">Filter the board by route day and print only that route when needed.</div>
            </div>
            <div className="stack-sm" style={{ alignItems: 'flex-end' }}>
              <form method="get" className="form-row">
                <select name="route_date" defaultValue={routeDate}>
                  <option value="">All route dates</option>
                  {routeDates.map((date) => <option key={date} value={date!}>{date}</option>)}
                </select>
                <button className="btn ghost" type="submit">Filter</button>
              </form>
              <Link className="btn ghost" href={routeDate ? `/admin/routes/print?route_date=${encodeURIComponent(routeDate)}` : '/admin/routes/print'}>Printable route sheet</Link>
              <form action={duplicateRouteDayAction} className="stack-sm" style={{ minWidth: 220 }}>
                <input type="date" name="source_date" defaultValue={routeDate || routeDates[0] || ''} />
                <input type="date" name="target_date" />
                <button className="btn ghost" type="submit">Duplicate day</button>
              </form>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Assignment</th>
              </tr>
            </thead>
            <tbody>
              {pickupRequests.map((request) => {
                const stop = pickupStops.find((item) => item.request_id === request.id);
                if (routeDate && stop?.route_date !== routeDate) return null;
                if (routeDate && !stop?.route_date) return null;
                return (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.request_number}</strong>
                      <div className="small subtle">{request.equipment_name}</div>
                    </td>
                    <td>
                      <div>{request.customer_name || '—'}</div>
                      <div className="small subtle">{request.customer_phone || '—'}</div>
                    </td>
                    <td>
                      <div>{stop?.route_date || 'Unscheduled'}</div>
                      <div className="small subtle">{stop?.stop_window || 'No window set'}</div>
                      <div className="small subtle">{stop?.route_sequence ? `Stop #${stop.route_sequence}` : 'No sequence'}</div>
                    </td>
                    <td>
                      <form action={upsertPickupStop} className="stack-sm" style={{ minWidth: 260 }}>
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="request_number" value={request.request_number} />
                        <input type="hidden" name="customer_name" value={request.customer_name || ''} />
                        <input type="hidden" name="customer_phone" value={request.customer_phone || ''} />
                        <input type="hidden" name="customer_id" value={request.customer_id || ''} />
                        <input type="hidden" name="customer_email" value={request.customer_email || ''} />
                        <input type="hidden" name="equipment_name" value={request.equipment_name} />
                        <input type="hidden" name="address" value={request.customer_address || ''} />
                        <div className="form-row">
                          <input type="date" name="route_date" defaultValue={stop?.route_date || routeDate || ''} />
                          <input name="stop_window" defaultValue={stop?.stop_window || ''} placeholder="9 AM - 11 AM" />
                        </div>
                        <div className="form-row">
                          <input type="number" min="1" name="route_sequence" defaultValue={stop?.route_sequence || ''} placeholder="Stop #" />
                          <select name="driver_name" defaultValue={stop?.driver_name || ''}>
                            <option value="">Driver</option>
                            {staffMembers.filter((member) => member.role === 'driver' || member.role === 'service_manager' || member.role === 'admin').map((member) => <option key={member.id} value={member.full_name}>{member.full_name}</option>)}
                          </select>
                        </div>
                        <div className="form-row">
                          <select name="stop_type" defaultValue={stop?.stop_type || 'pickup'}>
                            <option value="pickup">pickup</option>
                            <option value="delivery">delivery</option>
                          </select>
                          <select name="route_status" defaultValue={stop?.route_status || 'scheduled'}>
                            <option value="unscheduled">unscheduled</option>
                            <option value="scheduled">scheduled</option>
                            <option value="en_route">en_route</option>
                            <option value="completed">completed</option>
                          </select>
                        </div>
                        <button className="btn ghost" type="submit">Save stop</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Driver dispatch sheets</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Export a printable route sheet by driver or by day.</div>
          <div className="stack-sm" style={{ marginBottom: 16 }}>
            <Link className="btn ghost" href={`/admin/routes/print${routeDate ? `?route_date=${routeDate}` : ''}`}>Print all visible stops</Link>
            <div className="form-row" style={{ flexWrap: 'wrap' }}>
              {driverNames.map((driverName) => (
                <Link key={driverName} className="btn ghost" href={`/admin/routes/print?${routeDate ? `route_date=${routeDate}&` : ''}driver=${encodeURIComponent(driverName)}`}>Dispatch for {driverName}</Link>
              ))}
            </div>
          </div>
          <h2 style={{ marginTop: 0 }}>Recent sync logs</h2>
          <table className="table">
            <thead><tr><th>Provider</th><th>Event</th><th>State</th><th>Audits</th></tr></thead>
            <tbody>
              {syncLogs.map((log) => {
                const auditCount = syncLogAudits.filter((audit) => audit.sync_log_id === log.id).length;
                return (
                  <tr key={log.id}>
                    <td><strong>{log.provider}</strong><div className="small subtle">{log.request_number || 'No request #'}</div></td>
                    <td>{log.event_type}<div className="small subtle">{typeof log.response_status === 'number' ? `HTTP ${log.response_status}` : 'No status'}{typeof log.retry_count === 'number' ? ` • retries ${log.retry_count}` : ''}</div></td>
                    <td><StatusPill status={log.retry_state || log.status} /><div className="small subtle">{log.dead_letter_note || 'No dead-letter note'}</div></td>
                    <td><Link className="btn ghost" href={`/admin/sync-logs/${log.id}`}>View audits ({auditCount})</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Staff onboarding and account linking</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Create invite tokens so each staff login can be linked to the correct staff record after signup.</div>
          <form action={createStaffLinkInviteAction} className="stack-sm" style={{ marginBottom: 16 }}>
            <input name="invited_by" defaultValue={currentStaffMember?.full_name || profile?.full_name || 'LKN Admin'} hidden readOnly />
            <div className="form-row">
              <input type="email" name="email" placeholder="staff email" />
              <select name="role" defaultValue="service_writer">
                <option value="admin">admin</option>
                <option value="service_manager">service_manager</option>
                <option value="service_writer">service_writer</option>
                <option value="driver">driver</option>
              </select>
            </div>
            <button className="btn ghost" type="submit">Create invite token</button>
          </form>
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Token</th><th>Status</th></tr></thead>
            <tbody>
              {staffInvites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{invite.role}</td>
                  <td><div><code>{invite.invite_token}</code></div><div className="small subtle">/accept-invite?token={invite.invite_token}&email={encodeURIComponent(invite.email)}</div></td>
                  <td>{invite.accepted_at ? `Accepted ${new Date(invite.accepted_at).toLocaleDateString()}` : `Open until ${invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : '—'}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Staff management</h2>
              <div className="small subtle">Real staff table scaffold with queue defaults, roles, active status, and auth link tracking.</div>
            </div>
          </div>
          <div className="stack-sm">
            {staffMembers.map((member) => (
              <div key={member.id}>
              <form key={member.id} action={saveStaffMemberAction} className="card">
                <input type="hidden" name="id" value={member.id} />
                <div className="grid grid-2">
                  <label>Full name<input name="full_name" defaultValue={member.full_name} /></label>
                  <label>Email<input name="email" defaultValue={member.email || ''} /></label>
                  <label>Phone<input name="phone" defaultValue={member.phone || ''} /></label>
                  <label>Auth user ID<input name="auth_user_id" defaultValue={member.auth_user_id || ''} placeholder="Supabase auth user id" /></label>
                  <label>Role
                    <select name="role" defaultValue={member.role}>
                      <option value="admin">admin</option>
                      <option value="service_manager">service_manager</option>
                      <option value="service_writer">service_writer</option>
                      <option value="driver">driver</option>
                    </select>
                  </label>
                  <label>Default queue view
                    <select name="default_queue_view" defaultValue={member.default_queue_view || 'all'}>
                      {savedViews.map((view) => <option key={view.key} value={view.key}>{view.label}</option>)}
                    </select>
                  </label>
                  <label>Active
                    <select name="active" defaultValue={member.active === false ? 'false' : 'true'}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                </div>
                <button className="btn ghost" type="submit">Save staff member</button>
              </form>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Estimate totals and pricing summary</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Auto-calculated subtotal, fees, discounts, tax, and final total from line items.</div>
          <table className="table">
            <thead><tr><th>Request</th><th>Subtotal</th><th>Fees</th><th>Discounts</th><th>Tax</th><th>Total</th></tr></thead>
            <tbody>
              {requests.map((request) => { const summary = estimateSummaryByRequest[request.id]; return (
                <tr key={request.id + '-estimate-summary'}>
                  <td><strong>{request.request_number}</strong><div className="small subtle">{request.equipment_name}</div></td>
                  <td>{formatMoney(summary.subtotal)}</td>
                  <td>{formatMoney(summary.fees)}</td>
                  <td>-{formatMoney(summary.discounts)}</td>
                  <td>{formatMoney(summary.tax)}</td>
                  <td><strong>{formatMoney(summary.total)}</strong></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Flyntlok field mapping</h2>
          <table className="table">
            <thead><tr><th>App field</th><th>Flyntlok field</th><th>Notes</th></tr></thead>
            <tbody>
              {flyntlokRequestFieldMap.map((map) => (
                <tr key={`${map.appField}-${map.flyntlokField}`}>
                  <td>{map.appField}</td>
                  <td>{map.flyntlokField}</td>
                  <td>{map.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Outbound payload mappings</h2>
          <table className="table">
            <thead><tr><th>Event</th><th>Provider</th><th>App field</th><th>Outbound field</th></tr></thead>
            <tbody>
              {outboundFieldMappings.slice(0, 20).map((map) => (
                <tr key={`${map.eventType}-${map.provider}-${map.appField}-${map.outboundField}`}>
                  <td>{map.eventType}</td>
                  <td>{map.provider}</td>
                  <td>{map.appField}</td>
                  <td>{map.outboundField}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Route optimization helper</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Suggested route sequence is generated from date, stop type, and normalized address order as a simple dispatch helper.</div>
          <table className="table">
            <thead><tr><th>Request</th><th>Stop</th><th>Current</th><th>Suggested</th><th>Driver</th></tr></thead>
            <tbody>
              {routeSuggestions.length ? routeSuggestions.map((stop: any) => (
                <tr key={stop.id}>
                  <td><strong>{stop.request_number}</strong><div className="small subtle">{stop.route_date || 'Unscheduled'}</div></td>
                  <td>{stop.stop_type}<div className="small subtle">{stop.address || 'No address'}</div></td>
                  <td>{stop.route_sequence || '—'}</td>
                  <td>{stop.suggested_sequence}</td>
                  <td>{stop.driver_name || 'Unassigned'}</td>
                </tr>
              )) : <tr><td colSpan={5}>No route stops found for the selected date.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Webhook retry audit trail</h2>
          <div className="small subtle" style={{ marginBottom: 12 }}>Shows who resolved or suppressed retries and why, so handoffs stay documented.</div>
          <table className="table">
            <thead><tr><th>When</th><th>Action</th><th>Performed by</th><th>Note</th></tr></thead>
            <tbody>
              {syncLogAudits.length ? syncLogAudits.map((audit) => (
                <tr key={audit.id}>
                  <td>{new Date(audit.created_at).toLocaleString()}</td>
                  <td>{audit.action}</td>
                  <td>{audit.performed_by || 'System'}</td>
                  <td>{audit.note || '—'}</td>
                </tr>
              )) : <tr><td colSpan={4}>No audit events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

    </main>
  );
}
