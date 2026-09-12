const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../utils/auditLog');

function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}

const PATIENT_FIELDS = [
  'first_name', 'middle_name', 'last_name', 'suffix', 'birth_date', 'sex',
  'civil_status', 'occupation', 'email', 'phone', 'address',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
];

// GET /api/patients?search=&status=&page=&limit=
const listPatients = asyncHandler(async (req, res) => {
  const { search = '', status = '', page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const where = [];
  const params = [];

  if (search) {
    where.push('(first_name LIKE ? OR last_name LIKE ? OR patient_code LIKE ? OR phone LIKE ? OR email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT id, patient_code, first_name, last_name, birth_date, sex, phone, email, status, created_at
     FROM patients
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) AS count FROM patients ${whereSql}`,
    params
  );

  res.json({ data: rows, total: count, page: Number(page), limit: Number(limit) });
});

// GET /api/patients/:id
const getPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);
  const patient = rows[0];
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found.' });
  }

  const [historyRows] = await pool.query(
    'SELECT * FROM medical_histories WHERE patient_id = ? ORDER BY updated_at DESC LIMIT 1',
    [id]
  );
  const medicalHistory = historyRows[0];

  const [[docCount]] = await pool.query(
    'SELECT COUNT(*) AS count FROM patient_documents WHERE patient_id = ?',
    [id]
  );

  const [portalRows] = await pool.query(
    'SELECT id, email, status, last_login_at FROM users WHERE patient_id = ?',
    [id]
  );

  res.json({
    ...patient,
    medicalHistory: medicalHistory || null,
    documentCount: docCount.count,
    portalAccess: portalRows[0] || null,
  });
});

// POST /api/patients
const createPatient = asyncHandler(async (req, res) => {
  const body = req.body;

  if (!body.firstName || !body.lastName) {
    return res.status(400).json({ message: 'First name and last name are required.' });
  }

  const [result] = await pool.query(
    `INSERT INTO patients
      (patient_code, first_name, middle_name, last_name, suffix, birth_date, sex,
       civil_status, occupation, email, phone, address,
       emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.firstName, body.middleName || null, body.lastName, body.suffix || null,
      body.birthDate || null, body.sex || null, body.civilStatus || null,
      body.occupation || null, body.email || null, body.phone || null, body.address || null,
      body.emergencyContactName || null, body.emergencyContactPhone || null,
      body.emergencyContactRelationship || null,
    ]
  );

  const id = result.insertId;
  const code = `P-${String(id).padStart(6, '0')}`;
  await pool.query('UPDATE patients SET patient_code = ? WHERE id = ?', [code, id]);

  // Seed the 32 permanent teeth as "healthy" so the chart has something to show immediately.
  await pool.query(
    `INSERT INTO patient_teeth (patient_id, tooth_id, status)
     SELECT ?, id, 'healthy' FROM teeth WHERE dentition = 'permanent'`,
    [id]
  );

  res.status(201).json({ id, patientCode: code, message: 'Patient created.' });
});

// PUT /api/patients/:id
const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  const map = {
    firstName: 'first_name', middleName: 'middle_name', lastName: 'last_name', suffix: 'suffix',
    birthDate: 'birth_date', sex: 'sex', civilStatus: 'civil_status', occupation: 'occupation',
    email: 'email', phone: 'phone', address: 'address',
    emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
    emergencyContactRelationship: 'emergency_contact_relationship',
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
  await pool.query(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Patient updated.' });
});

// PATCH /api/patients/:id/status
const updatePatientStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  await pool.query('UPDATE patients SET status = ? WHERE id = ?', [status, id]);

  await logAction({
    req, action: 'patient.status_changed', entityType: 'patient', entityId: id,
    description: `Set patient #${id} status to "${status}"`,
  });

  res.json({ message: 'Patient status updated.' });
});

