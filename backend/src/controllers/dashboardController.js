const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const summary = asyncHandler(async (req, res) => {
  const [[patientCount]] = await pool.query('SELECT COUNT(*) AS count FROM patients WHERE status = "active"');
  const [[todayAppts]] = await pool.query(
    'SELECT COUNT(*) AS count FROM appointments WHERE appointment_date = CURDATE()'
  );
  const [[upcomingAppts]] = await pool.query(
    `SELECT COUNT(*) AS count FROM appointments
     WHERE appointment_date >= CURDATE()
       AND status IN ('pending','confirmed')`
  );
  const [[unpaidInvoices]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS amount
     FROM invoices WHERE status IN ('unpaid','partially_paid')`
  );
  const [recentAppointments] = await pool.query(
    `SELECT a.id, a.appointment_date, a.start_time, a.status,
            p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            u.first_name AS dentist_first_name, u.last_name AS dentist_last_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.dentist_id
     WHERE a.appointment_date >= CURDATE()
     ORDER BY a.appointment_date ASC, a.start_time ASC
     LIMIT 8`
  );

  res.json({
    activePatients: patientCount.count,
    todayAppointments: todayAppts.count,
    upcomingAppointments: upcomingAppts.count,
    unpaidInvoiceCount: unpaidInvoices.count,
    unpaidInvoiceAmount: Number(unpaidInvoices.amount),
    recentAppointments,
  });
});

module.exports = { summary };
