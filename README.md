# Klinikly Clinic — Phase 1 + Phase 2 + Phase 3 + Phase 4

A dental clinic management system, built on your existing `dental_clinic` MySQL
schema.

- **Phase 1: Foundation** — login, authentication, roles, live dashboard shell.
- **Phase 2: Core clinic modules** — Patients, Appointments, and an interactive Dental Chart.
- **Phase 3: Clinical & billing** — Treatment Plans & Records, Invoices, and Payments.
- **Phase 4: Admin & operations** — Staff & Roles management, Clinic Settings, Notifications, Audit Logs, and Reports.

This closes out the original roadmap — all four phases are now in place.

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
    │   ├── components/           # Sidebar, NotificationBell, Modal,
    │   │                         # PatientPicker, DentalChart, TreatmentTab,
    │   │                         # ProtectedRoute
    │   ├── pages/                # Login, Dashboard, Patients, Appointments,
    │   │                         # Billing, Payments, StaffRoles,
    │   │                         # ClinicSettings, AuditLogs, Reports, etc.
    │   └── styles/index.css
    └── .env.example
```

## All four phases are now built

The original roadmap is complete. If you want to keep going, some natural
next steps that weren't in the original scope:

- Patient-facing portal (the `roles` table already has a `patient` role
  ready for this) — self-service booking, viewing their own records/invoices.
- SMS/email delivery for notifications (currently in-app only).
- Patient document uploads (see gap below).
- Exportable PDF invoices/receipts.

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

## Notes

- Passwords are hashed with bcrypt (12 rounds) — never stored in plain text.
- JWT tokens expire after 8 hours by default (`JWT_EXPIRES_IN` in backend `.env`).
- The `roles` table already includes a `patient` role for a future patient-facing portal, matching Klinikly's own patient portal + online booking feature set.
