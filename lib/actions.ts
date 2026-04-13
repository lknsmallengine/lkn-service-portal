
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createInvoicePaymentLink } from './payments';
import { uploadRequestFile } from './storage';
import { createSupabaseServerClient, useDemoData } from './supabase';
import { getCurrentDisplayName, getCurrentRole, getCurrentRoleName } from './auth';
import { getChecklistTemplates, getNotificationTemplates } from './data';
import { buildCustomerInvoiceEmailTemplate, buildStaffInvoiceEmailTemplate, buildEstimateReadyEmailTemplate, buildStatusUpdateEmailTemplate, buildRouteUpdateEmailTemplate, buildStaffInviteEmailTemplate, renderStoredTemplate, sendEmailNotification, sendSmsNotification } from './notify';
import { buildFieldLevelOutboundPayload, buildFlyntlokRequestPayload } from './flyntlok-map';
import { postOutboundWebhook } from './outbound-webhooks';



async function logNotificationSend(input: {
  templateKey?: string | null;
  templateId?: string | null;
  channel: 'email' | 'sms';
  requestId?: string | null;
  customerId?: string | null;
  recipient?: string | null;
  subject?: string | null;
  renderedBody?: string | null;
  providerMessageId?: string | null;
  providerStatus?: string | null;
  sendMode?: 'live' | 'demo';
  errorMessage?: string | null;
  createdBy?: string | null;
}) {
  if (useDemoData) {
    console.log('demo notification_send_log', input);
    return;
  }
  const supabase = createSupabaseServerClient();
  if (!supabase) return;
  await supabase.from('notification_send_logs').insert({
    template_id: input.templateId || null,
    template_key: input.templateKey || null,
    channel: input.channel,
    request_id: input.requestId || null,
    customer_id: input.customerId || null,
    recipient: input.recipient || null,
    subject: input.subject || null,
    rendered_body: input.renderedBody || null,
    provider_message_id: input.providerMessageId || null,
    provider_status: input.providerStatus || null,
    send_mode: input.sendMode || null,
    error_message: input.errorMessage || null,
    created_by: input.createdBy || null
  });
}

async function sendTemplatedNotification(input: {
  templateKey: string;
  channel: 'email' | 'sms';
  to?: string | null;
  subjectFallback?: string;
  bodyFallback: string;
  values?: Record<string, string | number | null | undefined>;
  requestId?: string | null;
  customerId?: string | null;
  createdBy?: string | null;
}) {
  const templates = await getNotificationTemplates();
  const template = templates.find((item) => item.template_key === input.templateKey && item.channel === input.channel && item.active !== false);
  const body = template ? renderStoredTemplate(template.body_template, input.values || {}) : input.bodyFallback;
  const subject = input.channel === 'email' ? (template ? renderStoredTemplate(template.subject_template || input.subjectFallback || '', input.values || {}) : (input.subjectFallback || input.templateKey)) : undefined;
  const result = input.channel === 'sms'
    ? await sendSmsNotification({ to: input.to, body, templateKey: input.templateKey, templateId: template?.id || null, requestId: input.requestId, customerId: input.customerId, createdBy: input.createdBy })
    : await sendEmailNotification({ to: input.to, subject: subject || input.templateKey, html: body, templateKey: input.templateKey, templateId: template?.id || null, requestId: input.requestId, customerId: input.customerId, createdBy: input.createdBy });
  await logNotificationSend({
    templateKey: input.templateKey,
    templateId: template?.id || null,
    channel: input.channel,
    requestId: input.requestId,
    customerId: input.customerId,
    recipient: input.to,
    subject: subject || null,
    renderedBody: body,
    providerMessageId: (result as any)?.id || null,
    providerStatus: (result as any)?.ok ? 'sent' : 'failed',
    sendMode: ((result as any)?.mode === 'live' ? 'live' : 'demo'),
    errorMessage: (result as any)?.reason || null,
    createdBy: input.createdBy || null
  });
  return result;
}

function nextRequestNumber() {
  return `LKN-${Date.now().toString().slice(-6)}`;
}

function flash(path: string, key: string, value: string) {
  const encoded = encodeURIComponent(value);
  redirect(`${path}${path.includes('?') ? '&' : '?'}${key}=${encoded}`);
}

async function getChecklistTemplateForRequestType(requestType: string) {
  const normalized = requestType.trim();
  const templates = await getChecklistTemplates(normalized);
  if (templates.length) {
    return templates.map((item) => ({ title: item.title, assigned_role: item.assigned_role || null }));
  }

  const fallback: Record<string, { title: string; assigned_role?: string | null }[]> = {
    repair: [
      { title: 'Confirm complaint and intake notes', assigned_role: 'service_writer' },
      { title: 'Assign technician and begin diagnosis', assigned_role: 'service_manager' },
      { title: 'Prepare estimate and contact customer', assigned_role: 'service_writer' }
    ],
    diagnostic: [
      { title: 'Verify symptoms and gather media', assigned_role: 'service_writer' },
      { title: 'Complete diagnostic workup', assigned_role: 'service_manager' },
      { title: 'Review repair recommendation with customer', assigned_role: 'service_writer' }
    ],
    'tune-up': [
      { title: 'Confirm maintenance package requested', assigned_role: 'service_writer' },
      { title: 'Complete service and quality check', assigned_role: 'service_manager' },
      { title: 'Prepare pickup notification', assigned_role: 'service_writer' }
    ],
    'pickup/delivery': [
      { title: 'Confirm route date and access instructions', assigned_role: 'driver' },
      { title: 'Create pickup or delivery stop', assigned_role: 'driver' },
      { title: 'Notify customer when en route', assigned_role: 'service_writer' }
    ]
  };
  const key = normalized.toLowerCase();
  return fallback[key] || fallback.repair;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (useDemoData) redirect('/dashboard');

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/login?error=missing-config');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect('/dashboard');
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = `${String(formData.get('first_name') || '').trim()} ${String(formData.get('last_name') || '').trim()}`.trim();
  const phone = String(formData.get('phone') || '').trim();

  if (useDemoData) redirect('/dashboard');

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/signup?error=missing-config');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: 'customer' }
    }
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);

  if (data.user?.id) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      phone,
      role: 'customer',
      email
    });
  }

  redirect('/dashboard');
}

export async function signOutAction() {
  if (!useDemoData) {
    const supabase = createSupabaseServerClient();
    await supabase?.auth.signOut();
  }
  redirect('/login');
}

