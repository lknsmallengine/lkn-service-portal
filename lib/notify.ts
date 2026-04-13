import twilio from 'twilio';
import { Resend } from 'resend';

export async function sendSmsNotification(input: { to?: string | null; body: string; templateKey?: string | null; templateId?: string | null; requestId?: string | null; customerId?: string | null; createdBy?: string | null; subject?: string | null }) {
  if (!input.to || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    return { ok: false, mode: 'demo', reason: 'Missing Twilio config or destination.' };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to: input.to,
    body: input.body
  });

  return { ok: true, mode: 'live', id: message.sid };
}

export async function sendEmailNotification(input: { to?: string | null; subject: string; html: string; templateKey?: string | null; templateId?: string | null; requestId?: string | null; customerId?: string | null; createdBy?: string | null }) {
  if (!input.to || !process.env.RESEND_API_KEY || !process.env.NOTIFICATIONS_FROM_EMAIL) {
    return { ok: false, mode: 'demo', reason: 'Missing Resend config or destination.' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.NOTIFICATIONS_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html
  });

  return { ok: true, mode: 'live', id: result.data?.id };
}


function shell(title: string, intro: string, bodyHtml: string) {
  return `
  <div style="font-family:Arial,sans-serif;background:#111827;padding:24px;color:#e5e7eb;">
    <div style="max-width:640px;margin:0 auto;background:#1f2937;border:1px solid #374151;border-radius:14px;overflow:hidden;">
      <div style="background:#f97316;color:#111827;padding:18px 22px;font-weight:700;font-size:20px;">LKN Small Engine</div>
      <div style="padding:22px;">
        <div style="font-size:22px;font-weight:700;margin-bottom:8px;">${title}</div>
        <p style="margin:0 0 16px 0;color:#d1d5db;line-height:1.5;">${intro}</p>
        ${bodyHtml}
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #374151;color:#9ca3af;font-size:13px;line-height:1.5;">
          LKN Small Engine • Mooresville, NC<br />
          Faster service updates, estimate approvals, and pickup coordination.
        </div>
      </div>
    </div>
  </div>`;
}

export function buildCustomerInvoiceEmailTemplate(input: { customerName?: string | null; invoiceNumber: string; requestNumber?: string | null; equipmentName?: string | null; total: string; dueDate?: string | null; paymentUrl?: string | null; }) {
  const cta = input.paymentUrl ? `<p style="margin:20px 0;"><a href="${input.paymentUrl}" style="background:#f97316;color:#111827;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;display:inline-block;">Pay invoice</a></p>` : '';
  const rows = `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:8px 0;color:#9ca3af;">Invoice</td><td style="padding:8px 0;text-align:right;">${input.invoiceNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Request</td><td style="padding:8px 0;text-align:right;">${input.requestNumber || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Equipment</td><td style="padding:8px 0;text-align:right;">${input.equipmentName || 'Service request'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Total due</td><td style="padding:8px 0;text-align:right;font-weight:700;">${input.total}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Due date</td><td style="padding:8px 0;text-align:right;">${input.dueDate || 'Due on receipt'}</td></tr>
    </table>`;
  return shell(`Invoice ${input.invoiceNumber}`, `Hi ${input.customerName || 'there'}, your invoice is ready. Review the summary below and use the payment link if you would like to pay online.`, rows + cta + `<p style="color:#d1d5db;line-height:1.5;">Questions about the repair or invoice? Reply to this email or contact the shop and we will help you quickly.</p>`);
}

export function buildStaffInvoiceEmailTemplate(input: { invoiceNumber: string; requestNumber?: string | null; equipmentName?: string | null; total: string; dueDate?: string | null; customerName?: string | null; customerEmail?: string | null; }) {
  const body = `
    <p style="color:#d1d5db;line-height:1.5;">An invoice is ready for follow-up. This copy is meant for the internal service team.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:8px 0;color:#9ca3af;">Invoice</td><td style="padding:8px 0;text-align:right;">${input.invoiceNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Request</td><td style="padding:8px 0;text-align:right;">${input.requestNumber || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Customer</td><td style="padding:8px 0;text-align:right;">${input.customerName || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Customer email</td><td style="padding:8px 0;text-align:right;">${input.customerEmail || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Equipment</td><td style="padding:8px 0;text-align:right;">${input.equipmentName || 'Service request'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Total due</td><td style="padding:8px 0;text-align:right;font-weight:700;">${input.total}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Due date</td><td style="padding:8px 0;text-align:right;">${input.dueDate || 'Due on receipt'}</td></tr>
    </table>`;
  return shell(`Internal follow-up: ${input.invoiceNumber}`, 'Keep the service team aligned on payment status and customer follow-up.', body);
}


