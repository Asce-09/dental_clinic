# White-Clover Dental Clinic — Phase 1 through Phase 5 (Patient Portal), fully responsive

A dental clinic management system, built on your existing `dental_clinic` MySQL
schema.

- **Phase 1: Foundation** — login, authentication, roles, live dashboard shell.
- **Phase 2: Core clinic modules** — Patients, Appointments, and an interactive Dental Chart.
- **Phase 3: Clinical & billing** — Treatment Plans & Records, Invoices, and Payments.
- **Phase 4: Admin & operations** — Staff & Roles management, Clinic Settings, Notifications, Audit Logs, and Reports.
- **Phase 5: Patient portal** — a self-service login for patients to view their own appointments, treatment plans, dental chart, and invoices, plus request new appointments.
- **Phase 6: Public website** — a marketing site at `/` for prospective patients, with a live inquiry form wired into the same staff notifications from Phase 4.

The entire app — both the staff dashboard and the patient portal — is now
responsive: usable on a phone, tablet, or desktop from the same codebase, no
separate mobile app needed. See "Responsive design" below.

Branded for **White-Clover Dental Clinic**, with a warm gold-and-ivory color
palette sampled directly from the clinic's logo. See "Branding & theming"
below if you ever want to adjust it.

This goes beyond the original four-phase roadmap.

## ⚠️ If you're upgrading from Phase 4

This phase changes the database schema (adds a `patient_id` column to
`users`). Run the migration before starting the backend:

```bash
mysql -u root -p dental_clinic < database/migrations/002_patient_portal.sql
```

