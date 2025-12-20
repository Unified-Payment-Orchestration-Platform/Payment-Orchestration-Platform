const SubscriptionController = require('../src/controllers/subscriptionController');
const SubscriptionService = require('../src/services/subscriptionService');

jest.mock('../src/services/subscriptionService');

describe('SubscriptionController', () => {
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

    describe('getSubscriptions', () => {
        it('should return subscriptions', async () => {
            req.params.user_id = 'user1';
            const mockSubs = [{ id: 1 }];
            SubscriptionService.getSubscriptions.mockResolvedValue(mockSubs);

            await SubscriptionController.getSubscriptions(req, res);

            expect(res.json).toHaveBeenCalledWith(mockSubs);
        });
    });

    describe('createSubscription', () => {
        it('should create subscription', async () => {
            req.params.user_id = 'user1';
            req.body = { channels: ['email'] };
            SubscriptionService.createSubscription.mockResolvedValue({ id: 1 });

            await SubscriptionController.createSubscription(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });
});
