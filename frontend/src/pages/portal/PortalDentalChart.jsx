import { useEffect, useState } from 'react';
import client from '../../api/client';

const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

const STATUS_OPTIONS = [
  'healthy', 'caries', 'filled', 'crowned', 'root_canal',
  'missing', 'extracted', 'implant', 'other',
];

export default function PortalDentalChart() {
  const [chart, setChart] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);

  useEffect(() => {
    client.get('/portal/dental-chart').then((res) => setChart(res.data));
  }, []);

  if (!chart) {
    return <div className="empty-state">Loading your dental chart…</div>;
  }

  const byNumber = Object.fromEntries(chart.map((t) => [t.tooth_number, t]));
  const selected = selectedNumber ? byNumber[selectedNumber] : null;

  function ToothRow({ numbers }) {
    return (
      <div className="tooth-row">
        {numbers.map((num) => {
          const tooth = byNumber[num];
          const status = tooth?.status || 'healthy';
          const isSelected = selectedNumber === num;
          return (
            <button
              key={num}
              className={`tooth tooth-${status}${isSelected ? ' tooth-selected' : ''}`}
              onClick={() => setSelectedNumber(num)}
              title={`Tooth ${num} — ${status.replace('_', ' ')}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <h1>Dental Chart</h1>
      </div>

      <div className="panel detail-panel">
        <div className="dental-chart">
          <div className="chart-grid">
            <div className="chart-quadrants">
              <ToothRow numbers={UPPER_RIGHT} />
              <ToothRow numbers={UPPER_LEFT} />
            </div>
            <div className="chart-midline" />
            <div className="chart-quadrants">
              <ToothRow numbers={LOWER_RIGHT} />
              <ToothRow numbers={LOWER_LEFT} />
            </div>
          </div>

          <div className="chart-legend">
            {STATUS_OPTIONS.map((s) => (
              <span key={s} className="legend-item">
                <span className={`legend-dot tooth-${s}`} />
                {s.replace('_', ' ')}
              </span>
            ))}
          </div>

          {selected && (
            <div className="tooth-panel">
              <div className="tooth-panel-header">
                <h4>Tooth {selected.tooth_number}</h4>
                <button className="modal-close" onClick={() => setSelectedNumber(null)}>×</button>
              </div>
              <p className="muted capitalize" style={{ marginBottom: 12 }}>
                Status: {selected.status.replace('_', ' ')}
              </p>

              <h5>Conditions on record</h5>
              {selected.conditions.length === 0 && (
                <p className="muted">No conditions recorded for this tooth.</p>
              )}
              {selected.conditions.length > 0 && (
                <ul className="condition-list">
                  {selected.conditions.map((c, i) => (
                    <li key={i}>
                      <strong>{c.condition_name}</strong> · {c.surface.replace('_', ' ')}
                      {c.notes && <span> — {c.notes}</span>}
                      <div className="muted small">{new Date(c.recorded_at).toLocaleDateString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
