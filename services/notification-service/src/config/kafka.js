const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'notification-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

const connectConsumer = async () => {
    try {
        await consumer.connect();
        console.log('Kafka Consumer connected');
    } catch (error) {
        console.error('Error connecting Kafka Consumer', error);
    }
};

const subscribeToTopic = async (topic) => {
    await consumer.subscribe({ topic, fromBeginning: true });
};

module.exports = {
    consumer,
    connectConsumer,
    subscribeToTopic,
};
