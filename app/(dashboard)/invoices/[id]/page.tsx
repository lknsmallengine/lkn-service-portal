import { sendInvoiceEmailAction } from '@/lib/actions';
import { getEstimateLineItems, getInvoiceById, getProfile, getRequestById } from '@/lib/data';
import { notFound } from 'next/navigation';

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default async function InvoiceDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { success?: string; error?: string };
}) {
  const invoice = await getInvoiceById(params.id);
  if (!invoice) return notFound();

  const [profile, request, items] = await Promise.all([
    getProfile(),
    getRequestById(invoice.request_id),
    getEstimateLineItems(invoice.request_id)
  ]);

  return (
    <div className="grid grid-2">
      <section className="card">
        <div className="header">
          <div>
            <div className="badge">{invoice.invoice_number}</div>
            <h2 style={{ marginBottom: 0 }}>Invoice details</h2>
          </div>
          <div className="badge">{invoice.status}</div>
        </div>
        {searchParams?.success ? <div className="badge" style={{ marginBottom: 12 }}>Success: {searchParams.success}</div> : null}
        {searchParams?.error ? <div className="badge" style={{ marginBottom: 12, background: '#4a1d1d' }}>Error: {searchParams.error}</div> : null}
        <div className="stack-sm" style={{ marginTop: 12 }}>
          <div><strong>Request:</strong> {request?.request_number || invoice.request_id}</div>
          <div><strong>Equipment:</strong> {request?.equipment_name || 'Service request'}</div>
          <div><strong>Total:</strong> {money(invoice.total)}</div>
          <div><strong>Due date:</strong> {invoice.due_date || 'Due on receipt'}</div>
          <div><strong>Payment method:</strong> {invoice.payment_method || (invoice.status === 'paid' ? 'Recorded payment' : 'Online payment link')}</div>
          {invoice.paid_at ? <div><strong>Paid at:</strong> {new Date(invoice.paid_at).toLocaleString()}</div> : null}
          {invoice.notes ? <div className="small subtle">{invoice.notes}</div> : null}
        </div>
        {invoice.stripe_payment_url ? <a className="btn" href={invoice.stripe_payment_url} target="_blank">Open payment link</a> : null}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Line items</h2>
        <table className="table">
          <thead><tr><th>Description</th><th>Type</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.line_type}</td>
                <td>{money(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Email this invoice</h2>
        <div className="grid grid-2">
          <form action={sendInvoiceEmailAction} className="stack-sm">
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <input type="hidden" name="request_id" value={invoice.request_id} />
            <input type="hidden" name="request_number" value={request?.request_number || ''} />
            <input type="hidden" name="customer_id" value={request?.customer_id || ''} />
            <input type="hidden" name="customer_email" value={profile?.email || ''} />
            <input type="hidden" name="customer_name" value={profile?.full_name || ''} />
            <input type="hidden" name="equipment_name" value={request?.equipment_name || ''} />
            <input type="hidden" name="payment_url" value={invoice.stripe_payment_url || ''} />
            <input type="hidden" name="invoice_number" value={invoice.invoice_number} />
            <input type="hidden" name="total" value={money(invoice.total)} />
            <input type="hidden" name="due_date" value={invoice.due_date || ''} />
            <input type="hidden" name="target_path" value={`/dashboard/invoices/${invoice.id}`} />
            <input type="hidden" name="audience" value="customer" />
            <strong>Customer copy</strong>
            <div className="small subtle">Send the customer the invoice and payment reminder.</div>
            <button className="btn" type="submit">Send customer invoice email</button>
          </form>

          <form action={sendInvoiceEmailAction} className="stack-sm">
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <input type="hidden" name="request_id" value={invoice.request_id} />
            <input type="hidden" name="request_number" value={request?.request_number || ''} />
            <input type="hidden" name="customer_id" value={request?.customer_id || ''} />
            <input type="hidden" name="customer_email" value="service@lknsmallengine.com" />
            <input type="hidden" name="customer_name" value={profile?.full_name || ''} />
            <input type="hidden" name="equipment_name" value={request?.equipment_name || ''} />
            <input type="hidden" name="payment_url" value={invoice.stripe_payment_url || ''} />
            <input type="hidden" name="invoice_number" value={invoice.invoice_number} />
            <input type="hidden" name="total" value={money(invoice.total)} />
            <input type="hidden" name="due_date" value={invoice.due_date || ''} />
            <input type="hidden" name="target_path" value={`/dashboard/invoices/${invoice.id}`} />
            <input type="hidden" name="audience" value="staff" />
            <strong>Staff copy</strong>
            <div className="small subtle">Send an internal follow-up copy to the service team.</div>
            <button className="btn ghost" type="submit">Send staff invoice email</button>
          </form>
        </div>
      </section>
    </div>
  );
}
