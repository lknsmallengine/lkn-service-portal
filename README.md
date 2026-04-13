Build 26 additions
- SMS template management alongside email templates
- notification send logs by template and channel
- stronger staff invite redirect notes for production onboarding
- final launch QA / deployment checklist pass

# LKN Service Portal – Build 23

Build 15 focuses on staff-side estimate management, callback follow-up, dispatch printing, and webhook recovery.

## What changed in Build 15
- admin-side **estimate line item create / delete** tools from the main service dashboard
- **callback request management board** for staff follow-up and status tracking
- **printable pickup / delivery route sheet** at `/admin/routes/print`
- **failed webhook retry queue UI** with action buttons tied to sync logs
- route stop save flow now sends **customer-facing route notifications** and logs the communication

## Existing stack
- Next.js App Router
- Supabase auth, database, and storage
- Stripe payment-link helper
- Twilio + Resend notification stubs
- Zapier / Flyntlok outbound and inbound webhook structure

## Run locally
```bash
npm install
npm run dev
```

## Required environment setup
Copy `.env.example` to `.env.local` and fill in:
- Supabase URL and anon key
- Supabase service role key
- Stripe secret key
- Twilio credentials
- Resend API key
- outbound webhook URLs for Zapier and Flyntlok
- `OUTBOUND_WEBHOOK_MAX_ATTEMPTS` for retry behavior

## Main implementation notes
- `app/admin/page.tsx` now exposes callback management, estimate tools, retry queue, and a printable route-sheet link
- `app/admin/routes/print/page.tsx` provides a print-friendly dispatch sheet grouped by route date
- `lib/actions.ts` already contained the Build 15 action layer and now the admin UI surfaces it
- `upsertPickupStop` sends in-app + SMS/email route updates when customer contact info is present

## Production follow-up after Build 15
- add true inline **edit** support for existing estimate line items instead of add/delete only
- add dead-letter resolution notes and filters to the retry queue
- connect driver assignment to internal staff records instead of free text
- wire callback board status changes into staff task ownership
- finalize Flyntlok field names against the live integration


## Build 16
- inline edit support for estimate line items from the admin dashboard
- callback request assignment fields (`assigned_to`, `assigned_at`)
- route-day filtering in the admin board and printable route sheet
- dead-letter note support on retryable webhook failures
- extra schema indexes for callback ownership and sync failure triage

### Production cleanup notes
- move staff names to a real staff table instead of the temporary hard-coded list in `app/admin/page.tsx`
- audit all admin flows against your final Supabase RLS policies before going live
- consider separate service-role actions for outbound webhooks if you do not want to rely on the end-user session for admin-triggered writes


## Build 17
- Added `staff_members` scaffolding and staff-powered pickers for callbacks and drivers.
- Added saved admin queue views.
- Estimate totals now auto-calc from line items and write back to `service_requests.estimate_total`.
- Added route-day duplication workflow for recurring pickup schedules.
- Added stronger webhook retry-state controls with `open`, `resolved`, and `do_not_retry`.


## Build 18 additions
- staff management UI on the admin page with queue-default support
- saved queue view preference action for staff users
- estimate subtotal / fee / discount / tax / total breakdown helper
- simple route optimization helper for dispatch sequencing
- webhook retry audit trail table and demo data

Production note: queue preferences should ultimately be keyed off the authenticated staff member record, and route optimization should be replaced with true mapping/geocoding if you want turn-by-turn efficiency.


## Build 20 additions

- staff CRUD expanded with save, deactivate, and delete flows
- admin request profit view with labor margin and parts margin tracking
- printable dispatch sheets now filter by driver and route date
- webhook retry actions now write audit entries into `sync_log_audits`
- permission cleanup tightened for staff preference saves and manager-only staff edits

### Production note

The profit view uses explicit `unit_cost` / `total_cost` values when they exist on estimate line items. If those fields are empty, the app falls back to simple assumptions so the dashboard still shows a directional gross profit estimate.


## Build 20 additions

- auth-to-staff record linking via `staff_members.auth_user_id`
- request-level profitability summary on request detail pages for staff users
- improved driver dispatch export filters and summary counts
- webhook audit detail page at `/admin/sync-logs/[id]`

## Production cleanup checklist

- populate `staff_members.auth_user_id` for every real staff user after Supabase auth signup
- align middleware role checks with database-backed roles once auth metadata is no longer authoritative
- seed driver/staff records before enabling admin assignment flows
- replace demo-only route optimization assumptions with a live mapping/dispatch provider if needed
- verify outbound webhook retry ownership and alerting before launch


