const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'core-banking-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const producer = kafka.producer();

const connectProducer = async () => {
    try {
        await producer.connect();
        console.log('Kafka Producer connected');
    } catch (error) {
        console.error('Error connecting Kafka Producer', error);
    }
};

const publishEvent = async (topic, event) => {
    try {
        await producer.send({
            topic,
            messages: [
                { value: JSON.stringify(event) },
            ],
        });
        console.log(Published event to ${topic}, event);
    } catch (error) {
        console.error(Error publishing to ${topic}, error);
    }
};

module.exports = {
    connectProducer,
    publishEvent,
};