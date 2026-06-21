class RagController {
  constructor(buildRagUseCase) {
    this.buildRagUseCase = buildRagUseCase;
  }

  build = async (req, res, next) => {
    try {
      const { connection_string } = req.body;
      const result = await this.buildRagUseCase.execute(connection_string);
      return res.status(200).json({
        status: 'cod_ok',
        data: result,
        message: 'Índice RAG generado de forma exitosa'
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = RagController;
