const FormatterService = require('../domain/services/FormatterService');

class ExecuteSqlUseCase {
  constructor(databasePort) {
    this.databasePort = databasePort;
  }

  async execute({ connection_string, sql, llm_template }) {
    if (!connection_string) {
      throw new Error('connection_string is required');
    }
    if (!sql) {
      throw new Error('sql query is required');
    }

    const results = await this.databasePort.executeQuery(connection_string, sql);
    const answer = FormatterService.populateTemplate(llm_template, results);

    return {
      answer,
      raw_data: results
    };
  }
}

module.exports = ExecuteSqlUseCase;
