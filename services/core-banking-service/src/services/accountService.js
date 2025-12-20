const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { publishEvent } = require('../events/kafka');

class AccountService {
    async createAccount(data) {
        const { user_id, account_type, currency } = data;
        const accountId = uuidv4();
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // 1. Create Account
            const accountResult = await client.query(
                'INSERT INTO accounts (account_id, user_id, account_type, currency, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
                [accountId, user_id, account_type, currency, 'ACTIVE']
            );
            const account = accountResult.rows[0];

            // 2. Initialize Balance (0.00)
            await client.query(
                'INSERT INTO account_balances (account_id, balance, version, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [accountId, 0.00, 1]
            );

            await client.query('COMMIT');

            // 3. Publish Event (Non-blocking)
            publishEvent('account-events', {
                type: 'AccountCreated',
                payload: { account_id: account.account_id, user_id: account.user_id, currency: account.currency }
            });

            return { ...account, balance: '0.00' };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async getAccount(accountId) {
        const result = await db.query(
            `SELECT a.account_id, a.user_id, a.account_type, a.currency, a.status, a.updated_at, ab.balance 
             FROM accounts a 
             JOIN account_balances ab ON a.account_id = ab.account_id 
             WHERE a.account_id = $1`,
            [accountId]
        );
        return result.rows[0];
    }

    async getUserAccounts(userId) {
        const result = await db.query(
            `SELECT a.account_id, a.account_type, a.currency, a.status, ab.balance 
             FROM accounts a 
             JOIN account_balances ab ON a.account_id = ab.account_id 
             WHERE a.user_id = $1`,
            [userId]
        );
        return result.rows;
    }

    async updateStatus(accountId, status) {
        const result = await db.query(
            'UPDATE accounts SET status = $1, updated_at = NOW() WHERE account_id = $2 RETURNING account_id, status, updated_at',
            [status, accountId]
        );
        return result.rows[0];
    }

    async getBalanceHistory(accountId) {
        const result = await db.query(
            'SELECT snapshot_id, balance, version, last_updated FROM account_balance_snapshots WHERE account_id = $1 ORDER BY last_updated DESC',
            [accountId]
        );
        return result.rows;
    }
}

module.exports = new AccountService();
