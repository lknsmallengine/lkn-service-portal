
import { FlyntlokFieldMap, OutboundFieldMap, ServiceRequest } from './types';

export const flyntlokRequestFieldMap: FlyntlokFieldMap[] = [
  { appField: 'request_number', flyntlokField: 'externalReference', required: true, notes: 'Use as shared key for Zapier sync.' },
  { appField: 'equipment_name', flyntlokField: 'unitDescription', required: true },
  { appField: 'equipment_id', flyntlokField: 'unitId' },
  { appField: 'issue_description', flyntlokField: 'complaint', required: true },
  { appField: 'request_type', flyntlokField: 'serviceType' },
  { appField: 'status', flyntlokField: 'workOrderStatus', required: true },
  { appField: 'pickup_required', flyntlokField: 'pickupRequested', notes: 'Converted to Y/N for Flyntlok payloads.' },
  { appField: 'requested_date', flyntlokField: 'requestedDate' }
];

export const outboundFieldMappings: OutboundFieldMap[] = [
  { provider: 'flyntlok', eventType: 'service_request.created', appField: 'request_number', outboundField: 'externalReference', required: true },
  { provider: 'flyntlok', eventType: 'service_request.created', appField: 'equipment_name', outboundField: 'unitDescription', required: true },
  { provider: 'flyntlok', eventType: 'service_request.created', appField: 'issue_description', outboundField: 'complaint', required: true },
  { provider: 'flyntlok', eventType: 'service_request.created', appField: 'request_type', outboundField: 'serviceType' },
  { provider: 'flyntlok', eventType: 'service_request.created', appField: 'requested_date', outboundField: 'requestedDate', transform: 'ISO date string' },
  { provider: 'flyntlok', eventType: 'service_request.created', appField: 'pickup_required', outboundField: 'pickupRequested', transform: 'booleanToYN' },
  { provider: 'flyntlok', eventType: 'work_order.status_updated', appField: 'request_number', outboundField: 'externalReference', required: true },
  { provider: 'flyntlok', eventType: 'work_order.status_updated', appField: 'status', outboundField: 'workOrderStatus', required: true, transform: 'normalizeFlyntlokStatus' },
  { provider: 'flyntlok', eventType: 'work_order.status_updated', appField: 'admin_notes', outboundField: 'statusNotes' },
  { provider: 'flyntlok', eventType: 'work_order.status_updated', appField: 'updatedAt', outboundField: 'statusUpdatedAt', transform: 'ISO timestamp' },
  { provider: 'flyntlok', eventType: 'request.callback_requested', appField: 'request_number', outboundField: 'externalReference', required: true },
  { provider: 'flyntlok', eventType: 'request.callback_requested', appField: 'preferred_contact', outboundField: 'preferredContactMethod' },
  { provider: 'flyntlok', eventType: 'request.callback_requested', appField: 'note', outboundField: 'callbackNote' },
  { provider: 'zapier', eventType: 'estimate.approved', appField: 'request_number', outboundField: 'request_number', required: true },
  { provider: 'zapier', eventType: 'estimate.approved', appField: 'decision', outboundField: 'decision', required: true },
  { provider: 'zapier', eventType: 'estimate.approved', appField: 'approvedAt', outboundField: 'approved_at', transform: 'ISO timestamp' },
  { provider: 'zapier', eventType: 'work_order.status_updated', appField: 'customer_email', outboundField: 'customer_email' },
  { provider: 'zapier', eventType: 'work_order.status_updated', appField: 'customer_phone', outboundField: 'customer_phone' },
  { provider: 'zapier', eventType: 'work_order.status_updated', appField: 'status', outboundField: 'status', required: true },
  { provider: 'zapier', eventType: 'request.callback_requested', appField: 'preferred_contact', outboundField: 'preferred_contact' },
  { provider: 'zapier', eventType: 'request.callback_requested', appField: 'note', outboundField: 'callback_note' },
  { provider: 'zapier', eventType: 'route.status_updated', appField: 'request_number', outboundField: 'request_number', required: true },
  { provider: 'zapier', eventType: 'route.status_updated', appField: 'route_date', outboundField: 'route_date' },
  { provider: 'zapier', eventType: 'route.status_updated', appField: 'stop_window', outboundField: 'stop_window' },
  { provider: 'zapier', eventType: 'route.status_updated', appField: 'route_status', outboundField: 'route_status' },
  { provider: 'zapier', eventType: 'route.status_updated', appField: 'driver_name', outboundField: 'driver_name' },
];

function booleanToYN(value: unknown) {
  if (value === true || value === 'true' || value === '1' || value === 1) return 'Y';
  return 'N';
}

function normalizeFlyntlokStatus(value: unknown) {
  const status = String(value || '').toLowerCase().trim();
  const map: Record<string, string> = {
    'request received': 'OPEN',
    'scheduled': 'SCHEDULED',
    'checked in': 'CHECKED_IN',
    'diagnosing': 'DIAGNOSING',
    'estimate sent': 'ESTIMATE_SENT',
    'approved': 'APPROVED',
    'waiting on parts': 'WAITING_PARTS',
    'in repair': 'IN_REPAIR',
    'completed': 'COMPLETED',
    'ready for pickup': 'READY_FOR_PICKUP',
    'delivered': 'DELIVERED',
    'closed': 'CLOSED'
  };
  return map[status] || String(value || 'OPEN').toUpperCase().replace(/\s+/g, '_');
}

function isoDate(value: unknown) {
  if (!value) return value;
  return String(value).slice(0, 10);
}

function isoTimestamp(value: unknown) {
  if (!value) return new Date().toISOString();
  return new Date(String(value)).toISOString();
}

function passthrough(value: unknown) {
  return value;
}

const transforms: Record<string, (value: unknown) => unknown> = {
  booleanToYN,
  normalizeFlyntlokStatus,
  'ISO date string': isoDate,
  'ISO timestamp': isoTimestamp
};

export function buildFlyntlokRequestPayload(request: Partial<ServiceRequest> & { customer_name?: string; customer_phone?: string; customer_email?: string; customer_address?: string }) {
  return {
    externalReference: request.request_number,
    customerName: request.customer_name,
    customerPhone: request.customer_phone,
    customerEmail: request.customer_email,
    customerAddress: request.customer_address,
    unitId: request.equipment_id,
    unitDescription: request.equipment_name,
    complaint: request.issue_description,
    serviceType: request.request_type,
    workOrderStatus: normalizeFlyntlokStatus(request.status),
    pickupRequested: booleanToYN(request.pickup_required),
    requestedDate: isoDate(request.requested_date)
  };
}

export function buildFieldLevelOutboundPayload(eventType: string, provider: 'flyntlok' | 'zapier', source: Record<string, unknown>) {
  const rows = outboundFieldMappings.filter((row) => row.eventType === eventType && row.provider === provider);
  return rows.reduce<Record<string, unknown>>((acc, row) => {
    const raw = source[row.appField];
    if (raw === undefined) return acc;
    const transform = row.transform ? (transforms[row.transform] || passthrough) : passthrough;
    acc[row.outboundField] = transform(raw);
    return acc;
  }, {});
}
