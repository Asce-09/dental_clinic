import { useState } from 'react';
import client from '../api/client';

export default function PortalAccessPanel({ patientId, portalAccess, onChange }) {
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [credentials, setCredentials] = useState(null); // { email, temporaryPassword }

  async function handleEnable() {
    setError('');
    setWorking(true);
    try {
      const res = await client.post(`/patients/${patientId}/portal/enable`);
      setCredentials({ email: res.data.email, temporaryPassword: res.data.temporaryPassword });
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not enable portal access.');
    } finally {
      setWorking(false);
    }
  }

  async function handleReset() {
    setError('');
    setWorking(true);
    try {
      const res = await client.post(`/patients/${patientId}/portal/reset-password`);
      setCredentials({ email: res.data.email, temporaryPassword: res.data.temporaryPassword });
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset the portal password.');
    } finally {
      setWorking(false);
    }
  }

  async function handleToggleStatus(nextStatus) {
    setError('');
    setWorking(true);
    try {
      await client.patch(`/patients/${patientId}/portal/status`, { status: nextStatus });
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update portal access.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="panel detail-panel">
      <h3 style={{ marginBottom: 4 }}>Portal access</h3>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Lets this patient log in to view their appointments, treatment plans, dental chart, and invoices.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {credentials && (
        <div className="success-banner">
          <strong>Share these with the patient once — they won't be shown again.</strong>
          <div style={{ marginTop: 8 }}>
            Email: <code>{credentials.email}</code>
            <br />
            Temporary password: <code>{credentials.temporaryPassword}</code>
          </div>
        </div>
      )}

      {!portalAccess && (
        <button className="btn btn-primary btn-inline" onClick={handleEnable} disabled={working}>
          {working ? 'Enabling…' : 'Enable portal access'}
        </button>
      )}

      {portalAccess && (
        <div>
          <div className="detail-grid" style={{ marginBottom: 16 }}>
            <div>
              <span className="detail-label">Login email</span>
              <span className="detail-value">{portalAccess.email}</span>
            </div>
            <div>
              <span className="detail-label">Status</span>
              <span className={`badge ${portalAccess.status === 'active' ? 'confirmed' : 'cancelled'}`}>
                {portalAccess.status}
              </span>
            </div>
            <div>
              <span className="detail-label">Last login</span>
              <span className="detail-value">
                {portalAccess.last_login_at ? new Date(portalAccess.last_login_at).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>

          <div className="actions-cell" style={{ justifyContent: 'flex-start' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleReset} disabled={working}>
              Reset password
            </button>
            {portalAccess.status === 'active' ? (
              <button className="btn btn-text-danger btn-sm" onClick={() => handleToggleStatus('inactive')} disabled={working}>
                Disable access
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => handleToggleStatus('active')} disabled={working}>
                Re-enable access
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
