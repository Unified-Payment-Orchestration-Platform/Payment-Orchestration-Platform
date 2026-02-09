const { Kafka } = require('kafkajs');
const AccountService = require('../services/accountService');

const kafka = new Kafka({
    clientId: 'core-banking-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const consumer = kafka.consumer({ groupId: 'core-banking-auth-events-group' });

const connectConsumer = async () => {
    let retries = 5;
    while (retries > 0) {
        try {
            await consumer.connect();
            console.log('Kafka Consumer connected for auth events');
            
            // Subscribe to auth-events topic to listen for user registrations
            await consumer.subscribe({ topic: 'auth-events', fromBeginning: false });
            
            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const event = JSON.parse(message.value.toString());
                        console.log(`[Core Banking] Received event from ${topic}:`, event.type);

                        if (event.type === 'UserRegistered') {
                            const { user_id, email, username } = event.payload;
                            console.log(`[Core Banking] User registered: ${user_id} (${email})`);
                            
                            // Automatically create a default account for the new user
                            // This demonstrates cross-service interaction:
                            // - Auth service creates user in auth_db (with user_id)
                            // - Core banking creates account in core_banking_db using that user_id
                            // - Both databases are updated with related data
                            
                            try {
                                const account = await AccountService.createAccount({
                                    user_id: user_id, // Using user_id from auth_db
                                    account_type: 'CHECKING',
                                    currency: 'USD'
                                });
                                
                                console.log(`[Core Banking] ✅ Auto-created account ${account.account_id} for user ${user_id} in core_banking_db`);
                                console.log(`[Core Banking] 📊 Database Update: core_banking_db.accounts table updated with user_id: ${user_id}`);
                                
                            } catch (error) {
                                // If account creation fails (e.g., account already exists), log but don't crash
                                console.error(`[Core Banking] ⚠️ Failed to auto-create account for user ${user_id}:`, error.message);
                            }
                        }
                    } catch (error) {
                        console.error('[Core Banking] Error processing auth event:', error);
                    }
                },
            });
            
            return;
        } catch (error) {
            console.error('Error connecting Kafka Consumer, retrying...', error.message);
            retries--;
            await new Promise(res => setTimeout(res, 5000));
        }
    }
    console.error('Failed to connect Kafka Consumer after multiple retries');
};

module.exports = {
    connectConsumer,
};
