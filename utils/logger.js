const mongoose = require('mongoose');

const logLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta
    });
  }

  error(message, meta = {}) {
    console.error(this.formatMessage(logLevels.ERROR, message, meta));
    this.saveLog(logLevels.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    console.warn(this.formatMessage(logLevels.WARN, message, meta));
  }

  info(message, meta = {}) {
    console.log(this.formatMessage(logLevels.INFO, message, meta));
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(logLevels.DEBUG, message, meta));
    }
  }

  async saveLog(level, message, meta) {
    try {
      if (process.env.NODE_ENV === 'production') {
        console.log('Saving log to database...');
      }
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  }
}

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    };

    if (res.statusCode >= 500) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'request',
        ...log
      }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        type: 'request',
        ...log
      }));
    } else {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'request',
        ...log
      }));
    }
  });

  next();
};

class PerformanceMonitor {
  static async measure(name, fn) {
    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1000000;

      if (durationMs > 1000) {
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          type: 'performance',
          operation: name,
          duration: `${durationMs.toFixed(2)}ms`,
          slow: true
        }));
      }

      return { result, durationMs };
    } catch (error) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1000000;
      throw { error, durationMs };
    }
  }

  static getSystemMetrics() {
    const memUsage = process.memoryUsage();
    return {
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`
      },
      uptime: process.uptime(),
      nodeVersion: process.version
    };
  }
}

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.resetTimeout;
      }
      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt
    };
  }
}

const createLogger = (context) => new Logger(context);

module.exports = {
  Logger,
  createLogger,
  requestLogger,
  PerformanceMonitor,
  CircuitBreaker,
  logLevels
};
