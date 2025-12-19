const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /settlements/:settlement_id
router.get('/:settlement_id', async (req, res) => {
    try {
        const { settlement_id } = req.params;
        const result = await db.query(
            `SELECT s.*, t.amount as transaction_amount 
             FROM settlements s
             JOIN transactions t ON s.transaction_id = t.transaction_id
             WHERE s.settlement_id = $1`,
            [settlement_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Settlement not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get settlement error:', err);
        res.status(500).json({ error: 'Internal Error' });
    }
});

module.exports = router;