(New installs don't need this — `dental_clinic_database.sql` already includes it.)

## ⚠️ If you're upgrading from Phase 5

Phase 6 doesn't change the schema, but it does rename the default placeholder
clinic name. If your database still has the original seed data, run:

```bash
mysql -u root -p dental_clinic < database/migrations/003_rebrand_clinic_name.sql
```

Skip this if you've already renamed your clinic in **Clinic Settings** — the
migration only touches the row if it's still the original placeholder.

Also: **the staff dashboard moved from `/` to `/dashboard`** — `/` is now the
public marketing site. If you had `/` bookmarked, update the bookmark.

## Stack

- **Backend:** Node.js + Express + MySQL (`mysql2`), JWT auth, bcrypt password hashing
- **Frontend:** React + Vite, React Router, Axios
- **Database:** your existing `dental_clinic` schema (copy included in `database/`)

## What's included in Phase 1

- Login page + JWT-based auth
- Role-aware backend (`admin`, `dentist`, `assistant`, `receptionist`, `accountant`, `patient`)
- Dashboard with live stats (active patients, today's/upcoming appointments, unpaid invoices) and an upcoming-appointments table
- Sidebar navigation with placeholders for Patients, Appointments, Treatment Plans, Billing, Payments, Staff & Roles, and Clinic Settings — these light up in Phases 2–4
- Admin-only user management API (list/create staff, change status)
- A CLI script to create your first admin login securely

### Phase 2 additions

- **Patients:** searchable list, add-patient form, and a patient profile page
  with three tabs — Overview, Medical History, and Dental Chart. New patients
  automatically get their 32 permanent teeth seeded as "healthy" so the chart
  is ready immediately.
- **Appointments:** day-view schedule with prev/next/today navigation, a
  new-appointment form (patient search, dentist, treatment, date/time), and
  one-click status progression (pending → confirmed → checked-in → in
  progress → completed, or cancel).
- **Dental Chart:** an interactive FDI-numbered chart (upper/lower, left/right
  quadrants). Click a tooth to change its status (healthy, caries, filled,
  crowned, root canal, missing, extracted, implant, other) or log a
  surface-specific condition with notes — each entry is timestamped and
  attributed to the staff member who recorded it.

### Phase 3 additions

- **Treatment Plans:** created from a patient's Treatment tab — a title,
  optional diagnosis/notes, and a line-item builder (link each line to a
  treatment type and/or a specific tooth). The estimated total recalculates
  automatically as items are added, edited, or removed. Plan and item
  statuses (proposed → accepted → in progress → completed) are tracked
  separately so you can see exactly what's been done.
- **Treatment Records:** quick clinical visit notes (diagnosis, procedure
  notes, prescription, follow-up date) tied to a dentist and, optionally, a
  tooth and treatment. Completing a record linked to a plan item
  automatically marks that item completed.
- **Treatment Plans overview:** a clinic-wide list (sidebar → Treatment
  Plans) filterable by status, so front desk staff can see everything in
  flight without opening each patient individually.
- **Billing & Invoices:** create an invoice for a patient by adding line
  items manually or pulling them straight from an accepted treatment plan.
  Handles discount/tax and computes the total automatically. Each invoice
  gets its own detail page showing items, running balance, and full payment
  history, plus a void action.
- **Payments:** record a payment against an invoice (cash, GCash, Maya, bank
  transfer, card) with a reference number — the invoice status
  (unpaid/partially paid/paid) updates automatically based on what's been
  verified. A clinic-wide Payments ledger (sidebar → Payments) shows every
  payment across all patients.

### Phase 4 additions

- **Staff & Roles:** a real screen for what was previously a `curl` workaround
  — list all staff, add new accounts, edit name/email/phone/role, change
  status (active/inactive/suspended), and reset a staff member's password as
  an admin.
- **Clinic Settings:** edit clinic name, address, contact info, timezone, and
  currency — backed by the single-row `clinic_settings` table.
- **Notifications:** a bell icon (top-left of the sidebar, visible on every
  page) with an unread badge. Dentists get notified when a new appointment is
  booked with them; admins get notified when an invoice is fully paid. Click
  a notification to mark it read, or "Mark all read."
- **Audit Logs** (admin only): a searchable history of sensitive actions —
  staff account changes, patient status changes, invoice status/payment
  events, and treatment plan status changes — each stamped with who did it,
  when, and from what IP.
- **Reports** (admin + accountant): revenue collected by month, new patients
  by month, appointment status breakdown, and top treatments by volume, plus
  a live outstanding-balance figure — all rendered as lightweight CSS bar
  charts (no extra charting library needed).

Admin-only nav items (Staff & Roles, Audit Logs, Clinic Settings) and the
Reports link only appear in the sidebar for `admin` (and `accountant` for
Reports) — other roles won't see them, though the backend also enforces this
independently of the UI.

## 1. Set up the database

If you haven't already, import the schema in phpMyAdmin (or via CLI):

```bash
mysql -u root -p < database/dental_clinic_database.sql
```

This creates the `dental_clinic` database, all 19 tables, the 6 default roles,
the 32 permanent + 20 primary teeth, and 10 default treatment types. **No
admin user is created yet on purpose** — you'll create one with a securely
hashed password in step 3.

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set your MySQL credentials (matches your XAMPP/phpMyAdmin
setup — usually `DB_USER=root`, `DB_PASSWORD=` blank if you haven't set one).
Also set `JWT_SECRET` to any long random string.

Create your first admin user:

```bash
npm run create-admin -- --email=you@clinic.com --password=SomethingStrong123 --first=Jane --last=Doe
```

Start the API:

```bash
npm run dev
```

It runs on `http://localhost:4000`. Visit `http://localhost:4000/api/health`
to confirm it's up.

## 3. Frontend setup

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:5173` and log in with the admin account you created.

### Adding a dentist (for the Appointments dropdown)

Now that Phase 4 is in, this is easiest done through the app itself: log in
as admin, go to **Staff & Roles** in the sidebar, click **+ Add staff**, and
pick the `dentist` role. They'll immediately show up in the Appointments
scheduling form.

(The old `curl` approach still works too, if you'd rather script it:)

```bash
curl -X POST http://localhost:4000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Maria","lastName":"Santos","email":"dr.santos@clinic.com","password":"SomethingStrong123","roleId":2}'
```

## Project structure

```
klinikly-clinic/
├── database/
│   └── dental_clinic_database.sql
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MySQL connection pool
│   │   ├── middleware/           # auth (JWT) + error handling
│   │   ├── controllers/          # auth, users, patients, appointments,
│   │   │                         # treatment plans/records, invoices,
│   │   │                         # payments, settings, notifications,
│   │   │                         # audit logs, reports
│   │   ├── routes/
│   │   ├── utils/                # asyncHandler, auditLog, notify
│   │   └── scripts/createAdmin.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/client.js         # axios instance w/ auth header
    │   ├── context/AuthContext.jsx
    │   ├── components/           # Sidebar, PortalSidebar, NotificationBell,
    │   │                         # Modal, PatientPicker, DentalChart,
    │   │                         # TreatmentTab, PortalAccessPanel,
    │   │                         # ProtectedRoute (role-aware)
    │   ├── pages/                # Login, Dashboard, Patients, Appointments,
    │   │                         # Billing, Payments, StaffRoles,
    │   │                         # ClinicSettings, AuditLogs, Reports, etc.
    │   │   └── portal/           # PortalDashboard, PortalAppointments,
    │   │                         # PortalTreatmentPlans, PortalDentalChart,
    │   │                         # PortalBilling, PortalInvoiceDetail,
    │   │                         # PortalProfile
    │   └── styles/index.css
    └── .env.example
```

## Phase 5: Patient Portal

### How it works

Patients don't self-register. A staff member (admin or receptionist) enables
portal access from a patient's profile page (**Patients → [patient] →
Overview tab → "Enable portal access"**). This requires the patient to have
an email on file, generates a one-time temporary password, and shows it once
for staff to hand off to the patient — nothing is emailed automatically
(there's no email/SMS integration yet).

Once enabled, the patient logs in at the same login screen as staff. The app
detects their role and routes them to `/portal` instead of the staff
dashboard — they never see staff screens, and staff routes actively redirect
patient accounts away (and vice versa).

### What patients can do

- View upcoming/past appointments and **request** a new one (goes in as
  `pending`; front desk still confirms it — this is a request queue, not
  self-booking).
- View their treatment plans and itemized costs (read-only).
- View their dental chart (read-only) — same FDI-numbered layout staff use.
- View invoices, balances, and payment history (read-only).
- Update their own contact info and emergency contact (name, email, and
  birth date stay staff-managed for identity integrity).
- View their medical history (read-only — edits still go through staff).
- Get notified (via the same bell) when their appointment is confirmed,
  cancelled, or marked complete.

### Security notes

- Every portal endpoint (`/api/portal/*`) is scoped by `req.user.patientId`
  from the JWT — never by a URL parameter — so there's no way for one
  patient's login to reach another patient's data by editing an ID in the
  URL or API request.
- A dedicated `requirePatient` middleware rejects staff tokens on portal
  routes and patient tokens on staff routes, independent of the frontend's
  own redirects.
- Enabling portal access checks that the email isn't already in use by
  another login (staff or patient) before creating the account.

## Phase 6: Public Website

A marketing site at `/` — the front door for prospective patients, meant to
make the clinic look established and trustworthy before someone ever calls
or walks in.

### What's on it

- A hero built around the actual clinic seal/logo rather than a generic
  device mockup, plus a live trust strip pulling real numbers (active
  patients, dentists on staff, completed appointments) straight from the
  database — no invented stats.
- A services overview and a "how a visit comes together" walkthrough that
  honestly describes the request-then-confirm flow this system actually
  uses (Phase 2's appointments), rather than promising instant self-service
  booking it doesn't have.
- A contact form that **feeds directly into Phase 4's notification system**
  — a submission notifies every active admin/receptionist account, the same
  way a new portal appointment request does. There's no separate inbox to
  check.
- Clinic contact info (address/phone/email) is pulled live from **Clinic
  Settings** (Phase 4) via a new public endpoint — update it once in the app
  and the public site reflects it immediately.
- A `Patient Login` link that goes straight to the real login screen, and
  adapts to "Go to Dashboard" / "Go to My Portal" automatically if you're
  already signed in.

### New public (unauthenticated) endpoints

Everything else in this API requires a login — these three are deliberately
open, since a marketing site needs to work before anyone has an account:

- `GET /api/public/clinic-info` — clinic name, address, phone, email.
- `GET /api/public/stats` — aggregate counts only (active patients, active
  dentists, completed appointments). Never exposes individual patient data.
- `POST /api/public/inquiry` — name, email/phone, and a message. Includes a
  basic honeypot field (a hidden input real visitors never fill in, but
  simple bots often do) to cut down on spam without needing a CAPTCHA
  service.

### Design notes

The public site intentionally looks different from the staff/patient app —
it pairs Cormorant Garamond (serif, for headlines) with Inter (the app's
existing font, for everything else), evoking the engraved-medallion feel of
the logo rather than reusing the dashboard's utilitarian UI chrome. It's a
separate stylesheet (`frontend/src/styles/landing.css`), loaded only on this
one page, so it doesn't affect the app's bundle size or styling anywhere
else.

## What's next

Some natural next steps that weren't in the original scope:

- SMS/email delivery for notifications and portal credentials (currently
  in-app only — the temporary password has to be relayed to the patient
  manually right now).
- Patient self-registration with identity verification, if you want to skip
  the "staff enables it" step.
- Patient document uploads (see gap below).
- Exportable PDF invoices/receipts.
- SEO basics for the public site (meta description, Open Graph tags, a
  sitemap) if you want it to rank in search rather than just be linked to
  directly.
- A proper CAPTCHA (e.g. hCaptcha/Turnstile) on the inquiry form if the
  honeypot alone doesn't hold up against spam once the site is public.

## Branding & theming

- **Logo:** lives in `frontend/public/` in three sizes — `logo.png` (400px,
  used in the login hero and its watermark), `logo-small.png` (120px, used
  in the sidebar and mobile top bar), and `favicon.png` (64px). All three
  were re-compressed from the original ~1.4MB upload down to roughly 60KB
  combined, since the full-resolution file is unnecessarily heavy for a UI
  icon shown at a few dozen pixels — this matters most on mobile.
- **Color palette:** every color in `frontend/src/styles/index.css` was
  sampled from the actual logo pixels and swapped in as CSS custom
  properties at the top of the file (`:root { --teal: ...; --teal-deep:
  ...; }` etc. — the variable names are a holdover from the previous teal
  theme, but their values are now the gold/ivory palette). Change a value
  there and it propagates everywhere; you don't need to hunt through
  individual components.
- **What stayed off-palette on purpose:** the dental chart and status badges
  (tooth conditions, appointment/invoice statuses) intentionally keep a few
  non-gold hues — blue, purple, red, muted green — because they exist to let
  you visually tell 8–9 different categories apart at a glance. Forcing all
  of those into shades of gold would make the chart harder to read, not more
  on-brand. Structural chrome (sidebar, buttons, headers, links, active
  states) is fully on-palette.
- **To swap the logo or palette again later:** replace the three PNGs in
  `frontend/public/` (keeping the same filenames avoids touching any code),
  and/or edit the `:root` block in `index.css`.

## Responsive design

Every screen — staff dashboard and patient portal alike — now adapts across
three breakpoints: desktop (>900px), tablet (~780px), and phone (≤480px).

- **Navigation:** on screens ≤780px wide, the sidebar becomes a slide-in
  drawer instead of a fixed column. A hamburger button in a fixed top bar
  opens it; tapping a link, or tapping outside the drawer, closes it again.
  Above 780px, it's back to a normal always-visible sidebar — nothing
  changes for desktop use.
- **Tables:** rather than squeezing columns until they're unreadable, tables
  keep a sane minimum width and the panel around them scrolls horizontally
  on narrow screens. You lose nothing — just swipe sideways to see the rest
  of a wide table (e.g. the Staff list or Audit Logs).
- **Forms & detail grids:** two-column layouts (patient forms, profile
  fields, invoice summaries) collapse to a single column under ~560px so
  labels and inputs aren't cramped.
- **Dental chart:** tooth buttons shrink slightly on phones (34px → 26px)
  and the chart scrolls horizontally as a fallback, so all 32 permanent
  teeth stay reachable even on a small screen.
- **Modals:** on phones ≤480px, modals become bottom sheets (anchored to the
  bottom edge, rounded top corners only) rather than floating dialogs — a
  more natural mobile pattern than a centered popup.
- **Stat cards, tabs, date navigation:** all reflow or wrap instead of
  overflowing the viewport.

This required no new dependencies — it's all CSS media queries plus a small
amount of React state for the mobile drawer (in `Sidebar.jsx` and
`PortalSidebar.jsx`). Nothing about the API or data model changed.

If you want to verify it yourself: open Chrome/Firefox DevTools, toggle
device toolbar (Ctrl+Shift+M / Cmd+Shift+M), and try a few presets (iPhone
SE for the smallest case, iPad for tablet). Or just resize the browser
window — everything reflows live, no reload needed.

## Known gaps to fill later

- Patient documents (`patient_documents` table) has no upload UI yet — needs
  file storage (local disk or S3-compatible) wired into the backend plus an
  upload widget on the patient profile.
- No pagination controls on the Patients list yet (backend supports
  `page`/`limit`, the UI just always requests the first 50).
- Invoices are created as a single atomic action — there's no "edit line
  items after creation" flow yet. Void and re-issue if a mistake needs
  fixing. Discounts/tax are entered as flat currency amounts, not
  percentages.
- Payment amounts aren't blocked from exceeding an invoice's balance (you can
  technically overpay) — worth adding a soft warning.
- Notifications are polled every 30s rather than pushed in real time
  (no websockets) — fine for a single-clinic deployment, but worth
  revisiting if you add multiple front-desk terminals watching live.
- Portal temporary passwords are shown once in the staff UI with no
  resend/copy-link mechanism — if staff loses it before relaying it, they'll
  need to use "Reset password" to generate a new one.

## Notes

- Passwords are hashed with bcrypt (12 rounds) — never stored in plain text.
- JWT tokens expire after 8 hours by default (`JWT_EXPIRES_IN` in backend `.env`).
- The `roles` table already includes a `patient` role for a future patient-facing portal, matching Klinikly's own patient portal + online booking feature set.
