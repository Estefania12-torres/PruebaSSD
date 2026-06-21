class DbController {
  constructor(executeSqlUseCase, runRawQueryUseCase) {
    this.executeSqlUseCase = executeSqlUseCase;
    this.runRawQueryUseCase = runRawQueryUseCase;
  }

  async execute(req, res, next) {
    try {
      const { connection_string, sql, llm_template } = req.body;
      const result = await this.executeSqlUseCase.execute({ connection_string, sql, llm_template });
      
      return res.status(200).json({
        status: 'cod_ok',
        data: result,
        message: 'Consulta ejecutada y ensamblada con éxito'
      });
    } catch (error) {
      next(error);
    }
  }

  async query(req, res, next) {
    try {
      const { connection_string, sql } = req.body;
      const result = await this.runRawQueryUseCase.execute({ connection_string, sql });
      
      return res.status(200).json({
        status: 'cod_ok',
        data: result,
        message: 'Consulta en crudo ejecutada con éxito'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DbController;
