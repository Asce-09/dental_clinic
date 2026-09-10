const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/payments?from=&to=&method=
const listPayments = asyncHandler(async (req, res) => {
  const { from, to, method } = req.query;
  const where = [];
  const params = [];

  if (from && to) { where.push('DATE(pay.paid_at) BETWEEN ? AND ?'); params.push(from, to); }
  if (method) { where.push('pay.payment_method = ?'); params.push(method); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT pay.id, pay.amount, pay.payment_method, pay.reference_number, pay.payment_status, pay.paid_at,
            i.invoice_number, i.id AS invoice_id,
            p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.patient_code,
            u.first_name AS received_by_first_name, u.last_name AS received_by_last_name
     FROM payments pay
     JOIN invoices i ON i.id = pay.invoice_id
     JOIN patients p ON p.id = pay.patient_id
     LEFT JOIN users u ON u.id = pay.received_by
     ${whereSql}
     ORDER BY pay.paid_at DESC
     LIMIT 200`,
    params
  );

  const [[{ total }]] = await pool.query(
    `SELECT COALESCE(SUM(pay.amount), 0) AS total FROM payments pay ${whereSql}`,
    params
  );

  res.json({ data: rows, total: Number(total) });
});

module.exports = { listPayments };
