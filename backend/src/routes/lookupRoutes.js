const express = require('express');
const { listTreatments, listDentists } = require('../controllers/lookupController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/treatments', listTreatments);
router.get('/dentists', listDentists);

module.exports = router;
