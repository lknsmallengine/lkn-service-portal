export type QaCheck = {
  id: string;
  group: 'customer' | 'staff' | 'integrations' | 'launch';
  title: string;
  path?: string;
  required?: boolean;
  notes?: string;
};

export function getQaChecks(): QaCheck[] {
  return [
    { id: 'signup-login', group: 'customer', title: 'Create or sign in to a customer account', path: '/login', required: true, notes: 'Verify login, session persistence, and redirect to /dashboard.' },
    { id: 'request-create', group: 'customer', title: 'Create a service request with at least one attachment', path: '/dashboard/requests', required: true, notes: 'Confirm request, upload labels, and checklist seeding all save correctly.' },
    { id: 'request-approval', group: 'customer', title: 'Approve and decline an estimate from the request detail page', path: '/dashboard/requests', required: true },
    { id: 'invoice-view', group: 'customer', title: 'Open invoice detail and confirm payment link rendering', path: '/dashboard/invoices', required: true },
    { id: 'admin-queue', group: 'staff', title: 'Open admin queue and update a request status', path: '/admin', required: true, notes: 'This should write a timeline event and notification log entry.' },
    { id: 'pickup-route', group: 'staff', title: 'Create or edit a pickup stop and verify customer-facing route status', path: '/admin', required: true },
    { id: 'invite-flow', group: 'staff', title: 'Send a staff invite and complete the /accept-invite flow', path: '/admin', required: true },
    { id: 'webhook-health', group: 'integrations', title: 'Hit /api/health and confirm the app returns ok=true before launch', path: '/api/health', required: true },
    { id: 'webhook-secrets', group: 'integrations', title: 'Verify inbound webhook secrets and one outbound retry path', path: '/admin/security', required: true },
    { id: 'launch-page', group: 'launch', title: 'Review /admin/launch and clear all required blockers', path: '/admin/launch', required: true },
    { id: 'vercel-env', group: 'launch', title: 'Run npm run verify-env before Vercel deployment', required: true, notes: 'This should be clean with demo mode disabled.' },
  ];
}

export function summarizeQaChecks(checks = getQaChecks()) {
  const required = checks.filter((c) => c.required).length;
  const optional = checks.length - required;
  const groups = Array.from(new Set(checks.map((c) => c.group)));
  return { total: checks.length, required, optional, groups };
}
