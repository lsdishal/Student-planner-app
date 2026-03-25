const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');

router.get('/', plannerController.getPlans);
router.post('/', plannerController.createPlan);

module.exports = router;