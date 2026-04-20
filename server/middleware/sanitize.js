/**
 * @module sanitize
 * @description Input sanitization middleware to prevent NoSQL injection attacks.
 * Strips MongoDB query operators ($gt, $ne, etc.) from request body, query, and params.
 * Also trims and length-limits string values to prevent abuse.
 */

const MAX_STRING_LENGTH = 2000;

/**
 * Recursively sanitize an object by removing keys that start with '$'
 * and trimming overly long strings. Prevents NoSQL injection.
 * @param {*} obj - The value to sanitize
 * @param {number} depth - Current recursion depth (prevents stack overflow)
 * @returns {*} Sanitized value
 */
const sanitizeValue = (obj, depth = 0) => {
  // Prevent deeply nested attack payloads
  if (depth > 10) return obj;

  if (typeof obj === 'string') {
    return obj.trim().slice(0, MAX_STRING_LENGTH);
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map(item => sanitizeValue(item, depth + 1));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Block any key starting with '$' (MongoDB operator injection)
      if (typeof key === 'string' && key.startsWith('$')) {
        continue;
      }
      sanitized[key] = sanitizeValue(value, depth + 1);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Express middleware that sanitizes req.body, req.query, and req.params.
 * Must be applied AFTER body parsers (express.json).
 */
const sanitizeMiddleware = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};

module.exports = { sanitizeMiddleware, sanitizeValue };
