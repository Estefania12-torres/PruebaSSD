require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Adapters
const NodeRagAdapter = require('./adapters/external/node-rag.adapter');
const N8nWebhookAdapter = require('./adapters/external/n8n-webhook.adapter');
const QueryController = require('./adapters/web/query.controller');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// --- Dependency Injection ---
const ragAdapter = new NodeRagAdapter();
const n8nAdapter = new N8nWebhookAdapter();
const queryController = new QueryController(ragAdapter, n8nAdapter);

// --- Routes ---

// Frontend Interface
app.post('/api/v1/query', (req, res) => queryController.handleQuery(req, res));

// n8n Internal Pipeline Endpoints
app.post('/api/query', (req, res) => queryController.getRawSchema(req, res));
app.post('/api/anonymize', (req, res) => queryController.anonymize(req, res));
app.post('/api/execute', (req, res) => queryController.execute(req, res));

// Health check
app.get('/health', (req, res) => res.json({ status: 'UP' }));

app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
    console.log(`Connecting to n8n at: ${process.env.N8N_WEBHOOK_URL}`);
});
