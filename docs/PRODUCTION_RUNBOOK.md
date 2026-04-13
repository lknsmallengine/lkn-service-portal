# Production Runbook – Build 27

## 1. Configure environments
- Copy `.env.example` to `.env.local` for local work and configure the matching secrets in Vercel for production.
- Set `NEXT_PUBLIC_USE_DEMO_DATA=false` in every non-demo environment.
- Set `NEXT_PUBLIC_APP_URL` to the real production domain.

## 2. Supabase
- Run `supabase/schema.sql` against the live project.
- Create a storage bucket named by `SUPABASE_STORAGE_BUCKET_REQUEST_MEDIA`.
- Add auth redirect URLs for:
  - the live app domain
  - `/login`
  - `/signup`
  - `/accept-invite`
- Load real `staff_members` records and backfill `auth_user_id` after staff signs in.

## 3. Notifications
- Configure Resend and verify the sending domain.
- Configure Twilio and verify the sending number.
- Test one invoice email, one status email, and one SMS before launch.

## 4. Payments
- Add Stripe secret and webhook secret only if you are using payment-link flows in production.
- Confirm the success and cancel URLs resolve back into the portal.

## 5. Integrations
- Set Flyntlok and Zapier webhook URLs and secrets.
- Run at least one outbound payload test to each destination.
- Verify failed webhooks write to sync logs and can be retried from admin.

## 6. Launch smoke test
- customer signup
- service request with attachments
- staff invite acceptance
- status update email
- estimate approval
- invoice detail view
- pickup route update
- webhook retry flow