export async function createServiceRequest(formData: FormData) {
  const requestNumber = nextRequestNumber();

  const payload = {
    request_number: requestNumber,
    equipment_id: String(formData.get('equipment_id') || ''),
    equipment_name: String(formData.get('equipment_name') || 'Equipment'),
    issue_description: String(formData.get('issue_description') || ''),
    request_type: String(formData.get('request_type') || 'Repair'),
    status: 'Request Received',
    pickup_required: String(formData.get('pickup_required') || 'false') === 'true',
    requested_date: String(formData.get('requested_date') || new Date().toISOString().slice(0, 10))
  };

  const mediaFiles = formData.getAll('media').filter((item): item is File => item instanceof File && item.size > 0);
  const mediaMetadata = mediaFiles.map((file, index) => ({
    file,
    label: String(formData.get(`media_label_${index}`) || formData.get('media_label') || 'overall').trim(),
    note: String(formData.get(`media_note_${index}`) || formData.get('media_note') || '').trim()
  }));
  const flyntlokPayload = buildFlyntlokRequestPayload(payload);

  if (useDemoData) {
    console.log('demo createServiceRequest', payload, mediaMetadata.map((f) => ({ name: f.file.name, label: f.label, note: f.note })), flyntlokPayload);
    revalidatePath('/dashboard/requests');
    revalidatePath('/dashboard');
    return { ok: true, requestNumber, mode: 'demo' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'No authenticated user.' };

  const { data, error } = await supabase
    .from('service_requests')
    .insert({ ...payload, customer_id: userId, status_updated_at: new Date().toISOString() })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  for (const item of mediaMetadata) {
    const uploaded = await uploadRequestFile(data.id, item.file);
    await supabase.from('request_media').insert({
      request_id: data.id,
      file_path: uploaded.path,
      public_url: uploaded.publicUrl,
      mime_type: item.file.type || null,
      label: item.label || 'overall',
      note: item.note || null
    });
  }

  const checklistTemplate = await getChecklistTemplateForRequestType(payload.request_type);
  if (checklistTemplate.length) {
    await supabase.from('request_task_checklist').insert(
      checklistTemplate.map((task, index) => ({
        request_id: data.id,
        title: task.title,
        assigned_role: task.assigned_role || null,
        sort_order: index + 1,
        created_by: 'system'
      }))
    );
  }

  await supabase.from('request_timeline_events').insert({
    request_id: data.id,
    event_type: 'request_created',
    status: payload.status,
    note: `${payload.request_type} request created`,
    created_by: 'customer',
    visibility: 'customer'
  });

  await postOutboundWebhook({
    provider: 'zapier',
    eventType: 'service_request.created',
    requestNumber,
    payload: flyntlokPayload
  });

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard');
  redirect(`/dashboard/requests/${data.id}`);
}

export async function updateProfile(formData: FormData) {
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const phone = String(formData.get('phone') || '').trim();
  const address = String(formData.get('address') || '').trim();

  if (useDemoData) {
    console.log('demo updateProfile', { fullName, phone, address });
    revalidatePath('/dashboard/profile');
    return { ok: true, mode: 'demo' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'No authenticated user.' };

  const { error } = await supabase.from('profiles').upsert({ id: userId, full_name: fullName, phone, address });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/profile');
  return { ok: true, mode: 'live' };
}

export async function createEquipment(formData: FormData) {
  const payload = {
    nickname: String(formData.get('nickname') || '').trim(),
    equipment_type: String(formData.get('equipment_type') || '').trim(),
    brand: String(formData.get('brand') || '').trim(),
    model: String(formData.get('model') || '').trim(),
    serial_number: String(formData.get('serial_number') || '').trim()
  };

  if (useDemoData) {
    console.log('demo createEquipment', payload);
    revalidatePath('/dashboard/equipment');
    return { ok: true, mode: 'demo' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'No authenticated user.' };

  const { error } = await supabase.from('equipment').insert({ ...payload, customer_id: userId });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/equipment');
  revalidatePath('/dashboard/requests');
  return { ok: true, mode: 'live' };
}

export async function updateEquipment(formData: FormData) {
  const id = String(formData.get('id') || '');
  const payload = {
    nickname: String(formData.get('nickname') || '').trim(),
    equipment_type: String(formData.get('equipment_type') || '').trim(),
    brand: String(formData.get('brand') || '').trim(),
    model: String(formData.get('model') || '').trim(),
    serial_number: String(formData.get('serial_number') || '').trim()
  };

  if (useDemoData) {
    console.log('demo updateEquipment', { id, ...payload });
    revalidatePath('/dashboard/equipment');
    redirect('/dashboard/equipment');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.from('equipment').update(payload).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/equipment');
  redirect('/dashboard/equipment');
}

export async function deleteEquipment(formData: FormData) {
  const id = String(formData.get('id') || '');

  if (useDemoData) {
    console.log('demo deleteEquipment', { id });
    revalidatePath('/dashboard/equipment');
    return { ok: true, mode: 'demo' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/equipment');
  revalidatePath('/dashboard/requests');
  return { ok: true, mode: 'live' };
}

export async function approveEstimate(formData: FormData) {
  const requestId = String(formData.get('request_id') || '');
  const requestNumber = String(formData.get('request_number') || '');
  const customerId = String(formData.get('customer_id') || '') || null;
  const decision = String(formData.get('decision') || 'approved');

  if (useDemoData) {
    console.log('demo approveEstimate', { requestId, decision });
    revalidatePath('/dashboard/requests');
    return { ok: true, mode: 'demo' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const nextStatus = decision === 'approved' ? 'Approved' : 'Estimate Declined';
  const { error } = await supabase.from('service_requests').update({ status: nextStatus, status_updated_at: new Date().toISOString() }).eq('id', requestId);
  if (error) return { ok: false, error: error.message };

  await supabase.from('notifications').insert({
    customer_id: customerId,
    request_id: requestId,
    type: decision === 'approved' ? 'estimate_approved' : 'estimate_declined',
    title: decision === 'approved' ? 'Estimate approved' : 'Estimate declined',
    body: decision === 'approved' ? 'Your approval was received and your repair can move forward.' : 'Your estimate was declined. Our team can follow up if needed.',
    channel: 'in_app',
    delivery_status: 'sent'
  });

  await postOutboundWebhook({
    provider: 'zapier',
    eventType: decision === 'approved' ? 'estimate.approved' : 'estimate.declined',
    requestNumber,
    payload: buildFieldLevelOutboundPayload(decision === 'approved' ? 'estimate.approved' : 'estimate.declined', 'zapier', { requestId, requestNumber, decision, approvedAt: new Date().toISOString() })
  });

  revalidatePath('/dashboard/requests');
  revalidatePath(`/dashboard/requests/${requestId}`);
  return { ok: true, mode: 'live' };
}

export async function requestCallbackAction(formData: FormData) {
  const requestId = String(formData.get('request_id') || '');
  const requestNumber = String(formData.get('request_number') || '');
  const customerId = String(formData.get('customer_id') || '') || null;
  const preferredContact = String(formData.get('preferred_contact') || 'phone') as 'phone' | 'sms' | 'email';
  const note = String(formData.get('note') || '').trim();
  const redirectTo = String(formData.get('redirect_to') || `/dashboard/requests/${requestId}`);

  if (useDemoData) {
    console.log('demo requestCallbackAction', { requestId, requestNumber, preferredContact, note });
    revalidatePath(`/dashboard/requests/${requestId}`);
    flash(redirectTo, 'success', 'Callback requested');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash(redirectTo, 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('callback_requests').insert({
    request_id: requestId,
    customer_id: customerId,
    request_number: requestNumber,
    preferred_contact: preferredContact,
    note: note || null,
    status: 'requested'
  });
  if (error) flash(redirectTo, 'error', error.message);

  await supabase!.from('notifications').insert({
    customer_id: customerId,
    request_id: requestId,
    type: 'callback_requested',
    title: 'Callback requested',
    body: `Customer requested a callback by ${preferredContact}.${note ? ` ${note}` : ''}`,
    channel: 'in_app',
    delivery_status: 'sent'
  });

  await supabase!.from('request_communications').insert({
    request_id: requestId,
    customer_id: customerId,
    direction: 'inbound',
    channel: 'in_app',
    subject: 'Customer callback request',
    message: `Preferred contact: ${preferredContact}.${note ? ` ${note}` : ''}`,
    sent_by: 'Customer'
  });

  await postOutboundWebhook({
    provider: 'flyntlok',
    eventType: 'request.callback_requested',
    requestNumber,
    payload: buildFieldLevelOutboundPayload('request.callback_requested', 'flyntlok', {
      request_number: requestNumber,
      preferred_contact: preferredContact,
      note
    })
  });

  await postOutboundWebhook({
    provider: 'zapier',
    eventType: 'request.callback_requested',
    requestNumber,
    payload: buildFieldLevelOutboundPayload('request.callback_requested', 'zapier', {
      request_number: requestNumber,
      preferred_contact: preferredContact,
      note
    })
  });

  revalidatePath(`/dashboard/requests/${requestId}`);
  flash(redirectTo, 'success', 'Callback requested');
}

export async function createPaymentLinkAction(formData: FormData) {
  const requestNumber = String(formData.get('request_number') || 'UNKNOWN');
  const amount = Number(formData.get('amount') || 0);
  const email = String(formData.get('customer_email') || '');
  const link = await createInvoicePaymentLink({ requestNumber, amountDollars: amount, customerEmail: email });
  return { ok: true, ...link };
}

export async function updateRequestStatus(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const requestId = String(formData.get('request_id') || '');
  const requestNumber = String(formData.get('request_number') || '');
  const customerId = String(formData.get('customer_id') || '') || null;
  const status = String(formData.get('status') || '').trim();
  const customerPhone = String(formData.get('customer_phone') || '').trim();
  const customerEmail = String(formData.get('customer_email') || '').trim();
  const equipmentName = String(formData.get('equipment_name') || 'Equipment').trim();
  const adminNotes = String(formData.get('admin_notes') || '').trim();
  const updatedBy = await getCurrentDisplayName();
  const updatedAt = new Date().toISOString();

  const smsBody = `LKN Small Engine update: ${equipmentName} is now marked ${status}. Reply or call if you have questions.`;
  const statusTemplate = await getNotificationTemplateOverride('status_update_email');
  const statusTemplateValues = {
    request_number: requestNumber,
    equipment_name: equipmentName,
    status,
    admin_notes: adminNotes || '',
    portal_url: buildPortalUrl(`/dashboard/requests/${requestId}`)
  };
  const emailSubject = renderStoredTemplate(statusTemplate?.subject_template || 'LKN Service Update: {{equipment_name}}', statusTemplateValues) || `LKN Service Update: ${equipmentName}`;
  const emailHtml = statusTemplate?.body_template
    ? renderStoredTemplate(statusTemplate.body_template, statusTemplateValues)
    : buildStatusUpdateEmailTemplate({ requestNumber, equipmentName, status, note: adminNotes || null, portalUrl: buildPortalUrl(`/dashboard/requests/${requestId}`) });

  const outboundPayload = { request_number: requestNumber, requestId, status, equipmentName, admin_notes: adminNotes, updatedBy, updatedAt, customer_email: customerEmail, customer_phone: customerPhone };

  if (useDemoData) {
    console.log('demo updateRequestStatus', { requestId, status, requestNumber, customerPhone, customerEmail, adminNotes });
    revalidatePath('/admin');
    revalidatePath(`/dashboard/requests/${requestId}`);
    flash('/admin', 'success', `Updated ${requestNumber} to ${status}`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');

  const { error } = await supabase!.from('service_requests').update({
    status,
    admin_notes: adminNotes || null,
    status_updated_at: updatedAt,
    status_updated_by: updatedBy
  }).eq('id', requestId);
  if (error) flash('/admin', 'error', error.message);

  await supabase!.from('notifications').insert({
    customer_id: customerId,
    request_id: requestId,
    type: 'status_update',
    title: `Status updated: ${status}`,
    body: `${equipmentName} is now ${status}.${adminNotes ? ` ${adminNotes}` : ''}`,
    channel: 'in_app',
    delivery_status: 'sent'
  });

  const [smsResult, emailResult] = await Promise.allSettled([
    sendSmsNotification({ to: customerPhone || undefined, body: smsBody }),
    sendEmailNotification({ to: customerEmail || undefined, subject: emailSubject, html: emailHtml })
  ]);

  await postOutboundWebhook({
    provider: 'flyntlok',
    eventType: 'work_order.status_updated',
    requestNumber,
    payload: buildFieldLevelOutboundPayload('work_order.status_updated', 'flyntlok', outboundPayload)
  });

  await postOutboundWebhook({
    provider: 'zapier',
    eventType: 'work_order.status_updated',
    requestNumber,
    payload: {
      ...buildFieldLevelOutboundPayload('work_order.status_updated', 'zapier', outboundPayload),
      smsResult,
      emailResult
    }
  });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/requests');
  revalidatePath(`/dashboard/requests/${requestId}`);
  flash('/admin', 'success', `Updated ${requestNumber} to ${status}`);
}

export async function addTimelineEntry(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const requestId = String(formData.get('request_id') || '');
  const requestNumber = String(formData.get('request_number') || '');
  const eventType = String(formData.get('event_type') || 'tech_note').trim();
  const status = String(formData.get('status') || '').trim() || null;
  const note = String(formData.get('note') || '').trim();
  const visibility = String(formData.get('visibility') || 'internal').trim();
  const createdBy = await getCurrentDisplayName();

  if (useDemoData) {
    console.log('demo addTimelineEntry', { requestId, eventType, status, note, visibility, createdBy });
    revalidatePath(`/dashboard/requests/${requestId}`);
    return { ok: true, mode: 'demo' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

  const { error } = await supabase.from('request_timeline_events').insert({
    request_id: requestId,
    event_type: eventType,
    status,
    note,
    visibility,
    created_by: createdBy
  });
  if (error) return { ok: false, error: error.message };

  await postOutboundWebhook({
    provider: 'zapier',
    eventType: 'request.timeline_added',
    requestNumber,
    payload: { requestId, requestNumber, eventType, status, note, visibility, createdBy }
  });

  revalidatePath(`/dashboard/requests/${requestId}`);
  return { ok: true, mode: 'live' };
}

export async function addCommunicationLogEntry(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const requestId = String(formData.get('request_id') || '');
  const customerId = String(formData.get('customer_id') || '') || null;
  const direction = String(formData.get('direction') || 'outbound').trim();
  const channel = String(formData.get('channel') || 'phone').trim();
  const subject = String(formData.get('subject') || '').trim() || null;
  const message = String(formData.get('message') || '').trim();
  const sentBy = await getCurrentDisplayName();

  if (useDemoData) {
    console.log('demo addCommunicationLogEntry', { requestId, customerId, direction, channel, subject, message, sentBy });
    revalidatePath(`/dashboard/requests/${requestId}`);
    return { ok: true, mode: 'demo' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

  const { error } = await supabase.from('request_communications').insert({
    request_id: requestId,
    customer_id: customerId,
    direction,
    channel,
    subject,
    message,
    sent_by: sentBy
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/requests/${requestId}`);
  return { ok: true, mode: 'live' };
}

export async function bulkUpdateRequestStatuses(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const identifiers = String(formData.get('request_identifiers') || '').split(',').map((item) => item.trim()).filter(Boolean);
  const status = String(formData.get('status') || '').trim();
  const adminNotes = String(formData.get('admin_notes') || '').trim();
  const updatedBy = await getCurrentDisplayName();
  const updatedAt = new Date().toISOString();

  if (!identifiers.length) flash('/admin', 'error', 'No request identifiers provided');

  if (useDemoData) {
    console.log('demo bulkUpdateRequestStatuses', { identifiers, status, adminNotes, updatedBy, updatedAt });
    revalidatePath('/admin');
    flash('/admin', 'success', `Updated ${identifiers.length} request(s)`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');

  const { data: requests, error: selectError } = await supabase!
    .from('service_requests')
    .select('id, request_number')
    .or(identifiers.map((item) => `id.eq.${item},request_number.eq.${item}`).join(','));

  if (selectError) flash('/admin', 'error', selectError.message);
  if (!requests?.length) flash('/admin', 'error', 'No matching requests found');

  const ids = requests!.map((item) => item.id);
  const { error } = await supabase!.from('service_requests').update({
    status,
    admin_notes: adminNotes || null,
    status_updated_at: updatedAt,
    status_updated_by: updatedBy
  }).in('id', ids);
  if (error) flash('/admin', 'error', error.message);

  await supabase!.from('request_timeline_events').insert(
    requests!.map((item) => ({
      request_id: item.id,
      event_type: 'bulk_status_changed',
      status,
      note: adminNotes || `Bulk-updated to ${status}`,
      created_by: updatedBy,
      visibility: 'internal'
    }))
  );

  revalidatePath('/admin');
  requests!.forEach((item) => revalidatePath(`/dashboard/requests/${item.id}`));
  flash('/admin', 'success', `Updated ${requests!.length} request(s)`);
}

export async function upsertPickupStop(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const payload = {
    request_id: String(formData.get('request_id') || ''),
    request_number: String(formData.get('request_number') || ''),
    customer_name: String(formData.get('customer_name') || ''),
    customer_phone: String(formData.get('customer_phone') || ''),
    customer_id: String(formData.get('customer_id') || '') || null,
    customer_email: String(formData.get('customer_email') || '') || null,
    equipment_name: String(formData.get('equipment_name') || ''),
    address: String(formData.get('address') || ''),
    route_date: String(formData.get('route_date') || '') || null,
    stop_window: String(formData.get('stop_window') || '') || null,
    stop_type: String(formData.get('stop_type') || 'pickup'),
    route_status: String(formData.get('route_status') || 'scheduled'),
    route_sequence: Number(formData.get('route_sequence') || 0) || null,
    driver_name: String(formData.get('driver_name') || '').trim() || null,
    customer_visibility: true
  };

  if (useDemoData) {
    console.log('demo upsertPickupStop', payload);
    revalidatePath('/admin');
    revalidatePath(`/dashboard/requests/${payload.request_id}`);
    flash('/admin', 'success', `Saved route stop for ${payload.request_number}`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');

  const { data: existing } = await supabase!.from('pickup_schedule').select('id').eq('request_id', payload.request_id).maybeSingle();

  let error = null;
  if (existing?.id) {
    ({ error } = await supabase!.from('pickup_schedule').update(payload).eq('id', existing.id));
  } else {
    ({ error } = await supabase!.from('pickup_schedule').insert(payload));
  }
  if (error) flash('/admin', 'error', error.message);

  const routeMessage = `${payload.stop_type === 'pickup' ? 'Pickup' : 'Delivery'} is now ${String(payload.route_status).replace('_', ' ')}${payload.route_date ? ` for ${payload.route_date}` : ''}${payload.stop_window ? ` during ${payload.stop_window}` : ''}.`;
  await supabase!.from('notifications').insert({
    customer_id: payload.customer_id,
    request_id: payload.request_id,
    type: 'route_status_update',
    title: `${payload.stop_type === 'pickup' ? 'Pickup' : 'Delivery'} update`,
    body: routeMessage,
    channel: 'in_app',
    delivery_status: 'sent'
  });

  await supabase!.from('request_communications').insert({
    request_id: payload.request_id,
    customer_id: payload.customer_id,
    direction: 'outbound',
    channel: 'in_app',
    subject: `${payload.stop_type === 'pickup' ? 'Pickup' : 'Delivery'} update`,
    message: routeMessage,
    sent_by: updatedBy || 'LKN Dispatch'
  });

  const routeTemplate = await getNotificationTemplateOverride('route_update_email');
  const routeTemplateValues = {
    request_number: payload.request_number,
    stop_type: payload.stop_type,
    stop_type_title: payload.stop_type === 'pickup' ? 'Pickup' : 'Delivery',
    route_status_human: String(payload.route_status).replace('_', ' '),
    route_date: payload.route_date || '',
    stop_window: payload.stop_window || '',
    driver_name: payload.driver_name || 'LKN team',
    address: payload.address || '',
    portal_url: buildPortalUrl(`/dashboard/requests/${payload.request_id}`)
  };
  await Promise.allSettled([
    sendSmsNotification({
      to: payload.customer_phone || undefined,
      body: `LKN Small Engine ${payload.stop_type}: ${String(payload.route_status).replace('_', ' ')}${payload.route_date ? ` on ${payload.route_date}` : ''}${payload.stop_window ? ` (${payload.stop_window})` : ''}.`
    }),
    sendEmailNotification({
      to: payload.customer_email || undefined,
      subject: renderStoredTemplate(routeTemplate?.subject_template || 'LKN {{stop_type_title}} Update', routeTemplateValues) || `LKN ${payload.stop_type === 'pickup' ? 'Pickup' : 'Delivery'} Update`,
      html: routeTemplate?.body_template
        ? renderStoredTemplate(routeTemplate.body_template, routeTemplateValues)
        : buildRouteUpdateEmailTemplate({ requestNumber: payload.request_number, stopType: payload.stop_type as any, routeDate: payload.route_date || null, stopWindow: payload.stop_window || null, driverName: payload.driver_name || null, address: payload.address || null, portalUrl: buildPortalUrl(`/dashboard/requests/${payload.request_id}`) })
    })
  ]);

  await postOutboundWebhook({
    provider: 'zapier',
    eventType: 'route.status_updated',
    requestNumber: payload.request_number,
    payload: buildFieldLevelOutboundPayload('route.status_updated', 'zapier', payload)
  });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/requests/${payload.request_id}`);
  flash('/admin', 'success', `Saved route stop for ${payload.request_number}`);
}


export async function saveEstimateLineItem(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const id = String(formData.get('id') || '').trim();
  const requestId = String(formData.get('request_id') || '').trim();
  const requestNumber = String(formData.get('request_number') || '').trim();
  const payload = {
    request_id: requestId,
    line_type: String(formData.get('line_type') || 'labor').trim(),
    description: String(formData.get('description') || '').trim(),
    quantity: Number(formData.get('quantity') || 1) || 1,
    unit_price: Number(formData.get('unit_price') || 0) || 0,
    total_price: Number(formData.get('total_price') || 0) || 0,
    sort_order: Number(formData.get('sort_order') || 0) || 0,
    customer_visible: String(formData.get('customer_visible') || 'true') === 'true'
  };

  if (!payload.description) flash('/admin', 'error', 'Estimate line description is required');
  if (!Number.isFinite(payload.total_price) || payload.total_price === 0) {
    payload.total_price = Number(((payload.quantity || 0) * (payload.unit_price || 0)).toFixed(2));
  }

  if (useDemoData) {
    console.log('demo saveEstimateLineItem', { id, requestId, payload });
    revalidatePath('/admin');
    revalidatePath(`/dashboard/requests/${requestId}`);
    flash('/admin', 'success', `Saved estimate line for ${requestNumber}`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');

  let error = null;
  if (id) {
    ({ error } = await supabase!.from('estimate_line_items').update(payload).eq('id', id));
  } else {
    ({ error } = await supabase!.from('estimate_line_items').insert(payload));
  }
  if (error) flash('/admin', 'error', error.message);

  const { data: lineTotals } = await supabase!.from('estimate_line_items').select('total_price, line_type').eq('request_id', requestId);
  const estimateTotal = (lineTotals || []).reduce((sum, item: any) => {
    const sign = item.line_type === 'discount' ? -1 : 1;
    return sum + sign * Number(item.total_price || 0);
  }, 0);
  await supabase!.from('service_requests').update({ estimate_total: Number(estimateTotal.toFixed(2)) }).eq('id', requestId);

  await supabase!.from('request_timeline_events').insert({
    request_id: requestId,
    event_type: id ? 'estimate_line_updated' : 'estimate_line_added',
    note: payload.description,
    visibility: 'internal',
    created_by: await getCurrentDisplayName()
  });

  revalidatePath('/admin');
  revalidatePath(`/dashboard/requests/${requestId}`);
  flash('/admin', 'success', `Saved estimate line for ${requestNumber}`);
}

export async function deleteEstimateLineItem(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const id = String(formData.get('id') || '').trim();
  const requestId = String(formData.get('request_id') || '').trim();
  const requestNumber = String(formData.get('request_number') || '').trim();

  if (useDemoData) {
    console.log('demo deleteEstimateLineItem', { id, requestId });
    revalidatePath('/admin');
    revalidatePath(`/dashboard/requests/${requestId}`);
    flash('/admin', 'success', `Deleted estimate line for ${requestNumber}`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('estimate_line_items').delete().eq('id', id);
  if (error) flash('/admin', 'error', error.message);

  const { data: lineTotals } = await supabase!.from('estimate_line_items').select('total_price, line_type').eq('request_id', requestId);
  const estimateTotal = (lineTotals || []).reduce((sum, item: any) => {
    const sign = item.line_type === 'discount' ? -1 : 1;
    return sum + sign * Number(item.total_price || 0);
  }, 0);
  await supabase!.from('service_requests').update({ estimate_total: Number(estimateTotal.toFixed(2)) }).eq('id', requestId);

  revalidatePath('/admin');
  revalidatePath(`/dashboard/requests/${requestId}`);
  flash('/admin', 'success', `Deleted estimate line for ${requestNumber}`);
}

export async function updateCallbackRequestStatus(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const id = String(formData.get('id') || '').trim();
  const requestId = String(formData.get('request_id') || '').trim();
  const requestNumber = String(formData.get('request_number') || '').trim();
  const status = String(formData.get('status') || 'acknowledged').trim();
  const assignedTo = String(formData.get('assigned_to') || '').trim();
  const payload: Record<string, any> = { status, assigned_to: assignedTo || null };
  if (assignedTo) payload.assigned_at = new Date().toISOString();

  if (useDemoData) {
    console.log('demo updateCallbackRequestStatus', { id, requestId, status, assignedTo });
    revalidatePath('/admin');
    flash('/admin', 'success', `Updated callback for ${requestNumber}`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('callback_requests').update(payload).eq('id', id);
  if (error) flash('/admin', 'error', error.message);

  const { data: lineTotals } = await supabase!.from('estimate_line_items').select('total_price, line_type').eq('request_id', requestId);
  const estimateTotal = (lineTotals || []).reduce((sum, item: any) => {
    const sign = item.line_type === 'discount' ? -1 : 1;
    return sum + sign * Number(item.total_price || 0);
  }, 0);
  await supabase!.from('service_requests').update({ estimate_total: Number(estimateTotal.toFixed(2)) }).eq('id', requestId);

  await supabase!.from('request_timeline_events').insert({
    request_id: requestId,
    event_type: 'callback_updated',
    note: assignedTo ? `Callback ${status} and assigned to ${assignedTo}` : `Callback marked ${status}`,
    visibility: 'internal',
    created_by: await getCurrentDisplayName()
  });

  revalidatePath('/admin');
  revalidatePath(`/dashboard/requests/${requestId}`);
  flash('/admin', 'success', `Updated callback for ${requestNumber}`);
}


export async function duplicateRouteDayAction(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const sourceDate = String(formData.get('source_date') || '').trim();
  const targetDate = String(formData.get('target_date') || '').trim();
  if (!sourceDate || !targetDate) flash('/admin', 'error', 'Both source and target dates are required');

  if (useDemoData) {
    console.log('demo duplicateRouteDayAction', { sourceDate, targetDate });
    revalidatePath('/admin');
    flash('/admin', 'success', `Duplicated ${sourceDate} route to ${targetDate} in demo mode`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');

  const { data: sourceStops, error } = await supabase!.from('pickup_schedule').select('*').eq('route_date', sourceDate).order('route_sequence', { ascending: true });
  if (error) flash('/admin', 'error', error.message);
  if (!sourceStops?.length) flash('/admin', 'error', 'No source route stops found');

  for (const stop of sourceStops!) {
    const payload = { ...stop, route_date: targetDate };
    delete (payload as any).id; delete (payload as any).created_at;
    const { data: existing } = await supabase!.from('pickup_schedule').select('id').eq('request_id', stop.request_id).maybeSingle();
    if (existing?.id) {
      await supabase!.from('pickup_schedule').update({
        route_date: targetDate,
        stop_window: stop.stop_window,
        route_sequence: stop.route_sequence,
        driver_name: stop.driver_name,
        stop_type: stop.stop_type,
        route_status: 'scheduled',
        customer_visibility: true
      }).eq('id', existing.id);
    } else {
      await supabase!.from('pickup_schedule').insert({ ...payload, route_status: 'scheduled', customer_visibility: true });
    }
  }

  revalidatePath('/admin');
  flash('/admin', 'success', `Duplicated ${sourceStops!.length} route stop(s) to ${targetDate}`);
}

export async function updateSyncLogRetryState(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const syncLogId = String(formData.get('sync_log_id') || '').trim();
  const retryState = String(formData.get('retry_state') || 'open').trim();
  const resolvedBy = await getCurrentDisplayName();
  const payload: Record<string, any> = { retry_state: retryState };
  if (retryState === 'resolved') {
    payload.resolved_at = new Date().toISOString();
    payload.resolved_by = resolvedBy;
  } else {
    payload.resolved_at = null;
    payload.resolved_by = null;
  }

  if (useDemoData) {
    console.log('demo updateSyncLogRetryState', { syncLogId, retryState, resolvedBy });
    await writeSyncAudit(syncLogId, `retry_state:${retryState}`, payload.resolved_by ? `Resolved by ${payload.resolved_by}` : null);
    revalidatePath('/admin');
    flash('/admin', 'success', `Marked sync log as ${retryState}`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('sync_logs').update(payload).eq('id', syncLogId);
  if (error) flash('/admin', 'error', error.message);
  await writeSyncAudit(syncLogId, `retry_state:${retryState}`, payload.resolved_by ? `Resolved by ${payload.resolved_by}` : null);

  revalidatePath('/admin');
  flash('/admin', 'success', `Marked sync log as ${retryState}`);
}

export async function saveSyncLogDeadLetterNote(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const syncLogId = String(formData.get('sync_log_id') || '').trim();
  const note = String(formData.get('dead_letter_note') || '').trim();

  if (useDemoData) {
    console.log('demo saveSyncLogDeadLetterNote', { syncLogId, note });
    await writeSyncAudit(syncLogId, 'dead_letter_note_saved', note);
    revalidatePath('/admin');
    flash('/admin', 'success', 'Saved dead-letter note in demo mode');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('sync_logs').update({ dead_letter_note: note || null }).eq('id', syncLogId);
  if (error) flash('/admin', 'error', error.message);
  await writeSyncAudit(syncLogId, 'dead_letter_note_saved', note);

  revalidatePath('/admin');
  flash('/admin', 'success', 'Saved dead-letter note');
}

export async function retrySyncLogAction(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(roleName)) return { ok: false, error: 'Staff access required.' };

  const syncLogId = String(formData.get('sync_log_id') || '').trim();

  if (useDemoData) {
    console.log('demo retrySyncLogAction', { syncLogId });
    await writeSyncAudit(syncLogId, 'retry_sent', 'Manual retry triggered');
    revalidatePath('/admin');
    flash('/admin', 'success', 'Retry queued in demo mode');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');

  const { data, error } = await supabase!.from('sync_logs').select('*').eq('id', syncLogId).maybeSingle();
  if (error || !data) flash('/admin', 'error', error?.message || 'Sync log not found');

  const provider = data.provider === 'zapier' ? 'zapier' : 'flyntlok';
  const result = await postOutboundWebhook({
    provider,
    eventType: data.event_type,
    requestNumber: data.request_number || undefined,
    payload: data.raw_payload || {}
  });

  await supabase!.from('sync_logs').update({
    last_attempt_at: new Date().toISOString()
  }).eq('id', syncLogId);
  await writeSyncAudit(syncLogId, result.ok ? 'retry_sent' : 'retry_failed', result.ok ? 'Manual resend succeeded' : (result.reason || 'Manual resend failed'));

  revalidatePath('/admin');
  flash('/admin', result.ok ? 'success' : 'error', result.ok ? 'Retry sent successfully' : `Retry failed: ${result.reason || 'unknown error'}`);
}


export async function saveStaffMemberAction(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager'].includes(roleName)) return { ok: false, error: 'Manager access required.' };
  const supabase = createSupabaseServerClient();
  const id = String(formData.get('id') || '').trim();
  const payload = {
    full_name: String(formData.get('full_name') || '').trim(),
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    auth_user_id: String(formData.get('auth_user_id') || '').trim() || null,
    role: String(formData.get('role') || 'service_writer').trim(),
    active: String(formData.get('active') || 'true') === 'true',
    default_queue_view: String(formData.get('default_queue_view') || '').trim() || null
  };

  if (useDemoData || !supabase) {
    console.log('demo saveStaffMemberAction', { id, payload });
    revalidatePath('/admin');
    redirect('/admin?success=staff-saved');
  }

  const query = id ? supabase.from('staff_members').update(payload).eq('id', id) : supabase.from('staff_members').insert(payload);
  const { error } = await query;
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin');
  redirect('/admin?success=staff-saved');
}


export async function deactivateStaffMemberAction(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager'].includes(roleName)) return { ok: false, error: 'Manager access required.' };
  const id = String(formData.get('id') || '').trim();

  if (useDemoData) {
    console.log('demo deactivateStaffMemberAction', { id });
    revalidatePath('/admin');
    redirect('/admin?success=staff-deactivated');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/admin?error=Supabase%20is%20not%20configured');
  const { error } = await supabase!.from('staff_members').update({ active: false }).eq('id', id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin');
  redirect('/admin?success=staff-deactivated');
}

export async function deleteStaffMemberAction(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (roleName !== 'admin') return { ok: false, error: 'Admin access required.' };
  const id = String(formData.get('id') || '').trim();

  if (useDemoData) {
    console.log('demo deleteStaffMemberAction', { id });
    revalidatePath('/admin');
    redirect('/admin?success=staff-deleted');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/admin?error=Supabase%20is%20not%20configured');
  const { error } = await supabase!.from('staff_members').delete().eq('id', id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin');
  redirect('/admin?success=staff-deleted');
}

export async function saveAdminQueuePreferenceAction(formData: FormData) {
  const roleName = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer', 'driver'].includes(roleName)) return { ok: false, error: 'Staff access required.' };
  const supabase = createSupabaseServerClient();
  const email = String(formData.get('email') || '').trim();
  const defaultQueueView = String(formData.get('default_queue_view') || 'all');

  if (useDemoData || !supabase) {
    console.log('demo saveAdminQueuePreferenceAction', { email, defaultQueueView });
    revalidatePath('/admin');
    redirect(`/admin?view=${encodeURIComponent(defaultQueueView)}&success=queue-default-saved`);
  }

  const { error } = await supabase.from('staff_members').update({ default_queue_view: defaultQueueView }).eq('email', email);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin');
  redirect(`/admin?view=${encodeURIComponent(defaultQueueView)}&success=queue-default-saved`);
}


export async function createStaffLinkInviteAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'service_writer').trim();
  const invitedBy = String(formData.get('invited_by') || 'LKN Admin').trim();
  const token = `invite-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  if (useDemoData) {
    console.log('demo createStaffLinkInviteAction', { email, role, invitedBy, token, expiresAt });
    flash('/admin', 'success', `Invite created for ${email}`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('staff_link_invites').insert({ email, role, invited_by: invitedBy, invite_token: token, expires_at: expiresAt });
  if (error) flash('/admin', 'error', error.message);
  revalidatePath('/admin');
  flash('/admin', 'success', `Invite created for ${email}`);
}

export async function acceptStaffInviteAction(formData: FormData) {
  const inviteToken = String(formData.get('invite_token') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const nextPath = `/accept-invite?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(email)}`;
  const fullName = `${firstName} ${lastName}`.trim();

  if (!inviteToken || !email) flash('/accept-invite', 'error', 'Invite email and token are required');
  if (!fullName) flash(nextPath, 'error', 'Please enter your first and last name');

  if (useDemoData) {
    console.log('demo acceptStaffInviteAction', { inviteToken, email, fullName });
    flash(nextPath, 'success', 'Demo invite accepted. Sign in flow would continue here.');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash(nextPath, 'error', 'Supabase is not configured');

  const { data: invite, error: inviteError } = await supabase!.from('staff_link_invites').select('*').eq('invite_token', inviteToken).eq('email', email).maybeSingle();
  if (inviteError || !invite) flash(nextPath, 'error', 'Invite token not found');
  if (invite.revoked_at) flash(nextPath, 'error', 'Invite token has been revoked');
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) flash(nextPath, 'error', 'Invite token has expired');

  let userId: string | null = null;
  const currentAuth = await supabase!.auth.getUser();
  userId = currentAuth.data.user?.id || null;

  if (!userId) {
    if (!password || password.length < 8) flash(nextPath, 'error', 'Please choose a password with at least 8 characters');
    const signUpResult = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: invite.role } }
    });
    if (signUpResult.error) flash(nextPath, 'error', signUpResult.error.message);
    userId = signUpResult.data.user?.id || null;
    if (!userId) flash(nextPath, 'error', 'Could not create the staff login');
  }

  const { error: profileError } = await supabase!.from('profiles').upsert({ id: userId, full_name: fullName, email, role: invite.role });
  if (profileError) flash(nextPath, 'error', profileError.message);

  const { error: staffError } = await supabase!.from('staff_members').update({ auth_user_id: userId, email, role: invite.role }).eq('email', email);
  if (staffError) flash(nextPath, 'error', staffError.message);

  await supabase!.from('staff_link_invites').update({ accepted_at: new Date().toISOString(), accepted_by_user_id: userId }).eq('id', invite.id);
  revalidatePath('/admin');
  revalidatePath('/dashboard/profile');
  flash(`/login?email=${encodeURIComponent(email)}`, 'success', 'Staff invite accepted. Sign in to continue.');
}

export async function linkStaffAccountAction(formData: FormData) {
  const inviteToken = String(formData.get('invite_token') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();

  if (useDemoData) {
    console.log('demo linkStaffAccountAction', { inviteToken, email });
    flash('/dashboard/profile', 'success', 'Staff link request saved in demo mode');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/dashboard/profile', 'error', 'Supabase is not configured');
  const { data: auth } = await supabase!.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) flash('/login', 'error', 'Please sign in first');

  const { data: invite, error: inviteError } = await supabase!
    .from('staff_link_invites')
    .select('*')
    .eq('invite_token', inviteToken)
    .eq('email', email)
    .maybeSingle();
  if (inviteError || !invite) flash('/dashboard/profile', 'error', 'Invite token not found');

  const { error: staffError } = await supabase!
    .from('staff_members')
    .update({ auth_user_id: userId })
    .eq('email', email);
  if (staffError) flash('/dashboard/profile', 'error', staffError.message);

  await supabase!.from('staff_link_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);
  revalidatePath('/dashboard/profile');
  revalidatePath('/admin');
  flash('/dashboard/profile', 'success', 'Staff account linked. You can now use staff tools based on your assigned role.');
}


export async function resendStaffLinkInviteAction(formData: FormData) {
  const inviteId = String(formData.get('invite_id') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const invitedBy = String(formData.get('invited_by') || 'LKN Admin').trim();
  const newToken = `invite-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const inviteUrl = buildPortalUrl(`/accept-invite?token=${newToken}&email=${encodeURIComponent(email)}`);
  const inviteTemplate = await getNotificationTemplateOverride('staff_invite_email');
  const inviteTemplateValues = { email, role: String(formData.get('role') || 'staff'), invite_url: inviteUrl, invited_by: invitedBy || 'LKN Admin' };

  if (useDemoData) flash('/admin', 'success', `Invite reissued for ${email}`);
  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('staff_link_invites').update({ invite_token: newToken, invited_by: invitedBy, expires_at: expiresAt, revoked_at: null, revoked_by: null }).eq('id', inviteId);
  if (error) flash('/admin', 'error', error.message);
  await sendEmailNotification({
    to: email,
    subject: renderStoredTemplate(inviteTemplate?.subject_template || "You're invited to the LKN Service Portal", inviteTemplateValues) || "You're invited to the LKN Service Portal",
    html: inviteTemplate?.body_template ? renderStoredTemplate(inviteTemplate.body_template, inviteTemplateValues) : buildStaffInviteEmailTemplate({ inviteeEmail: email, role: String(formData.get('role') || 'staff'), inviteUrl, invitedBy })
  });
  revalidatePath('/admin');
  flash('/admin', 'success', `Invite reissued for ${email}`);
}

export async function revokeStaffLinkInviteAction(formData: FormData) {
  const inviteId = String(formData.get('invite_id') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const by = await getCurrentDisplayName();
  if (useDemoData) flash('/admin', 'success', `Invite revoked for ${email}`);
  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('staff_link_invites').update({ revoked_at: new Date().toISOString(), revoked_by: by }).eq('id', inviteId);
  if (error) flash('/admin', 'error', error.message);
  revalidatePath('/admin');
  flash('/admin', 'success', `Invite revoked for ${email}`);
}

export async function saveChecklistTemplateAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const requestType = String(formData.get('request_type') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const assignedRole = String(formData.get('assigned_role') || '').trim() || null;
  const sortOrder = Number(formData.get('sort_order') || 1);
  const active = String(formData.get('active') || 'true') !== 'false';

  if (!requestType || !title) flash('/admin', 'error', 'Checklist template request type and title are required');
  if (useDemoData) flash('/admin', 'success', `Checklist template saved for ${requestType}`);
  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const payload = { request_type: requestType, title, assigned_role: assignedRole, sort_order: sortOrder, active };
  const query = id
    ? supabase!.from('request_checklist_templates').update(payload).eq('id', id)
    : supabase!.from('request_checklist_templates').insert(payload);
  const { error } = await query;
  if (error) flash('/admin', 'error', error.message);
  revalidatePath('/admin');
  flash('/admin', 'success', `Checklist template saved for ${requestType}`);
}

export async function deleteChecklistTemplateAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const requestType = String(formData.get('request_type') || '').trim();
  if (useDemoData) flash('/admin', 'success', `Checklist template removed from ${requestType || 'request type'}`);
  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('request_checklist_templates').delete().eq('id', id);
  if (error) flash('/admin', 'error', error.message);
  revalidatePath('/admin');
  flash('/admin', 'success', `Checklist template removed from ${requestType || 'request type'}`);
}

export async function saveNotificationTemplateAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const templateKey = String(formData.get('template_key') || '').trim();
  const channel = String(formData.get('channel') || 'email').trim();
  const subjectTemplate = String(formData.get('subject_template') || '').trim() || null;
  const bodyTemplate = String(formData.get('body_template') || '').trim();
  const active = String(formData.get('active') || 'true') !== 'false';
  if (!templateKey || !bodyTemplate) flash('/admin', 'error', 'Template key and body are required');
  if (useDemoData) flash('/admin', 'success', `Notification template saved for ${templateKey}`);
  const supabase = createSupabaseServerClient();
  if (!supabase) flash('/admin', 'error', 'Supabase is not configured');
  const payload = { template_key: templateKey, channel, subject_template: subjectTemplate, body_template: bodyTemplate, active, updated_at: new Date().toISOString() };
  const query = id
    ? supabase!.from('notification_templates').update(payload).eq('id', id)
    : supabase!.from('notification_templates').insert(payload);
  const { error } = await query;
  if (error) flash('/admin', 'error', error.message);
  revalidatePath('/admin');
  flash('/admin', 'success', `Notification template saved for ${templateKey}`);
}

export async function sendInvoiceEmailAction(formData: FormData) {
  const invoiceId = String(formData.get('invoice_id') || '').trim();
  const requestId = String(formData.get('request_id') || '').trim();
  const customerId = String(formData.get('customer_id') || '').trim() || null;
  const customerEmail = String(formData.get('customer_email') || '').trim();
  const requestNumber = String(formData.get('request_number') || '').trim();
  const invoiceNumber = String(formData.get('invoice_number') || '').trim();
  const total = String(formData.get('total') || '').trim();
  const dueDate = String(formData.get('due_date') || '').trim();
  const targetPath = String(formData.get('target_path') || '/dashboard/invoices').trim();
  const audience = String(formData.get('audience') || 'customer').trim();
  const subject = audience === 'staff' ? `Invoice ready for follow-up: ${invoiceNumber}` : `Your LKN Small Engine invoice ${invoiceNumber}`;
  const message = audience === 'staff'
    ? `Invoice ${invoiceNumber} for request ${requestNumber} is ${total}. Review customer follow-up and payment status.`
    : `Your invoice ${invoiceNumber} for request ${requestNumber} is ready. Total due: ${total}${dueDate ? `, due ${dueDate}` : ''}.`;
  const equipmentName = String(formData.get('equipment_name') || '').trim();
  const customerName = String(formData.get('customer_name') || '').trim();

  if (!customerEmail) flash(targetPath, 'error', 'No email address was provided');
  if (useDemoData) {
    console.log('demo sendInvoiceEmailAction', { invoiceId, requestId, customerEmail, subject, message, audience });
    flash(targetPath, 'success', `${audience === 'staff' ? 'Staff' : 'Customer'} invoice email queued in demo mode`);
  }
  const supabase = createSupabaseServerClient();
  if (!supabase) flash(targetPath, 'error', 'Supabase is not configured');

  const html = audience === 'staff'
    ? buildStaffInvoiceEmailTemplate({ invoiceNumber, requestNumber, equipmentName, total, dueDate, customerName, customerEmail })
    : buildCustomerInvoiceEmailTemplate({ customerName, invoiceNumber, requestNumber, equipmentName, total, dueDate, paymentUrl: String(formData.get('payment_url') || '').trim() || null });
  await sendEmailNotification({ to: customerEmail, subject, html });
  await supabase!.from('notifications').insert({
    customer_id: customerId,
    request_id: requestId || null,
    type: audience === 'staff' ? 'staff_invoice_email' : 'invoice_email',
    title: subject,
    body: message,
    channel: 'email',
    delivery_status: 'sent'
  });
  await supabase!.from('request_communications').insert({
    request_id: requestId,
    customer_id: customerId,
    direction: 'outbound',
    channel: 'email',
    subject,
    message,
    sent_by: await getCurrentDisplayName()
  });
  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath(`/dashboard/requests/${requestId}`);
  flash(targetPath, 'success', `${audience === 'staff' ? 'Staff' : 'Customer'} invoice email sent`);
}

export async function addChecklistTaskAction(formData: FormData) {
  const requestId = String(formData.get('request_id') || '').trim();
  const requestNumber = String(formData.get('request_number') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const assignedRole = String(formData.get('assigned_role') || '').trim() || null;
  const by = await getCurrentDisplayName();
  if (!requestId || !title) flash(`/dashboard/requests/${requestId}`, 'error', 'Task title is required');

  if (useDemoData) {
    console.log('demo addChecklistTaskAction', { requestId, requestNumber, title, assignedRole, by });
    flash(`/dashboard/requests/${requestId}`, 'success', 'Checklist task added in demo mode');
  }
  const supabase = createSupabaseServerClient();
  if (!supabase) flash(`/dashboard/requests/${requestId}`, 'error', 'Supabase is not configured');
  const { data: latest } = await supabase!.from('request_task_checklist').select('sort_order').eq('request_id', requestId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const nextSort = (((latest as any)?.sort_order) || 0) + 1;
  const { error } = await supabase!.from('request_task_checklist').insert({ request_id: requestId, title, assigned_role: assignedRole, sort_order: nextSort, created_by: by });
  if (error) flash(`/dashboard/requests/${requestId}`, 'error', error.message);
  await supabase!.from('request_timeline_events').insert({ request_id: requestId, event_type: 'checklist_task_added', note: title, status: requestNumber || null, created_by: by, visibility: 'internal' });
  revalidatePath(`/dashboard/requests/${requestId}`);
  flash(`/dashboard/requests/${requestId}`, 'success', 'Checklist task added');
}

export async function toggleChecklistTaskAction(formData: FormData) {
  const taskId = String(formData.get('task_id') || '').trim();
  const requestId = String(formData.get('request_id') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const makeComplete = String(formData.get('make_complete') || 'false') === 'true';
  const by = await getCurrentDisplayName();

  if (useDemoData) {
    console.log('demo toggleChecklistTaskAction', { taskId, requestId, title, makeComplete, by });
    flash(`/dashboard/requests/${requestId}`, 'success', `Checklist task ${makeComplete ? 'completed' : 're-opened'} in demo mode`);
  }
  const supabase = createSupabaseServerClient();
  if (!supabase) flash(`/dashboard/requests/${requestId}`, 'error', 'Supabase is not configured');
  const { error } = await supabase!.from('request_task_checklist').update({
    is_complete: makeComplete,
    completed_at: makeComplete ? new Date().toISOString() : null,
    completed_by: makeComplete ? by : null
  }).eq('id', taskId);
  if (error) flash(`/dashboard/requests/${requestId}`, 'error', error.message);
  await supabase!.from('request_timeline_events').insert({ request_id: requestId, event_type: makeComplete ? 'checklist_task_completed' : 'checklist_task_reopened', note: title || null, created_by: by, visibility: 'internal' });
  revalidatePath(`/dashboard/requests/${requestId}`);
  flash(`/dashboard/requests/${requestId}`, 'success', `Checklist task ${makeComplete ? 'completed' : 're-opened'}`);
}
