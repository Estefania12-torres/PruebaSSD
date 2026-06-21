class BuildRagUseCase {
  constructor(databasePort, ragPort) {
    this.databasePort = databasePort;
    this.ragPort = ragPort;
  }

  async execute(connectionString) {
    if (!connectionString) {
      throw new Error('La cadena de conexión es obligatoria.');
    }
    
    // 1. Extraer metadatos
    const schema = await this.databasePort.extractSchema(connectionString);
    
    // 2. Construir e indexar vectores RAG
    await this.ragPort.buildIndex(connectionString, schema);
    
    return {
      message: 'Indexación completada correctamente.',
      tablesIndexed: Object.keys(schema).length
    };
  }
}

module.exports = BuildRagUseCase;
