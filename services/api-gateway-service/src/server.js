// src/index.js

const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs'); // For later Pub/Sub
const httpProxy = require('express-http-proxy');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');

dotenv.config(); // Load environment variables from .env

const app = express();
const port = process.env.PORT || 3000;

// Middleware for logging, security, and CORS
app.use(requestLogger('API-GATEWAY'));
app.use(morgan('combined')); // Logging for monitoring and debugging
app.use(helmet()); // Security headers (e.g., XSS protection)
app.use(cors()); // Enable CORS for client-side requests
app.use(express.json()); // Parse JSON bodies

// PostgreSQL connection pool (for persistence checks)
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Kafka setup (commented out for now; enable when integrating Pub/Sub)
/*
const kafka = new Kafka({
 clientId: 'api-gateway',
 brokers: [process.env.KAFKA_BROKER],
});
// Example producer for publishing events
const producer = kafka.producer();
await producer.connect();
// Use like: await producer.send({ topic: 'orders.created', messages: [{ value: JSON.stringify(payload) }] });
*/

// Health endpoint (required for monitoring; checks DB connection)
app.get('/health', async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW()'); // Simple query to test DB
    client.release();
    res.status(200).json({
      status: 'healthy',
      db: 'connected',
      timestamp: result.rows[0].now,
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(503).json({ status: 'unhealthy', error: 'DB connection failed' });
  }
});

// Import Routes



// Proxy routes to downstream microservices (generic routing)
// Example: Proxy /auth/* to auth-service
// Proxy /auth/* to auth-service
// Proxy /auth/* to auth-service
app.use('/auth', (req, res, next) => {
  // If the request is for /users (e.g. /auth/users/...), we want to forward it as /users/...
  // effectively mapping /auth/users -> /users on auth-service
  if (req.url.startsWith('/users')) {

  } else {
    req.url = '/auth' + req.url;
  }
  httpProxy('http://auth-service:3001')(req, res, next);
});

// Proxy /users/* to auth-service
app.use('/users', (req, res, next) => {
  // We keep the /users prefix because auth-service mounts it at /users
  // req.url here is the path after /users (e.g. /me)
  // But auth-service expects /users/me.
  // wait, existing /auth proxy does req.url = '/auth' + req.url
  // express-http-proxy by default forwards the modified req.url.
  // When using app.use('/path', ...), req.url is stripped of '/path'.
  // So for /users/me, req.url is /me.
  // Auth service expects /users/me.
  // So we need to prepend /users.
  req.url = '/users' + req.url;
  httpProxy('http://auth-service:3001')(req, res, next);
});

// Proxy /core/* to core-banking-service
app.use('/core', (req, res, next) => {
  req.url = req.url.replace('/core', '');
  httpProxy('http://core-banking-service:3005')(req, res, next);
});

// Proxy /receipts/* to notification-service
app.use('/receipts', (req, res, next) => {
  httpProxy('http://notification-service:3006')(req, res, next);
});


// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ message: 'API Gateway is running. Use /health for status or /auth, /core for services.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`API Gateway listening on port ${port}`);
    // Optional: Test DB connection on startup
    try {
      const client = await pgPool.connect();
      console.log('Connected to PostgreSQL');
      client.release();
    } catch (err) {
      console.error('Failed to connect to PostgreSQL:', err);
    }
    // Kafka connection test (uncomment when ready)
    // await producer.connect();
    // console.log('Connected to Kafka');
  });
}

module.exports = app;