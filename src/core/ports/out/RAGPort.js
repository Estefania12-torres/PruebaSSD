class RAGPort {
  async buildIndex(connectionString, schema) {
    throw new Error('Method buildIndex not implemented');
  }
  async searchRelevantSchema(connectionString, query, limit) {
    throw new Error('Method searchRelevantSchema not implemented');
  }
}

module.exports = RAGPort;
