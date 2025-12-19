const express = require('express');
const router = express.Router();
const db = require('../db');
const { publishEvent } = require('../events/kafka');
const { v4: uuidv4 } = require('uuid');

// POST /transactions - Create a transaction
router.post('/', async (req, res) => {
    const client = await db.getClient();
    try {
        const { type, from_account_id, to_account_id, amount, currency = 'USD', idempotency_key } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Idempotency Check
        if (idempotency_key) {
            const existing = await client.query('SELECT * FROM transactions WHERE idempotency_key = $1', [idempotency_key]);
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'Duplicate transaction', transaction: existing.rows[0] });
            }
        }

        await client.query('BEGIN');

        // 1. Compliance Check (Internal Call Simulation)
        // In real system: await axios.post('http://localhost:3002/compliance/check', { ... });
        // Assuming pass for MVP unless flagged

        // 2. Balance Checks & Updates
        let new_from_balance = null;
        let new_to_balance = null;

        if (type === 'withdrawal' || type === 'transfer') {
            const balanceRes = await client.query('SELECT balance FROM account_balances WHERE account_id = $1 FOR UPDATE', [from_account_id]);
            if (balanceRes.rows.length === 0) throw new Error('Source account not found');
            const currentBalance = parseFloat(balanceRes.rows[0].balance);

            if (currentBalance < amount) {
                throw new Error('Insufficient funds');
            }

            const updateRes = await client.query(
                'UPDATE account_balances SET balance = balance - $1, version = version + 1 WHERE account_id = $2 RETURNING balance',
                [amount, from_account_id]
            );
            new_from_balance = updateRes.rows[0].balance;
        }

        if (type === 'deposit' || type === 'transfer') {
            const targetId = type === 'deposit' ? from_account_id : to_account_id; // For deposit, from_account_id is usually where money goes if we view it as user's account
            // Let's stick to standard: Deposit needs a 'to_account_id' ideally, or we infer from context. 
            // Assuming 'to_account_id' is the target for deposit/transfer.

            // Re-evaluating Request body: usually Deposit is external -> account.
            // If type=deposit, to_account_id is required.
            // If type=withdrawal, from_account_id is required.
            // If type=transfer, both required.

            const targetAccountId = (type === 'deposit') ? to_account_id : to_account_id;
            if (!targetAccountId) throw new Error('Target account required');

            const updateRes = await client.query(
                'UPDATE account_balances SET balance = balance + $1, version = version + 1 WHERE account_id = $2 RETURNING balance',
                [amount, targetAccountId]
            );
            new_to_balance = updateRes.rows[0].balance;
        }

        // 3. Insert Transaction Record
        const txnId = uuidv4();
        await client.query(
            `INSERT INTO transactions (transaction_id, type, amount, currency, status, from_account_id, to_account_id, idempotency_key, metadata)
       VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, $8)`,
            [txnId, type, amount, currency, from_account_id, to_account_id, idempotency_key, '{}']
        );

        // 4. Ledger Entries (Double Entry)
        if (from_account_id) {
            await client.query(
                `INSERT INTO transaction_ledger (transaction_id, account_id, amount, entry_type, debit_amount)
             VALUES ($1, $2, $3, 'debit', $3)`,
                [txnId, from_account_id, amount]
            );
        }
        if (to_account_id) {
            await client.query(
                `INSERT INTO transaction_ledger (transaction_id, account_id, amount, entry_type, credit_amount)
             VALUES ($1, $2, $3, 'credit', $3)`,
                [txnId, to_account_id, amount]
            );
        }

        await client.query('COMMIT');

        // 5. Publish Event
        await publishEvent('transactions', {
            event_type: 'transaction.completed',
            transaction_id: txnId,
            type,
            amount,
            status: 'completed'
        });

        res.status(201).json({
            transaction_id: txnId,
            status: 'completed',
            new_from_balance,
            new_to_balance
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', err);
        if (err.message === 'Insufficient funds') {
            return res.status(400).json({ error: 'Insufficient funds' });
        }
        res.status(500).json({ error: err.message || 'Transaction failed' });
    } finally {
        client.release();
    }
});

// GET /transactions/:transaction_id
router.get('/:transaction_id', async (req, res) => {
    try {
        const { transaction_id } = req.params;
        const result = await db.query(
            `SELECT * FROM transactions WHERE transaction_id = $1`,
            [transaction_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const ledger = await db.query(
            `SELECT * FROM transaction_ledger WHERE transaction_id = $1`,
            [transaction_id]
        );

        res.json({ ...result.rows[0], ledger_entries: ledger.rows });
    } catch (err) {
        res.status(500).json({ error: 'Internal Error' });
    }
});

// GET /transactions/accounts/:account_id
router.get('/accounts/:account_id', async (req, res) => {
    try {
        const { account_id } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT * FROM transactions 
             WHERE from_account_id = $1 OR to_account_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [account_id, limit, offset]
        );

        const countRes = await db.query(
            `SELECT COUNT(*) FROM transactions WHERE from_account_id = $1 OR to_account_id = $1`,
            [account_id]
        );

        res.json({
            transactions: result.rows,
            total: parseInt(countRes.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal Error' });
    }
});

module.exports = router;
