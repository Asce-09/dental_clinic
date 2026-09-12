import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * for="staff" (default): requires login AND a non-patient role. Patient
 * accounts get bounced to /portal instead of seeing the staff dashboard.
 *
 * for="patient": requires login AND the patient role. Staff accounts get
 * bounced to /dashboard instead of seeing the patient portal.
 */
export default function ProtectedRoute({ children, for: audience = 'staff' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isPatient = user.role === 'patient';

  if (audience === 'staff' && isPatient) {
    return <Navigate to="/portal" replace />;
  }
  if (audience === 'patient' && !isPatient) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
