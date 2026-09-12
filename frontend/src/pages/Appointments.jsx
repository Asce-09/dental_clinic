import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';
import PatientPicker from '../components/PatientPicker.jsx';

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = ((+h + 11) % 12) + 1;
  const ampm = +h < 12 ? 'AM' : 'PM';
  return `${hour}:${m} ${ampm}`;
}

const STATUS_FLOW = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed'];

const EMPTY_FORM = {
  patientId: '', dentistId: '', treatmentId: '', appointmentDate: todayStr(),
  startTime: '09:00', endTime: '', reason: '',
};

export default function Appointments() {
  const [date, setDate] = useState(todayStr());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dentists, setDentists] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    client
      .get('/appointments', { params: { date } })
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [date]);

  useEffect(() => {
    client.get('/lookups/dentists').then((res) => setDentists(res.data));
    client.get('/lookups/treatments').then((res) => setTreatments(res.data));
  }, []);

  async function handleStatusChange(id, status) {
    await client.patch(`/appointments/${id}/status`, { status });
    load();
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.patientId || !form.appointmentDate || !form.startTime) {
      setError('Patient, date, and start time are required.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/appointments', form);
      setShowAdd(false);
      setForm({ ...EMPTY_FORM, appointmentDate: date });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create appointment.');
    } finally {
      setSaving(false);
    }
  }

  function shiftDate(days) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  }

  return (
    <div>
      <div className="topbar">
        <h1>Appointments</h1>
        <button
          className="btn btn-primary btn-inline"
          onClick={() => {
            setForm({ ...EMPTY_FORM, appointmentDate: date });
            setShowAdd(true);
          }}
        >
          + New appointment
        </button>
      </div>

      <div className="date-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => shiftDate(-1)}>
          ← Prev
        </button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn btn-secondary btn-sm" onClick={() => shiftDate(1)}>
          Next →
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setDate(todayStr())}>
          Today
        </button>
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading appointments…</div>}

        {!loading && appointments.length === 0 && (
          <div className="empty-state">No appointments scheduled for this day.</div>
        )}

        {!loading && appointments.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Dentist</th>
                <th>Treatment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(a.status) + 1];
                return (
                  <tr key={a.id}>
                    <td>{formatTime(a.start_time)}</td>
                    <td>
                      {a.patient_first_name} {a.patient_last_name}
                      <div className="muted small">{a.patient_phone}</div>
                    </td>
                    <td>
                      {a.dentist_first_name ? `Dr. ${a.dentist_first_name} ${a.dentist_last_name}` : '—'}
                    </td>
                    <td>{a.treatment_name || a.reason || '—'}</td>
                    <td>
                      <span className={`badge ${a.status}`}>{a.status.replace('_', ' ')}</span>
                    </td>
                    <td className="actions-cell">
                      {nextStatus && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStatusChange(a.id, nextStatus)}
                        >
                          Mark {nextStatus.replace('_', ' ')}
                        </button>
                      )}
                      {!['cancelled', 'completed', 'no_show'].includes(a.status) && (
                        <button
                          className="btn btn-text-danger btn-sm"
                          onClick={() => handleStatusChange(a.id, 'cancelled')}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="New appointment" onClose={() => setShowAdd(false)}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleAddSubmit}>
            <PatientPicker
              onSelect={(p) => setForm({ ...form, patientId: p ? p.id : '' })}
            />

            <div className="form-grid">
              <div className="field">
                <label>Date *</label>
                <input
                  type="date"
                  value={form.appointmentDate}
                  onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Start time *</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Dentist</label>
                <select
                  value={form.dentistId}
                  onChange={(e) => setForm({ ...form, dentistId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Treatment</label>
                <select
                  value={form.treatmentId}
                  onChange={(e) => setForm({ ...form, treatmentId: e.target.value })}
                >
                  <option value="">Not specified</option>
                  {treatments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field span-2">
                <label>Reason / notes</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create appointment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}