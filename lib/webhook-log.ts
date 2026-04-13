
import { createSupabaseAdminClient, useDemoData } from './supabase';

export async function logWebhookEvent(input: {
  provider: 'flyntlok' | 'stripe' | 'zapier';
  direction?: 'inbound' | 'outbound';
  eventType: string;
  status: 'received' | 'processed' | 'failed';
  requestNumber?: string;
  responseStatus?: number | null;
  errorMessage?: string | null;
  retryCount?: number | null;
  rawPayload?: unknown;
}) {
  if (useDemoData) {
    console.log('demo webhook log', input);
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from('sync_logs').insert({
    provider: input.provider,
    direction: input.direction ?? 'inbound',
    event_type: input.eventType,
    status: input.status,
    request_number: input.requestNumber,
    response_status: input.responseStatus ?? null,
    error_message: input.errorMessage ?? null,
    retry_count: input.retryCount ?? 0,
    raw_payload: input.rawPayload
  });
}
