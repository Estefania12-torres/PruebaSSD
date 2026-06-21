class RunRawQueryUseCase {
  constructor(databasePort) {
    this.databasePort = databasePort;
  }

  async execute({ connection_string, sql }) {
    if (!connection_string) {
      throw new Error('connection_string is required');
    }
    if (!sql) {
      throw new Error('sql query is required');
    }

    // Clean markdown code blocks (e.g. ```sql ... ``` or ```)
    let cleanSql = sql.replace(/```sql/gi, '').replace(/```/g, '').trim();

    return await this.databasePort.executeQuery(connection_string, cleanSql);
  }
}

module.exports = RunRawQueryUseCase;
