import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import DentalChart from '../components/DentalChart.jsx';
import TreatmentTab from '../components/TreatmentTab.jsx';
import PortalAccessPanel from '../components/PortalAccessPanel.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'medical', label: 'Medical History' },
  { key: 'chart', label: 'Dental Chart' },
  { key: 'treatment', label: 'Treatment' },
];

function calcAge(birthDate) {
  if (!birthDate) return '—';
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState('overview');
  const [historyForm, setHistoryForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    client.get(`/patients/${id}`).then((res) => {
      setPatient(res.data);
      setHistoryForm({
        allergies: res.data.medicalHistory?.allergies || '',
        currentMedications: res.data.medicalHistory?.current_medications || '',
        medicalConditions: res.data.medicalHistory?.medical_conditions || '',
        previousSurgeries: res.data.medicalHistory?.previous_surgeries || '',
        familyHistory: res.data.medicalHistory?.family_history || '',
        pregnancyStatus: res.data.medicalHistory?.pregnancy_status || '',
        smokingStatus: res.data.medicalHistory?.smoking_status || '',
        alcoholUse: res.data.medicalHistory?.alcohol_use || '',
        notes: res.data.medicalHistory?.notes || '',
      });
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveHistory(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await client.put(`/patients/${id}/medical-history`, historyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (!patient) {
    return <div className="empty-state">Loading patient…</div>;
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="link-back" onClick={() => navigate('/patients')}>
            ← Back to patients
          </button>
          <h1>
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="muted">
            {patient.patient_code} · {calcAge(patient.birth_date)} yrs
            {patient.sex ? ` · ${patient.sex.replace('_', ' ')}` : ''}
          </p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="panel detail-panel">
          <div className="detail-grid">
            <div>
              <span className="detail-label">Phone</span>
              <span className="detail-value">{patient.phone || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Email</span>
              <span className="detail-value">{patient.email || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Civil status</span>
              <span className="detail-value">{patient.civil_status || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Occupation</span>
              <span className="detail-value">{patient.occupation || '—'}</span>
            </div>
            <div className="span-2">
              <span className="detail-label">Address</span>
              <span className="detail-value">{patient.address || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Emergency contact</span>
              <span className="detail-value">
                {patient.emergency_contact_name
                  ? `${patient.emergency_contact_name} (${patient.emergency_contact_relationship || '—'})`
                  : '—'}
              </span>
            </div>
            <div>
              <span className="detail-label">Emergency phone</span>
              <span className="detail-value">{patient.emergency_contact_phone || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div style={{ marginTop: 20 }}>
          <PortalAccessPanel
            patientId={id}
            portalAccess={patient.portalAccess}
            onChange={load}
          />
        </div>
      )}

      {tab === 'medical' && historyForm && (
        <div className="panel detail-panel">
          <form onSubmit={handleSaveHistory}>
            <div className="form-grid">
              <div className="field span-2">
                <label>Allergies</label>
                <input
                  value={historyForm.allergies}
                  onChange={(e) => setHistoryForm({ ...historyForm, allergies: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Current medications</label>
                <input
                  value={historyForm.currentMedications}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, currentMedications: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>Medical conditions</label>
                <input
                  value={historyForm.medicalConditions}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, medicalConditions: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>Previous surgeries</label>
                <input
                  value={historyForm.previousSurgeries}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, previousSurgeries: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>Family history</label>
                <input
                  value={historyForm.familyHistory}
                  onChange={(e) => setHistoryForm({ ...historyForm, familyHistory: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Pregnancy status</label>
                <input
                  value={historyForm.pregnancyStatus}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, pregnancyStatus: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Smoking status</label>
                <input
                  value={historyForm.smokingStatus}
                  onChange={(e) => setHistoryForm({ ...historyForm, smokingStatus: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Alcohol use</label>
                <input
                  value={historyForm.alcoholUse}
                  onChange={(e) => setHistoryForm({ ...historyForm, alcoholUse: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Notes</label>
                <input
                  value={historyForm.notes}
                  onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary btn-inline" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save medical history'}
            </button>
            {saved && <span className="save-confirmed">Saved</span>}
          </form>
        </div>
      )}

      {tab === 'chart' && (
        <div className="panel detail-panel">
          <DentalChart patientId={id} />
        </div>
      )}

      {tab === 'treatment' && <TreatmentTab patientId={id} />}
    </div>
  );
}
