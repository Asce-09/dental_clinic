import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const NAV_ITEMS = [
  { to: '/portal', label: 'Overview' },
  { to: '/portal/appointments', label: 'My Appointments' },
  { to: '/portal/treatment-plans', label: 'Treatment Plans' },
  { to: '/portal/dental-chart', label: 'Dental Chart' },
  { to: '/portal/billing', label: 'Billing' },
  { to: '/portal/profile', label: 'My Profile' },
];

export default function PortalSidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <span className="mobile-topbar-brand">White-Clover · Portal</span>
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

        <div className="nav-group">
          <div className="nav-label">Patient Portal</div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/portal'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="who">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="role">Patient</div>
          <button className="logout-link" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
