const request = require('supertest');
const app = require('../src/server');

// Mock Kafka to prevent connection attempts during tests
jest.mock('../src/config/kafka', () => ({
    connectConsumer: jest.fn(),
    subscribeToTopic: jest.fn(),
    consumer: {
        run: jest.fn(),
    },
}));

describe('Notification Service Tests', () => {
    it('should export the app', () => {
        expect(app).toBeDefined();
    });

    // Add more specific route tests if applicable, e.g.
    // it('GET /receipts/health should return 200', ...)
});
