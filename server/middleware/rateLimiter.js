/**
 * @module rateLimiter
 * @description In-memory sliding window rate limiter middleware.
 * Prevents API abuse by limiting requests per IP within a time window.
 * No external dependencies required — uses a Map-based token bucket.
 */

const rateLimitStore = new Map();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore) {
    if (now - data.windowStart > data.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiting middleware with configurable limits.
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {string} options.message - Error message when limit exceeded
 * @returns {Function} Express middleware
 */
const createRateLimiter = ({ windowMs = 60000, max = 100, message = 'Too many requests, please try again later.' } = {}) => {
  return (req, res, next) => {
    const key = `${req.ip}-${req.baseUrl || req.path}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
      // New window
      rateLimitStore.set(key, { windowStart: now, count: 1, windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: message,
        retryAfterSeconds: retryAfter
      });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    next();
  };
};

// Pre-configured limiters for different route categories
const apiLimiter = createRateLimiter({ windowMs: 60000, max: 100, message: 'API rate limit exceeded. Please slow down.' });
const authLimiter = createRateLimiter({ windowMs: 60000, max: 10, message: 'Too many login attempts. Please wait a minute.' });
const reportLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Report submission rate limit exceeded.' });
const journeyLimiter = createRateLimiter({ windowMs: 60000, max: 15, message: 'Journey planning rate limit exceeded.' });

module.exports = { createRateLimiter, apiLimiter, authLimiter, reportLimiter, journeyLimiter };
