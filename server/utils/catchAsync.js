/**
 * @module catchAsync
 * @description Utility to wrap asynchronous route handlers and catch potential errors.
 * Eliminates the need for repetitive try-catch blocks in route controllers.
 * @param {Function} fn - Asynchronous function to be wrapped
 * @returns {Function} Wrapped function that passes errors to global error middleware
 */
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
