const TransactionService = require('../services/transactionService');

class TransactionController {
    async transfer(req, res) {
        try {
            const result = await TransactionService.transfer(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async deposit(req, res) {
        try {
            const result = await TransactionService.deposit(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async withdrawal(req, res) {
        try {
            const result = await TransactionService.withdrawal(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async getTransaction(req, res) {
        try {
            const { transaction_id } = req.params;
            const result = await TransactionService.getTransaction(transaction_id);
            if (!result) return res.status(404).json({ error: 'Transaction not found' });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getLedger(req, res) {
        try {
            const { transaction_id } = req.params;
            const result = await TransactionService.getLedger(transaction_id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async reverse(req, res) {
        try {
            const { transaction_id } = req.params;
            const { reason } = req.body;
            const result = await TransactionService.reverse(transaction_id, reason);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new TransactionController();
