const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres_user',
    password: process.env.DB_PASSWORD || 'postgres_pass',
    database: process.env.DB_NAME || 'app_db',
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
