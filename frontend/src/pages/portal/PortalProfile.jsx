import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function PortalProfile() {
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    client.get('/portal/me').then((res) => {
      setPatient(res.data);
      setForm({
        phone: res.data.phone || '',
        address: res.data.address || '',
        emergencyContactName: res.data.emergency_contact_name || '',
        emergencyContactPhone: res.data.emergency_contact_phone || '',
        emergencyContactRelationship: res.data.emergency_contact_relationship || '',
      });
    });
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await client.put('/portal/me', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (!patient || !form) {
    return <div className="empty-state">Loading your profile…</div>;
  }

  const h = patient.medicalHistory;

  return (
    <div>
      <div className="topbar">
        <h1>My Profile</h1>
      </div>

      <div className="panel detail-panel" style={{ marginBottom: 20 }}>
        <div className="detail-grid">
          <div>
            <span className="detail-label">Name</span>
            <span className="detail-value">{patient.first_name} {patient.last_name}</span>
          </div>
          <div>
            <span className="detail-label">Patient code</span>
            <span className="detail-value">{patient.patient_code}</span>
          </div>
          <div>
            <span className="detail-label">Email</span>
            <span className="detail-value">{patient.email || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Birth date</span>
            <span className="detail-value">{patient.birth_date || '—'}</span>
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>
          Name, email, and birth date are managed by the clinic. Contact the front desk if any of these need correcting.
        </p>
      </div>

      <div className="panel detail-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>Contact details</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field span-2">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field">
              <label>Emergency contact name</label>
              <input
                value={form.emergencyContactName}
                onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Emergency contact phone</label>
              <input
                value={form.emergencyContactPhone}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
              />
            </div>
            <div className="field span-2">
              <label>Relationship</label>
              <input
                value={form.emergencyContactRelationship}
                onChange={(e) => setForm({ ...form, emergencyContactRelationship: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-inline" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="save-confirmed">Saved</span>}
        </form>
      </div>

      <div className="panel detail-panel">
        <h3 style={{ marginBottom: 14 }}>Medical history</h3>
        <p className="muted small" style={{ marginBottom: 14 }}>
          On file with the clinic — for changes, please let your dentist know at your next visit.
        </p>
        {!h && <p className="muted">No medical history recorded yet.</p>}
        {h && (
          <div className="detail-grid">
            <div><span className="detail-label">Allergies</span><span className="detail-value">{h.allergies || '—'}</span></div>
            <div><span className="detail-label">Current medications</span><span className="detail-value">{h.current_medications || '—'}</span></div>
            <div><span className="detail-label">Medical conditions</span><span className="detail-value">{h.medical_conditions || '—'}</span></div>
            <div><span className="detail-label">Previous surgeries</span><span className="detail-value">{h.previous_surgeries || '—'}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
