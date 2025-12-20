const express = require('express');
const router = express.Router();
const SettlementController = require('../controllers/settlementController');

router.post('/process', SettlementController.process);
router.get('/:settlement_id', SettlementController.getSettlement);

module.exports = router;
