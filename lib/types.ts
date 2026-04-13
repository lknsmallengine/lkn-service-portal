export type Profile = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  email?: string | null;
  address?: string | null;
  created_at?: string;
};


export type StaffMember = {
  id: string;
  full_name: string;
  email?: string | null;
  role: 'admin' | 'service_manager' | 'service_writer' | 'driver';
  active?: boolean;
  default_queue_view?: string | null;
  default_route_date?: string | null;
  phone?: string | null;
  auth_user_id?: string | null;
  created_at?: string;
};

export type Equipment = {
  id: string;
  customer_id?: string;
  nickname: string;
  equipment_type: string;
  brand: string;
  model: string;
  serial_number: string;
  created_at?: string;
};

export type ServiceRequest = {
  id: string;
  customer_id?: string | null;
  request_number: string;
  equipment_id?: string;
  equipment_name: string;
  issue_description: string;
  request_type: string;
  status: string;
  pickup_required: boolean;
  requested_date: string;
  estimate_total?: number;
  admin_notes?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
  created_at?: string;
};

export type EstimateLineItem = {
  id: string;
  request_id: string;
  line_type: 'labor' | 'part' | 'fee' | 'discount' | 'note';
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  total_price: number;
  unit_cost?: number | null;
  total_cost?: number | null;
  sort_order?: number | null;
  customer_visible?: boolean | null;
  created_at?: string;
};

export type CallbackRequest = {
  id: string;
  request_id: string;
  customer_id?: string | null;
  request_number: string;
  preferred_contact?: 'phone' | 'sms' | 'email' | null;
  note?: string | null;
  status: 'requested' | 'acknowledged' | 'completed';
  assigned_to?: string | null;
  assigned_at?: string | null;
  created_at: string;
};

export type RequestMedia = {
  id: string;
  request_id: string;
  file_path: string;
  public_url?: string | null;
  mime_type?: string | null;
  label?: 'overall' | 'damage' | 'serial' | 'before' | 'after' | 'other' | null;
  note?: string | null;
  created_at?: string;
};

export type Notification = {
  id: string;
  customer_id?: string | null;
  request_id?: string | null;
  type: string;
  title: string;
  body: string;
  channel?: 'sms' | 'email' | 'in_app' | null;
  delivery_status?: 'queued' | 'sent' | 'failed' | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  request_id: string;
  invoice_number: string;
  total: number;
  status: 'paid' | 'unpaid';
  stripe_payment_url?: string;
  due_date?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
};

export type SyncLog = {
  id: string;
  provider: 'flyntlok' | 'stripe' | 'zapier';
  direction: 'inbound' | 'outbound';
  event_type: string;
  status: 'received' | 'processed' | 'failed';
  request_number?: string;
  response_status?: number | null;
  error_message?: string | null;
  retry_count?: number | null;
  dead_letter_note?: string | null;
  last_attempt_at?: string | null;
  retry_state?: 'open' | 'resolved' | 'do_not_retry' | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  raw_payload?: unknown;
};

export type FlyntlokFieldMap = {
  appField: string;
  flyntlokField: string;
  required?: boolean;
  notes?: string;
};

export type OutboundFieldMap = {
  eventType: string;
  provider: 'flyntlok' | 'zapier';
  appField: string;
  outboundField: string;
  required?: boolean;
  transform?: string;
  notes?: string;
};

export type RequestTimelineEvent = {
  id: string;
  request_id: string;
  event_type: string;
  status?: string | null;
  note?: string | null;
  created_by?: string | null;
  visibility?: 'internal' | 'customer' | null;
  created_at: string;
};

export type RequestCommunication = {
  id: string;
  request_id: string;
  customer_id?: string | null;
  direction: 'outbound' | 'inbound';
  channel: 'sms' | 'email' | 'phone' | 'in_app';
  subject?: string | null;
  message: string;
  sent_by?: string | null;
  created_at: string;
};

export type PickupScheduleStop = {
  id: string;
  request_id: string;
  request_number: string;
  customer_name: string;
  customer_phone?: string | null;
  equipment_name: string;
  address?: string | null;
  route_date?: string | null;
  stop_window?: string | null;
  stop_type: 'pickup' | 'delivery';
  route_status: 'unscheduled' | 'scheduled' | 'en_route' | 'completed';
  route_sequence?: number | null;
  driver_name?: string | null;
  customer_visibility?: boolean | null;
};


export type RequestTaskChecklistItem = {
  id: string;
  request_id: string;
  title: string;
  is_complete: boolean;
  sort_order?: number | null;
  assigned_role?: 'admin' | 'service_manager' | 'service_writer' | 'driver' | 'tech' | null;
  created_by?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  created_at: string;
};

export type AdminQueueRequest = ServiceRequest & {
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
};


export type EstimateBreakdown = {
  subtotal: number;
  fees: number;
  discounts: number;
  taxable: number;
  tax: number;
  total: number;
};

export type SyncLogAudit = {
  id: string;
  sync_log_id: string;
  action: string;
  note?: string | null;
  performed_by?: string | null;
  created_at: string;
};


export type RequestProfitRow = {
  request_id: string;
  request_number: string;
  equipment_name: string;
  labor_revenue: number;
  labor_cost: number;
  labor_margin: number;
  parts_revenue: number;
  parts_cost: number;
  parts_margin: number;
  fees: number;
  discounts: number;
  tax: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  gross_margin_percent: number;
};


export type StaffLinkInvite = {
  id: string;
  email: string;
  role: 'admin' | 'service_manager' | 'service_writer' | 'driver';
  invited_by?: string | null;
  invite_token: string;
  expires_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  accepted_by_user_id?: string | null;
  created_at: string;
};

export type ChecklistTemplate = {
  id: string;
  request_type: string;
  title: string;
  assigned_role?: 'admin' | 'service_manager' | 'service_writer' | 'driver' | 'tech' | null;
  sort_order?: number | null;
  active?: boolean | null;
  created_at: string;
};


export type NotificationTemplate = {
  id: string;
  template_key: string;
  channel: 'email' | 'sms';
  subject_template?: string | null;
  body_template: string;
  active?: boolean | null;
  updated_at?: string | null;
  created_at: string;
};


export type NotificationSendLog = {
  id: string;
  template_id?: string | null;
  template_key?: string | null;
  channel: 'email' | 'sms';
  request_id?: string | null;
  customer_id?: string | null;
  recipient?: string | null;
  subject?: string | null;
  rendered_body?: string | null;
  provider_message_id?: string | null;
  provider_status?: string | null;
  send_mode?: 'live' | 'demo';
  error_message?: string | null;
  created_by?: string | null;
  created_at: string;
};
