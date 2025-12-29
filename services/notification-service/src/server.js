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
    await subscribeToTopic('account-events');

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const event = JSON.parse(message.value.toString());

                // Define mock contact details for demo
                const mockPhone = '+251900478653';
                const mockEmail = 'user@example.com';

                if (event.type === 'TransactionCompleted') {
                    console.log('Received TransactionCompleted event:', event.payload.transaction_id);
                    const { transaction_id, amount, currency, transaction_type, phone_number, sender_phone, receiver_phone, sender_email, receiver_email } = event.payload;

                    // 1. Generate PDF
                    const fileName = await PDFService.generateReceipt(event.payload);
                    const receiptUrl = `http://localhost:${port}/receipts/${fileName}`;

                    if (transaction_type === 'TRANSFER') {
                        // Check if it's a Subscription Payment
                        const isSubscription = event.payload.idempotency_key && event.payload.idempotency_key.startsWith('sub_');
                        const subjectSuffix = isSubscription ? 'Subscription Paid' : 'Transfer Sent';
                        const receivedSubject = isSubscription ? 'Subscription Payment Received' : 'Funds Received';

                        // Notify Sender
                        const senderMsg = `You sent ${amount} ${currency}. Ref: ${transaction_id}. Receipt: ${receiptUrl}`;
                        const senderP = sender_phone || mockPhone;
                        await NotificationService.sendSMS(senderP, senderMsg);
                        if (sender_email) await NotificationService.sendEmail(sender_email, subjectSuffix, senderMsg);

                        // Notify Receiver
                        const receiverMsg = `You received ${amount} ${currency}. Ref: ${transaction_id}. Receipt: ${receiptUrl}`;
                        const receiverP = receiver_phone || mockPhone;
                        await NotificationService.sendSMS(receiverP, receiverMsg);
                        if (receiver_email) await NotificationService.sendEmail(receiver_email, receivedSubject, receiverMsg);

                    } else {
                        // Deposit / Withdrawal
                        let messageBody = `Transaction ${transaction_id} of ${amount} ${currency} completed. Receipt: ${receiptUrl}`;
                        let subject = 'Transaction Completed';

                        if (transaction_type === 'DEPOSIT') {
                            messageBody = `Deposit of ${amount} ${currency} successful. Ref: ${transaction_id}. Receipt: ${receiptUrl}`;
                            subject = 'Deposit Confirmation';
                        } else if (transaction_type === 'WITHDRAWAL') {
                            messageBody = `Withdrawal of ${amount} ${currency} successful. Ref: ${transaction_id}. Receipt: ${receiptUrl}`;
                            subject = 'Withdrawal Alert';
                        }

                        // 3. Send Notifications
                        const targetPhone = phone_number || mockPhone;
                        await NotificationService.sendSMS(targetPhone, messageBody);
                        await NotificationService.sendEmail(mockEmail, subject, messageBody);
                    }

                } else if (event.type === 'UserRegistered') {
                    console.log('Received UserRegistered event:', event.payload.user_id);
                    const { username, phone_number } = event.payload;
                    const message = `Welcome ${username}! Thanks for registering with UPOP.`;

                    const targetPhone = phone_number || mockPhone;
                    await NotificationService.sendSMS(targetPhone, message);
                    await NotificationService.sendEmail(mockEmail, 'Welcome to UPOP', message);

                } else if (event.type === 'AccountCreated') {
                    console.log('Received AccountCreated event:', event.payload.account_id);
                    const { account_id, currency, phone_number } = event.payload;
                    const message = `Your new ${currency} account (${account_id}) has been successfully created.`;

                    const targetPhone = phone_number || mockPhone;
                    await NotificationService.sendSMS(targetPhone, message);
                    await NotificationService.sendEmail(mockEmail, 'Account Created', message);
                }
            } catch (error) {
                console.error('Error processing Kafka message:', error);
            }
        },
    });
};

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Notification Service listening on port ${port}`);
        runKafkaConsumer();
    });
}

module.exports = app;
