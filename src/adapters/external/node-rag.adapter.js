const axios = require('axios');
const { IRagContextPort } = require('../../core/ports/contracts');

/**
 * NodeRagAdapter implementation of IRagContextPort.
 * Handles the conversion of natural language queries into embeddings 
 * and retrieves relevant relational schema metadata from a vector database.
 */
class NodeRagAdapter extends IRagContextPort {
    constructor() {
        super();
        this.vectorDbUrl = process.env.VECTOR_DB_URL || 'http://localhost:8000';
        this.embeddingServiceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:11434/api/embeddings';
        this.embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
        this.collectionName = 'schema_collection';
    }

    /**
     * Retrieves the most relevant relational schemas based on a natural language query.
     * @param {string} naturalQuery - The user's query in natural language.
     * @returns {Promise<Array>} - An array of relevant table schema objects.
     */
    async getRelevantSchema(naturalQuery) {
        try {
            // 1. Generate Embedding for the query
            const embedding = await this._generateEmbedding(naturalQuery);

            // 2. Query Vector Database for similar schemas
            const vectorResponse = await axios.post(`${this.vectorDbUrl}/api/v1/collections/${this.collectionName}/query`, {
                query_embeddings: [embedding],
                n_results: 3
            });

            const vectorData = vectorResponse.data;

            // 3. Map and clean the response data
            return this._mapVectorResponseToSchema(vectorData);
        } catch (error) {
            console.error('[NodeRagAdapter] Error retrieving relevant schema:', error.message);
            if (error.response) {
                console.error('[NodeRagAdapter] API Response Error:', error.response.data);
            }
            throw new Error(`RAG Schema Retrieval failed: ${error.message}`);
        }
    }

    /**
     * Internal method to call the embedding service.
     * @param {string} text - The text to embed.
     * @returns {Promise<Array<number>>} - The embedding vector.
     */
    async _generateEmbedding(text) {
        try {
            const response = await axios.post(this.embeddingServiceUrl, {
                model: this.embeddingModel,
                prompt: text
            });

            if (!response.data || !response.data.embedding) {
                throw new Error('Invalid response from embedding service: missing embedding vector.');
            }

            return response.data.embedding;
        } catch (error) {
            console.error('[NodeRagAdapter] Embedding generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Internal method to clean and deserialize vector metadata.
     * @param {Object} vectorData - The raw response from the vector database.
     * @returns {Array} - An array of parsed schema objects.
     */
    _mapVectorResponseToSchema(vectorData) {
        try {
            if (!vectorData || !vectorData.metadatas || !Array.isArray(vectorData.metadatas)) {
                return [];
            }

            // Each element in metadatas contains the metadata for the matched vector
            return vectorData.metadatas[0].map(meta => {
                if (!meta || !meta.schema_json) {
                    return null;
                }
                try {
                    return JSON.parse(meta.schema_json);
                } catch (parseError) {
                    console.error('[NodeRagAdapter] Failed to parse schema_json metadata:', parseError.message);
                    return null;
                }
            }).filter(item => item !== null);
        } catch (error) {
            console.error('[NodeRagAdapter] Error mapping vector response to schema:', error.message);
            return [];
        }
    }

    /**
     * Implementation of the interface method to maintain compatibility with the port.
     */
    async getContext(query) {
        const schemas = await this.getRelevantSchema(query);
        return JSON.stringify(schemas, null, 2);
    }
}

module.exports = NodeRagAdapter;
