import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'patient' ? '/portal' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="auth-hero-brand">
          <img src="/logo-small.png" alt="" className="auth-hero-logo" />
          <span>White-Clover Dental Clinic</span>
        </div>
        <div>
          <div className="auth-hero-headline">Run the whole clinic from one screen.</div>
          <p className="auth-hero-sub">
            Patient records, appointments, dental charting, treatment plans, and billing —
            in one system built for your practice.
          </p>
        </div>
        <img src="/logo.png" alt="" className="auth-hero-watermark" />
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <img src="/logo-small.png" alt="White-Clover Dental Clinic" className="auth-card-logo" />
          <h1>Welcome back</h1>
          <p className="sub">Sign in to your clinic dashboard.</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
