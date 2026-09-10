const express = require('express');
const { listAuditLogs } = require('../controllers/auditLogController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', listAuditLogs);

module.exports = router;
