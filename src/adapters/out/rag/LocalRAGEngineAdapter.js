const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const RAGPort = require('../../../core/ports/out/RAGPort');

class LocalRAGEngineAdapter extends RAGPort {
  constructor(persistPath = './data/rag') {
    super();
    this.persistPath = persistPath;
    this.modelPipeline = null;
    this.initPromise = null;
  }

  // Lazy initialization of the pipeline
  async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      this.modelPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      await fs.mkdir(this.persistPath, { recursive: true });
    })();
    return this.initPromise;
  }

  getConnectionHash(connectionString) {
    return crypto.createHash('md5').update(connectionString).digest('hex');
  }

  async generateEmbedding(text) {
    await this.init();
    const output = await this.modelPipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async buildIndex(connectionString, schema) {
    await this.init();
    const indexData = [];
    const hash = this.getConnectionHash(connectionString);

    for (const [tableName, info] of Object.entries(schema)) {
      const columns = info.columns || [];
      const descriptionText = `Tabla: ${tableName}. Columnas: ${columns.join(', ')}.`;
      
      const vector = await this.generateEmbedding(descriptionText);
      indexData.push({
        table: tableName,
        text: descriptionText,
        vector
      });
    }

    const filePath = path.join(this.persistPath, `${hash}.json`);
    await fs.writeFile(filePath, JSON.stringify(indexData, null, 2), 'utf-8');
    console.log(`Índice RAG construido y guardado en: ${filePath}`);
  }

  async searchRelevantSchema(connectionString, query, limit = 4) {
    await this.init();
    const hash = this.getConnectionHash(connectionString);
    const filePath = path.join(this.persistPath, `${hash}.json`);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const indexData = JSON.parse(fileContent);
      
      const queryVector = await this.generateEmbedding(query);

      const scored = indexData.map(item => {
        const score = this.cosineSimilarity(queryVector, item.vector);
        return { table: item.table, text: item.text, score };
      });

      scored.sort((a, b) => b.score - a.score);

      const topMatches = scored.slice(0, limit);
      console.log(`RAG Matches encontrados para: "${query}"`, topMatches.map(m => `${m.table} (${m.score.toFixed(2)})`));

      return topMatches.map(m => m.text).join('\n');
    } catch (err) {
      console.warn(`El índice RAG no existe o no pudo ser leído para este hash. Construyendo en caliente...`);
      return '';
    }
  }
}

module.exports = LocalRAGEngineAdapter;
