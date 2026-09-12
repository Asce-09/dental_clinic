import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

const STATUS_FILTERS = ['', 'proposed', 'accepted', 'in_progress', 'completed', 'cancelled'];

export default function TreatmentPlansOverview() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client
      .get('/treatment-plans', { params: status ? { status } : {} })
      .then((res) => setPlans(res.data))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="topbar">
        <h1>Treatment Plans</h1>
      </div>

      <div className="filter-row">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            className={`filter-chip${status === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading treatment plans…</div>}
        {!loading && plans.length === 0 && (
          <div className="empty-state">No treatment plans found.</div>
        )}
        {!loading && plans.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Estimated total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="row-link" onClick={() => navigate(`/patients/${p.patient_id}`)}>
                  <td>{p.patient_first_name} {p.patient_last_name} <span className="muted small">({p.patient_code})</span></td>
                  <td>{p.title}</td>
                  <td><span className={`badge ${p.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>{p.status.replace('_', ' ')}</span></td>
                  <td>{money(p.total_estimated)}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>
        Click a row to open that patient's profile and manage the plan under their Treatment tab.
      </p>
    </div>
  );
}
