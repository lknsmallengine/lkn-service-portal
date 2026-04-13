
import { logWebhookEvent } from './webhook-log';

function getHeaders(secret?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (secret) headers['x-lkn-webhook-secret'] = secret;
  return headers;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postOutboundWebhook(input: {
  provider: 'flyntlok' | 'zapier';
  eventType: string;
  requestNumber?: string;
  payload: unknown;
}) {
  const envKey = input.provider === 'flyntlok' ? 'FLYNTLOK_OUTBOUND_WEBHOOK_URL' : 'ZAPIER_OUTBOUND_WEBHOOK_URL';
  const secretKey = input.provider === 'flyntlok' ? 'FLYNTLOK_WEBHOOK_SECRET' : 'ZAPIER_WEBHOOK_SECRET';
  const url = process.env[envKey];
  const secret = process.env[secretKey];
  const maxAttempts = Math.max(1, Number(process.env.OUTBOUND_WEBHOOK_MAX_ATTEMPTS || 3));

  if (!url) {
    await logWebhookEvent({
      provider: input.provider,
      direction: 'outbound',
      eventType: input.eventType,
      status: 'failed',
      requestNumber: input.requestNumber,
      retryCount: 0,
      rawPayload: { reason: `Missing ${envKey}`, payload: input.payload }
    });
    return { ok: false, mode: 'demo', reason: `Missing ${envKey}` };
  }

  let lastStatus: number | undefined;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(secret),
        body: JSON.stringify(input.payload)
      });

      lastStatus = response.status;

      if (response.ok) {
        await logWebhookEvent({
          provider: input.provider,
          direction: 'outbound',
          eventType: input.eventType,
          status: 'processed',
          requestNumber: input.requestNumber,
          responseStatus: response.status,
          retryCount: attempt - 1,
          rawPayload: input.payload
        });

        return { ok: true, mode: 'live', status: response.status, attempts: attempt };
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown outbound webhook error';
    }

    if (attempt < maxAttempts) {
      await wait(attempt * 400);
    }
  }

  await logWebhookEvent({
    provider: input.provider,
    direction: 'outbound',
    eventType: input.eventType,
    status: 'failed',
    requestNumber: input.requestNumber,
    responseStatus: lastStatus,
    retryCount: maxAttempts - 1,
    rawPayload: input.payload,
    errorMessage: lastError
  });

  return { ok: false, mode: 'live', status: lastStatus, attempts: maxAttempts, reason: lastError };
}
