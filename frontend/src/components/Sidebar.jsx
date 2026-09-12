import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const BASE_NAV = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Clinic',
    items: [
      { to: '/patients', label: 'Patients' },
      { to: '/appointments', label: 'Appointments' },
      { to: '/treatments', label: 'Treatment Plans' },
    ],
  },
  {
    label: 'Front Desk',
    items: [
      { to: '/billing', label: 'Billing & Invoices' },
      { to: '/payments', label: 'Payments' },
    ],
  },
];

const ADMIN_ITEMS = [
  { to: '/users', label: 'Staff & Roles' },
  { to: '/audit-logs', label: 'Audit Logs' },
  { to: '/settings', label: 'Clinic Settings' },
];

const REPORTS_ITEM = { to: '/reports', label: 'Reports' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = [...BASE_NAV];

  if (user?.role === 'admin' || user?.role === 'accountant') {
    nav.push({
      label: 'Admin',
      items: [
        ...(user.role === 'admin' ? ADMIN_ITEMS : []),
        REPORTS_ITEM,
      ],
    });
  }

  return (
    <>
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <img src="/logo-small.png" alt="" className="mobile-topbar-logo" />
        <span className="mobile-topbar-brand">White-Clover · Clinic</span>
      </div>

      <div
        className={`sidebar-backdrop${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img src="/logo-small.png" alt="White-Clover Dental Clinic" className="sidebar-brand-logo" />
            <span>White-Clover</span>
          </div>
          <NotificationBell />
        </div>

        {nav.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="who">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="role">{user?.role}</div>
          <button className="logout-link" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
