import { Routes, Route } from 'react-router-dom';
import PublicLanding from './pages/public/PublicLanding.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Appointments from './pages/Appointments.jsx';
import TreatmentPlansOverview from './pages/TreatmentPlansOverview.jsx';
import Billing from './pages/Billing.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import Payments from './pages/Payments.jsx';
import StaffRoles from './pages/StaffRoles.jsx';
import ClinicSettings from './pages/ClinicSettings.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Reports from './pages/Reports.jsx';
import Sidebar from './components/Sidebar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import PortalSidebar from './components/PortalSidebar.jsx';
import PortalDashboard from './pages/portal/PortalDashboard.jsx';
import PortalAppointments from './pages/portal/PortalAppointments.jsx';
import PortalTreatmentPlans from './pages/portal/PortalTreatmentPlans.jsx';
import PortalDentalChart from './pages/portal/PortalDentalChart.jsx';
import PortalBilling from './pages/portal/PortalBilling.jsx';
import PortalInvoiceDetail from './pages/portal/PortalInvoiceDetail.jsx';
import PortalProfile from './pages/portal/PortalProfile.jsx';

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}

function PortalLayout({ children }) {
  return (
    <div className="app-shell">
      <PortalSidebar />
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLanding />} />
      <Route path="/login" element={<Login />} />

      {/* ---------- Staff dashboard ---------- */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Patients />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PatientDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Appointments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/treatments"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TreatmentPlansOverview />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Billing />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InvoiceDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Payments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StaffRoles />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AuditLogs />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ClinicSettings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ---------- Patient portal ---------- */}

      <Route
        path="/portal"
        element={
          <ProtectedRoute for="patient">
            <PortalLayout>
              <PortalDashboard />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/appointments"
        element={
          <ProtectedRoute for="patient">
            <PortalLayout>
              <PortalAppointments />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/treatment-plans"
        element={
          <ProtectedRoute for="patient">
            <PortalLayout>
              <PortalTreatmentPlans />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/dental-chart"
        element={
          <ProtectedRoute for="patient">
            <PortalLayout>
              <PortalDentalChart />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/billing"
        element={
          <ProtectedRoute for="patient">
            <PortalLayout>
              <PortalBilling />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/billing/:id"
        element={
          <ProtectedRoute for="patient">
            <PortalLayout>
              <PortalInvoiceDetail />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/profile"
        element={
          <ProtectedRoute for="patient">
            <PortalLayout>
              <PortalProfile />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
