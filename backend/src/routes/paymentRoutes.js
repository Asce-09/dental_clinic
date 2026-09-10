const express = require('express');
const { listPayments } = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listPayments);

module.exports = router;
