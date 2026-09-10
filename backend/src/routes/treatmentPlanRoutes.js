const express = require('express');
const {
  listAllPlans, listForPatient, getPlan, createPlan,
  updatePlanStatus, addItem, updateItem, deleteItem,
} = require('../controllers/treatmentPlanController');
const { requireAuth, requireRole } = require('../middleware/auth');

const CLINICAL = ['admin', 'dentist', 'assistant'];

const patientNestedRouter = express.Router({ mergeParams: true });
patientNestedRouter.use(requireAuth);
patientNestedRouter.get('/', listForPatient);
patientNestedRouter.post('/', requireRole(...CLINICAL), createPlan);

const standaloneRouter = express.Router();
standaloneRouter.use(requireAuth);
standaloneRouter.get('/', listAllPlans);
standaloneRouter.get('/:id', getPlan);
standaloneRouter.patch('/:id/status', requireRole(...CLINICAL), updatePlanStatus);
standaloneRouter.post('/:id/items', requireRole(...CLINICAL), addItem);

const itemsRouter = express.Router();
itemsRouter.use(requireAuth);
itemsRouter.put('/:itemId', requireRole(...CLINICAL), updateItem);
itemsRouter.delete('/:itemId', requireRole(...CLINICAL), deleteItem);

module.exports = { patientNestedRouter, standaloneRouter, itemsRouter };
