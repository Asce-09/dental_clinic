import { useEffect, useState } from 'react';
import client from '../../api/client';
import ToothGrid, { DENTITION_INFO } from '../../components/ToothGrid.jsx';

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

  const byNumber = Object.fromEntries(chart.teeth.map((t) => [t.tooth_number, t]));
  const selected = selectedNumber ? byNumber[selectedNumber] : null;

  return (
    <div>
      <div className="topbar">
        <h1>Dental Chart</h1>
      </div>

      <div className="panel detail-panel">
        <div className="dental-chart">
          <div className="chart-header">
            <div>
              <strong>{DENTITION_INFO[chart.dentition].label}</strong>
              <div className="muted small">{DENTITION_INFO[chart.dentition].detail}</div>
            </div>
          </div>

          <ToothGrid
            dentition={chart.dentition}
            byNumber={byNumber}
            selectedNumber={selectedNumber}
            onSelect={setSelectedNumber}
          />

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
