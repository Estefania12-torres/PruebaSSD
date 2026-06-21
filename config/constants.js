require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  N8N_API_KEY: process.env.N8N_API_KEY,
  DATABASE_CONNECTION: process.env.DATABASE_CONNECTION
};
