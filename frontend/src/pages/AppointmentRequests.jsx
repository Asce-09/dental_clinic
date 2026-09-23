import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

const STATUS_FILTERS = ['', 'new', 'in_progress', 'resolved'];
const STATUS_LABELS = { new: 'New', in_progress: 'In Progress', resolved: 'Resolved' };

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hour = ((+h + 11) % 12) + 1;
  const ampm = +h < 12 ? 'AM' : 'PM';
  return `${hour}:${m} ${ampm}`;
}

export default function AppointmentRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [working, setWorking] = useState(null); // id currently being updated
  const [resultById, setResultById] = useState({}); // { [id]: message string }
  const [errorById, setErrorById] = useState({}); // { [id]: error message string }

  function load() {
    setLoading(true);
    client
      .get('/appointment-requests', { params: status ? { status } : {} })
      .then((res) => setRequests(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status]);

  async function handleStatusChange(request, newStatus) {
    const firstTimeResolving = newStatus === 'resolved' && !request.linked_appointment_id;

    if (firstTimeResolving) {
      const ok = window.confirm(
        `Mark this resolved?\n\nThis will automatically create a patient record for ` +
        `${request.name} (or match an existing one by email/phone) and book a real ` +
        `appointment for ${request.preferred_date}. This can't be undone from here.`
      );
      if (!ok) return;
    }

    setWorking(request.id);
    setErrorById((prev) => ({ ...prev, [request.id]: null }));
    try {
      const res = await client.patch(`/appointment-requests/${request.id}/status`, { status: newStatus });
      if (res.data.patientId) {
        setResultById((prev) => ({ ...prev, [request.id]: res.data.message }));
      }
      load();
    } catch (err) {
      // Surface the real failure instead of silently snapping the dropdown
      // back to its old value with no explanation — that's exactly what was
      // happening before this fix.
      const message =
        err.response?.data?.message ||
        'Could not update this request. Check your connection and try again.';
      setErrorById((prev) => ({ ...prev, [request.id]: message }));
    } finally {
      setWorking(null);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1>Appointment Requests</h1>
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
        {loading && <div className="empty-state">Loading appointment requests…</div>}
        {!loading && requests.length === 0 && (
          <div className="empty-state">No appointment requests yet — new website bookings will show up here.</div>
        )}

        {!loading && requests.length > 0 && requests.map((r) => (
          <div className="plan-row" key={r.id}>
            <div
              className="plan-row-header"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
            >
              <div>
                <strong>{r.name}</strong>
                <div className="muted small">
                  {r.preferred_date}
                  {formatTime(r.preferred_time) ? ` · ${formatTime(r.preferred_time)}` : ''}
                  {r.treatment_name ? ` · ${r.treatment_name}` : ''}
                </div>
              </div>
              <span className={`badge ${r.status === 'resolved' ? 'completed' : r.status === 'in_progress' ? 'checked_in' : 'pending'}`}>
                {STATUS_LABELS[r.status]}
              </span>
            </div>

            {openId === r.id && (
              <div className="plan-detail">
                <div className="detail-grid" style={{ marginBottom: 16 }}>
                  <div>
                    <span className="detail-label">Contact</span>
                    <span className="detail-value">
                      {[r.email, r.phone].filter(Boolean).join(' · ') || 'No contact info provided'}
                    </span>
                  </div>
                  <div>
                    <span className="detail-label">Preferred date & time</span>
                    <span className="detail-value">
                      {r.preferred_date}{formatTime(r.preferred_time) ? ` at ${formatTime(r.preferred_time)}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="detail-label">Service requested</span>
                    <span className="detail-value">{r.treatment_name || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="detail-label">Received</span>
                    <span className="detail-value">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {r.reason && (
                  <p style={{ marginBottom: 16, whiteSpace: 'pre-wrap' }}>{r.reason}</p>
                )}

                <div className="field" style={{ maxWidth: 220 }}>
                  <label>Status</label>
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r, e.target.value)}
                    disabled={working === r.id}
                  >
                    {STATUS_FILTERS.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {resultById[r.id] && (
                  <div className="success-banner" style={{ marginTop: 14 }}>{resultById[r.id]}</div>
                )}

                {errorById[r.id] && (
                  <div className="error-banner" style={{ marginTop: 14 }}>{errorById[r.id]}</div>
                )}

                {r.linked_patient_id ? (
                  <p className="muted small" style={{ marginTop: 12 }}>
                    Linked to patient <strong>{r.linked_patient_code}</strong> —{' '}
                    <Link to={`/patients/${r.linked_patient_id}`}>view patient record</Link>. The
                    appointment was booked automatically when this was marked resolved.
                  </p>
                ) : (
                  <p className="muted small" style={{ marginTop: 12 }}>
                    Marking this <strong>Resolved</strong> will automatically create a patient
                    record (or match an existing one by email/phone) and book the real
                    appointment — no manual re-entry needed.
                  </p>
                )}

                {r.handled_by_first_name && (
                  <p className="muted small" style={{ marginTop: 4 }}>
                    Last updated by {r.handled_by_first_name} {r.handled_by_last_name}
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
