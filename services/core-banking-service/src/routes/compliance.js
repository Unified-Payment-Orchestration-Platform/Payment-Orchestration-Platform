const express = require('express');
const router = express.Router();
const ComplianceController = require('../controllers/complianceController');

router.post('/check', ComplianceController.check);
router.get('/logs/:transaction_id', ComplianceController.getLogs);

module.exports = router;
