# QA Smoke Test – Build 29

Run this in a Vercel preview or production environment with demo mode disabled.

## Customer flow
1. Sign in as a customer.
2. Create a service request with at least one image or video attachment.
3. Confirm the request appears in the customer dashboard and admin queue.
4. Open the request detail page and approve or decline an estimate.
5. Open the invoice list and invoice detail page.
6. Confirm payment-link rendering if Stripe is enabled.

## Staff flow
1. Sign in as a staff user.
2. Open `/admin` and update a request status.
3. Confirm a timeline event and notification log entry are written.
4. Create or update a pickup/delivery stop.
5. Confirm the customer-facing route status card updates.
6. Send and complete a staff invite through `/accept-invite`.

## Integration checks
1. Open `/api/health` and confirm `ok: true`.
2. Confirm webhook secrets are set for Flyntlok, Zapier, and Stripe if used.
3. Trigger one outbound webhook and confirm retry behavior logs correctly.
4. Send one email and one SMS notification if those providers are enabled.

## Launch sign-off
1. Run `npm run verify-env`.
2. Review `/admin/launch`.
3. Review `/admin/security`.
4. Confirm no required blockers remain.
5. Confirm Supabase redirect URLs match your production domain and `/accept-invite`.
