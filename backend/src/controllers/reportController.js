const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reports/overview?months=6
const overview = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));

  // Revenue collected per month (based on verified payments), last N months including current.
  const [revenueRows] = await pool.query(
    `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, COALESCE(SUM(amount), 0) AS total
     FROM payments
     WHERE payment_status = 'verified'
       AND paid_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY month
     ORDER BY month ASC`,
    [months - 1]
  );

  // Appointment status breakdown, last N months.
  const [apptStatusRows] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM appointments
     WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY status`,
    [months - 1]
  );

  // Top treatments by number of completed treatment records, last N months.
  const [topTreatments] = await pool.query(
    `SELECT t.name, COUNT(*) AS count
     FROM treatment_records tr
     JOIN treatments t ON t.id = tr.treatment_id
     WHERE tr.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY t.id, t.name
     ORDER BY count DESC
     LIMIT 5`,
    [months - 1]
  );

  // Outstanding balance across all non-void invoices.
  const [[{ outstanding }]] = await pool.query(
    `SELECT COALESCE(SUM(balance), 0) AS outstanding FROM (
       SELECT i.total - COALESCE((
         SELECT SUM(p.amount) FROM payments p
         WHERE p.invoice_id = i.id AND p.payment_status = 'verified'
       ), 0) AS balance
       FROM invoices i
       WHERE i.status NOT IN ('void')
     ) balances`
  );

  // New patients per month, last N months.
  const [newPatientRows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM patients
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY month
     ORDER BY month ASC`,
    [months - 1]
  );

  res.json({
    revenueByMonth: revenueRows,
    appointmentsByStatus: apptStatusRows,
    topTreatments,
    outstandingBalance: Number(outstanding),
    newPatientsByMonth: newPatientRows,
  });
});

module.exports = { overview };
