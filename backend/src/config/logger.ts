import pino from 'pino';
import { config } from './env';

// Define log levels based on environment
const logLevel = config.NODE_ENV === 'production' ? 'info' : 'debug';

// Create pretty transport for development
const prettyTransport = 
  config.NODE_ENV !== 'production' 
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {};

// Configure the logger
export const logger = pino({
  level: logLevel,
  ...prettyTransport,
  base: {
    env: config.NODE_ENV,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password'],
    censor: '[REDACTED]',
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

// Export instance for use throughout the application
export default logger;