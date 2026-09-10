import { useEffect, useRef, useState } from 'react';
import client from '../api/client';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ data: [], unreadCount: 0 });
  const boxRef = useRef(null);

  function load() {
    client.get('/notifications').then((res) => setData(res.data));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open) load();
  }

  async function markRead(id) {
    await client.patch(`/notifications/${id}/read`);
    load();
  }

  async function markAllRead() {
    await client.patch('/notifications/read-all');
    load();
  }

  return (
    <div className="notification-bell" ref={boxRef}>
      <button className="bell-button" onClick={handleOpen} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {data.unreadCount > 0 && <span className="bell-badge">{data.unreadCount}</span>}
      </button>

      {open && (
        <div className="bell-dropdown">
          <div className="bell-dropdown-header">
            <strong>Notifications</strong>
            {data.unreadCount > 0 && (
              <button className="bell-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="bell-list">
            {data.data.length === 0 && (
              <div className="bell-empty">You're all caught up.</div>
            )}
            {data.data.map((n) => (
              <div
                key={n.id}
                className={`bell-item${n.read_at ? '' : ' unread'}`}
                onClick={() => !n.read_at && markRead(n.id)}
              >
                <div className="bell-item-title">{n.title}</div>
                <div className="bell-item-message">{n.message}</div>
                <div className="bell-item-time">{timeAgo(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
