const axios = require('axios');
const OrchestratorPort = require('../../../core/ports/out/OrchestratorPort');
const constants = require('../../../../config/constants');

class N8nHttpAdapter extends OrchestratorPort {
  constructor() {
    super();
    this.webhookUrl = constants.N8N_WEBHOOK_URL;
    this.apiKey = constants.N8N_API_KEY;
  }

  async triggerWorkflow(connectionString, question, schemaContext) {
    try {
      const payload = {
        connection_string: connectionString,
        question: question,
        schema_context: schemaContext,
        backend_url: `http://localhost:${constants.PORT}`
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.post(this.webhookUrl, payload, { headers });
      return response.data;
    } catch (error) {
      console.error('Error in N8nHttpAdapter.triggerWorkflow:', error.message);
      if (error.response) {
        console.error('n8n response error:', error.response.data);
      }
      throw new Error(`n8n workflow trigger failed: ${error.message}`);
    }
  }
}

module.exports = N8nHttpAdapter;
