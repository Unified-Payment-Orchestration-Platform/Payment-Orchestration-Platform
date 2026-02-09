const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { publishEvent } = require('../events/kafka');

class AccountService {
    async createAccount(data) {
        const { user_id, account_type, currency } = data;
        const accountId = uuidv4();
        let client;
        
        try {
            client = await db.getWriteClient();
            console.log('[AccountService] Creating account with:', { accountId, user_id, account_type, currency });

            await client.query('BEGIN');

            // 1. Create Account
            const accountResult = await client.query(
                'INSERT INTO accounts (account_id, user_id, account_type, currency, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
                [accountId, user_id, account_type, currency, 'ACTIVE']
            );
            const account = accountResult.rows[0];
            console.log('[AccountService] Account created:', account.account_id);

            // 2. Initialize Balance (0.00)
            await client.query(
                'INSERT INTO account_balances (account_id, balance, version, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [accountId, 0.00, 1]
            );
            console.log('[AccountService] Balance initialized');

            await client.query('COMMIT');
            console.log('[AccountService] Transaction committed');

            // 3. Publish Event (Non-blocking)
            // Note: user details are fetched from auth-service via API if needed
            // Core banking can function independently even if auth-service is down
            try {
                publishEvent('account-events', {
                    type: 'AccountCreated',
                    payload: { account_id: account.account_id, user_id: account.user_id, currency: account.currency }
                });
            } catch (eventError) {
                // Don't fail account creation if event publishing fails
                console.error('[AccountService] Failed to publish event (non-critical):', eventError.message);
            }

            return { ...account, balance: '0.00' };
        } catch (e) {
            console.error('[AccountService] Error in createAccount:', e);
            console.error('[AccountService] Error message:', e.message);
            console.error('[AccountService] Error stack:', e.stack);
            if (client) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('[AccountService] Error during rollback:', rollbackError.message);
                }
            }
            throw e;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    async getAccount(accountId) {
        // Use queryWrite to read from primary since replica is not set up yet
        const result = await db.queryWrite(
            `SELECT a.account_id, a.user_id, a.account_type, a.currency, a.status, a.updated_at, ab.balance 
             FROM accounts a 
             JOIN account_balances ab ON a.account_id = ab.account_id 
             WHERE a.account_id = $1`,
            [accountId]
        );
        return result.rows[0];
    }

    async getUserAccounts(userId) {
        // Use queryWrite to read from primary since replica is not set up yet
        const result = await db.queryWrite(
            `SELECT a.account_id, a.account_type, a.currency, a.status, ab.balance 
             FROM accounts a 
             JOIN account_balances ab ON a.account_id = ab.account_id 
             WHERE a.user_id = $1`,
            [userId]
        );
        return result.rows;
    }

    async updateStatus(accountId, status) {
        const result = await db.queryWrite(
            'UPDATE accounts SET status = $1, updated_at = NOW() WHERE account_id = $2 RETURNING account_id, status, updated_at',
            [status, accountId]
        );
        return result.rows[0];
    }

    async getBalanceHistory(accountId) {
        // Use queryWrite to read from primary since replica is not set up yet
        const result = await db.queryWrite(
            'SELECT snapshot_id, balance, version, last_updated FROM account_balance_snapshots WHERE account_id = $1 ORDER BY last_updated DESC',
            [accountId]
        );
        return result.rows;
    }

    async getAccountTransactions(accountId) {
        // Use queryWrite to read from primary since replica is not set up yet
        const result = await db.queryWrite(
            'SELECT * FROM transactions WHERE from_account_id = $1 OR to_account_id = $1 ORDER BY created_at DESC',
            [accountId]
        );
        return result.rows;
    }
}

module.exports = new AccountService();
