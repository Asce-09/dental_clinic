const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../utils/auditLog');
const { notify } = require('../utils/notify');

const VALID_STATUSES = ['new', 'in_progress', 'resolved'];

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || parts[0];
  return { firstName, lastName };
}

// GET /api/appointment-requests?status=
const listRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = [];
  const params = [];
  if (status && VALID_STATUSES.includes(status)) {
    where.push('ar.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT ar.id, ar.name, ar.email, ar.phone, ar.preferred_date, ar.preferred_time,
            ar.reason, ar.status, ar.created_at, ar.updated_at,
            ar.linked_patient_id, ar.linked_appointment_id,
            t.name AS treatment_name,
            p.patient_code AS linked_patient_code,
            u.first_name AS handled_by_first_name, u.last_name AS handled_by_last_name
     FROM appointment_requests ar
     LEFT JOIN treatments t ON t.id = ar.treatment_id
     LEFT JOIN patients p ON p.id = ar.linked_patient_id
     LEFT JOIN users u ON u.id = ar.handled_by
     ${whereSql}
     ORDER BY
       FIELD(ar.status, 'new', 'in_progress', 'resolved'),
       ar.preferred_date ASC, ar.created_at DESC
     LIMIT 300`,
    params
  );

  res.json(rows);
});

// PATCH /api/appointment-requests/:id/status
// Setting status to "resolved" automatically finds-or-creates the matching
// patient (by email or phone) and books the real appointment from the
// request's details — this is the one case in the app where an unverified
// public submission is allowed to create real clinical records, and only
// because a staff member is the one explicitly confirming it right here.
const updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const [[request]] = await pool.query('SELECT * FROM appointment_requests WHERE id = ?', [id]);
  if (!request) {
    return res.status(404).json({ message: 'Appointment request not found.' });
  }

  // Simple path: any status other than "resolved" (or a request that's
  // already been resolved before) is just a status update, no side effects.
  if (status !== 'resolved' || request.linked_appointment_id) {
    await pool.query(
      'UPDATE appointment_requests SET status = ?, handled_by = ? WHERE id = ?',
      [status, req.user.id, id]
    );
    await logAction({
      req, action: 'appointment_request.status_changed', entityType: 'appointment_request', entityId: id,
      description: `Set appointment request #${id} status to "${status}"`,
    });
    return res.json({ message: 'Appointment request status updated.' });
  }

  // Resolving for the first time: find-or-create the patient, then book the appointment.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let patientId = null;
    let patientCode = null;
    let patientIsNew = false;

    if (request.email || request.phone) {
      const matchClauses = [];
      const matchParams = [];
      if (request.email) {
        matchClauses.push('email = ?');
        matchParams.push(request.email);
      }
      if (request.phone) {
        matchClauses.push('phone = ?');
        matchParams.push(request.phone);
      }
      const [existingMatches] = await conn.query(
        `SELECT id, patient_code FROM patients WHERE ${matchClauses.join(' OR ')} LIMIT 1`,
        matchParams
      );
      if (existingMatches.length) {
        patientId = existingMatches[0].id;
        patientCode = existingMatches[0].patient_code;
      }
    }

    if (!patientId) {
      const { firstName, lastName } = splitName(request.name);

      const [result] = await conn.query(
        `INSERT INTO patients (patient_code, first_name, last_name, email, phone)
         VALUES (UUID(), ?, ?, ?, ?)`,
        [firstName, lastName, request.email || null, request.phone || null]
      );
      patientId = result.insertId;
      patientCode = `P-${String(patientId).padStart(6, '0')}`;
      await conn.query('UPDATE patients SET patient_code = ? WHERE id = ?', [patientCode, patientId]);

      // Same seeding as manual patient creation, so their dental chart works immediately.
      await conn.query(
        `INSERT INTO patient_teeth (patient_id, tooth_id, status)
         SELECT ?, id, 'healthy' FROM teeth WHERE dentition = 'permanent'`,
        [patientId]
      );
      patientIsNew = true;
    }

    const startTime = request.preferred_time || '09:00:00';
    const notes = request.preferred_time
      ? null
      : 'Preferred time not specified by requester — confirm exact time with patient.';

    const [apptResult] = await conn.query(
      `INSERT INTO appointments
        (patient_id, treatment_id, appointment_date, start_time, status, source, reason, notes, created_by)
       VALUES (?, ?, ?, ?, 'confirmed', 'website', ?, ?, ?)`,
      [patientId, request.treatment_id, request.preferred_date, startTime, request.reason, notes, req.user.id]
    );
    const appointmentId = apptResult.insertId;

    await conn.query(
      `UPDATE appointment_requests
       SET status = 'resolved', handled_by = ?, linked_patient_id = ?, linked_appointment_id = ?
       WHERE id = ?`,
      [req.user.id, patientId, appointmentId, id]
    );

    await conn.commit();

    await logAction({
      req, action: 'appointment_request.resolved', entityType: 'appointment_request', entityId: id,
      description: patientIsNew
        ? `Resolved request #${id}: created patient ${patientCode} and booked appointment #${appointmentId}`
        : `Resolved request #${id}: matched existing patient ${patientCode} and booked appointment #${appointmentId}`,
    });

    if (request.email || request.phone) {
      // Best-effort — if this patient also has portal access, let them know.
      const [portalUser] = await pool.query('SELECT id FROM users WHERE patient_id = ?', [patientId]);
      if (portalUser.length) {
        await notify({
          userId: portalUser[0].id,
          type: 'appointment_status',
          title: 'Your appointment has been confirmed',
          message: `${request.preferred_date} at ${startTime.slice(0, 5)}.`,
        });
      }
    }

    res.json({
      message: patientIsNew
        ? `Resolved — created patient ${patientCode} and booked their appointment.`
        : `Resolved — matched existing patient ${patientCode} and booked their appointment.`,
      patientId,
      patientCode,
      patientIsNew,
      appointmentId,
    });
  } catch (err) {
    await conn.rollback();
    // These two error codes are exactly what MySQL throws when this
    // endpoint's newer columns/enum value (added by migration
    // 006_auto_resolve_appointment_requests.sql) don't exist yet — i.e. the
    // database hasn't been migrated to match this version of the app. Flag
    // that specifically rather than the generic 500, since "something went
    // wrong" gives the admin nothing to act on.
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'WARN_DATA_TRUNCATED' || err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      const schemaError = new Error(
        'This database is missing a recent update needed to resolve requests ' +
        '(migration 006_auto_resolve_appointment_requests.sql). Ask whoever manages ' +
        'the database to run the pending migrations, then try again.'
      );
      schemaError.status = 500;
      schemaError.exposeMessage = true;
      throw schemaError;
    }
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = { listRequests, updateRequestStatus };
