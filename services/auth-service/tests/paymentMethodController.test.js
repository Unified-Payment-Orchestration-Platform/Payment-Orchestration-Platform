const PaymentMethodController = require('../src/controllers/paymentMethodController');
const PaymentMethodService = require('../src/services/paymentMethodService');

jest.mock('../src/services/paymentMethodService');

describe('PaymentMethodController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { userId: 'user1', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('listMethods', () => {
        it('should list methods for owner', async () => {
            req.params.user_id = 'user1';
            const mockMethods = [{ method_id: 'm1' }];
            PaymentMethodService.getMethods.mockResolvedValue(mockMethods);

            await PaymentMethodController.listMethods(req, res);

            expect(PaymentMethodService.getMethods).toHaveBeenCalledWith('user1');
            expect(res.json).toHaveBeenCalledWith(mockMethods);
        });

        it('should deny access to other user', async () => {
            req.params.user_id = 'other';
            await PaymentMethodController.listMethods(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('addMethod', () => {
        it('should add method', async () => {
            req.params.user_id = 'user1';
            req.body = { type: 'card' };
            PaymentMethodService.addMethod.mockResolvedValue({ method_id: 'm1' });

            await PaymentMethodController.addMethod(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ method_id: 'm1' });
        });
    });

    describe('deleteMethod', () => {
        it('should delete method', async () => {
            req.params.user_id = 'user1';
            req.params.method_id = 'm1';
            PaymentMethodService.deleteMethod.mockResolvedValue({ method_id: 'm1' });

            await PaymentMethodController.deleteMethod(req, res);

            expect(res.json).toHaveBeenCalledWith({ message: 'Method deleted' });
        });
    });
});
