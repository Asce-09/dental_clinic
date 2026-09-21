const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Files land in backend/uploads/patient-documents, outside version control.
// Never served as static files — always streamed through the authenticated
// download endpoint in patientDocumentController.js, since these can be
// scanned consent forms, ID photos, or other sensitive patient documents.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'patient-documents');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `patient${req.params.id}-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, HEIC images or PDF files are allowed.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB — enough for a phone photo of a form
});

module.exports = { upload, UPLOAD_DIR };