// PUT /api/patients/:id/medical-history
const upsertMedicalHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  const [existing] = await pool.query('SELECT id FROM medical_histories WHERE patient_id = ?', [id]);

  const fields = [
    'allergies', 'currentMedications', 'medicalConditions', 'previousSurgeries',
    'familyHistory', 'pregnancyStatus', 'smokingStatus', 'alcoholUse', 'notes',
  ];
  const colMap = {
    allergies: 'allergies', currentMedications: 'current_medications',
    medicalConditions: 'medical_conditions', previousSurgeries: 'previous_surgeries',
    familyHistory: 'family_history', pregnancyStatus: 'pregnancy_status',
    smokingStatus: 'smoking_status', alcoholUse: 'alcohol_use', notes: 'notes',
  };

  if (existing.length) {
    const presentFields = fields.filter((f) => f in body);
    const sets = presentFields.map((f) => `${colMap[f]} = ?`);
    const values = presentFields.map((f) => body[f] || null);

    await pool.query(
      `UPDATE medical_histories SET ${sets.join(', ')}, recorded_by = ? WHERE patient_id = ?`,
      [...values, req.user.id, id]
    );
  } else {
    await pool.query(
      `INSERT INTO medical_histories
        (patient_id, allergies, current_medications, medical_conditions, previous_surgeries,
         family_history, pregnancy_status, smoking_status, alcohol_use, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, body.allergies || null, body.currentMedications || null, body.medicalConditions || null,
        body.previousSurgeries || null, body.familyHistory || null, body.pregnancyStatus || null,
        body.smokingStatus || null, body.alcoholUse || null, body.notes || null, req.user.id,
      ]
    );
  }

  res.json({ message: 'Medical history saved.' });
});

// POST /api/patients/:id/portal/enable
const enablePortalAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [[patient]] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found.' });
  }
  if (!patient.email) {
    return res.status(400).json({
      message: 'This patient needs an email address on file before you can enable portal access.',
    });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE patient_id = ?', [id]);
  if (existing.length) {
    return res.status(409).json({ message: 'Portal access is already enabled for this patient.' });
  }

  const [emailInUse] = await pool.query('SELECT id FROM users WHERE email = ?', [patient.email]);
  if (emailInUse.length) {
    return res.status(409).json({
      message: `A login already exists for ${patient.email}. Use a different email on the patient's record, or check if a staff account is using it.`,
    });
  }

  const [[patientRole]] = await pool.query("SELECT id FROM roles WHERE name = 'patient' LIMIT 1");
  if (!patientRole) {
    return res.status(500).json({ message: 'No "patient" role found in the roles table.' });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await pool.query(
    `INSERT INTO users (role_id, patient_id, first_name, last_name, email, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patientRole.id, id, patient.first_name, patient.last_name, patient.email, passwordHash]
  );

  await logAction({
    req, action: 'patient.portal_enabled', entityType: 'patient', entityId: id,
    description: `Enabled portal access for patient #${id} (${patient.email})`,
  });

  res.status(201).json({
    message: 'Portal access enabled.',
    email: patient.email,
    temporaryPassword: tempPassword,
  });
});

// POST /api/patients/:id/portal/reset-password
const resetPortalPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query('SELECT id, email FROM users WHERE patient_id = ?', [id]);
  const portalUser = rows[0];
  if (!portalUser) {
    return res.status(404).json({ message: 'This patient does not have portal access enabled.' });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await pool.query('UPDATE users SET password_hash = ?, status = "active" WHERE id = ?', [
    passwordHash, portalUser.id,
  ]);

  await logAction({
    req, action: 'patient.portal_password_reset', entityType: 'patient', entityId: id,
    description: `Reset portal password for patient #${id}`,
  });

  res.json({ message: 'Portal password reset.', email: portalUser.email, temporaryPassword: tempPassword });
});

// PATCH /api/patients/:id/portal/status  { status: 'active' | 'inactive' }
const setPortalStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const [rows] = await pool.query('SELECT id FROM users WHERE patient_id = ?', [id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'This patient does not have portal access enabled.' });
  }

  await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, rows[0].id]);

  await logAction({
    req, action: 'patient.portal_status_changed', entityType: 'patient', entityId: id,
    description: `Set portal login status to "${status}" for patient #${id}`,
  });

  res.json({ message: 'Portal access status updated.' });
});

module.exports = {
  listPatients, getPatient, createPatient, updatePatient, updatePatientStatus, upsertMedicalHistory,
  enablePortalAccess, resetPortalPassword, setPortalStatus,
};
