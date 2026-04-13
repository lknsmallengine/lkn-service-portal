import { NextRequest, NextResponse } from 'next/server';
import { verifyHmacSha256 } from '@/lib/webhook-utils';
import { logWebhookEvent } from '@/lib/webhook-log';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const authorized = verifyHmacSha256(raw, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  const payload = raw ? JSON.parse(raw) : {};

  if (!authorized && process.env.NEXT_PUBLIC_USE_DEMO_DATA !== 'true') {
    await logWebhookEvent({ provider: 'stripe', eventType: 'unauthorized', status: 'failed', rawPayload: payload });
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  await logWebhookEvent({
    provider: 'stripe',
    eventType: String(payload.type || 'stripe.event'),
    status: 'received',
    requestNumber: payload?.data?.object?.metadata?.request_number,
    rawPayload: payload
  });

  return NextResponse.json({ ok: true });
}
