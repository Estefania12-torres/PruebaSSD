class AskModel {
  constructor({ connection_string, question }) {
    this.connection_string = connection_string;
    this.question = question;
  }

  validate() {
    if (!this.connection_string || typeof this.connection_string !== 'string' || this.connection_string.trim() === '') {
      throw new Error('connection_string is required and must be a non-empty string');
    }
    if (!this.question || typeof this.question !== 'string' || this.question.trim() === '') {
      throw new Error('question is required and must be a non-empty string');
    }
  }
}

module.exports = AskModel;