export function buildEstimateReadyEmailTemplate(input: { customerName?: string | null; requestNumber: string; equipmentName?: string | null; estimateTotal?: string | null; portalUrl?: string | null; }) {
  const cta = input.portalUrl ? `<p style="margin:20px 0;"><a href="${input.portalUrl}" style="background:#f97316;color:#111827;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;display:inline-block;">Review estimate</a></p>` : '';
  const body = `
    <p style="color:#d1d5db;line-height:1.5;">Your estimate is ready for ${input.equipmentName || 'your equipment'}.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:8px 0;color:#9ca3af;">Request</td><td style="padding:8px 0;text-align:right;">${input.requestNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Equipment</td><td style="padding:8px 0;text-align:right;">${input.equipmentName || 'Service request'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Estimate total</td><td style="padding:8px 0;text-align:right;font-weight:700;">${input.estimateTotal || 'See portal'}</td></tr>
    </table>`;
  return shell(`Estimate ready for ${input.requestNumber}`, `Hi ${input.customerName || 'there'}, your LKN estimate is ready to review.`, body + cta);
}

export function buildStatusUpdateEmailTemplate(input: { customerName?: string | null; requestNumber: string; equipmentName?: string | null; status: string; note?: string | null; portalUrl?: string | null; }) {
  const cta = input.portalUrl ? `<p style="margin:20px 0;"><a href="${input.portalUrl}" style="background:#f97316;color:#111827;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;display:inline-block;">View request</a></p>` : '';
  const body = `
    <p style="color:#d1d5db;line-height:1.5;">Your service request status has changed to <strong>${input.status}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:8px 0;color:#9ca3af;">Request</td><td style="padding:8px 0;text-align:right;">${input.requestNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Equipment</td><td style="padding:8px 0;text-align:right;">${input.equipmentName || 'Service request'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Current status</td><td style="padding:8px 0;text-align:right;font-weight:700;">${input.status}</td></tr>
    </table>
    ${input.note ? `<p style="color:#d1d5db;line-height:1.5;">${input.note}</p>` : ''}`;
  return shell(`Service update for ${input.requestNumber}`, `Hi ${input.customerName || 'there'}, here is the latest update from LKN Small Engine.`, body + cta);
}

export function buildRouteUpdateEmailTemplate(input: { customerName?: string | null; requestNumber: string; stopType: 'pickup' | 'delivery'; routeDate?: string | null; stopWindow?: string | null; driverName?: string | null; address?: string | null; portalUrl?: string | null; }) {
  const title = input.stopType === 'pickup' ? 'Pickup scheduled' : 'Delivery scheduled';
  const cta = input.portalUrl ? `<p style="margin:20px 0;"><a href="${input.portalUrl}" style="background:#f97316;color:#111827;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;display:inline-block;">View route details</a></p>` : '';
  const body = `
    <p style="color:#d1d5db;line-height:1.5;">Your ${input.stopType} has been scheduled.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:8px 0;color:#9ca3af;">Request</td><td style="padding:8px 0;text-align:right;">${input.requestNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Date</td><td style="padding:8px 0;text-align:right;">${input.routeDate || 'Pending'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Window</td><td style="padding:8px 0;text-align:right;">${input.stopWindow || 'Pending'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Driver</td><td style="padding:8px 0;text-align:right;">${input.driverName || 'LKN team'}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;">Address</td><td style="padding:8px 0;text-align:right;">${input.address || 'On file'}</td></tr>
    </table>`;
  return shell(title, `Hi ${input.customerName || 'there'}, here is your latest route update from LKN Small Engine.`, body + cta);
}


export function renderStoredTemplate(template: string | null | undefined, values: Record<string, string | number | null | undefined>) {
  const source = template || '';
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
    const value = values[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function buildStaffInviteEmailTemplate(input: { inviteeEmail: string; role: string; inviteUrl: string; invitedBy?: string | null }) {
  const body = `
    <p style="color:#d1d5db;line-height:1.5;">You have been invited to join the LKN Small Engine service portal as <strong>${input.role}</strong>.</p>
    <p style="margin:20px 0;"><a href="${input.inviteUrl}" style="background:#f97316;color:#111827;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;display:inline-block;">Accept invite</a></p>
    <p style="color:#d1d5db;line-height:1.5;">This invite was sent to ${input.inviteeEmail}.${input.invitedBy ? ` It was issued by ${input.invitedBy}.` : ''}</p>`;
  return shell('Join the LKN staff portal', 'Set your account up and link it to the correct staff record before launch.', body);
}


export function buildSmsTemplate(input: { brand?: string | null; message: string }) {
  const brand = input.brand || 'LKN Small Engine';
  return `${brand}: ${input.message}`.trim();
}
