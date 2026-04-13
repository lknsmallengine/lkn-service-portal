import { getInvoices, getRequests } from '@/lib/data';

export default async function InvoicesPage() {
  const [invoices, requests] = await Promise.all([getInvoices(), getRequests()]);
  const byRequest = new Map(requests.map((r) => [r.id, r]));
  const openInvoice = invoices.find((invoice) => invoice.status === 'unpaid') || invoices[0];

  return (
    <section className="grid grid-2">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Open invoice</h2>
        {openInvoice ? (
          <>
            <div className="small subtle">Invoice {openInvoice.invoice_number}</div>
            <div className="kpi" style={{ marginTop: 10 }}>${Number(openInvoice.total).toFixed(2)}</div>
            <p className="subtle">{byRequest.get(openInvoice.request_id)?.equipment_name || 'Service request'} • {openInvoice.status}</p>
            <div className="form-row"><a className="btn" href={`/dashboard/invoices/${openInvoice.id}`}>View invoice</a>{openInvoice.stripe_payment_url ? <a className="btn ghost" href={openInvoice.stripe_payment_url} target="_blank">Pay now</a> : null}</div>
          </>
        ) : (
          <p className="subtle">No open invoices right now.</p>
        )}
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Invoice history</h2>
        <table className="table">
          <thead>
            <tr><th>Invoice</th><th>Request</th><th>Total</th><th>Status</th><th>Details</th><th>Link</th></tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{byRequest.get(invoice.request_id)?.request_number || invoice.request_id}</td>
                <td>${Number(invoice.total).toFixed(2)}</td>
                <td>{invoice.status}</td>
                <td><a href={`/dashboard/invoices/${invoice.id}`}>View</a></td>
                <td>{invoice.stripe_payment_url ? <a href={invoice.stripe_payment_url} target="_blank">Open</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
