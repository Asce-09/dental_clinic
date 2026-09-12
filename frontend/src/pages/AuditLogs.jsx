import { useEffect, useState } from 'react';
import client from '../api/client';

const ENTITY_TYPES = ['', 'user', 'patient', 'invoice', 'treatment_plan', 'clinic_settings'];

function actionLabel(action) {
  return action.replace(/_/g, ' ').replace(/\./g, ' · ');
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    client
      .get('/audit-logs', { params: entityType ? { entityType } : {} })
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [entityType]);

  return (
    <div>
      <div className="topbar">
        <h1>Audit Logs</h1>
      </div>

      <div className="filter-row">
        {ENTITY_TYPES.map((t) => (
          <button
            key={t || 'all'}
            className={`filter-chip${entityType === t ? ' active' : ''}`}
            onClick={() => setEntityType(t)}
          >
            {t ? t.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading audit logs…</div>}
        {!loading && logs.length === 0 && <div className="empty-state">No activity recorded yet.</div>}
        {!loading && logs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.user_first_name ? `${l.user_first_name} ${l.user_last_name}` : 'System'}</td>
                  <td className="capitalize">{actionLabel(l.action)}</td>
                  <td>
                    {l.entity_type ? `${l.entity_type.replace('_', ' ')}${l.entity_id ? ` #${l.entity_id}` : ''}` : '—'}
                  </td>
                  <td>{l.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
