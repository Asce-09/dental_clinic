import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Modal from '../components/Modal.jsx';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

const PAYMENT_METHODS = ['cash', 'gcash', 'maya', 'bank_transfer', 'card', 'other'];

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [showPay, setShowPay] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    client.get(`/invoices/${id}`).then((res) => setInvoice(res.data));
  }

  useEffect(load, [id]);

  async function handleRecordPayment(e) {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    setSaving(true);
    try {
      await client.post(`/invoices/${id}/payments`, {
        amount, paymentMethod: method, referenceNumber: reference, notes,
      });
      setShowPay(false);
      setAmount('');
      setReference('');
      setNotes('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record payment.');
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid() {
    if (!window.confirm('Void this invoice? This cannot be undone.')) return;
    await client.patch(`/invoices/${id}/status`, { status: 'void' });
    load();
  }

  if (!invoice) {
    return <div className="empty-state">Loading invoice…</div>;
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="link-back" onClick={() => navigate('/billing')}>
            ← Back to billing
          </button>
          <h1>{invoice.invoice_number}</h1>
          <p className="muted">
            {invoice.patient_first_name} {invoice.patient_last_name} · {invoice.patient_code}
          </p>
        </div>
        <div className="topbar-actions">
          <span className={`badge ${invoice.status === 'paid' ? 'confirmed' : invoice.status === 'void' ? 'cancelled' : 'pending'}`}>
            {invoice.status.replace('_', ' ')}
          </span>
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setShowPay(true)}>
                Record payment
              </button>
              <button className="btn btn-text-danger btn-sm" onClick={handleVoid}>
                Void
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel detail-panel">
        <table className="mini-table">
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td>{it.description}</td>
                <td>{it.quantity}</td>
                <td>{money(it.unit_price)}</td>
                <td>{money(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-summary">
          <div><span>Subtotal</span><span>{money(invoice.subtotal)}</span></div>
          <div><span>Discount</span><span>-{money(invoice.discount)}</span></div>
          <div><span>Tax</span><span>{money(invoice.tax)}</span></div>
          <div className="total"><span>Total</span><span>{money(invoice.total)}</span></div>
          <div><span>Paid</span><span>{money(invoice.amountPaid)}</span></div>
          <div className="balance"><span>Balance</span><span>{money(invoice.balance)}</span></div>
        </div>

        {invoice.notes && <p className="muted">Notes: {invoice.notes}</p>}
      </div>

      <div className="panel-header" style={{ marginTop: 24, border: 'none' }}>
        <h3>Payment history</h3>
      </div>
      <div className="panel">
        {invoice.payments.length === 0 && <div className="empty-state">No payments recorded yet.</div>}
        {invoice.payments.length > 0 && (
          <table>
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Received by</th></tr>
            </thead>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.paid_at).toLocaleString()}</td>
                  <td>{money(p.amount)}</td>
                  <td>{p.payment_method.replace('_', ' ')}</td>
                  <td>{p.reference_number || '—'}</td>
                  <td>{p.received_by_first_name ? `${p.received_by_first_name} ${p.received_by_last_name}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPay && (
        <Modal title="Record payment" onClose={() => setShowPay(false)}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleRecordPayment}>
            <div className="field">
              <label>Amount * (balance: {money(invoice.balance)})</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="field">
              <label>Payment method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Reference number</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="field">
              <label>Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Record payment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
