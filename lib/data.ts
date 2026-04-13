import {
  demoAdminQueue,
  demoCallbackRequests,
  demoEquipment,
  demoEstimateLineItems,
  demoInvoices,
  demoNotifications,
  demoPickupStops,
  demoProfile,
  demoRequestCommunications,
  demoRequestMedia,
  demoRequestTimelineEvents,
  demoRequests,
  demoStaffMembers,
  demoSyncLogs,
  demoSyncLogAudits,
  demoStaffLinkInvites,
  demoChecklistTemplates,
  demoRequestTaskChecklistItems,
  demoNotificationTemplate, NotificationSendLogs
} from './demo-data';
import { createSupabaseServerClient, useDemoData } from './supabase';
import { buildRequestProfitRows } from './profit-utils';
import {
  AdminQueueRequest,
  CallbackRequest,
  Equipment,
  EstimateLineItem,
  Invoice,
  Notification,
  PickupScheduleStop,
  Profile,
  RequestCommunication,
  RequestMedia,
  RequestTimelineEvent,
  ServiceRequest,
  StaffMember,
  SyncLog,
  SyncLogAudit,
  RequestProfitRow,
  StaffLinkInvite,
  ChecklistTemplate,
  RequestTaskChecklistItem,
  NotificationTemplate, NotificationSendLog
} from './types';

export async function getProfile(): Promise<Profile | null> {
  if (useDemoData) return demoProfile;
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoProfile;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email,
    full_name: data?.full_name,
    phone: data?.phone,
    role: data?.role,
    address: data?.address,
    created_at: data?.created_at
  };
}


export async function getStaffMembers(): Promise<StaffMember[]> {
  if (useDemoData) return demoStaffMembers.filter((item) => item.active !== false);
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoStaffMembers.filter((item) => item.active !== false);
  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('active', true)
    .order('full_name', { ascending: true });
  if (error) return demoStaffMembers.filter((item) => item.active !== false);
  return data as StaffMember[];
}


export async function getStaffQueuePreference(email?: string | null): Promise<string | null> {
  const staff = await getStaffMembers();
  const match = staff.find((item) => item.email && email && item.email.toLowerCase() === email.toLowerCase());
  return match?.default_queue_view || null;
}

export async function getStaffMemberByAuth({ userId, email }: { userId?: string | null; email?: string | null }): Promise<StaffMember | null> {
  const staff = await getStaffMembers();
  const byAuth = userId ? staff.find((item) => item.auth_user_id && item.auth_user_id === userId) : null;
  if (byAuth) return byAuth;
  const byEmail = email ? staff.find((item) => item.email && item.email.toLowerCase() === email.toLowerCase()) : null;
  return byEmail || null;
}

export async function getDriverNames(): Promise<string[]> {
  const staff = await getStaffMembers();
  return staff.filter((item) => item.role === 'driver' || item.role === 'service_manager' || item.role === 'admin').map((item) => item.full_name).sort();
}

export async function getEquipment(): Promise<Equipment[]> {
  if (useDemoData) return demoEquipment;
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoEquipment;
  const { data, error } = await supabase.from('equipment').select('*').order('created_at', { ascending: false });
  if (error) return demoEquipment;
  return data as Equipment[];
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const equipment = await getEquipment();
  return equipment.find((item) => item.id === id) ?? null;
}

export async function getRequests(): Promise<ServiceRequest[]> {
  if (useDemoData) return demoRequests;
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoRequests;
  const { data, error } = await supabase.from('service_requests').select('*').order('created_at', { ascending: false });
  if (error) return demoRequests;
  return (data as ServiceRequest[]).map((r) => ({ ...r, equipment_name: r.equipment_name || 'Equipment' }));
}

export async function getRequestById(id: string): Promise<ServiceRequest | null> {
  const requests = await getRequests();
  return requests.find((r) => r.id === id) ?? null;
}

