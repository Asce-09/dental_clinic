import { useEffect, useState } from 'react';
import client from '../api/client';
import ToothGrid, { DENTITION_INFO } from './ToothGrid.jsx';

const STATUS_OPTIONS = [
  'healthy', 'caries', 'filled', 'crowned', 'root_canal',
  'missing', 'extracted', 'implant', 'other',
];

const SURFACE_OPTIONS = [
  'whole', 'mesial', 'distal', 'occlusal', 'buccal', 'lingual', 'incisal', 'cervical',
];

export default function DentalChart({ patientId }) {
  const [chart, setChart] = useState(null); // { dentition, autoDentition, age, teeth }
  const [override, setOverride] = useState('auto');
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [conditionForm, setConditionForm] = useState({ conditionName: '', surface: 'whole', notes: '' });
  const [savingCondition, setSavingCondition] = useState(false);

  function load() {
    const params = override === 'auto' ? {} : { dentition: override };
    client.get(`/patients/${patientId}/teeth`, { params }).then((res) => setChart(res.data));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, override]);

  if (!chart) {
    return <div className="empty-state">Loading dental chart…</div>;
  }

  const byNumber = Object.fromEntries(chart.teeth.map((t) => [t.tooth_number, t]));
  const selected = selectedNumber ? byNumber[selectedNumber] : null;

  async function handleStatusChange(status) {
    if (!selected) return;
    setSavingStatus(true);
    try {
      await client.put(`/patients/${patientId}/teeth/${selected.id}`, { status });
      load();
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAddCondition(e) {
    e.preventDefault();
    if (!selected || !conditionForm.conditionName) return;
    setSavingCondition(true);
    try {
      await client.post(`/patients/${patientId}/teeth/${selected.id}/conditions`, conditionForm);
      setConditionForm({ conditionName: '', surface: 'whole', notes: '' });
      load();
    } finally {
      setSavingCondition(false);
    }
  }

  return (
    <div className="dental-chart">
      <div className="chart-header">
        <div>
          <strong>{DENTITION_INFO[chart.dentition].label}</strong>
          <div className="muted small">
            {DENTITION_INFO[chart.dentition].detail}
            {chart.age === null
              ? ' · No birth date on file, showing the adult chart by default'
              : ` · Patient is ${chart.age} year${chart.age === 1 ? '' : 's'} old`}
          </div>
        </div>
        <div className="field chart-override">
          <label>Chart type</label>
          <select value={override} onChange={(e) => setOverride(e.target.value)}>
            <option value="auto">Auto (by age)</option>
            <option value="primary">Primary (baby) teeth</option>
            <option value="mixed">Mixed dentition</option>
            <option value="permanent">Permanent (adult) teeth</option>
          </select>
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
            <button className="modal-close" onClick={() => setSelectedNumber(null)}>
              ×
            </button>
          </div>

          <div className="field">
            <label>Status</label>
            <select
              value={selected.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <h5>Conditions on record</h5>
          {selected.conditions.length === 0 && (
            <p className="muted">No conditions recorded for this tooth yet.</p>
          )}
          {selected.conditions.length > 0 && (
            <ul className="condition-list">
              {selected.conditions.map((c) => (
                <li key={c.id}>
                  <strong>{c.condition_name}</strong> · {c.surface.replace('_', ' ')}
                  {c.notes && <span> — {c.notes}</span>}
                  <div className="muted small">
                    {new Date(c.recorded_at).toLocaleDateString()}
                    {c.recorded_by_first_name && ` · ${c.recorded_by_first_name} ${c.recorded_by_last_name}`}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className="condition-form" onSubmit={handleAddCondition}>
            <div className="field">
              <label>Add condition</label>
              <input
                placeholder="e.g. Deep caries"
                value={conditionForm.conditionName}
                onChange={(e) => setConditionForm({ ...conditionForm, conditionName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Surface</label>
              <select
                value={conditionForm.surface}
                onChange={(e) => setConditionForm({ ...conditionForm, surface: e.target.value })}
              >
                {SURFACE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Notes</label>
              <input
                value={conditionForm.notes}
                onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })}
              />
            </div>
            <button className="btn btn-secondary btn-inline" type="submit" disabled={savingCondition}>
              {savingCondition ? 'Saving…' : 'Add condition'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
