
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
  RequestTaskChecklistItem,
  ChecklistTemplate
} from './types';

export const demoProfile: Profile = {
  id: 'cust_1',
  full_name: 'Jared Washington',
  phone: '704-677-8461',
  email: 'jared@lknsmallengine.com',
  address: '619 N. Church St, Mooresville, NC 28115',
  role: 'customer',
  created_at: '2026-03-20T12:00:00Z'
};

export const demoProfiles: Profile[] = [
  demoProfile,
  {
    id: 'cust_2',
    full_name: 'Mike Sanders',
    phone: '704-555-1010',
    email: 'mike@example.com',
    address: '125 Sugar Magnolia Dr, Mooresville, NC 28115',
    role: 'customer',
    created_at: '2026-03-18T12:00:00Z'
  }
];

export const demoEquipment: Equipment[] = [
  { id: 'eq_1', customer_id: 'cust_1', nickname: 'Front Yard Mower', equipment_type: 'Zero Turn', brand: 'Hustler', model: 'Raptor', serial_number: 'HZR-12345', created_at: '2026-03-21T12:00:00Z' },
  { id: 'eq_2', customer_id: 'cust_1', nickname: 'Backpack Blower', equipment_type: 'Handheld', brand: 'Echo', model: 'PB-9010', serial_number: 'ECH-67890', created_at: '2026-03-22T12:00:00Z' }
];

export const demoRequests: ServiceRequest[] = [
  {
    id: 'req_1',
    customer_id: 'cust_1',
    request_number: 'LKN-1024',
    equipment_id: 'eq_1',
    equipment_name: 'Hustler Raptor',
    issue_description: 'Will not start consistently when hot.',
    request_type: 'Repair',
    status: 'Estimate Sent',
    pickup_required: false,
    requested_date: '2026-03-30',
    estimate_total: 300,
    admin_notes: 'Compression and ignition both test good. Waiting on estimate approval before replacing carb and fuel line.',
    status_updated_at: '2026-03-31T16:05:00Z',
    status_updated_by: 'Kelly Standish',
    created_at: '2026-03-30T14:10:00Z'
  },
  {
    id: 'req_2',
    customer_id: 'cust_1',
    request_number: 'LKN-1025',
    equipment_id: 'eq_2',
    equipment_name: 'Echo PB-9010',
    issue_description: 'Needs annual service before season.',
    request_type: 'Tune-Up',
    status: 'In Repair',
    pickup_required: true,
    requested_date: '2026-03-31',
    estimate_total: 185,
    admin_notes: 'Tune-up parts installed. Final run test and blower tube inspection still needed.',
    status_updated_at: '2026-03-31T17:20:00Z',
    status_updated_by: 'Lyndsey',
    created_at: '2026-03-31T10:05:00Z'
  }
];