export async function getEstimateLineItems(requestId: string): Promise<EstimateLineItem[]> {
  if (useDemoData) return demoEstimateLineItems.filter((item) => item.request_id === requestId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoEstimateLineItems.filter((item) => item.request_id === requestId);
  const { data, error } = await supabase
    .from('estimate_line_items')
    .select('*')
    .eq('request_id', requestId)
    .eq('customer_visible', true)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return data as EstimateLineItem[];
}

export async function getLatestCallbackRequest(requestId: string): Promise<CallbackRequest | null> {
  if (useDemoData) return demoCallbackRequests.filter((item) => item.request_id === requestId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('callback_requests')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as CallbackRequest | null;
}

export async function getRequestMedia(requestId: string): Promise<RequestMedia[]> {
  if (useDemoData) return demoRequestMedia.filter((item) => item.request_id === requestId);
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoRequestMedia.filter((item) => item.request_id === requestId);
  const { data, error } = await supabase.from('request_media').select('*').eq('request_id', requestId).order('created_at', { ascending: false });
  if (error) return [];
  return data as RequestMedia[];
}

export async function getRequestTimeline(requestId: string): Promise<RequestTimelineEvent[]> {
  if (useDemoData) return demoRequestTimelineEvents.filter((item) => item.request_id === requestId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('request_timeline_events').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
  if (error) return [];
  return data as RequestTimelineEvent[];
}

export async function getRequestCommunications(requestId: string): Promise<RequestCommunication[]> {
  if (useDemoData) return demoRequestCommunications.filter((item) => item.request_id === requestId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('request_communications').select('*').eq('request_id', requestId).order('created_at', { ascending: false });
  if (error) return [];
  return data as RequestCommunication[];
}

export async function getNotifications(): Promise<Notification[]> {
  if (useDemoData) return demoNotifications;
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoNotifications;
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
  if (error) return demoNotifications;
  return data as Notification[];
}

export async function getInvoices(): Promise<Invoice[]> {
  if (useDemoData) return demoInvoices;
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoInvoices;
  const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (error) return demoInvoices;
  return data as Invoice[];
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getInvoices();
  return invoices.find((invoice) => invoice.id === id) || null;
}

export async function getSyncLogs(): Promise<SyncLog[]> {
  if (useDemoData) return demoSyncLogs;
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoSyncLogs;
  const { data, error } = await supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return demoSyncLogs;
  return data as SyncLog[];
}


export async function getSyncLogAudits(syncLogId?: string): Promise<SyncLogAudit[]> {
  if (useDemoData) {
    const audits = syncLogId ? demoSyncLogAudits.filter((item) => item.sync_log_id === syncLogId) : demoSyncLogAudits;
    return [...audits].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const supabase = createSupabaseServerClient();
  if (!supabase) return syncLogId ? demoSyncLogAudits.filter((item) => item.sync_log_id === syncLogId) : demoSyncLogAudits;
  let query = supabase.from('sync_log_audits').select('*').order('created_at', { ascending: false });
  if (syncLogId) query = query.eq('sync_log_id', syncLogId);
  const { data, error } = await query;
  if (error) return [];
  return data as SyncLogAudit[];
}

export async function getAdminQueueRequests(): Promise<AdminQueueRequest[]> {
  if (useDemoData) return demoAdminQueue;
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoAdminQueue;
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      profiles:customer_id (full_name, phone, email, address)
    `)
    .order('created_at', { ascending: false });

  if (error || !data) return demoAdminQueue;

  return (data as any[]).map((row) => ({
    ...row,
    equipment_name: row.equipment_name || 'Equipment',
    customer_name: row.profiles?.full_name || null,
    customer_phone: row.profiles?.phone || null,
    customer_email: row.profiles?.email || null,
    customer_address: row.profiles?.address || null
  }));
}

export async function getAllCallbackRequests(): Promise<CallbackRequest[]> {
  if (useDemoData) return [...demoCallbackRequests].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const supabase = createSupabaseServerClient();
  if (!supabase) return [...demoCallbackRequests].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await supabase
    .from('callback_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as CallbackRequest[];
}

export async function getAllEstimateLineItems(): Promise<EstimateLineItem[]> {
  if (useDemoData) return [...demoEstimateLineItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const supabase = createSupabaseServerClient();
  if (!supabase) return [...demoEstimateLineItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const { data, error } = await supabase
    .from('estimate_line_items')
    .select('*')
    .order('request_id', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) return [];
  return data as EstimateLineItem[];
}

export async function getRetryableSyncLogs(filters?: { status?: string; provider?: string; }): Promise<SyncLog[]> {
  const logs = await getSyncLogs();
  return logs.filter((log) => {
    const retryable = (log.retry_state || 'open') === 'open' && (log.status === 'failed' || (log.direction === 'outbound' && (log.retry_count || 0) > 0));
    const statusOk = !filters?.status || filters.status === 'all' ? true : log.status === filters.status;
    const providerOk = !filters?.provider || filters.provider === 'all' ? true : log.provider === filters.provider;
    return retryable && statusOk && providerOk;
  });
}

export async function getPickupStopByRequestId(requestId: string): Promise<PickupScheduleStop | null> {
  const stops = await getPickupSchedule();
  return stops.find((item) => item.request_id === requestId) ?? null;
}

export async function getPickupSchedule(routeDate?: string): Promise<PickupScheduleStop[]> {
  const sortedDemo = [...demoPickupStops].sort((a, b) => {
    return `${a.route_date || ''}-${a.route_sequence || 999}`.localeCompare(`${b.route_date || ''}-${b.route_sequence || 999}`);
  });
  if (useDemoData) return routeDate ? sortedDemo.filter((stop) => stop.route_date === routeDate) : sortedDemo;
  const supabase = createSupabaseServerClient();
  if (!supabase) return routeDate ? sortedDemo.filter((stop) => stop.route_date === routeDate) : sortedDemo;
  let query = supabase
    .from('pickup_schedule')
    .select('*')
    .order('route_date', { ascending: true })
    .order('route_sequence', { ascending: true })
    .order('stop_window', { ascending: true });
  if (routeDate) query = query.eq('route_date', routeDate);
  const { data, error } = await query;

  if (error) return routeDate ? sortedDemo.filter((stop) => stop.route_date === routeDate) : sortedDemo;
  return data as PickupScheduleStop[];
}


export async function getRequestProfitRows(): Promise<RequestProfitRow[]> {
  const [requests, items] = await Promise.all([getAdminQueueRequests(), getAllEstimateLineItems()]);
  return buildRequestProfitRows(requests, items);
}

export async function getRequestProfitRowById(requestId: string): Promise<RequestProfitRow | null> {
  const rows = await getRequestProfitRows();
  return rows.find((row) => row.request_id === requestId) || null;
}


export async function getStaffLinkInvites(): Promise<StaffLinkInvite[]> {
  if (useDemoData) return demoStaffLinkInvites as StaffLinkInvite[];
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoStaffLinkInvites as StaffLinkInvite[];
  const { data, error } = await supabase.from('staff_link_invites').select('*').order('created_at', { ascending: false });
  if (error) return demoStaffLinkInvites as StaffLinkInvite[];
  return data as StaffLinkInvite[];
}

export async function getPendingStaffLinkInviteByToken(token: string): Promise<StaffLinkInvite | null> {
  const invites = await getStaffLinkInvites();
  return invites.find((item) => item.invite_token === token && !item.accepted_at && !item.revoked_at) || null;
}


export async function getRequestTaskChecklist(requestId: string): Promise<RequestTaskChecklistItem[]> {
  if (useDemoData) return demoRequestTaskChecklistItems.filter((item) => item.request_id === requestId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const supabase = createSupabaseServerClient();
  if (!supabase) return demoRequestTaskChecklistItems.filter((item) => item.request_id === requestId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const { data, error } = await supabase
    .from('request_task_checklist')
    .select('*')
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return [];
  return data as RequestTaskChecklistItem[];
}


export async function getChecklistTemplates(requestType?: string): Promise<ChecklistTemplate[]> {
  const filterDemo = requestType ? demoChecklistTemplates.filter((item) => item.request_type.toLowerCase() === requestType.toLowerCase()) : demoChecklistTemplates;
  if (useDemoData) return filterDemo as ChecklistTemplate[];
  const supabase = createSupabaseServerClient();
  if (!supabase) return filterDemo as ChecklistTemplate[];
  let query = supabase.from('request_checklist_templates').select('*').eq('active', true).order('request_type', { ascending: true }).order('sort_order', { ascending: true });
  if (requestType) query = query.eq('request_type', requestType);
  const { data, error } = await query;
  if (error) return filterDemo as ChecklistTemplate[];
  return data as ChecklistTemplate[];
}


export async function getNotificationTemplate(
  key: string
): Promise<NotificationTemplate | null> {
  if (useDemoData) {
    return (
      demoNotificationTemplates.find((t) => t.key === key && t.is_active) ?? null
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return (
      demoNotificationTemplates.find((t) => t.key === key && t.is_active) ?? null
    );
  }

  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('key', key)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return null;
  return (data as NotificationTemplate) ?? null;
}

export async function getNotificationSendLogs(): Promise<NotificationSendLog[]> {
  if (useDemoData) return demoNotificationSendLogs;

  const supabase = createSupabaseServerClient();
  if (!supabase) return demoNotificationSendLogs;

  const { data, error } = await supabase
    .from('notification_send_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return (data as NotificationSendLog[]) ?? [];
}
}
