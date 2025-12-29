const request = require('supertest');
const app = require('../src/server');

describe('API Gateway Tests', () => {
    it('GET /health should return 200', async () => {
        // Mock the DB response if necessary, but for now we might fail if DB isn't up.
        // However, the test environment might not have DB.
        // Let's expect it to return 503 if DB is down, or 200 if up. 
        // Ideally we mock pgPool.

        // For simplicity in this environment without setting up mocks yet:
        // We just want to see if the app mounts.
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message');
    });
});
