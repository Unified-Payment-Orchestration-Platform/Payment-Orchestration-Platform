const AuthController = require('../src/controllers/authController');
const AuthService = require('../src/services/authService');
const tokenUtils = require('../src/utils/tokenUtils');

jest.mock('../src/services/authService');
jest.mock('../src/utils/tokenUtils');

describe('AuthController', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, params: {}, headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a user successfully', async () => {
            req.body = { username: 'test', email: 'test@test.com', password: 'password' };
            const mockUser = { user_id: '1', email: 'test@test.com', role: 'user', username: 'test', is_active: true };

            AuthService.register.mockResolvedValue(mockUser);
            tokenUtils.generateAccessToken.mockReturnValue('access_token');
            tokenUtils.generateRefreshToken.mockReturnValue('refresh_token');

            await AuthController.register(req, res);

            expect(AuthService.register).toHaveBeenCalledWith('test', 'test@test.com', 'password', undefined);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'User registered',
                token: 'access_token',
                refreshToken: 'refresh_token'
            }));
        });

        it('should return 400 if fields are missing', async () => {
            req.body = { username: 'test' };
            await AuthController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Missing fields' });
        });
    });

    describe('login', () => {
        it('should login successfully', async () => {
            req.body = { email: 'test@test.com', password: 'password' };
            const mockResult = { user: { id: 1 }, token: 'token', refreshToken: 'refresh' };
            AuthService.login.mockResolvedValue(mockResult);

            await AuthController.login(req, res);

            expect(AuthService.login).toHaveBeenCalledWith('test@test.com', 'password');
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('should return 401 on failure', async () => {
            req.body = { email: 'test@test.com', password: 'wrong' };
            AuthService.login.mockRejectedValue(new Error('Invalid credentials'));

            await AuthController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            req.body = { refreshToken: 'valid_refresh' };
            const mockResult = { token: 'new_token' };
            AuthService.refreshToken.mockResolvedValue(mockResult);

            await AuthController.refreshToken(req, res);

            expect(AuthService.refreshToken).toHaveBeenCalledWith('valid_refresh');
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('should return 400 if refresh token missing', async () => {
            await AuthController.refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            AuthService.logout.mockResolvedValue(true);
            await AuthController.logout(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
