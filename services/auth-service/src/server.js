const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const AuthController = require('./controllers/authController');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.post('/auth/register', AuthController.register);
app.post('/auth/login', AuthController.login);
app.post('/auth/validate', AuthController.validate);

app.get('/health', (req, res) => res.json({ status: 'Auth Service Online' }));

// Start Server
app.listen(port, () => {
    console.log(`Auth Service running on port ${port}`);
});
