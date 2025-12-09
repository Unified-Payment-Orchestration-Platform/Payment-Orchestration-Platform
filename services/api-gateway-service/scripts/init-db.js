const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres_user',
    password: process.env.DB_PASSWORD || 'postgres_pass',
    database: process.env.DB_NAME || 'app_db',
});

async function initDb() {
    try {
        await client.connect();
        console.log('Connected to database successfully');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema initialization...');
        await client.query(schemaSql);
        console.log('Schema initialization completed successfully.');

    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Simple retry logic for container startup
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

async function connectWithRetry(retries = 0) {
    try {
        await initDb();
    } catch (e) {
        if (retries < MAX_RETRIES) {
            console.log(`Failed to connect (attempt ${retries + 1}/${MAX_RETRIES}). Retrying in 2s...`);
            setTimeout(() => connectWithRetry(retries + 1), RETRY_DELAY);
        } else {
            console.error('Max retries reached. Exiting.');
            process.exit(1);
        }
    }
}

connectWithRetry();
