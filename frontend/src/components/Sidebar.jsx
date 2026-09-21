import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

// Grouping mirrors the VTTECH-style category layout (Appointment / Customer /
// Service / Accountant / Marketing / Staff & User / Report) using only the
// modules this system actually has. VTTECH also has Warehouse, Card, Labo,
// and Caring modules — those don't exist here, so there's nothing to link to.

const INQUIRIES_ITEM = { to: '/inquiries', label: 'Website Inquiries' };
const APPOINTMENT_REQUESTS_ITEM = { to: '/appointment-requests', label: 'Appointment Requests' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  // Dashboard stays a plain top-level link (not a dropdown) so it's always one click away.
  const overview = { to: '/dashboard', label: 'Dashboard' };

  const nav = [
    { label: 'Appointment', items: [{ to: '/appointments', label: 'Appointments' }] },
    { label: 'Customer', items: [{ to: '/patients', label: 'Patients' }] },
    { label: 'Service', items: [{ to: '/treatments', label: 'Treatment Plans' }] },
    {
      label: 'Accountant',
      items: [
        { to: '/billing', label: 'Billing & Invoices' },
        { to: '/payments', label: 'Payments' },
      ],
    },
  ];

  if (user?.role === 'admin' || user?.role === 'receptionist') {
    nav.push({
      label: 'Marketing',
      items: [APPOINTMENT_REQUESTS_ITEM, INQUIRIES_ITEM],
    });
  }

  if (user?.role === 'admin') {
    nav.push({
      label: 'Staff & User',
      items: [
        { to: '/users', label: 'Staff & Roles' },
        { to: '/audit-logs', label: 'Audit Logs' },
        { to: '/settings', label: 'Clinic Settings' },
      ],
    });
  }

  if (user?.role === 'admin' || user?.role === 'accountant') {
    nav.push({
      label: 'Report',
      items: [{ to: '/reports', label: 'Reports' }],
    });
  }

  const isInGroup = (group) =>
    group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  // Whenever the route changes, make sure the group holding the current page is open.
  useEffect(() => {
    const active = nav.find(isInGroup);
    if (active) setOpenGroups((prev) => (prev[active.label] ? prev : { ...prev, [active.label]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.role]);

  function toggleGroup(label) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
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

        <NavLink
          to={overview.to}
          end
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `nav-link nav-link-top${isActive ? ' active' : ''}`}
        >
          {overview.label}
        </NavLink>

        {nav.map((group) => {
          const open = !!openGroups[group.label];
          const hasActive = isInGroup(group);
          return (
            <div className="nav-group" key={group.label}>
              <button
                type="button"
                className={`nav-toggle${hasActive ? ' has-active' : ''}`}
                onClick={() => toggleGroup(group.label)}
                aria-expanded={open}
              >
                <span>{group.label}</span>
                <svg
                  className={`nav-chevron${open ? ' open' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className={`nav-collapse${open ? ' open' : ''}`}>
                <div className="nav-collapse-inner">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      tabIndex={open ? 0 : -1}
                      className={({ isActive }) => `nav-link nav-sublink${isActive ? ' active' : ''}`}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

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
