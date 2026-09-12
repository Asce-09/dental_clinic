import { useEffect, useState } from 'react';
import client from '../../api/client';
import Modal from '../../components/Modal.jsx';

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = ((+h + 11) % 12) + 1;
  const ampm = +h < 12 ? 'AM' : 'PM';
  return `${hour}:${m} ${ampm}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = { treatmentId: '', appointmentDate: todayStr(), startTime: '09:00', reason: '' };

export default function PortalAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    setLoading(true);
    client.get('/portal/appointments').then((res) => setAppointments(res.data)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    client.get('/lookups/treatments').then((res) => setTreatments(res.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.appointmentDate || !form.startTime) {
      setError('Please choose a preferred date and time.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/portal/appointments', form);
      setShowRequest(false);
      setForm(EMPTY_FORM);
      setSuccess('Your appointment request has been sent. The clinic will confirm it shortly.');
      setTimeout(() => setSuccess(''), 5000);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1>My Appointments</h1>
        <button className="btn btn-primary btn-inline" onClick={() => setShowRequest(true)}>
          + Request appointment
        </button>
      </div>

      {success && <div className="success-banner">{success}</div>}

      <div className="panel">
        {loading && <div className="empty-state">Loading appointments…</div>}
        {!loading && appointments.length === 0 && (
          <div className="empty-state">You have no appointments yet.</div>
        )}
        {!loading && appointments.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Dentist</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.appointment_date}</td>
                  <td>{formatTime(a.start_time)}</td>
                  <td>{a.dentist_first_name ? `Dr. ${a.dentist_first_name} ${a.dentist_last_name}` : 'Unassigned'}</td>
                  <td>{a.treatment_name || a.reason || '—'}</td>
                  <td><span className={`badge ${a.status}`}>{a.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showRequest && (
        <Modal title="Request an appointment" onClose={() => setShowRequest(false)}>
          <p className="muted" style={{ marginBottom: 16 }}>
            This sends a request to the clinic — it isn't confirmed until staff reviews and accepts it.
          </p>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Preferred date *</label>
                <input
                  type="date"
                  min={todayStr()}
                  value={form.appointmentDate}
                  onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Preferred time *</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="field span-2">
                <label>Treatment (optional)</label>
                <select
                  value={form.treatmentId}
                  onChange={(e) => setForm({ ...form, treatmentId: e.target.value })}
                >
                  <option value="">Not sure / general checkup</option>
                  {treatments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="field span-2">
                <label>Reason / notes</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. tooth sensitivity on the lower left side"
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Sending…' : 'Send request'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
