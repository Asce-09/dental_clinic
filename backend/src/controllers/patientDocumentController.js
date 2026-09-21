const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../utils/auditLog');
const { UPLOAD_DIR } = require('../middleware/upload');

const DOCUMENT_TYPES = ['xray', 'photo', 'prescription', 'consent', 'medical_document', 'other'];

// GET /api/patients/:id/documents
const listDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query(
    `SELECT d.id, d.document_type, d.title, d.mime_type, d.file_size, d.created_at,
            u.first_name AS uploaded_by_first_name, u.last_name AS uploaded_by_last_name
     FROM patient_documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.patient_id = ?
     ORDER BY d.created_at DESC`,
    [id]
  );

  res.json(rows);
});

// POST /api/patients/:id/documents  (multipart/form-data: file, title, documentType)
const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'No file was uploaded.' });
  }

  const documentType = DOCUMENT_TYPES.includes(req.body.documentType) ? req.body.documentType : 'other';
  const title = req.body.title?.trim() || req.file.originalname;

  const [result] = await pool.query(
    `INSERT INTO patient_documents (patient_id, document_type, title, file_path, mime_type, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, documentType, title, req.file.filename, req.file.mimetype, req.file.size, req.user.id]
  );

  await logAction({
    req, action: 'patient_document.uploaded', entityType: 'patient', entityId: id,
    description: `Uploaded document "${title}" (${documentType}) for patient #${id}`,
  });

  res.status(201).json({ id: result.insertId, message: 'Document uploaded.' });
});

// GET /api/patients/:id/documents/:docId/download
const downloadDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;

  const [[doc]] = await pool.query(
    'SELECT * FROM patient_documents WHERE id = ? AND patient_id = ?',
    [docId, id]
  );
  if (!doc) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  const filePath = path.join(UPLOAD_DIR, doc.file_path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File is missing from storage.' });
  }

  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.title)}"`);
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /api/patients/:id/documents/:docId
const deleteDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;

  const [[doc]] = await pool.query(
    'SELECT * FROM patient_documents WHERE id = ? AND patient_id = ?',
    [docId, id]
  );
  if (!doc) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  await pool.query('DELETE FROM patient_documents WHERE id = ?', [docId]);

  const filePath = path.join(UPLOAD_DIR, doc.file_path);
  fs.unlink(filePath, (err) => {
    if (err) console.error('[patient documents] failed to remove file from disk:', err.message);
  });

  await logAction({
    req, action: 'patient_document.deleted', entityType: 'patient', entityId: id,
    description: `Deleted document "${doc.title}" for patient #${id}`,
  });

  res.json({ message: 'Document deleted.' });
});

module.exports = { listDocuments, uploadDocument, downloadDocument, deleteDocument };
