/**
 * Configures and exports the Winston logger instance used across the application to provide coherent console and daily rotating file logs.
 */
import winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const splatArgs = info[Symbol.for('splat') as unknown as string] as unknown[];
    
    let metaString = '';
    
    // Check if there are unmerged primitive string arguments or explicit splat args
    if (splatArgs && splatArgs.length > 0) {
      metaString = ' ' + splatArgs.map(s => {
        if (typeof s === 'string') return s;
        if (s instanceof Error) return s.stack || s.message;
        return JSON.stringify(s, null, 2);
      }).join(' ');
    } else if (Object.keys(meta).length > 0) {
      // Fallback for metadata merged directly into info
      metaString = ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
  })
);

const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    dailyRotateFileTransport
  ]
});

export default logger;
