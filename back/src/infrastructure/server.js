const express = require('express');
const cors = require('cors');
const apiRouter = require('../adapters/in/http/routes');
const errorHandler = require('./utils/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'UP' }));

// Global Error Handler
app.use(errorHandler);

module.exports = app;
