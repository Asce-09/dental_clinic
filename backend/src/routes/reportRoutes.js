const express = require('express');
const { overview } = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'accountant'));

router.get('/overview', overview);

module.exports = router;