## Build 21 additions

- staff onboarding flow with invite-token based staff account linking
- invoice detail page with customer-facing payment and line-item context
- request attachments now support labels like overall, damage, serial, before, and after
- production hardening notes: link each staff auth user to `staff_members.auth_user_id`, rotate webhook secrets before launch, disable demo fallback in production, and verify RLS policies for staff-only tables


## Build 22 additions
- upload-time attachment labeling and note capture on the service request form
- dedicated `/accept-invite` page for staff invite acceptance and account linking
- invoice email scaffolding for both customer-facing and internal staff copies
- request-level internal task checklist with add, complete, and reopen actions

### Production follow-up for Build 22
- convert attachment labeling from one label-per-upload-batch to per-file labeling if you want finer control
- point staff invoice email actions to real destination addresses and branded templates
- wire invite acceptance into your final auth onboarding flow and optional password creation path
- add task checklist permissions by role if certain staff should only view or complete, not create


## Build 23 additions
- per-file attachment labels and notes on the service-request form
- branded customer and staff invoice email templates
- fuller `/accept-invite` onboarding flow for new staff accounts or linking an existing login
- request checklist templates that auto-seed based on request type during request creation
- deployment hardening with security headers and an app URL env var

### Pre-launch deployment hardening
- set `NEXT_PUBLIC_USE_DEMO_DATA=false` in production and verify there is no demo fallback on your live deployment
- rotate all webhook secrets before launch and keep separate values for test vs production
- confirm the Supabase auth redirect URL list includes your live domain and `/accept-invite`
- review Row Level Security for all staff-only tables after you load real `staff_members.auth_user_id` values
- verify outbound invoice email sender domain authentication in Resend before customer launch
- add monitoring or alerts for failed webhooks and failed notification sends so the team sees issues early


## Build 24 additions
- branded customer notification templates beyond invoices, including estimate-ready, status-update, and route-update email builders
- drag-and-drop request upload area with per-file previews, labels, and notes
- staff invite resend and revoke controls from the admin dashboard
- editable request checklist templates in admin, backed by a new `request_checklist_templates` table
- added `DEPLOYMENT_CHECKLIST.md` for live launch cleanup and handoff

### Build 24 launch cleanup
- seed your real request checklist templates so repair, diagnostic, tune-up, and pickup flows match your operation
- verify staff invite resend/revoke behavior with live Supabase auth and email delivery
- confirm preview uploads behave well on mobile Safari and Android Chrome
- point branded status and route emails at your real portal URLs before customer launch


## Build 25 additions
- notification templates now back live status, route, and invite email flows
- admin can edit email templates from the operations dashboard
- staff invites now send portal acceptance emails
- admin layout tightened for a more launch-ready operations view


## Build 27 additions
- launch integration pass focused on production readiness instead of new feature scope
- new admin launch-readiness page at `/admin/launch`
- new `/api/health` route for simple launch and monitoring checks
- `lib/env.ts` centralizes provider/env readiness checks
- `scripts/verify-env.mjs` validates required vars before launch
- added `docs/PRODUCTION_RUNBOOK.md` for go-live setup

### Build 27 launch focus
This pass is about going live safely:
- wire real environment variables
- disable demo mode
- confirm Supabase auth + storage
- verify notification providers
- verify Flyntlok/Zapier endpoints
- run a smoke test before launch


## Build 28

Security and permissions pass:
- stronger role helpers in middleware and auth
- safer webhook signature comparison
- dedicated `/admin/security` review page
- RLS additions for staff/customer separation, pickup visibility, and invite controls
- `docs/SECURITY_CHECKLIST.md` for pre-launch validation


## Build 29

QA and launch pass:
- dedicated `/admin/qa` launch workspace for smoke testing and blocker review
- richer `/api/health` output with required blockers and QA metadata
- launch page cleanup focused on required blockers first
- stronger auth redirect verification guidance for Supabase production setup
- added `docs/QA_SMOKE_TEST.md` for pre-launch validation

### Build 29 launch recommendation
Use this build to stop feature work and test the real deployment path:
- run `npm run verify-env`
- clear `/admin/launch` blockers
- validate `/admin/security` with live roles
- run the smoke tests from `docs/QA_SMOKE_TEST.md`
- check `/api/health` after deployment before inviting customers
