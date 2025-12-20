const SettlementService = require('../services/settlementService');

class SettlementController {
    async process(req, res) {
        try {
            const result = await SettlementService.processSettlements();
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getSettlement(req, res) {
        try {
            const { settlement_id } = req.params;
            const result = await SettlementService.getSettlement(settlement_id);
            if (!result) return res.status(404).json({ error: 'Settlement not found' });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new SettlementController();
