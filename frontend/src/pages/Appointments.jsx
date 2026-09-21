import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';
import PatientPicker from '../components/PatientPicker.jsx';
import { todayStr, toDateStr } from '../utils/date.js';
import {
  formatTime, formatDayLabel, STATUS_FLOW, CAME_STATUSES, TIME_RANGES, inRange,
} from '../utils/appointments.js';

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

  const [activeRange, setActiveRange] = useState(null);
  const [search, setSearch] = useState('');

  function load() {
    setLoading(true);
    client
      .get('/appointments', { params: { date } })
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [date]);

  useEffect(() => {
    setActiveRange(null);
    setSearch('');
  }, [date]);

  useEffect(() => {
    client.get('/lookups/dentists').then((res) => setDentists(res.data));
    client.get('/lookups/treatments').then((res) => setTreatments(res.data));
  }, []);

  const rangeCounts = useMemo(() => {
    const counts = {};
    TIME_RANGES.forEach((r) => {
      counts[r.key] = appointments.filter((a) => inRange(a.start_time, r)).length;
    });
    return counts;
  }, [appointments]);

  const stats = useMemo(() => ({
    total: appointments.length,
    came: appointments.filter((a) => CAME_STATUSES.includes(a.status)).length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  }), [appointments]);

  const visibleAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (activeRange) {
        const range = TIME_RANGES.find((r) => r.key === activeRange);
        if (!inRange(a.start_time, range)) return false;
      }
      if (term) {
        const haystack = [
          a.patient_code, a.patient_first_name, a.patient_last_name, a.patient_phone,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [appointments, activeRange, search]);

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
    setDate(toDateStr(d));
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
          + Make an appointment
        </button>
      </div>

      <div className="appt-day-header">
        <div className="date-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => shiftDate(-1)}>
            ← Prev
          </button>
          <div className="appt-day-label">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <span>{formatDayLabel(date)}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => shiftDate(1)}>
            Next →
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setDate(todayStr())}>
            Today
          </button>
        </div>

        <div className="appt-stat-strip">
          <span className="appt-stat"><strong>{stats.total}</strong> Appointments</span>
          <span className="appt-stat appt-stat-came"><strong>{stats.came}</strong> Came</span>
          <span className="appt-stat appt-stat-cancelled"><strong>{stats.cancelled}</strong> Cancelled</span>
        </div>
      </div>

      <div className="filter-row">
        <button
          className={`filter-chip${activeRange === null ? ' active' : ''}`}
          onClick={() => setActiveRange(null)}
        >
          All ({appointments.length})
        </button>
        {TIME_RANGES.map((r) => (
          <button
            key={r.key}
            className={`filter-chip${activeRange === r.key ? ' active' : ''}`}
            onClick={() => setActiveRange(activeRange === r.key ? null : r.key)}
          >
            {rangeCounts[r.key]} | {r.label}
          </button>
        ))}
      </div>

      <div className="search-row">
        <input
          type="text"
          placeholder="Filter by patient name, code, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading appointments…</div>}

        {!loading && visibleAppointments.length === 0 && (
          <div className="empty-state">
            {appointments.length === 0
              ? 'No appointments scheduled for this day.'
              : 'No appointments match this filter.'}
          </div>
        )}

        {!loading && visibleAppointments.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Patient Code</th>
                <th>Patient</th>
                <th>Phone</th>
                <th>Content</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleAppointments.map((a, i) => {
                const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(a.status) + 1];
                return (
                  <tr key={a.id}>
                    <td>{i + 1}</td>
                    <td>{formatTime(a.start_time)}</td>
                    <td>{a.patient_code}</td>
                    <td>{a.patient_first_name} {a.patient_last_name}</td>
                    <td>{a.patient_phone || '—'}</td>
                    <td>
                      {a.treatment_name && <strong>{a.treatment_name}</strong>}
                      {a.treatment_name && a.reason ? <br /> : null}
                      {a.reason || (!a.treatment_name && '—')}
                    </td>
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
        <Modal title="Make an appointment" onClose={() => setShowAdd(false)}>
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
