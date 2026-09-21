import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { todayStr, toDateStr } from '../utils/date.js';
import {
  formatTime, formatDayLabel, ageFromBirthDate, CAME_STATUSES, TIME_RANGES, inRange,
} from '../utils/appointments.js';

// "Who is coming in on this day" view for the Patients page: same day
// navigation, time-slot chips and quick filter as the Appointments page, but
// every row opens the patient's record.
export default function PatientsByDay() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayStr());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setActiveRange(null);
    setSearch('');
    client
      .get('/appointments', { params: { date } })
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  }, [date]);

  function shiftDate(days) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    setDate(toDateStr(d));
  }

  const rangeCounts = useMemo(() => {
    const counts = {};
    TIME_RANGES.forEach((r) => {
      counts[r.key] = appointments.filter((a) => inRange(a.start_time, r)).length;
    });
    return counts;
  }, [appointments]);

  const came = appointments.filter((a) => CAME_STATUSES.includes(a.status)).length;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const range = TIME_RANGES.find((r) => r.key === activeRange);
    return appointments.filter((a) => {
      if (range && !inRange(a.start_time, range)) return false;
      if (term) {
        const haystack = [a.patient_code, a.patient_first_name, a.patient_last_name, a.patient_phone]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [appointments, activeRange, search]);

  return (
    <div>
      <div className="appt-day-header">
        <div className="date-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => shiftDate(-1)}>
            ← Prev
          </button>
          <div className="appt-day-label">
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
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
          <span className="appt-stat"><strong>{appointments.length}</strong> Patients</span>
          <span className="appt-stat appt-stat-came"><strong>{came}</strong> Came</span>
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
        {loading && <div className="empty-state">Loading patients…</div>}

        {!loading && visible.length === 0 && (
          <div className="empty-state">
            {appointments.length === 0
              ? 'No patients scheduled for this day.'
              : 'No patients match this filter.'}
          </div>
        )}

        {!loading && visible.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Code</th>
                <th>Patient</th>
                <th>Age</th>
                <th>Phone</th>
                <th>Content</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a, i) => (
                <tr key={a.id} className="row-link" onClick={() => navigate(`/patients/${a.patient_id}`)}>
                  <td>{i + 1}</td>
                  <td>{formatTime(a.start_time)}</td>
                  <td>{a.patient_code}</td>
                  <td>{a.patient_first_name} {a.patient_last_name}</td>
                  <td>{ageFromBirthDate(a.patient_birth_date)}</td>
                  <td>{a.patient_phone || '—'}</td>
                  <td>
                    {a.treatment_name && <strong>{a.treatment_name}</strong>}
                    {a.treatment_name && a.reason ? <br /> : null}
                    {a.reason || (!a.treatment_name && '—')}
                  </td>
                  <td>
                    <span className={`badge ${a.status}`}>{a.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
