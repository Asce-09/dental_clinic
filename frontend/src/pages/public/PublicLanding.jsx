import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/landing.css';

const EMPTY_FORM = { name: '', email: '', phone: '', message: '', website: '' };

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function PublicLanding() {
  const { user } = useAuth();
  const [clinicInfo, setClinicInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok: bool, message: string }

  useEffect(() => {
    client.get('/public/clinic-info').then((res) => setClinicInfo(res.data)).catch(() => {});
    client.get('/public/stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const clinicName = clinicInfo?.clinic_name || 'White-Clover Dental Clinic';

  async function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);
    try {
      const res = await client.post('/public/inquiry', form);
      setResult({ ok: true, message: res.data.message });
      setForm(EMPTY_FORM);
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const accountLink = !user
    ? { to: '/login', label: 'Patient Login' }
    : user.role === 'patient'
    ? { to: '/portal', label: 'Go to My Portal' }
    : { to: '/dashboard', label: 'Go to Dashboard' };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#top" className="landing-brand">
            <img src="/logo-small.png" alt="" />
            <span>{clinicName}</span>
          </a>
          <div className="landing-nav-links">
            <a href="#services" onClick={(e) => { e.preventDefault(); scrollToId('services'); }}>Services</a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToId('how-it-works'); }}>How It Works</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }}>Contact</a>
          </div>
          <div className="landing-nav-actions">
            <Link to={accountLink.to} className="landing-btn landing-btn-ghost">
              <span>{accountLink.label}</span>
            </Link>
            <a
              href="#contact"
              className="landing-btn landing-btn-primary"
              onClick={(e) => { e.preventDefault(); scrollToId('contact'); }}
            >
              Request an Appointment
            </a>
          </div>
        </div>
      </nav>

      <header id="top" className="hero">
        <div>
          <h1 className="hero-headline">Gentle care, rooted in trust.</h1>
          <p className="hero-sub">
            {clinicName} pairs modern dental technology with an unhurried, judgment-free
            approach — from routine cleanings to full treatment plans, tracked and shared
            with you every step of the way through your own patient portal.
          </p>
          <div className="hero-actions">
            <a
              href="#contact"
              className="landing-btn landing-btn-primary"
              onClick={(e) => { e.preventDefault(); scrollToId('contact'); }}
            >
              Request an Appointment
            </a>
            <a
              href="#how-it-works"
              className="landing-btn landing-btn-ghost"
              onClick={(e) => { e.preventDefault(); scrollToId('how-it-works'); }}
            >
              How It Works
            </a>
          </div>
        </div>
        <div className="hero-seal">
          <img src="/logo.png" alt={`${clinicName} seal`} />
        </div>
      </header>

      <div className="trust-strip">
        <div className="trust-stats">
          <div>
            <div className="trust-stat-value">{stats ? `${stats.activePatients}+` : '—'}</div>
            <div className="trust-stat-label">Patients under our care</div>
          </div>
          <div>
            <div className="trust-stat-value">{stats ? stats.activeDentists : '—'}</div>
            <div className="trust-stat-label">Licensed dentists on staff</div>
          </div>
          <div>
            <div className="trust-stat-value">{stats ? `${stats.completedAppointments}+` : '—'}</div>
            <div className="trust-stat-label">Appointments completed</div>
          </div>
        </div>
        <p className="trust-compliance">
          Your records are handled under the safeguards of the Philippine Data Privacy Act of 2012.
        </p>
      </div>

      <section id="services" className="section">
        <div className="section-intro">
          <h2>What we offer</h2>
          <p>
            General and restorative dentistry, backed by digital record-keeping so your
            history is always accurate and easy to review together.
          </p>
        </div>
        <div className="service-list">
          <div className="service-row">
            <h3>General & preventive care</h3>
            <p>Checkups, cleanings, and early screening — the routine visits that keep small issues from becoming big ones.</p>
          </div>
          <div className="service-row">
            <h3>Restorative treatments</h3>
            <p>Fillings, crowns, root canals, and other procedures, laid out as a clear treatment plan before any work begins.</p>
          </div>
          <div className="service-row">
            <h3>Digital dental charting</h3>
            <p>A tooth-by-tooth record of your dental history, kept current at every visit — not scattered across paper charts.</p>
          </div>
          <div className="service-row">
            <h3>Online patient portal</h3>
            <p>Log in anytime to see your upcoming appointments, treatment plans, and invoices — no phone calls required.</p>
          </div>
          <div className="service-row">
            <h3>Transparent billing</h3>
            <p>Itemized invoices and a running payment history, so there are no surprises about what you owe or why.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="section-intro">
          <h2>How a visit comes together</h2>
          <p>Booking here starts as a request, not an instant slot — someone from our team confirms it with you directly.</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Reach out</h3>
            <p>Send an inquiry below, or call the clinic to ask for a visit.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>We confirm your visit</h3>
            <p>Our front desk reaches out to settle on a date and time that works for you.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Get personalized care</h3>
            <p>Your dentist reviews your history and, if needed, builds a treatment plan suited to you.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Manage it online</h3>
            <p>Log in to your patient portal anytime to check appointments, plans, and bills.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="section contact-section">
        <div className="contact-grid">
          <div className="contact-info">
            <h3>Get in touch</h3>
            {clinicInfo?.address && (
              <div className="contact-info-row">
                <span className="contact-info-label">Address</span>
                <span className="contact-info-value">{clinicInfo.address}</span>
              </div>
            )}
            {clinicInfo?.phone && (
              <div className="contact-info-row">
                <span className="contact-info-label">Phone</span>
                <span className="contact-info-value">
                  <a href={`tel:${clinicInfo.phone}`}>{clinicInfo.phone}</a>
                </span>
              </div>
            )}
            {clinicInfo?.email && (
              <div className="contact-info-row">
                <span className="contact-info-label">Email</span>
                <span className="contact-info-value">
                  <a href={`mailto:${clinicInfo.email}`}>{clinicInfo.email}</a>
                </span>
              </div>
            )}
            {!clinicInfo?.address && !clinicInfo?.phone && !clinicInfo?.email && (
              <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
                Send us a message and we'll get back to you directly.
              </p>
            )}
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 20 }}>
              Already a patient? <Link to="/login" style={{ color: 'var(--ink)' }}>Log in to your portal</Link> to
              request an appointment directly.
            </p>
          </div>

          <div>
            <form onSubmit={handleSubmit}>
              <div className="landing-field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="landing-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="landing-field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="At least one of email or phone"
                />
              </div>
              <div className="landing-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us what you'd like to visit for, and any preferred dates."
                  required
                />
              </div>
              {/* Honeypot — hidden from real visitors, often filled in by bots */}
              <div className="landing-field honeypot-field" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
              <button className="landing-btn landing-btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
              {result && (
                <p className={`form-note ${result.ok ? 'success' : 'error'}`}>{result.message}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/logo-small.png" alt="" />
            <span>{clinicName}</span>
          </div>
          <div className="landing-footer-links">
            <a href="#services" onClick={(e) => { e.preventDefault(); scrollToId('services'); }}>Services</a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToId('how-it-works'); }}>How It Works</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }}>Contact</a>
            <Link to="/login">Patient Login</Link>
          </div>
        </div>
        <p className="landing-footer-copyright">
          © {new Date().getFullYear()} {clinicName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
