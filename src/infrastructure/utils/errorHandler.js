const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler] Caught error:', err);

  const status = err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  return res.status(status).json({
    status: 'cod_error',
    error_code: errorCode,
    detail: err.message || 'An unexpected error occurred.',
    message: 'No se pudo completar la solicitud por fallas internas.'
  });
};

module.exports = errorHandler;
