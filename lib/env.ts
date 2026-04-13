export type LaunchCheck = {
  key: string;
  label: string;
  status: 'ready' | 'missing' | 'warning';
  value?: string;
  notes?: string;
  required: boolean;
  group?: 'launch' | 'security' | 'qa';
};

function present(value?: string | null) {
  return Boolean(value && String(value).trim());
}

function masked(value?: string | null) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 10) return 'configured';
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

function tryUrl(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(String(value));
  } catch {
    return null;
  }
}

function isHttpsUrl(value?: string | null) {
  const url = tryUrl(value);
  return Boolean(url && url.protocol === 'https:');
}

function authRedirectStatus() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!present(appUrl)) return { status: 'missing' as const, value: '', notes: 'Set NEXT_PUBLIC_APP_URL first, then add it to Supabase redirect URLs.' };
  const url = tryUrl(appUrl);
  if (!url) return { status: 'missing' as const, value: appUrl || '', notes: 'NEXT_PUBLIC_APP_URL is not a valid URL.' };
  const expected = [
    `${url.origin}/login`,
    `${url.origin}/signup`,
    `${url.origin}/accept-invite`,
    `${url.origin}/dashboard`,
    `${url.origin}/admin`
  ];
  return {
    status: isHttpsUrl(appUrl) ? 'warning' as const : 'warning' as const,
    value: expected.join(', '),
    notes: isHttpsUrl(appUrl)
      ? 'Confirm these exact URLs are allowed in Supabase auth redirects and site URL settings.'
      : 'Use an HTTPS production domain before launch and add these paths to Supabase redirects.'
  };
}

export function getLaunchChecks(): LaunchCheck[] {
  const authRedirect = authRedirectStatus();
  return [
    { key: 'app-url', label: 'Public app URL', required: true, group: 'launch', status: present(process.env.NEXT_PUBLIC_APP_URL) ? 'ready' : 'missing', value: process.env.NEXT_PUBLIC_APP_URL || '', notes: 'Used in invite links, portal links, and provider callbacks.' },
    { key: 'app-url-https', label: 'Public app URL uses HTTPS', required: true, group: 'launch', status: isHttpsUrl(process.env.NEXT_PUBLIC_APP_URL) ? 'ready' : 'warning', value: process.env.NEXT_PUBLIC_APP_URL || '', notes: 'Production launch should use HTTPS.' },
    { key: 'supabase-url', label: 'Supabase URL', required: true, group: 'launch', status: present(process.env.NEXT_PUBLIC_SUPABASE_URL) ? 'ready' : 'missing', value: masked(process.env.NEXT_PUBLIC_SUPABASE_URL), notes: 'Required for auth, database, and storage.' },
    { key: 'supabase-anon', label: 'Supabase anon key', required: true, group: 'launch', status: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? 'ready' : 'missing', value: masked(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { key: 'supabase-service-role', label: 'Supabase service role key', required: true, group: 'launch', status: present(process.env.SUPABASE_SERVICE_ROLE_KEY) ? 'ready' : 'missing', value: masked(process.env.SUPABASE_SERVICE_ROLE_KEY), notes: 'Required for admin/server-side actions and webhook writes.' },
    { key: 'demo-mode', label: 'Demo mode disabled', required: true, group: 'launch', status: process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'false' ? 'ready' : 'warning', value: process.env.NEXT_PUBLIC_USE_DEMO_DATA || 'true', notes: 'Set NEXT_PUBLIC_USE_DEMO_DATA=false before launch.' },
    { key: 'request-media-bucket', label: 'Request media bucket', required: true, group: 'launch', status: present(process.env.SUPABASE_STORAGE_BUCKET_REQUEST_MEDIA) ? 'ready' : 'missing', value: process.env.SUPABASE_STORAGE_BUCKET_REQUEST_MEDIA || '', notes: 'Bucket for photos and videos uploaded with service requests.' },
    { key: 'stripe-secret', label: 'Stripe secret key', required: false, group: 'launch', status: present(process.env.STRIPE_SECRET_KEY) ? 'ready' : 'warning', value: masked(process.env.STRIPE_SECRET_KEY), notes: 'Optional unless you are generating payment links from the app.' },
    { key: 'twilio', label: 'Twilio SMS credentials', required: false, group: 'launch', status: present(process.env.TWILIO_ACCOUNT_SID) && present(process.env.TWILIO_AUTH_TOKEN) && present(process.env.TWILIO_FROM_NUMBER) ? 'ready' : 'warning', value: present(process.env.TWILIO_ACCOUNT_SID) ? masked(process.env.TWILIO_ACCOUNT_SID) : '', notes: 'Needed for launch-grade SMS notifications.' },
    { key: 'resend', label: 'Resend email provider', required: false, group: 'launch', status: present(process.env.RESEND_API_KEY) && present(process.env.NOTIFICATIONS_FROM_EMAIL) ? 'ready' : 'warning', value: present(process.env.NOTIFICATIONS_FROM_EMAIL) ? process.env.NOTIFICATIONS_FROM_EMAIL : '', notes: 'Needed for customer and staff emails.' },
    { key: 'zapier-outbound', label: 'Zapier outbound webhook URL', required: false, group: 'launch', status: present(process.env.ZAPIER_OUTBOUND_WEBHOOK_URL) ? 'ready' : 'warning', value: process.env.ZAPIER_OUTBOUND_WEBHOOK_URL || '' },
    { key: 'flyntlok-outbound', label: 'Flyntlok outbound webhook URL', required: false, group: 'launch', status: present(process.env.FLYNTLOK_OUTBOUND_WEBHOOK_URL) ? 'ready' : 'warning', value: process.env.FLYNTLOK_OUTBOUND_WEBHOOK_URL || '' },
    { key: 'security-headers', label: 'Security headers configured', required: true, group: 'security', status: 'ready', value: 'next.config.mjs', notes: 'X-Frame-Options, Referrer-Policy, and related headers ship with this app.' },
    { key: 'webhook-secrets', label: 'Inbound webhook secrets', required: true, group: 'security', status: present(process.env.FLYNTLOK_WEBHOOK_SECRET) && present(process.env.ZAPIER_WEBHOOK_SECRET) ? 'ready' : 'missing', value: present(process.env.FLYNTLOK_WEBHOOK_SECRET) || present(process.env.ZAPIER_WEBHOOK_SECRET) ? 'configured' : '', notes: 'Use separate secrets for production and test.' },
    { key: 'stripe-webhook-secret', label: 'Stripe webhook secret', required: false, group: 'security', status: present(process.env.STRIPE_WEBHOOK_SECRET) ? 'ready' : 'warning', value: masked(process.env.STRIPE_WEBHOOK_SECRET) },
    { key: 'auth-cookie-domain', label: 'Supabase auth redirect review', required: true, group: 'security', status: authRedirect.status, value: authRedirect.value, notes: authRedirect.notes },
    { key: 'launch-monitoring', label: 'Health endpoint available', required: true, group: 'qa', status: 'ready', value: '/api/health', notes: 'Use this endpoint for simple smoke testing after deployment.' },
  ];
}

export function summarizeLaunchChecks(checks = getLaunchChecks()) {
  const requiredMissing = checks.filter((c) => c.required && c.status !== 'ready').length;
  const warnings = checks.filter((c) => c.status === 'warning').length;
  const ready = checks.filter((c) => c.status === 'ready').length;
  const score = Math.round((ready / checks.length) * 100);
  return { requiredMissing, warnings, ready, total: checks.length, score };
}
