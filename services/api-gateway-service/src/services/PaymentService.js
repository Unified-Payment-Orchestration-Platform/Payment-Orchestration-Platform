const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const TransactionRepository = require('../repositories/TransactionRepository');
const AuthClient = require('../clients/AuthClient');

class PaymentService {
    constructor() {
        this.transactionRepo = new TransactionRepository(db);
        this.authClient = AuthClient;
    }

    async initiatePayment(paymentRequest, authToken) {
        const transactionId = `tx-${uuidv4()}`;

        // 1. Synchronous Auth Check
        // We assume the token is passed from the controller
        console.log(`[PaymentService] Verifying auth for ${transactionId}`);
        try {
            // Synchronous call to Auth Service
            await this.authClient.verifyToken(authToken);
            console.log(`[PaymentService] Auth verified for ${transactionId}`);
        } catch (err) {
            console.error(`[PaymentService] Auth failed: ${err.message}`);
            throw new Error(`Authorization Failed: ${err.message}`);
        }

        // 2. Prepare Transaction Data
        const transactionData = {
            transactionId,
            userId: paymentRequest.metadata?.userId || null,
            paymentType: paymentRequest.paymentType,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency || 'USD',
            idempotencyKey: paymentRequest.idempotencyKey || `idemp-${uuidv4()}`, // Fallback if not provided
            metadata: paymentRequest.metadata || {}
        };

        // 3. Persist to DB
        console.log(`[PaymentService] Persisting transaction ${transactionId}`);
        const savedTransaction = await this.transactionRepo.create(transactionData);

        // 4. Future: Publish to Kafka for Compliance/Core Banking
        // await kafkaProducer.send(...)

        return savedTransaction;
    }
}

module.exports = new PaymentService();
