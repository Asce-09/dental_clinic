import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

export default function Payments() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client.get('/payments').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="topbar">
        <h1>Payments</h1>
      </div>

      {data && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(1, 260px)', marginBottom: 24 }}>
          <div className="stat-card">
            <div className="label">Total collected (last 200 payments)</div>
            <div className="value">{money(data.total)}</div>
          </div>
        </div>
      )}

      <div className="panel">
        {loading && <div className="empty-state">Loading payments…</div>}
        {!loading && data && data.data.length === 0 && <div className="empty-state">No payments recorded yet.</div>}
        {!loading && data && data.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Received by</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p.id} className="row-link" onClick={() => navigate(`/billing/${p.invoice_id}`)}>
                  <td>{new Date(p.paid_at).toLocaleString()}</td>
                  <td>{p.patient_first_name} {p.patient_last_name}</td>
                  <td>{p.invoice_number}</td>
                  <td>{money(p.amount)}</td>
                  <td>{p.payment_method.replace('_', ' ')}</td>
                  <td><span className={`badge ${p.payment_status === 'verified' ? 'confirmed' : p.payment_status === 'failed' ? 'cancelled' : 'pending'}`}>{p.payment_status}</span></td>
                  <td>{p.received_by_first_name ? `${p.received_by_first_name} ${p.received_by_last_name}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
