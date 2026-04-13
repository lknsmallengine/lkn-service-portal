
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  full_name text,
  phone text,
  email text,
  address text,
  role text default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete cascade,
  nickname text not null,
  equipment_type text not null,
  brand text not null,
  model text not null,
  serial_number text,
  created_at timestamptz not null default now()
);

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete set null,
  equipment_id uuid references equipment(id) on delete set null,
  request_number text unique not null,
  equipment_name text,
  issue_description text not null,
  request_type text not null,
  status text not null default 'Request Received',
  pickup_required boolean not null default false,
  requested_date date,
  admin_notes text,
  status_updated_at timestamptz,
  status_updated_by text,
  created_at timestamptz not null default now()
);

create table if not exists request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references service_requests(id) on delete cascade,
  file_path text not null,
  public_url text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists request_timeline_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references service_requests(id) on delete cascade,
  event_type text not null,
  status text,
  note text,
  created_by text,
  visibility text default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists request_communications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references service_requests(id) on delete cascade,
  customer_id uuid references profiles(id) on delete set null,
  direction text not null,
  channel text not null,
  subject text,
  message text not null,
  sent_by text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete cascade,
  request_id uuid references service_requests(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  channel text default 'in_app',
  delivery_status text default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references service_requests(id) on delete cascade,
  invoice_number text not null,
  total numeric(10,2) not null default 0,
  status text not null default 'unpaid',
  stripe_payment_url text,
  created_at timestamptz not null default now()
);

create table if not exists pickup_schedule (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references service_requests(id) on delete cascade,
  request_number text not null,
  customer_name text not null,
  customer_phone text,
  equipment_name text not null,
  address text,
  route_date date,
  stop_window text,
  stop_type text not null default 'pickup',
  route_status text not null default 'unscheduled',
  created_at timestamptz not null default now()
);

create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  direction text not null,
  event_type text not null,
  status text not null,
  request_number text,
  response_status integer,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table equipment enable row level security;
alter table service_requests enable row level security;
alter table request_media enable row level security;
alter table request_timeline_events enable row level security;
alter table request_communications enable row level security;
alter table notifications enable row level security;
alter table invoices enable row level security;
alter table pickup_schedule enable row level security;
alter table sync_logs enable row level security;

