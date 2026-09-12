import { useEffect, useState } from 'react';
import client from '../api/client';

const TIMEZONES = ['Asia/Manila', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo', 'UTC'];
const CURRENCIES = ['PHP', 'USD', 'SGD', 'HKD', 'JPY'];

export default function ClinicSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/settings').then((res) => {
      const s = res.data || {};
      setForm({
        clinicName: s.clinic_name || '',
        address: s.address || '',
        phone: s.phone || '',
        email: s.email || '',
        timezone: s.timezone || 'Asia/Manila',
        currency: s.currency || 'PHP',
      });
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.clinicName) {
      setError('Clinic name is required.');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      await client.put('/settings', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return <div className="empty-state">Loading settings…</div>;
  }

  return (
    <div>
      <div className="topbar">
        <h1>Clinic Settings</h1>
      </div>

      <div className="panel detail-panel" style={{ maxWidth: 560 }}>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Clinic name *</label>
            <input
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-inline" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="save-confirmed">Saved</span>}
        </form>
      </div>
    </div>
  );
}
