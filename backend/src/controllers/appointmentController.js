const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');

const APPT_SELECT = `
  SELECT a.id, a.patient_id, a.dentist_id, a.treatment_id,
         a.appointment_date, a.start_time, a.end_time, a.status, a.source,
         a.reason, a.notes, a.created_at,
         p.first_name AS patient_first_name, p.last_name AS patient_last_name,
         p.phone AS patient_phone,
         u.first_name AS dentist_first_name, u.last_name AS dentist_last_name,
         t.name AS treatment_name
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  LEFT JOIN users u ON u.id = a.dentist_id
  LEFT JOIN treatments t ON t.id = a.treatment_id
`;

// GET /api/appointments?date=&from=&to=&dentistId=&patientId=&status=
const listAppointments = asyncHandler(async (req, res) => {
  const { date, from, to, dentistId, patientId, status } = req.query;

  const where = [];
  const params = [];

  if (date) {
    where.push('a.appointment_date = ?');
    params.push(date);
  } else if (from && to) {
    where.push('a.appointment_date BETWEEN ? AND ?');
    params.push(from, to);
  }
  if (dentistId) {
    where.push('a.dentist_id = ?');
    params.push(dentistId);
  }
  if (patientId) {
    where.push('a.patient_id = ?');
    params.push(patientId);
  }
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `${APPT_SELECT} ${whereSql} ORDER BY a.appointment_date ASC, a.start_time ASC`,
    params
  );

  res.json(rows);
});

// GET /api/appointments/:id
const getAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(`${APPT_SELECT} WHERE a.id = ?`, [id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }
  res.json(rows[0]);
});

// POST /api/appointments
const createAppointment = asyncHandler(async (req, res) => {
  const body = req.body;

  if (!body.patientId || !body.appointmentDate || !body.startTime) {
    return res.status(400).json({
      message: 'patientId, appointmentDate and startTime are required.',
    });
  }

  const [result] = await pool.query(
    `INSERT INTO appointments
      (patient_id, dentist_id, treatment_id, appointment_date, start_time, end_time,
       status, source, reason, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?, ?)`,
    [
      body.patientId, body.dentistId || null, body.treatmentId || null,
      body.appointmentDate, body.startTime, body.endTime || null,
      body.status || 'pending', body.reason || null, body.notes || null, req.user.id,
    ]
  );

  if (body.dentistId) {
    const [patientRows] = await pool.query(
      'SELECT first_name, last_name FROM patients WHERE id = ?',
      [body.patientId]
    );
    const patientName = patientRows[0]
      ? `${patientRows[0].first_name} ${patientRows[0].last_name}`
      : 'a patient';
    await notify({
      userId: body.dentistId,
      type: 'appointment_assigned',
      title: 'New appointment scheduled',
      message: `You've been scheduled with ${patientName} on ${body.appointmentDate} at ${body.startTime}.`,
    });
  }

  res.status(201).json({ id: result.insertId, message: 'Appointment created.' });
});

// PUT /api/appointments/:id
const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  const map = {
    dentistId: 'dentist_id', treatmentId: 'treatment_id', appointmentDate: 'appointment_date',
    startTime: 'start_time', endTime: 'end_time', reason: 'reason', notes: 'notes',
  };

  const sets = [];
  const params = [];
  Object.entries(map).forEach(([key, col]) => {
    if (key in body) {
      sets.push(`${col} = ?`);
      params.push(body[key] || null);
    }
  });

  if (!sets.length) {
    return res.status(400).json({ message: 'No fields provided to update.' });
  }

  params.push(id);
  await pool.query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Appointment updated.' });
});

// PATCH /api/appointments/:id/status
const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = [
    'pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show',
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);

  const [apptRows] = await pool.query('SELECT patient_id, appointment_date, start_time FROM appointments WHERE id = ?', [id]);
  const appt = apptRows[0];
  if (appt) {
    const [portalUsers] = await pool.query(
      'SELECT id FROM users WHERE patient_id = ? AND status = "active"',
      [appt.patient_id]
    );
    const STATUS_MESSAGES = {
      confirmed: 'Your appointment has been confirmed.',
      cancelled: 'Your appointment has been cancelled.',
      completed: 'Your appointment is complete. Thanks for visiting!',
    };
    if (portalUsers[0] && STATUS_MESSAGES[status]) {
      await notify({
        userId: portalUsers[0].id,
        type: 'appointment_status',
        title: STATUS_MESSAGES[status],
        message: `${appt.appointment_date} at ${appt.start_time}.`,
      });
    }
  }

  res.json({ message: 'Appointment status updated.' });
});

module.exports = {
  listAppointments, getAppointment, createAppointment, updateAppointment, updateAppointmentStatus,
};
