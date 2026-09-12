import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

export default function PortalInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get(`/portal/invoices/${id}`)
      .then((res) => setInvoice(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load this invoice.'));
  }, [id]);

  if (error) {
    return <div className="empty-state">{error}</div>;
  }
  if (!invoice) {
    return <div className="empty-state">Loading invoice…</div>;
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="link-back" onClick={() => navigate('/portal/billing')}>
            ← Back to billing
          </button>
          <h1>{invoice.invoice_number}</h1>
        </div>
        <span className={`badge ${invoice.status === 'paid' ? 'completed' : invoice.status === 'void' ? 'cancelled' : 'pending'}`}>
          {invoice.status.replace('_', ' ')}
        </span>
      </div>

      <div className="panel detail-panel" style={{ marginBottom: 20 }}>
        <table className="mini-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td>{it.treatment_name || it.description}</td>
                <td>{it.quantity}</td>
                <td>{money(it.unit_price)}</td>
                <td>{money(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-summary">
          <div><span>Subtotal</span><span>{money(invoice.subtotal)}</span></div>
          {Number(invoice.discount) > 0 && <div><span>Discount</span><span>-{money(invoice.discount)}</span></div>}
          {Number(invoice.tax) > 0 && <div><span>Tax</span><span>{money(invoice.tax)}</span></div>}
          <div className="total"><span>Total</span><span>{money(invoice.total)}</span></div>
          <div><span>Paid</span><span>{money(invoice.amountPaid)}</span></div>
          <div className="balance"><span>Balance</span><span>{money(invoice.balance)}</span></div>
        </div>
      </div>

      <div className="panel detail-panel">
        <h3 style={{ marginBottom: 12 }}>Payment history</h3>
        {invoice.payments.length === 0 && <p className="muted">No payments recorded yet.</p>}
        {invoice.payments.length > 0 && (
          <table className="mini-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p, i) => (
                <tr key={i}>
                  <td>{new Date(p.paid_at).toLocaleDateString()}</td>
                  <td className="capitalize">{p.payment_method.replace('_', ' ')}</td>
                  <td>{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
