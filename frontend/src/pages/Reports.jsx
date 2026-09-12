import { useEffect, useState } from 'react';
import client from '../api/client';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  });
}

function BarList({ items, valueFormatter = (v) => v, barClass = '' }) {
  const max = Math.max(1, ...items.map((it) => it.value));
  return (
    <div className="bar-list">
      {items.map((it) => (
        <div className="bar-row" key={it.label}>
          <span className="bar-label">{it.label}</span>
          <div className="bar-track">
            <div
              className={`bar-fill ${barClass}`}
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
          <span className="bar-value">{valueFormatter(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked in',
  in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    client.get('/reports/overview', { params: { months } }).then((res) => setData(res.data));
  }, [months]);

  if (!data) {
    return <div className="empty-state">Loading reports…</div>;
  }

  const revenueItems = data.revenueByMonth.map((r) => ({
    label: monthLabel(r.month), value: Number(r.total),
  }));
  const patientItems = data.newPatientsByMonth.map((r) => ({
    label: monthLabel(r.month), value: Number(r.count),
  }));
  const statusItems = data.appointmentsByStatus.map((s) => ({
    label: STATUS_LABELS[s.status] || s.status, value: Number(s.count),
  }));
  const treatmentItems = data.topTreatments.map((t) => ({
    label: t.name, value: Number(t.count),
  }));

  const totalRevenue = revenueItems.reduce((s, r) => s + r.value, 0);
  const totalBillings = totalRevenue + Number(data.outstandingBalance || 0);

  return (
    <div>
      <div className="topbar">
        <h1>Reports</h1>
        <select
          className="inline-select"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
        >
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 260px))', marginBottom: 28 }}>
        <div className="stat-card accent">
          <div className="label">Outstanding balance</div>
          <div className="value">{money(Math.max(0, data.outstandingBalance))}</div>
        </div>
        <div className="stat-card">
          <div className="label">Revenue collected ({months}mo)</div>
          <div className="value">{money(totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total billings ({months}mo)</div>
          <div className="value">{money(totalBillings)}</div>
        </div>
      </div>

      <div className="report-grid">
        <div className="panel report-panel">
          <div className="panel-header"><h3>Revenue by month</h3></div>
          <div className="report-panel-body">
            {revenueItems.length === 0 ? (
              <div className="empty-state">No verified payments in this period yet.</div>
            ) : (
              <BarList items={revenueItems} valueFormatter={money} barClass="bar-teal" />
            )}
          </div>
        </div>

        <div className="panel report-panel">
          <div className="panel-header"><h3>New patients by month</h3></div>
          <div className="report-panel-body">
            {patientItems.length === 0 ? (
              <div className="empty-state">No new patients in this period yet.</div>
            ) : (
              <BarList items={patientItems} barClass="bar-gold" />
            )}
          </div>
        </div>

        <div className="panel report-panel">
          <div className="panel-header"><h3>Appointments by status</h3></div>
          <div className="report-panel-body">
            {statusItems.length === 0 ? (
              <div className="empty-state">No appointments in this period yet.</div>
            ) : (
              <BarList items={statusItems} barClass="bar-teal" />
            )}
          </div>
        </div>

        <div className="panel report-panel">
          <div className="panel-header"><h3>Top treatments</h3></div>
          <div className="report-panel-body">
            {treatmentItems.length === 0 ? (
              <div className="empty-state">No completed treatments in this period yet.</div>
            ) : (
              <BarList items={treatmentItems} barClass="bar-gold" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}