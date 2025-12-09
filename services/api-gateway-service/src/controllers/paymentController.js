const PaymentService = require('../services/PaymentService');

class PaymentController {
    async initiatePayment(req, res) {
        try {
            const authToken = req.headers.authorization?.split(' ')[1];
            if (!authToken) {
                // For now, trail services
            }

            const payment = await PaymentService.initiatePayment(req.body, authToken);
            res.status(201).json(payment);
        } catch (error) {
            console.error('Payment Error:', error.message);
            if (error.message.includes('Auth Failed')) {
                res.status(401).json({ error: error.message });
            } else if (error.message.includes('Duplicate')) {
                res.status(409).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    }

    async getPaymentStatus(req, res) {
        // Placeholder for GET /:id
        res.status(501).json({ message: 'Not implemented yet' });
    }
}

module.exports = new PaymentController();
