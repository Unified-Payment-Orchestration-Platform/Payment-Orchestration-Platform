const axios = require('axios');
const express = require('express');
const router = express.Router();
const db = require('../db');
const { publishEvent } = require('../events/kafka');
const { v4: uuidv4 } = require('uuid');

const axios = require('axios');

// GET /accounts/:account_id - Get account details
router.get('/:account_id', async (req, res) => {
    try {
        const { account_id } = req.params;

        const result = await db.query(
            `SELECT a.account_id, a.user_id, a.account_type, a.currency, a.status, ab.balance 
       FROM accounts a 
       JOIN account_balances ab ON a.account_id = ab.account_id 
       WHERE a.account_id = $1`,
            [account_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get account error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});