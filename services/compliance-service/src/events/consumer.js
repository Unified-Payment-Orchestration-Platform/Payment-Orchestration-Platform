const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'compliance-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'compliance-group' });
const producer = kafka.producer();

const run = async () => {
    await consumer.connect();
    await producer.connect();

    await consumer.subscribe({ topic: 'transaction-events', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value.toString());
            console.log(`Received event: ${event.type}`);

            if (event.type === 'TransactionCompleted') {
                const transaction = event.payload;
                const amount = parseFloat(transaction.amount);

                let complianceStatus = 'APPROVED';
                let reason = 'Transaction within limits';

                // Compliance Rule: Amount > 5000 is Suspicious
                if (amount > 5000) {
                    complianceStatus = 'SUSPICIOUS';
                    reason = 'Amount exceeds threshold of 5000 due to Velocity Check (Mock)';
                }

                console.log(`Compliance Verdict for ${transaction.transaction_id}: ${complianceStatus}`);

                // Emit Compliance Verdict
                await producer.send({
                    topic: 'compliance-events',
                    messages: [
                        {
                            value: JSON.stringify({
                                type: 'ComplianceVerdict',
                                payload: {
                                    transaction_id: transaction.transaction_id,
                                    status: complianceStatus,
                                    reason: reason,
                                    timestamp: new Date().toISOString()
                                }
                            })
                        }
                    ]
                });
            }
        },
    });
};

module.exports = { run };
