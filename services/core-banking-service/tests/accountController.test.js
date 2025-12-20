const AccountController = require('../src/controllers/accountController');
const AccountService = require('../src/services/accountService');

jest.mock('../src/services/accountService');

describe('AccountController', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('createAccount', () => {
        it('should create an account', async () => {
            req.body = { user_id: 'u1', account_type: 'SAVINGS', currency: 'USD' };
            const mockAccount = { account_id: 'a1', balance: '0.00' };
            AccountService.createAccount.mockResolvedValue(mockAccount);

            await AccountController.createAccount(req, res);

            expect(AccountService.createAccount).toHaveBeenCalledWith(req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockAccount);
        });

        it('should return 400 for missing fields', async () => {
            req.body = { user_id: 'u1' }; // Missing type/currency
            await AccountController.createAccount(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getAccount', () => {
        it('should return account details', async () => {
            req.params.account_id = 'a1';
            const mockAccount = { account_id: 'a1' };
            AccountService.getAccount.mockResolvedValue(mockAccount);

            await AccountController.getAccount(req, res);
            expect(res.json).toHaveBeenCalledWith(mockAccount);
        });

        it('should return 404 if not found', async () => {
            req.params.account_id = 'a1';
            AccountService.getAccount.mockResolvedValue(null);
            await AccountController.getAccount(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
