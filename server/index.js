const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Initialize Database Connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Middleware Configuration
 */

// CORS (Cross-Origin Resource Sharing)
// Configured to allow requests from:
// - Localhost (Development)
// - Vercel App (Production Frontend)
app.use(cors({
    origin: [
        "http://localhost:5173",                       // Local Vite Dev Server
        "https://smart-split-theta-nine.vercel.app"    // Production Frontend URL
    ],
    credentials: true, // Allow cookies/headers to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Body Parser
// Parses incoming JSON payloads
app.use(express.json());

/**
 * Route Definitions
 */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));

// Check Route
app.get('/', (req, res) => {
    res.status(200).send('Smart Split Server is Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});