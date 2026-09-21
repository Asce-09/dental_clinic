import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { todayStr } from '../utils/date.js';
import {
  formatTime, formatShortDate, STATUS_FLOW, CLOSED_STATUSES,
} from '../utils/appointments.js';

const SCHEDULING_ROLES = ['admin', 'dentist', 'assistant', 'receptionist'];

const EMPTY_FORM = {
  dentistId: '', treatmentId: '', appointmentDate: todayStr(),
  startTime: '09:00', endTime: '', reason: '',
};

// Appointments for one patient, with a quick "book" button so staff can
// schedule the next visit without leaving the patient's record.
export default function PatientAppointmentsTab({ patientId }) {
  const { user } = useAuth();
  const canSchedule = SCHEDULING_ROLES.includes(user?.role);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('upcoming');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dentists, setDentists] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    client
      .get('/appointments', { params: { patientId } })
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (!canSchedule) return;
    client.get('/lookups/dentists').then((res) => setDentists(res.data));
    client.get('/lookups/treatments').then((res) => setTreatments(res.data));
  }, [canSchedule]);

  const today = todayStr();
  const upcoming = useMemo(
    () => appointments
      .filter((a) => a.appointment_date >= today)
      .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time)),
    [appointments, today]
  );
  const past = useMemo(
    () => appointments
      .filter((a) => a.appointment_date < today)
      .sort((a, b) => (b.appointment_date + b.start_time).localeCompare(a.appointment_date + a.start_time)),
    [appointments, today]
  );
  const all = useMemo(
    () => [...appointments].sort((a, b) => (b.appointment_date + b.start_time).localeCompare(a.appointment_date + a.start_time)),
    [appointments]
  );
  const visible = view === 'upcoming' ? upcoming : view === 'past' ? past : all;

  async function handleStatusChange(id, status) {
    await client.patch(`/appointments/${id}/status`, { status });
    load();
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.appointmentDate || !form.startTime) {
      setError('Date and start time are required.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/appointments', { ...form, patientId });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      setView('upcoming');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel detail-panel">
      <div className="section-header">
        <h3>Appointments</h3>
        {canSchedule && (
          <button
            className="btn btn-primary btn-inline"
            onClick={() => {
              setForm({ ...EMPTY_FORM, appointmentDate: todayStr() });
              setError('');
              setShowAdd(true);
            }}
          >
            + Make an appointment
          </button>
        )}
      </div>

      <div className="filter-row">
        <button className={`filter-chip${view === 'upcoming' ? ' active' : ''}`} onClick={() => setView('upcoming')}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`filter-chip${view === 'past' ? ' active' : ''}`} onClick={() => setView('past')}>
          Past ({past.length})
        </button>
        <button className={`filter-chip${view === 'all' ? ' active' : ''}`} onClick={() => setView('all')}>
          All ({appointments.length})
        </button>
      </div>

      {loading && <div className="empty-state">Loading appointments…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          {view === 'upcoming' && 'No upcoming appointments for this patient.'}
          {view === 'past' && 'No past appointments for this patient.'}
          {view === 'all' && 'This patient has no appointments yet.'}
        </div>
      )}

      {!loading && visible.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Dentist</th>
              <th>Content</th>
              <th>Status</th>
              {canSchedule && <th></th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => {
              const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(a.status) + 1];
              return (
                <tr key={a.id}>
                  <td>{formatShortDate(a.appointment_date)}</td>
                  <td>{formatTime(a.start_time)}</td>
                  <td>{a.dentist_first_name ? `Dr. ${a.dentist_first_name} ${a.dentist_last_name}` : '—'}</td>
                  <td>
                    {a.treatment_name && <strong>{a.treatment_name}</strong>}
                    {a.treatment_name && a.reason ? <br /> : null}
                    {a.reason || (!a.treatment_name && '—')}
                  </td>
                  <td>
                    <span className={`badge ${a.status}`}>{a.status.replace('_', ' ')}</span>
                  </td>
                  {canSchedule && (
                    <td className="actions-cell">
                      {nextStatus && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStatusChange(a.id, nextStatus)}
                        >
                          Mark {nextStatus.replace('_', ' ')}
                        </button>
                      )}
                      {!CLOSED_STATUSES.includes(a.status) && (
                        <button
                          className="btn btn-text-danger btn-sm"
                          onClick={() => handleStatusChange(a.id, 'cancelled')}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showAdd && (
        <Modal title="Make an appointment" onClose={() => setShowAdd(false)}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleAddSubmit}>
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
                    <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>
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
                    <option key={t.id} value={t.id}>{t.name}</option>
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