do $$ begin
  create policy "profiles self select" on profiles for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles self upsert" on profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles self update" on profiles for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "equipment own rows" on equipment for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "requests own rows" on service_requests for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "request media own rows" on request_media for select using (
    exists (
      select 1 from service_requests sr
      where sr.id = request_media.request_id and sr.customer_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "timeline own rows" on request_timeline_events for select using (
    exists (
      select 1 from service_requests sr
      where sr.id = request_timeline_events.request_id and sr.customer_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "communications own rows" on request_communications for select using (
    exists (
      select 1 from service_requests sr
      where sr.id = request_communications.request_id and sr.customer_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "notifications own rows" on notifications for select using (auth.uid() = customer_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "invoices own rows" on invoices for select using (
    exists (
      select 1 from service_requests sr
      where sr.id = invoices.request_id and sr.customer_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "pickup schedule own rows" on pickup_schedule for select using (false);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "sync logs admin only" on sync_logs for select using (false);
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public)
values ('request-media', 'request-media', true)
on conflict (id) do nothing;


-- Build 13 production note:
-- In production, mirror staff authorization in both middleware and database policies.
-- These helpers make it easier to expand beyond pure admin access to service_manager/service_writer roles.
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', 'customer');
$$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'service_manager', 'service_writer');
$$;

create index if not exists idx_pickup_schedule_request_id on pickup_schedule(request_id);


-- Build 14 additions
create table if not exists estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  line_type text not null,
  description text not null,
  quantity numeric,
  unit_price numeric,
  total_price numeric not null default 0,
  sort_order integer default 0,
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists callback_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  customer_id uuid references profiles(id) on delete set null,
  request_number text not null,
  preferred_contact text,
  note text,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

alter table if exists pickup_schedule add column if not exists route_sequence integer;
alter table if exists pickup_schedule add column if not exists driver_name text;
alter table if exists sync_logs add column if not exists retry_count integer default 0;

alter table estimate_line_items enable row level security;
alter table callback_requests enable row level security;

do $$ begin
  create policy "estimate line items own rows" on estimate_line_items for select using (
    exists (
      select 1 from service_requests sr
      where sr.id = estimate_line_items.request_id and sr.customer_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "callback requests own rows" on callback_requests for select using (
    exists (
      select 1 from service_requests sr
      where sr.id = callback_requests.request_id and sr.customer_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

create index if not exists idx_estimate_line_items_request_id on estimate_line_items(request_id, sort_order);
create index if not exists idx_callback_requests_request_id on callback_requests(request_id, created_at desc);
create index if not exists idx_pickup_schedule_route_date_sequence on pickup_schedule(route_date, route_sequence);


-- Build 16 additions
alter table if exists callback_requests add column if not exists assigned_to text;
alter table if exists callback_requests add column if not exists assigned_at timestamptz;
alter table if exists sync_logs add column if not exists dead_letter_note text;
alter table if exists sync_logs add column if not exists last_attempt_at timestamptz;

create index if not exists idx_callback_requests_status_assigned on callback_requests(status, assigned_to);
create index if not exists idx_sync_logs_status_provider on sync_logs(status, provider, created_at desc);


-- Build 17 additions
create table if not exists staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  role text not null default 'service_writer',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table if exists service_requests add column if not exists estimate_total numeric(10,2) default 0;
alter table if exists pickup_schedule add column if not exists customer_visibility boolean default true;
alter table if exists sync_logs add column if not exists retry_state text default 'open';
alter table if exists sync_logs add column if not exists resolved_at timestamptz;
alter table if exists sync_logs add column if not exists resolved_by text;

alter table staff_members enable row level security;

do $$ begin
  create policy "staff members staff view" on staff_members for select using (public.is_staff_role());
exception when duplicate_object then null; end $$;

create index if not exists idx_staff_members_active_role on staff_members(active, role, full_name);
create index if not exists idx_sync_logs_retry_state on sync_logs(retry_state, provider, created_at desc);


-- Build 18 additions
alter table if exists staff_members add column if not exists default_queue_view text default 'all';
alter table if exists staff_members add column if not exists default_route_date date;
alter table if exists staff_members add column if not exists phone text;

create table if not exists sync_log_audits (
  id uuid primary key default gen_random_uuid(),
  sync_log_id uuid not null references sync_logs(id) on delete cascade,
  action text not null,
  note text,
  performed_by text,
  created_at timestamptz not null default now()
);

alter table sync_log_audits enable row level security;

do $$ begin
  create policy "sync log audits staff view" on sync_log_audits for select using (public.is_staff_role());
exception when duplicate_object then null; end $$;

create index if not exists idx_staff_members_default_queue_view on staff_members(default_queue_view, active);
create index if not exists idx_sync_log_audits_sync_log_created on sync_log_audits(sync_log_id, created_at desc);


alter table if exists estimate_line_items add column if not exists unit_cost numeric(10,2);
alter table if exists estimate_line_items add column if not exists total_cost numeric(10,2);
create index if not exists idx_estimate_line_items_request_id_sort on estimate_line_items(request_id, sort_order);

drop policy if exists "staff members staff view" on staff_members;
create policy "staff members staff view" on staff_members for select using (public.is_staff_role());
drop policy if exists "staff members manager write" on staff_members;
create policy "staff members manager write" on staff_members for all using (public.jwt_role() in ('admin','service_manager')) with check (public.jwt_role() in ('admin','service_manager'));

drop policy if exists "sync log audits staff write" on sync_log_audits;
create policy "sync log audits staff write" on sync_log_audits for insert with check (public.is_staff_role());


alter table if exists staff_members add column if not exists auth_user_id uuid;
create index if not exists idx_staff_members_auth_user_id on staff_members(auth_user_id);

-- Build 20 note: link each staff row to its Supabase auth user id for stronger role resolution and staff-specific preferences.


alter table if exists request_media add column if not exists label text;
alter table if exists request_media add column if not exists note text;
alter table if exists invoices add column if not exists due_date date;
alter table if exists invoices add column if not exists paid_at timestamptz;
alter table if exists invoices add column if not exists payment_method text;
alter table if exists invoices add column if not exists notes text;

create table if not exists staff_link_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  invited_by text,
  invite_token text not null unique,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_staff_link_invites_email on staff_link_invites(email);
create index if not exists idx_staff_link_invites_token on staff_link_invites(invite_token);


-- Build 22 additions
create table if not exists request_task_checklist (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  sort_order integer default 0,
  assigned_role text,
  created_by text,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz not null default now()
);

alter table request_task_checklist enable row level security;

do $$ begin
  create policy "request task checklist staff view" on request_task_checklist for select using (public.is_staff_role());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "request task checklist staff write" on request_task_checklist for all using (public.is_staff_role()) with check (public.is_staff_role());
exception when duplicate_object then null; end $$;

create index if not exists idx_request_task_checklist_request_sort on request_task_checklist(request_id, sort_order, created_at);


-- Build 23 additions
alter table if exists request_media add column if not exists label text;
alter table if exists request_media add column if not exists note text;
alter table if exists staff_link_invites add column if not exists accepted_by_user_id uuid;
create index if not exists idx_request_media_request_label on request_media(request_id, label, created_at);
create index if not exists idx_staff_link_invites_token_email on staff_link_invites(invite_token, email);


-- Build 24 additions
alter table if exists staff_link_invites add column if not exists revoked_at timestamptz;
alter table if exists staff_link_invites add column if not exists revoked_by text;
create index if not exists idx_staff_link_invites_status on staff_link_invites(email, accepted_at, revoked_at, expires_at);

create table if not exists request_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  title text not null,
  assigned_role text,
  sort_order integer default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table request_checklist_templates enable row level security;

do $$ begin
  create policy "request checklist templates staff view" on request_checklist_templates for select using (public.is_staff_role());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "request checklist templates staff write" on request_checklist_templates for all using (public.is_staff_role()) with check (public.is_staff_role());
exception when duplicate_object then null; end $$;

create index if not exists idx_request_checklist_templates_type_sort on request_checklist_templates(request_type, active, sort_order, created_at);


-- Build 25 additions
create table if not exists notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  channel text not null default 'email',
  subject_template text,
  body_template text not null,
  active boolean not null default true,
  updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notification_templates enable row level security;

do $$ begin
  create policy "notification templates staff view" on notification_templates for select using (public.is_staff_role());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "notification templates staff write" on notification_templates for all using (public.is_staff_role()) with check (public.is_staff_role());
exception when duplicate_object then null; end $$;

create index if not exists idx_notification_templates_key_active on notification_templates(template_key, active);


create table if not exists notification_send_logs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references notification_templates(id) on delete set null,
  template_key text,
  channel text not null check (channel in ('email','sms')),
  request_id uuid references service_requests(id) on delete set null,
  customer_id uuid references profiles(id) on delete set null,
  recipient text,
  subject text,
  rendered_body text,
  provider_message_id text,
  provider_status text,
  send_mode text check (send_mode in ('live','demo')),
  error_message text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table notification_send_logs enable row level security;
drop policy if exists "notification send logs staff view" on notification_send_logs;
create policy "notification send logs staff view" on notification_send_logs for select using (public.is_staff_role());
drop policy if exists "notification send logs staff write" on notification_send_logs;
create policy "notification send logs staff write" on notification_send_logs for insert with check (public.is_staff_role());
create index if not exists idx_notification_send_logs_created on notification_send_logs(created_at desc);
create index if not exists idx_notification_send_logs_template on notification_send_logs(template_key, channel, created_at desc);


-- Build 28 additions
create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select public.current_app_role();
$$;

create or replace function public.can_manage_staff()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'service_manager');
$$;

do $$ begin
  create policy "profiles staff view" on profiles for select using (public.is_staff_role());
exception when duplicate_object then null; end $$;

drop policy if exists "equipment own rows" on equipment;
create policy "equipment customer select" on equipment for select using (auth.uid() = customer_id);
create policy "equipment customer insert" on equipment for insert with check (auth.uid() = customer_id);
create policy "equipment customer update" on equipment for update using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
create policy "equipment staff all" on equipment for all using (public.is_staff_role()) with check (public.is_staff_role());

drop policy if exists "requests own rows" on service_requests;
create policy "requests customer select" on service_requests for select using (auth.uid() = customer_id);
create policy "requests customer insert" on service_requests for insert with check (auth.uid() = customer_id);
create policy "requests staff all" on service_requests for all using (public.is_staff_role()) with check (public.is_staff_role());

create policy "request media customer insert" on request_media for insert with check (
  exists (
    select 1 from service_requests sr
    where sr.id = request_media.request_id and sr.customer_id = auth.uid()
  )
);
create policy "request media staff all" on request_media for all using (public.is_staff_role()) with check (public.is_staff_role());
create policy "timeline staff all" on request_timeline_events for all using (public.is_staff_role()) with check (public.is_staff_role());
create policy "communications staff all" on request_communications for all using (public.is_staff_role()) with check (public.is_staff_role());
create policy "notifications staff all" on notifications for all using (public.is_staff_role()) with check (public.is_staff_role());
create policy "invoices staff all" on invoices for all using (public.is_staff_role()) with check (public.is_staff_role());
drop policy if exists "pickup schedule own rows" on pickup_schedule;
create policy "pickup schedule customer select" on pickup_schedule for select using (
  customer_visibility = true and exists (
    select 1 from service_requests sr
    where sr.id = pickup_schedule.request_id and sr.customer_id = auth.uid()
  )
);
create policy "pickup schedule staff all" on pickup_schedule for all using (public.is_staff_role()) with check (public.is_staff_role());
drop policy if exists "sync logs admin only" on sync_logs;
create policy "sync logs staff view" on sync_logs for select using (public.is_staff_role());
create policy "sync logs staff write" on sync_logs for insert with check (public.is_staff_role());
create policy "estimate line items staff all" on estimate_line_items for all using (public.is_staff_role()) with check (public.is_staff_role());
create policy "callback requests staff all" on callback_requests for all using (public.is_staff_role()) with check (public.is_staff_role());
create policy "staff link invites staff view" on staff_link_invites for select using (public.can_manage_staff());
create policy "staff link invites staff write" on staff_link_invites for all using (public.can_manage_staff()) with check (public.can_manage_staff());

create index if not exists idx_profiles_role_created on profiles(role, created_at desc);
create index if not exists idx_service_requests_customer_status on service_requests(customer_id, status, created_at desc);
create index if not exists idx_notifications_customer_created on notifications(customer_id, created_at desc);
