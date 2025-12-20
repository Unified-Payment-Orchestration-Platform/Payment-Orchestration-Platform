const ComplianceService = require('../services/complianceService');

class ComplianceController {
    async check(req, res) {
        try {
            const result = await ComplianceService.checkCompliance(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getLogs(req, res) {
        try {
            const { transaction_id } = req.params;
            const logs = await ComplianceService.getLogs(transaction_id);
            res.json(logs);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ComplianceController();
