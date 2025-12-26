const AccountService = require('../services/accountService');

class AccountController {
    async createAccount(req, res) {
        try {
            const { user_id, account_type, currency } = req.body;
            if (!user_id || !account_type || !currency) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            const account = await AccountService.createAccount(req.body);
            res.status(201).json(account);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create account' });
        }
    }

    async getAccount(req, res) {
        try {
            const { account_id } = req.params;
            const account = await AccountService.getAccount(account_id);
            if (!account) return res.status(404).json({ error: 'Account not found' });
            res.json(account);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserAccounts(req, res) {
        try {
            const { user_id } = req.params;
            const accounts = await AccountService.getUserAccounts(user_id);
            res.json(accounts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            const { account_id } = req.params;
            const { status } = req.body;
            const result = await AccountService.updateStatus(account_id, status);
            if (!result) return res.status(404).json({ error: 'Account not found' });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getBalanceHistory(req, res) {
        try {
            const { account_id } = req.params;
            const history = await AccountService.getBalanceHistory(account_id);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAccountTransactions(req, res) {
        try {
            const { account_id } = req.params;
            const transactions = await AccountService.getAccountTransactions(account_id);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AccountController();
