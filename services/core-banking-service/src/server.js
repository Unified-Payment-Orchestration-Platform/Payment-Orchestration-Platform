const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { connectProducer } = require('./events/kafka');
const db = require('./db');

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());


// Health Check
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT NOW()');
        res.status(200).json({ status: 'healthy', db: 'connected' });
    } catch (err) {
        console.error(err);
        res.status(503).json({ status: 'unhealthy', error: 'db_error' });
    }
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, async () => {
    console.log(Core Banking Service listening on port ${port});
    await connectProducer();
});