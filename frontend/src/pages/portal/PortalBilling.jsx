import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

export default function PortalBilling() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/portal/invoices').then((res) => setInvoices(res.data)).finally(() => setLoading(false));
  }, []);

  const outstanding = invoices
    .filter((i) => i.status !== 'void')
    .reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0);

  return (
    <div>
      <div className="topbar">
        <h1>Billing</h1>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'minmax(0, 260px)', marginBottom: 24 }}>
        <div className="stat-card accent">
          <div className="label">Outstanding balance</div>
          <div className="value">{money(outstanding)}</div>
        </div>
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading invoices…</div>}
        {!loading && invoices.length === 0 && <div className="empty-state">No invoices yet.</div>}
        {!loading && invoices.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="row-link" onClick={() => navigate(`/portal/billing/${inv.id}`)}>
                  <td>{inv.invoice_number}</td>
                  <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td>{money(inv.total)}</td>
                  <td>{money(Number(inv.total) - Number(inv.amount_paid))}</td>
                  <td><span className={`badge ${inv.status === 'paid' ? 'completed' : inv.status === 'void' ? 'cancelled' : 'pending'}`}>{inv.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
