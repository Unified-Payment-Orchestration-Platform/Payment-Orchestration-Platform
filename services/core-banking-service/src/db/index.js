const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const writePool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const readPool = new Pool({
    host: process.env.DB_REPLICA_HOST || process.env.DB_HOST, // Fallback to primary if replica not set
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const queryWithRetry = async (pool, text, params, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await pool.query(text, params);
        } catch (err) {
            if (i === retries - 1) throw err;
            console.warn(`Query failed, retrying (${i + 1}/${retries})...`, err.message);
            await sleep(1000 * (i + 1)); // Exponential backoffish
        }
    }
};

writePool.on('error', (err) => console.error('Unexpected error on WRITE client', err));
readPool.on('error', (err) => console.error('Unexpected error on READ client', err));

module.exports = {
    query: (text, params) => queryWithRetry(readPool, text, params), // Default to read pool for generic queries
    getWriteClient: () => writePool.connect(),
    getReadClient: () => readPool.connect(),
    queryWrite: (text, params) => queryWithRetry(writePool, text, params),
};
