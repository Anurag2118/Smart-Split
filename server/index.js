const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ["http://localhost:5173", "https://smart-split-theta-nine.vercel.app/"],
    credentials: true
}));
app.use(express.json());

//Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));

app.get('/', (req, res) => {
    res.send('Smart Split Server is Running');
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartsplit')
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.log(err));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});