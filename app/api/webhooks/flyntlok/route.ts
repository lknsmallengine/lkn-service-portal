import { NextRequest, NextResponse } from 'next/server';
import { verifyBasicSharedSecret } from '@/lib/webhook-utils';
import { logWebhookEvent } from '@/lib/webhook-log';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const authorized = verifyBasicSharedSecret(request.headers.get('x-flyntlok-secret'), process.env.FLYNTLOK_WEBHOOK_SECRET);

  if (!authorized && process.env.NEXT_PUBLIC_USE_DEMO_DATA !== 'true') {
    await logWebhookEvent({ provider: 'flyntlok', eventType: 'unauthorized', status: 'failed', rawPayload: payload });
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  await logWebhookEvent({
    provider: 'flyntlok',
    eventType: String(payload.event_type || payload.event || 'flyntlok.event'),
    status: 'received',
    requestNumber: payload.request_number,
    rawPayload: payload
  });

  return NextResponse.json({ ok: true });
}
