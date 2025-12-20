const UserController = require('../src/controllers/userController');
const UserService = require('../src/services/userService');

jest.mock('../src/services/userService');

describe('UserController', () => {
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

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const mockUser = { user_id: 'user1', username: 'test' };
            UserService.getProfile.mockResolvedValue(mockUser);

            await UserController.getProfile(req, res);

            expect(UserService.getProfile).toHaveBeenCalledWith('user1');
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });

        it('should return 404 if user not found', async () => {
            UserService.getProfile.mockResolvedValue(null);
            await UserController.getProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getUserById', () => {
        it('should allow admin to get any user', async () => {
            req.user.role = 'admin';
            req.params.user_id = 'otherUser';
            const mockUser = { user_id: 'otherUser' };
            UserService.getUserById.mockResolvedValue(mockUser);

            await UserController.getUserById(req, res);

            expect(res.json).toHaveBeenCalledWith(mockUser);
        });

        it('should deny non-admin accessing other user', async () => {
            req.user.role = 'user';
            req.user.userId = 'user1';
            req.params.user_id = 'otherUser';

            await UserController.getUserById(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('updateStatus', () => {
        it('should allow admin to update status', async () => {
            req.user.role = 'admin';
            req.params.user_id = 'user1';
            req.body = { is_active: false };

            UserService.updateStatus.mockResolvedValue({ user_id: 'user1', is_active: false });

            await UserController.updateStatus(req, res);

            expect(UserService.updateStatus).toHaveBeenCalledWith('user1', { is_active: false });
            expect(res.json).toHaveBeenCalled();
        });

        it('should deny non-admin', async () => {
            req.user.role = 'user';
            await UserController.updateStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
