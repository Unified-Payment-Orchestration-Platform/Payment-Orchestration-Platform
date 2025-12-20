const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'auth-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const producer = kafka.producer();

const connectProducer = async () => {
    let retries = 5;
    while (retries > 0) {
        try {
            await producer.connect();
            console.log('Kafka Producer connected');
            return;
        } catch (error) {
            console.error('Error connecting Kafka Producer, retrying...', error.message);
            retries--;
            await new Promise(res => setTimeout(res, 5000));
        }
    }
    console.error('Failed to connect Kafka Producer after multiple retries');
};

const publishEvent = async (topic, event) => {
    try {
        await producer.send({
            topic,
            messages: [
                { value: JSON.stringify(event) },
            ],
        });
        console.log(`Published event to ${topic}`, event);
    } catch (error) {
        console.error(`Error publishing to ${topic}`, error);
    }
};

module.exports = {
    connectProducer,
    publishEvent,
};
