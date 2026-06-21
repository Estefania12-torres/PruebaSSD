class AskController {
  constructor(askUseCase) {
    this.askUseCase = askUseCase;
  }

  async ask(req, res, next) {
    try {
      const { connection_string, question } = req.body;
      const result = await this.askUseCase.execute({ connection_string, question });
      
      return res.status(200).json({
        status: 'cod_ok',
        data: result,
        message: 'Flujo NL2SQL ejecutado correctamente'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AskController;
