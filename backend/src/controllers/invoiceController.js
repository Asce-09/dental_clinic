const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');
const { logAction } = require('../utils/auditLog');

async function nextInvoiceNumber(conn) {
  const [[{ maxId }]] = await conn.query('SELECT COALESCE(MAX(id), 0) AS maxId FROM invoices');
  return `INV-${String(maxId + 1).padStart(6, '0')}`;
}

// GET /api/invoices?status=&patientId=&from=&to=
const listInvoices = asyncHandler(async (req, res) => {
  const { status, patientId, from, to } = req.query;
  const where = [];
  const params = [];

  if (status) { where.push('i.status = ?'); params.push(status); }
  if (patientId) { where.push('i.patient_id = ?'); params.push(patientId); }
  if (from && to) { where.push('DATE(i.created_at) BETWEEN ? AND ?'); params.push(from, to); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT i.id, i.invoice_number, i.total, i.status, i.due_date, i.created_at,
            p.id AS patient_id, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            p.patient_code,
            COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_status = 'verified'), 0) AS amount_paid
     FROM invoices i
     JOIN patients p ON p.id = i.patient_id
     ${whereSql}
     ORDER BY i.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(rows);
});

// GET /api/invoices/:id
const getInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [invoiceRows] = await pool.query(
    `SELECT i.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            p.patient_code, p.phone AS patient_phone, p.address AS patient_address
     FROM invoices i JOIN patients p ON p.id = i.patient_id WHERE i.id = ?`,
    [id]
  );
  const invoice = invoiceRows[0];
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  const [items] = await pool.query(
    `SELECT ii.*, t.name AS treatment_name
     FROM invoice_items ii LEFT JOIN treatments t ON t.id = ii.treatment_id
     WHERE ii.invoice_id = ? ORDER BY ii.id`,
    [id]
  );

  const [payments] = await pool.query(
    `SELECT pay.*, u.first_name AS received_by_first_name, u.last_name AS received_by_last_name
     FROM payments pay LEFT JOIN users u ON u.id = pay.received_by
     WHERE pay.invoice_id = ? ORDER BY pay.paid_at DESC`,
    [id]
  );

  const amountPaid = payments
    .filter((p) => p.payment_status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  res.json({ ...invoice, items, payments, amountPaid, balance: Number(invoice.total) - amountPaid });
});

// POST /api/invoices
// body: { patientId, dueDate, discount, tax, notes, items: [{ treatmentId, description, quantity, unitPrice }] }
const createInvoice = asyncHandler(async (req, res) => {
  const { patientId, dueDate, discount = 0, tax = 0, notes, items = [] } = req.body;

  if (!patientId || !items.length) {
    return res.status(400).json({ message: 'A patient and at least one line item are required.' });
  }

  const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 1) * Number(it.unitPrice || 0), 0);
  const total = Math.max(0, subtotal - Number(discount) + Number(tax));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const invoiceNumber = await nextInvoiceNumber(conn);

    const [result] = await conn.query(
      `INSERT INTO invoices (patient_id, invoice_number, subtotal, discount, tax, total, due_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, invoiceNumber, subtotal, discount, tax, total, dueDate || null, notes || null, req.user.id]
    );
    const invoiceId = result.insertId;

    for (const item of items) {
      if (!item.description) continue;
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      await conn.query(
        `INSERT INTO invoice_items (invoice_id, treatment_id, description, quantity, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.treatmentId || null, item.description, qty, price, qty * price]
      );
    }

    await conn.commit();
    res.status(201).json({ id: invoiceId, invoiceNumber, total, message: 'Invoice created.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// PATCH /api/invoices/:id/status  (mainly for voiding)
const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['draft', 'unpaid', 'partially_paid', 'paid', 'void'];
  if (!valid.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }
  await pool.query('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);

  await logAction({
    req, action: 'invoice.status_changed', entityType: 'invoice', entityId: id,
    description: `Set invoice #${id} status to "${status}"`,
  });

  res.json({ message: 'Invoice status updated.' });
});

// POST /api/invoices/:id/payments
// body: { amount, paymentMethod, referenceNumber, notes }
const recordPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, paymentMethod, referenceNumber, notes } = req.body;

  if (!amount || Number(amount) <= 0 || !paymentMethod) {
    return res.status(400).json({ message: 'A positive amount and payment method are required.' });
  }

  const [invoiceRows] = await pool.query('SELECT patient_id, total FROM invoices WHERE id = ?', [id]);
  const invoice = invoiceRows[0];
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  await pool.query(
    `INSERT INTO payments (invoice_id, patient_id, amount, payment_method, reference_number, notes, received_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, invoice.patient_id, amount, paymentMethod, referenceNumber || null, notes || null, req.user.id]
  );

  const [[{ totalPaid }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalPaid FROM payments
     WHERE invoice_id = ? AND payment_status = 'verified'`,
    [id]
  );

  const newStatus = Number(totalPaid) >= Number(invoice.total)
    ? 'paid'
    : Number(totalPaid) > 0
      ? 'partially_paid'
      : 'unpaid';

  await pool.query('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, id]);

  await logAction({
    req, action: 'payment.recorded', entityType: 'invoice', entityId: id,
    description: `Recorded ${paymentMethod} payment of ${amount} on invoice #${id}`,
  });

  if (newStatus === 'paid') {
    const [admins] = await pool.query(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
       WHERE r.name = 'admin' AND u.status = 'active'`
    );
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'invoice_paid',
        title: 'Invoice fully paid',
        message: `Invoice #${id} has been paid in full.`,
      });
    }
  }

  res.status(201).json({ message: 'Payment recorded.', invoiceStatus: newStatus, totalPaid });
});

module.exports = { listInvoices, getInvoice, createInvoice, updateInvoiceStatus, recordPayment };
