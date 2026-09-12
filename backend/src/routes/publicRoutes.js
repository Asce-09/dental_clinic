const express = require('express');
const { getClinicInfo, getStats, submitInquiry } = require('../controllers/publicController');

const router = express.Router();

// No requireAuth here on purpose — this is the public marketing site's API.

router.get('/clinic-info', getClinicInfo);
router.get('/stats', getStats);
router.post('/inquiry', submitInquiry);

module.exports = router;
