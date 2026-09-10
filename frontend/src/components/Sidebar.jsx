import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const BASE_NAV = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard' }],
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
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">White-Clover Dental Clinic</div>
        <NotificationBell />
      </div>

      {nav.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
  );
}