export const demoEstimateLineItems: EstimateLineItem[] = [
  { id: 'eli_1', request_id: 'req_1', line_type: 'labor', description: 'Diagnose fuel delivery issue and replace carburetor', quantity: 1, unit_price: 165, total_price: 165, unit_cost: 82.5, total_cost: 82.5, sort_order: 1, customer_visible: true, created_at: '2026-03-31T15:55:00Z' },
  { id: 'eli_2', request_id: 'req_1', line_type: 'part', description: 'Carburetor assembly', quantity: 1, unit_price: 92, total_price: 92, unit_cost: 58, total_cost: 58, sort_order: 2, customer_visible: true, created_at: '2026-03-31T15:55:00Z' },
  { id: 'eli_3', request_id: 'req_1', line_type: 'part', description: 'Fuel line', quantity: 1, unit_price: 28, total_price: 28, unit_cost: 12, total_cost: 12, sort_order: 3, customer_visible: true, created_at: '2026-03-31T15:55:00Z' },
  { id: 'eli_4', request_id: 'req_1', line_type: 'fee', description: 'Shop supplies', quantity: 1, unit_price: 15, total_price: 15, unit_cost: 3, total_cost: 3, sort_order: 4, customer_visible: true, created_at: '2026-03-31T15:55:00Z' },
  { id: 'eli_4b', request_id: 'req_1', line_type: 'discount', description: 'Customer loyalty discount', quantity: 1, unit_price: -10, total_price: -10, sort_order: 5, customer_visible: true, created_at: '2026-03-31T15:55:00Z' },
  { id: 'eli_5', request_id: 'req_2', line_type: 'labor', description: 'Annual tune-up labor', quantity: 1, unit_price: 110, total_price: 110, unit_cost: 55, total_cost: 55, sort_order: 1, customer_visible: true, created_at: '2026-03-31T11:00:00Z' },
  { id: 'eli_6', request_id: 'req_2', line_type: 'part', description: 'Tune-up kit', quantity: 1, unit_price: 60, total_price: 60, unit_cost: 31, total_cost: 31, sort_order: 2, customer_visible: true, created_at: '2026-03-31T11:00:00Z' },
  { id: 'eli_7', request_id: 'req_2', line_type: 'fee', description: 'Shop supplies', quantity: 1, unit_price: 15, total_price: 15, unit_cost: 3, total_cost: 3, sort_order: 3, customer_visible: true, created_at: '2026-03-31T11:00:00Z' }
];

export const demoCallbackRequests: CallbackRequest[] = [
  { id: 'cb_1', request_id: 'req_1', customer_id: 'cust_1', request_number: 'LKN-1024', preferred_contact: 'phone', note: 'Please call after 3 PM if possible.', status: 'requested', assigned_to: 'Kelly Standish', assigned_at: '2026-03-31T16:20:00Z', created_at: '2026-03-31T16:08:00Z' }
];

export const demoAdminQueue: AdminQueueRequest[] = demoRequests.map((request) => ({
  ...request,
  customer_name: 'Jared Washington',
  customer_phone: '704-677-8461',
  customer_email: 'jared@lknsmallengine.com',
  customer_address: '619 N. Church St, Mooresville, NC 28115'
}));

