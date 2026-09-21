import { useEffect, useState } from 'react';
import client from '../api/client';

const STATUS_FILTERS = ['', 'new', 'in_progress', 'resolved'];
const STATUS_LABELS = { new: 'New', in_progress: 'In Progress', resolved: 'Resolved' };

export default function WebsiteInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  function load() {
    setLoading(true);
    client
      .get('/inquiries', { params: status ? { status } : {} })
      .then((res) => setInquiries(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status]);

  async function handleStatusChange(id, newStatus) {
    await client.patch(`/inquiries/${id}/status`, { status: newStatus });
    load();
  }

  return (
    <div>
      <div className="topbar">
        <h1>Website Inquiries</h1>
      </div>

      <div className="filter-row">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            className={`filter-chip${status === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading inquiries…</div>}
        {!loading && inquiries.length === 0 && (
          <div className="empty-state">No inquiries yet — new website submissions will show up here.</div>
        )}

        {!loading && inquiries.length > 0 && inquiries.map((inq) => (
          <div className="plan-row" key={inq.id}>
            <div
              className="plan-row-header"
              onClick={() => setOpenId(openId === inq.id ? null : inq.id)}
            >
              <div>
                <strong>{inq.name}</strong>
                <div className="muted small">
                  {[inq.email, inq.phone].filter(Boolean).join(' · ') || 'No contact info provided'}
                  {' · '}
                  {new Date(inq.created_at).toLocaleString()}
                </div>
              </div>
              <span className={`badge ${inq.status === 'resolved' ? 'completed' : inq.status === 'in_progress' ? 'checked_in' : 'pending'}`}>
                {STATUS_LABELS[inq.status]}
              </span>
            </div>

            {openId === inq.id && (
              <div className="plan-detail">
                <p style={{ marginBottom: 16, whiteSpace: 'pre-wrap' }}>{inq.message}</p>

                <div className="field" style={{ maxWidth: 220 }}>
                  <label>Status</label>
                  <select
                    value={inq.status}
                    onChange={(e) => handleStatusChange(inq.id, e.target.value)}
                  >
                    {STATUS_FILTERS.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {inq.handled_by_first_name && (
                  <p className="muted small" style={{ marginTop: 10 }}>
                    Last updated by {inq.handled_by_first_name} {inq.handled_by_last_name}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
