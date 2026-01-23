const express = require('express');
const dotenv = require('dotenv');
const { run } = require('./events/consumer');

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3007; // Default to 3007 if not set

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'compliance-service' });
});

// Start Kafka Consumer
run().catch(console.error);

app.listen(PORT, () => {
    console.log(`Compliance Service running on port ${PORT}`);
});
