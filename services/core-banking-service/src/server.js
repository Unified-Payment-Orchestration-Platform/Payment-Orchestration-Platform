const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { connectProducer } = require('./events/kafka');
const db = require('./db');
const requestLogger = require('./middleware/requestLogger');

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

// Import Services
const CronService = require('./services/cronService');

app.use(requestLogger('CORE-BANKING-SERVICE'));
app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// Import Routes (will be created next)
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const complianceRoutes = require('./routes/compliance');
const settlementRoutes = require('./routes/settlements');

// Health Check
app.get('/health', async (req, res) => {
    try {
        await db.queryWrite('SELECT NOW()');
        res.status(200).json({ status: 'healthy', db: 'connected' });
    } catch (err) {
        console.error(err);
        res.status(503).json({ status: 'unhealthy', error: 'db_error' });
    }
});

// Routes
app.use('/accounts', accountRoutes);
app.use('/transactions', transactionRoutes);
app.use('/compliance', complianceRoutes);
app.use('/settlements', settlementRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, async () => {
    console.log(`Core Banking Service listening on port ${port}`);
    await connectProducer();
    CronService.start();
});
