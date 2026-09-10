const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', requireRole('admin'), updateSettings);

module.exports = router;
