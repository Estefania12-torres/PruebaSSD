const AskModel = require('../domain/AskModel');

class AskUseCase {
  constructor(orchestratorPort, ragPort, databasePort) {
    this.orchestratorPort = orchestratorPort;
    this.ragPort = ragPort;
    this.databasePort = databasePort;
  }

  async execute({ connection_string, question }) {
    // 1. Validación en capa de dominio
    const askModel = new AskModel({ connection_string, question });
    askModel.validate();

    // 2. Auto-construir índice RAG si no existiera previamente
    let schemaContext = await this.ragPort.searchRelevantSchema(connection_string, question, 3);
    
    if (!schemaContext) {
      console.log('Generando índice RAG inicial en caliente...');
      const schema = await this.databasePort.extractSchema(connection_string);
      await this.ragPort.buildIndex(connection_string, schema);
      schemaContext = await this.ragPort.searchRelevantSchema(connection_string, question, 3);
    }

    // 3. Invocar flujo n8n pasándole el fragmento de esquema relevante recuperado por el RAG
    return await this.orchestratorPort.triggerWorkflow(connection_string, question, schemaContext);
  }
}

module.exports = AskUseCase;
