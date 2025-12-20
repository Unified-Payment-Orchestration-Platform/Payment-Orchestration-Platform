const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const requestLogger = require('./middleware/requestLogger');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(requestLogger('AUTH-SERVICE'));
app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
// Note: PaymentMethod and Subscription routes are mounted on /users to match semantics /users/:id/...
// but since I defined them to start with /:user_id, we can just mount them at /users too.
app.use('/users', paymentMethodRoutes);
app.use('/users', subscriptionRoutes);

app.get('/health', (req, res) => res.json({ status: 'Auth Service Online' }));

// Start Server
app.listen(port, async () => {
    console.log(`Auth Service running on port ${port}`);
    const { connectProducer } = require('./events/kafka');
    await connectProducer();
});
