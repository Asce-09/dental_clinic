import { useEffect, useState } from 'react';
import client from '../../api/client';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

export default function PortalTreatmentPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    client.get('/portal/treatment-plans').then((res) => setPlans(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="topbar">
        <h1>Treatment Plans</h1>
      </div>

      {loading && <div className="empty-state">Loading treatment plans…</div>}
      {!loading && plans.length === 0 && (
        <div className="panel"><div className="empty-state">No treatment plans on file yet.</div></div>
      )}

      {!loading && plans.map((plan) => (
        <div className="panel plan-row" key={plan.id} style={{ marginBottom: 12 }}>
          <div
            className="plan-row-header"
            onClick={() => setOpenId(openId === plan.id ? null : plan.id)}
          >
            <div>
              <strong>{plan.title}</strong>
              <div className="muted small">
                {new Date(plan.created_at).toLocaleDateString()} · <span className="capitalize">{plan.status.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="plan-row-total">{money(plan.total_estimated)}</div>
          </div>

          {openId === plan.id && (
            <div className="plan-detail">
              {plan.diagnosis && (
                <p className="muted" style={{ marginBottom: 10 }}>
                  <strong>Diagnosis:</strong> {plan.diagnosis}
                </p>
              )}
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Tooth</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.treatment_name || it.description}</td>
                      <td>{it.tooth_number || '—'}</td>
                      <td>{it.quantity}</td>
                      <td>{money(it.quantity * it.unit_price)}</td>
                      <td><span className={`badge ${it.status === 'completed' ? 'completed' : 'pending'}`}>{it.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {plan.notes && <p className="muted small" style={{ marginTop: 10 }}>{plan.notes}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
