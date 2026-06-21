const axios = require('axios');
const { IN8nWebhookPort } = require('../../core/ports/contracts');

/**
 * N8nWebhookAdapter implementation of IN8nWebhookPort.
 * Sends payloads to an n8n webhook for AI orchestration.
 */
class N8nWebhookAdapter extends IN8nWebhookPort {
    constructor() {
        super();
        this.webhookUrl = process.env.N8N_WEBHOOK_URL;
        this.apiKey = process.env.N8N_API_KEY;
    }

    async sendToAgent(payload) {
        try {
            const response = await axios.post(this.webhookUrl, payload, {
                headers: { 
                    'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error in N8nWebhookAdapter.sendToAgent:', error.message);
            throw new Error(`n8n Webhook call failed: ${error.message}`);
        }
    }
}

module.exports = N8nWebhookAdapter;
