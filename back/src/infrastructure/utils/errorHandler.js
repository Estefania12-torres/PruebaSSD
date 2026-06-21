const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler] Caught error:', err);

  // Detectar errores de validación de dominio → 400 Bad Request
  const isValidationError = 
    err.message?.includes('is required') ||
    err.message?.includes('must be a non-empty string') ||
    err.message?.includes('sql query is required');

  const status = err.status || (isValidationError ? 400 : 500);
  const errorCode = err.code || (isValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');

  return res.status(status).json({
    status: 'cod_error',
    error_code: errorCode,
    detail: err.message || 'An unexpected error occurred.',
    message: isValidationError
      ? 'Datos de entrada inválidos. Revisa los campos requeridos.'
      : 'No se pudo completar la solicitud por fallas internas.'
  });
};

module.exports = errorHandler;
