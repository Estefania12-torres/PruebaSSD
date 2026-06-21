class DatabasePort {
  async executeQuery(connectionString, sqlQuery) {
    throw new Error('Method executeQuery not implemented');
  }
  async extractSchema(connectionString) {
    throw new Error('Method extractSchema not implemented');
  }
}

module.exports = DatabasePort;