export const demoRequestMedia: RequestMedia[] = [
  { id: 'media_1', request_id: 'req_1', file_path: 'demo/req_1/hustler-top.jpg', public_url: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1200&q=80', mime_type: 'image/jpeg', label: 'overall', note: 'Overall machine condition at check-in.', created_at: '2026-03-30T14:11:00Z' },
  { id: 'media_2', request_id: 'req_1', file_path: 'demo/req_1/hustler-side.jpg', public_url: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80', mime_type: 'image/jpeg', label: 'damage', note: 'Fuel line routing and carb area.', created_at: '2026-03-30T14:12:00Z' },
  { id: 'media_3', request_id: 'req_2', file_path: 'demo/req_2/echo-blower.jpg', public_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80', mime_type: 'image/jpeg', label: 'before', note: 'Pickup photo before service.', created_at: '2026-03-31T10:06:00Z' }
];

export const demoRequestTimelineEvents: RequestTimelineEvent[] = [
  { id: 'time_1', request_id: 'req_1', event_type: 'request_created', status: 'Request Received', note: 'Customer submitted online request.', created_by: 'Customer', visibility: 'customer', created_at: '2026-03-30T14:10:00Z' },
  { id: 'time_2', request_id: 'req_1', event_type: 'status_changed', status: 'Checked In', note: 'Unit tagged and checked in.', created_by: 'Lyndsey', visibility: 'customer', created_at: '2026-03-31T08:15:00Z' },
  { id: 'time_3', request_id: 'req_1', event_type: 'status_changed', status: 'Diagnosing', note: 'Fuel delivery and ignition tests started.', created_by: 'Kelly Standish', visibility: 'internal', created_at: '2026-03-31T10:45:00Z' },
  { id: 'time_4', request_id: 'req_1', event_type: 'estimate_sent', status: 'Estimate Sent', note: 'Estimate sent to customer for carburetor and fuel line replacement.', created_by: 'Kelly Standish', visibility: 'customer', created_at: '2026-03-31T16:00:00Z' },
  { id: 'time_5', request_id: 'req_2', event_type: 'request_created', status: 'Request Received', note: 'Pickup requested through service portal.', created_by: 'Customer', visibility: 'customer', created_at: '2026-03-31T10:05:00Z' },
  { id: 'time_6', request_id: 'req_2', event_type: 'pickup_scheduled', status: 'Scheduled', note: 'Pickup added to Tuesday route.', created_by: 'LKN Dispatch', visibility: 'customer', created_at: '2026-03-31T11:10:00Z' },
  { id: 'time_7', request_id: 'req_2', event_type: 'status_changed', status: 'In Repair', note: 'Tune-up parts installed and running test pending.', created_by: 'Lyndsey', visibility: 'customer', retry_state: 'resolved', resolved_at: '2026-03-31T17:25:00Z', resolved_by: 'Kelly Standish', created_at: '2026-03-31T17:20:00Z' }
];

export const demoRequestCommunications: RequestCommunication[] = [
  { id: 'comm_1', request_id: 'req_1', customer_id: 'cust_1', direction: 'outbound', channel: 'sms', message: 'Your estimate for Hustler Raptor is ready to review in the portal.', sent_by: 'Automated SMS', created_at: '2026-03-31T16:01:00Z' },
  { id: 'comm_2', request_id: 'req_1', customer_id: 'cust_1', direction: 'outbound', channel: 'email', subject: 'Estimate Ready - LKN-1024', message: 'We sent your estimate and included the recommended parts and labor breakdown.', sent_by: 'LKN Small Engine', created_at: '2026-03-31T16:02:00Z' },
  { id: 'comm_3', request_id: 'req_2', customer_id: 'cust_1', direction: 'outbound', channel: 'phone', message: 'Confirmed pickup window for Tuesday morning.', sent_by: 'Lyndsey', created_at: '2026-03-31T11:12:00Z' }
];

export const demoNotifications: Notification[] = [
  { id: 'not_1', customer_id: 'cust_1', request_id: 'req_1', type: 'estimate_ready', title: 'Estimate ready', body: 'Your estimate for Hustler Raptor is ready to review.', channel: 'in_app', delivery_status: 'sent', created_at: '2026-03-31T16:00:00Z' },
  { id: 'not_2', customer_id: 'cust_1', request_id: 'req_2', type: 'status_update', title: 'Repair update', body: 'Your Echo PB-9010 is now in repair.', channel: 'sms', delivery_status: 'sent', created_at: '2026-03-31T17:15:00Z' }
];

export const demoInvoices: Invoice[] = [
  { id: 'inv_1', request_id: 'req_1', invoice_number: 'INV-1024', total: 300, status: 'unpaid', stripe_payment_url: 'https://example.com/pay/LKN-1024', due_date: '2026-04-08', notes: 'Payment due before pickup unless otherwise arranged.', created_at: '2026-03-31T18:00:00Z' },
  { id: 'inv_2', request_id: 'req_2', invoice_number: 'INV-1025', total: 185, status: 'paid', stripe_payment_url: 'https://example.com/pay/LKN-1025', paid_at: '2026-03-31T18:32:00Z', payment_method: 'Stripe', notes: 'Paid online after service completion.', created_at: '2026-03-31T18:30:00Z' }
];

export const demoPickupStops: PickupScheduleStop[] = [
  {
    id: 'pick_1',
    request_id: 'req_2',
    request_number: 'LKN-1025',
    customer_name: 'Jared Washington',
    customer_phone: '704-677-8461',
    equipment_name: 'Echo PB-9010',
    address: '619 N. Church St, Mooresville, NC 28115',
    route_date: '2026-04-02',
    stop_window: '9:00 AM - 11:00 AM',
    stop_type: 'pickup',
    route_status: 'scheduled',
    route_sequence: 2,
    driver_name: 'Matt',
    customer_visibility: true
  }
];

export const demoSyncLogs: SyncLog[] = [
  { id: 'sync_1', provider: 'flyntlok', direction: 'inbound', event_type: 'work_order.updated', status: 'processed', request_number: 'LKN-1025', response_status: 200, retry_count: 0, retry_state: 'resolved', resolved_at: '2026-03-31T17:25:00Z', resolved_by: 'Kelly Standish', created_at: '2026-03-31T17:20:00Z' },
  { id: 'sync_2', provider: 'zapier', direction: 'outbound', event_type: 'estimate.approved', status: 'received', request_number: 'LKN-1024', response_status: 202, retry_count: 1, dead_letter_note: null, retry_state: 'open', created_at: '2026-03-31T17:30:00Z' },
  { id: 'sync_3', provider: 'flyntlok', direction: 'outbound', event_type: 'request.callback_requested', status: 'failed', request_number: 'LKN-1024', response_status: 500, error_message: 'Timeout posting payload to Flyntlok endpoint', retry_count: 3, dead_letter_note: 'Verify remote endpoint and request signature before retrying.', last_attempt_at: '2026-03-31T18:10:00Z', created_at: '2026-03-31T18:10:00Z' }
];


export const demoStaffMembers: StaffMember[] = [
  { id: 'staff_1', full_name: 'Jared Washington', email: 'jared@lknsmallengine.com', role: 'admin', active: true, auth_user_id: 'demo-admin-user', created_at: '2026-03-01T09:00:00Z' },
  { id: 'staff_2', full_name: 'Kelly Standish', email: 'kelly@lknsmallengine.com', role: 'service_manager', active: true, created_at: '2026-03-01T09:00:00Z' },
  { id: 'staff_3', full_name: 'Lyndsey', email: 'lyndsey@lknsmallengine.com', role: 'service_writer', active: true, created_at: '2026-03-01T09:00:00Z' },
  { id: 'staff_4', full_name: 'Matt', email: 'matt@lknsmallengine.com', role: 'driver', active: true, default_queue_view: 'pickup-today', created_at: '2026-03-01T09:00:00Z' },
  { id: 'staff_5', full_name: 'Clint', email: 'clint@lknsmallengine.com', role: 'service_manager', active: false, default_queue_view: 'awaiting-approval', created_at: '2026-03-01T09:00:00Z' }
];


export const demoSyncLogAudits: SyncLogAudit[] = [
  { id: 'audit_1', sync_log_id: 'sync_1', action: 'resolved', note: 'Confirmed Flyntlok accepted update after retry.', performed_by: 'Kelly Standish', created_at: '2026-03-31T17:26:00Z' },
  { id: 'audit_2', sync_log_id: 'sync_2', action: 'do_not_retry', note: 'Duplicate Zap already completed manually.', performed_by: 'Jared Washington', created_at: '2026-03-31T18:10:00Z' },
  { id: 'audit_3', sync_log_id: 'sync_3', action: 'retry_sent', note: 'Manual resend attempted after endpoint check.', performed_by: 'Lyndsey', created_at: '2026-03-31T18:15:00Z' }
];


export const demoStaffLinkInvites = [
  { id: 'invite_1', email: 'lyndsey@lknsmallengine.com', role: 'service_writer', invited_by: 'Jared Washington', invite_token: 'demo-link-token-1', expires_at: '2026-04-30T23:59:59Z', accepted_at: null,
    revoked_at: null,
    revoked_by: null, created_at: '2026-04-01T12:00:00Z' }
];


export const demoRequestTaskChecklistItems: RequestTaskChecklistItem[] = [
  {
    id: 'task-1',
    request_id: 'req-1',
    title: 'Confirm serial number photo is attached',
    is_complete: true,
    sort_order: 1,
    assigned_role: 'service_writer',
    created_by: 'Jared Washington',
    completed_at: '2026-04-09T13:20:00.000Z',
    completed_by: 'Lyndsey',
    created_at: '2026-04-09T13:00:00.000Z'
  },
  {
    id: 'task-2',
    request_id: 'req-1',
    title: 'Collect estimate approval before starting repairs',
    is_complete: false,
    sort_order: 2,
    assigned_role: 'service_writer',
    created_by: 'Jared Washington',
    created_at: '2026-04-09T13:30:00.000Z'
  },
  {
    id: 'task-3',
    request_id: 'req-2',
    title: 'Schedule pickup window with customer',
    is_complete: false,
    sort_order: 1,
    assigned_role: 'driver',
    created_by: 'Lyndsey',
    created_at: '2026-04-10T08:30:00.000Z'
  }
];


export const demoChecklistTemplates: ChecklistTemplate[] = [
  { id: 'tmpl_1', request_type: 'Repair', title: 'Confirm complaint and duplicate issue', assigned_role: 'service_writer', sort_order: 1, active: true, created_at: '2026-03-20T09:00:00Z' },
  { id: 'tmpl_2', request_type: 'Repair', title: 'Document parts needed and ETA', assigned_role: 'service_manager', sort_order: 2, active: true, created_at: '2026-03-20T09:00:00Z' },
  { id: 'tmpl_3', request_type: 'Diagnostic', title: 'Collect test results and readings', assigned_role: 'tech', sort_order: 1, active: true, created_at: '2026-03-20T09:00:00Z' },
  { id: 'tmpl_4', request_type: 'Tune-Up', title: 'Verify maintenance items completed', assigned_role: 'tech', sort_order: 1, active: true, created_at: '2026-03-20T09:00:00Z' },
  { id: 'tmpl_5', request_type: 'Pickup/Delivery', title: 'Confirm access and pickup location', assigned_role: 'driver', sort_order: 1, active: true, created_at: '2026-03-20T09:00:00Z' }
];


export const demoNotificationTemplates: NotificationTemplate[] = [
  {
    id: 'nt_1',
    template_key: 'status_update_email',
    channel: 'email',
    subject_template: 'LKN Service Update: {{equipment_name}}',
    body_template: '<p>Your service request <strong>{{request_number}}</strong> is now <strong>{{status}}</strong>.</p><p>{{admin_notes}}</p>',
    active: true,
    created_at: '2026-04-10T09:00:00Z'
  },
  {
    id: 'nt_2',
    template_key: 'route_update_email',
    channel: 'email',
    subject_template: 'LKN {{stop_type_title}} Update',
    body_template: '<p>Your {{stop_type}} is now {{route_status_human}}.</p><p>{{route_date}} {{stop_window}}</p>',
    active: true,
    created_at: '2026-04-10T09:00:00Z'
  },
  {
    id: 'nt_3',
    template_key: 'staff_invite_email',
    channel: 'email',
    subject_template: "You're invited to the LKN Service Portal",
    body_template: '<p>You have been invited to join the LKN staff portal as {{role}}.</p><p>Use this link: <a href="{{invite_url}}">Accept invite</a></p>',
    active: true,
    created_at: '2026-04-10T09:00:00Z'
  }
];


export const demoNotificationSendLogs = [
  { id: 'nlog_1', template_id: null, template_key: 'status_update_sms', channel: 'sms', request_id: 'req_1', customer_id: 'cust_1', recipient: '704-555-0100', subject: null, rendered_body: 'LKN update: your request is now In Repair.', provider_message_id: 'demo-sms-1', provider_status: 'queued', send_mode: 'demo', error_message: null, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'nlog_2', template_id: null, template_key: 'invoice_customer', channel: 'email', request_id: 'req_2', customer_id: 'cust_2', recipient: 'customer@example.com', subject: 'Your LKN invoice is ready', rendered_body: '<p>Demo invoice email</p>', provider_message_id: 'demo-email-1', provider_status: 'queued', send_mode: 'demo', error_message: null, created_by: 'system', created_at: new Date().toISOString() }
];
