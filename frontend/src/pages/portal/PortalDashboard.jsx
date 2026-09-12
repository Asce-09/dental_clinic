import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = ((+h + 11) % 12) + 1;
  const ampm = +h < 12 ? 'AM' : 'PM';
  return `${hour}:${m} ${ampm}`;
}

export default function PortalDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/portal/appointments'),
      client.get('/portal/invoices'),
      client.get('/portal/treatment-plans'),
    ])
      .then(([apptRes, invRes, planRes]) => {
        setAppointments(apptRes.data);
        setInvoices(invRes.data);
        setPlans(planRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="empty-state">Loading your dashboard…</div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments
    .filter((a) => a.appointment_date >= today && !['cancelled', 'completed', 'no_show'].includes(a.status))
    .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time));
  const nextAppt = upcoming[0];

  const outstanding = invoices
    .filter((i) => i.status !== 'void')
    .reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0);

  const activePlans = plans.filter((p) => ['proposed', 'accepted', 'in_progress'].includes(p.status));

  return (
    <div>
      <div className="topbar">
        <h1>Welcome back</h1>
        <span className="date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Next appointment</div>
          <div className="value" style={{ fontSize: 18 }}>
            {nextAppt
              ? `${nextAppt.appointment_date} · ${formatTime(nextAppt.start_time)}`
              : 'None scheduled'}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Active treatment plans</div>
          <div className="value">{activePlans.length}</div>
        </div>
        <div className="stat-card accent">
          <div className="label">Outstanding balance</div>
          <div className="value">{money(outstanding)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Upcoming appointments</h3>
          <Link to="/portal/appointments" className="btn btn-secondary btn-sm">
            Request appointment
          </Link>
        </div>

        {upcoming.length === 0 && (
          <div className="empty-state">
            No upcoming appointments. Use "Request appointment" to ask for a slot.
          </div>
        )}

        {upcoming.length > 0 && (
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
              {upcoming.slice(0, 5).map((a) => (
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
    </div>
  );
}
