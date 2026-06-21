/**
 * Interface for RAG Context Retrieval
 * This class acts as a contract for any adapter that provides context retrieval.
 */
class IRagContextPort {
    async getContext(query) {
        throw new Error('Method "getContext()" must be implemented.');
    }
}

/**
 * Interface for n8n Webhook Communication
 * This class acts as a contract for any adapter that communicates with n8n webhooks.
 */
class IN8nWebhookPort {
    async sendToAgent(payload) {
        throw new Error('Method "sendToAgent()" must be implemented.');
    }
}

module.exports = {
    IRagContextPort,
    IN8nWebhookPort
};
