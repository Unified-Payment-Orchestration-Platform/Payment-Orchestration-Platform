const { Pool } = require('pg');
require('dotenv').config();

// Write pool (connects to primary database)
const writePool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres_user',
    password: process.env.DB_PASSWORD || 'postgres_pass',
    database: process.env.DB_NAME || 'app_db',
});

// Read pool (connects to replica database)
const readPool = new Pool({
    host: process.env.DB_REPLICA_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres_user',
    password: process.env.DB_PASSWORD || 'postgres_pass',
    database: process.env.DB_NAME || 'app_db',
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const queryWithRetry = async (pool, text, params, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await pool.query(text, params);
        } catch (err) {
            if (i === retries - 1) throw err;
            console.warn(`Query failed, retrying (${i + 1}/${retries})...`, err.message);
            await sleep(1000 * (i + 1)); // Exponential backoff
        }
    }
};

writePool.on('error', (err) => console.error('Unexpected error on WRITE client', err));
readPool.on('error', (err) => console.error('Unexpected error on READ client', err));

module.exports = {
    // Default to read pool for generic queries (optimistic - most queries are reads)
    query: (text, params) => queryWithRetry(readPool, text, params),
    // Explicit write operations
    queryWrite: (text, params) => queryWithRetry(writePool, text, params),
    // Get clients for transactions
    getWriteClient: () => writePool.connect(),
    getReadClient: () => readPool.connect(),
    // Legacy support
    getClient: () => writePool.connect(),
};
