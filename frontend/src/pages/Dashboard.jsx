import { useEffect, useState } from 'react';
import client from '../api/client';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = ((+h + 11) % 12) + 1;
  const ampm = +h < 12 ? 'AM' : 'PM';
  return `${hour}:${m} ${ampm}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load dashboard data.'));
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <div className="topbar">
        <h1>Dashboard</h1>
        <span className="date">{today}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Active patients</div>
          <div className="value">{data?.activePatients ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today's appointments</div>
          <div className="value">{data?.todayAppointments ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Upcoming appointments</div>
          <div className="value">{data?.upcomingAppointments ?? '—'}</div>
        </div>
        <div className="stat-card accent">
          <div className="label">Unpaid invoices</div>
          <div className="value">
            {data ? formatCurrency(data.unpaidInvoiceAmount) : '—'}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Upcoming appointments</h3>
        </div>

        {data && data.recentAppointments.length === 0 && (
          <div className="empty-state">No upcoming appointments scheduled yet.</div>
        )}

        {data && data.recentAppointments.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Dentist</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentAppointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.appointment_date}</td>
                  <td>{formatTime(a.start_time)}</td>
                  <td>
                    {a.patient_first_name} {a.patient_last_name}
                  </td>
                  <td>
                    {a.dentist_first_name
                      ? `Dr. ${a.dentist_first_name} ${a.dentist_last_name}`
                      : '—'}
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
