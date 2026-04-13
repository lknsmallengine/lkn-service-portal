# Security Checklist

## Role model
- Customer accounts should only read their own equipment, service requests, invoices, notifications, media, and pickup stops.
- `service_writer` and `service_manager` should have admin workflow access.
- Only `admin` and `service_manager` should manage staff records and invites.

## Pre-launch checks
1. Set `NEXT_PUBLIC_USE_DEMO_DATA=false`.
2. Confirm Supabase redirect URLs include the live domain and `/accept-invite`.
3. Apply the latest `supabase/schema.sql` so RLS policies and helper functions exist.
4. Verify inbound webhook secrets are set for Flyntlok, Zapier, and Stripe.
5. Confirm request media storage bucket permissions match the intended upload flow.
6. Test customer isolation with two separate non-staff accounts.
7. Test staff/admin isolation with at least one service writer and one admin account.

## Smoke tests
- Customer A cannot view Customer B request detail pages.
- Customer cannot load `/admin` routes.
- Unsigned webhook requests return `401`.
- Revoked invite tokens are rejected.
- Staff can read admin queues, sync logs, and route boards after schema migration.
