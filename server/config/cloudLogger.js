const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

/**
 * @module cloudLogger
 * @description Google Cloud Logging (Stackdriver) configuration.
 * Provides a unified logging interface that streams to both the console 
 * and Google Cloud when in production.
 */

const loggingWinston = new LoggingWinston();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'kyzen-api' },
  transports: [
    // Standard console transport for local development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Google Cloud Logging transport
    ...(process.env.NODE_ENV === 'production' ? [loggingWinston] : [])
  ],
});

module.exports = logger;
