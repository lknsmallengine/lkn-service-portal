Build 26 additions
- SMS template management alongside email templates
- notification send logs by template and channel
- stronger staff invite redirect notes for production onboarding
- final launch QA / deployment checklist pass

# Build 24 deployment checklist

## Required before launch
- Set `NEXT_PUBLIC_USE_DEMO_DATA=false`
- Add live Supabase URL, anon key, and service role key
- Add live Resend, Twilio, Stripe, Flyntlok, and Zapier secrets
- Verify `NEXT_PUBLIC_APP_URL` matches the production domain
- Add the production domain and `/accept-invite` redirect to Supabase auth settings
- Load real `staff_members` records and connect each one to `auth_user_id`
- Seed `request_checklist_templates` for your real request types
- Rotate webhook secrets and verify signature validation end-to-end

## Recommended before customer launch
- Verify branded emails render correctly in Gmail and iPhone Mail
- Confirm outbound notification sender domain is authenticated
- Test pickup and delivery route notifications with a real staff record
- Review row-level security for every staff-only table
- Add monitoring for failed webhooks and failed notifications
- Confirm Stripe payment links open the correct hosted payment page


## Build 25 pre-launch items
- seed `notification_templates` with your approved branded copy
- set `NEXT_PUBLIC_APP_URL` to the real Vercel domain
- confirm Resend sending domain and from-address for invite/status emails
- test invite acceptance flow with a real Supabase auth user

- verify `notification_send_logs` writes on both SMS and email sends
- confirm staff invite links use the public app URL and correct post-login redirects
- test one full estimate/status/invoice notification flow in live mode

## Build 27 – Launch integration pass
- [ ] Set `NEXT_PUBLIC_USE_DEMO_DATA=false`
- [ ] Set `NEXT_PUBLIC_APP_URL` to the real domain
- [ ] Configure `SUPABASE_STORAGE_BUCKET_REQUEST_MEDIA`
- [ ] Run `npm run verify-env`
- [ ] Visit `/api/health` in the deployed app and confirm required checks are green
- [ ] Visit `/admin/launch` as staff and confirm readiness score is acceptable
- [ ] Run the smoke test from `docs/PRODUCTION_RUNBOOK.md`
