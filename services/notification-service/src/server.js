const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { connectConsumer, subscribeToTopic, consumer } = require('./config/kafka');
const PDFService = require('./services/pdfService');
const NotificationService = require('./services/notificationService');
const receiptRoutes = require('./routes/receipts');

dotenv.config();

const requestLogger = require('./middleware/requestLogger');

const app = express();
const port = process.env.PORT || 3006;

app.use(requestLogger('NOTIFICATION-SERVICE'));
app.use(cors());
app.use(express.json());

// Routes
app.use('/receipts', receiptRoutes);

// Kafka Consumer Logic
const runKafkaConsumer = async () => {
    await connectConsumer();
    await subscribeToTopic('transaction-events');
    await subscribeToTopic('auth-events');

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const event = JSON.parse(message.value.toString());

                if (event.type === 'TransactionCompleted') {
                    console.log('Received TransactionCompleted event:', event.payload.transaction_id);

                    // 1. Generate PDF
                    const fileName = await PDFService.generateReceipt(event.payload);
                    const receiptUrl = `http://localhost:${port}/receipts/${fileName}`;

                    // 2. Send SMS
                    // In a real app, we'd look up the user's phone number from AuthService using event.payload.from_account_id -> user_id
                    // For demo, we'll use a mock number
                    await NotificationService.sendSMS('+251900478653', `Transaction ${event.payload.transaction_id} of ${event.payload.amount} ${event.payload.currency} completed. Receipt: ${receiptUrl}`);
                } else if (event.type === 'UserRegistered') {
                    console.log('Received UserRegistered event:', event.payload.user_id);
                    await NotificationService.sendSMS('+251900478653', `Welcome ${event.payload.username}! Thanks for registering with UPOP.`);
                }
            } catch (error) {
                console.error('Error processing Kafka message:', error);
            }
        },
    });
};

app.listen(port, () => {
    console.log(`Notification Service listening on port ${port}`);
    runKafkaConsumer();
});
