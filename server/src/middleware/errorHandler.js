/**
 * Global error handling middleware
 */
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, _next) => {
  logger.error(`${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });

  if (err.type === 'entity.parse.failed') {
    return sendError(res, 'Invalid JSON in request body', 400);
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return sendError(res, 'Duplicate record', 409);
  }

  if (err.code === '23503') { // Foreign key violation
    return sendError(res, 'Referenced record not found', 404);
  }

  return sendError(res, 'Internal server error', 500);
};

const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.path}`, 404);
};

module.exports = { errorHandler, notFoundHandler };
