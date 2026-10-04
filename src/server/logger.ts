/**
 * src/server/logger.ts
 * Production Structured JSON Logger with Sensitive Data Redaction
 * 
 * Features:
 * - RFC 5424 severity levels: DEBUG, INFO, WARN, ERROR, CRITICAL
 * - Strict automatic redaction of sensitive credentials (passwords, api keys, jwt tokens, cookies)
 * - Traceable metadata: requestId, userId, service, durationMs, timestamp
 * - Rolling memory buffer for real-time observability dashboards
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  requestId?: string;
  userId?: string;
  durationMs?: number;
  errorCode?: string;
  meta?: Record<string, any>;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'jwt',
  'secret',
  'apikey',
  'api_key',
  'gemini_api_key',
  'authorization',
  'cookie',
  'privatekey',
  'private_key'
]);

function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Mask potential JWT tokens or bearer tokens
    if (obj.startsWith('Bearer ') || obj.split('.').length === 3) {
      return '[REDACTED_TOKEN]';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_]/g, ''))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return sanitized;
  }
  return obj;
}

class StructuredLogger {
  private recentLogs: StructuredLogEntry[] = [];
  private maxStoredLogs = 500;
  private currentMinLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';

  private levelValues: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    CRITICAL: 50
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelValues[level] >= (this.levelValues[this.currentMinLevel] || 20);
  }

  private write(level: LogLevel, service: string, message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      requestId: meta?.requestId,
      userId: meta?.userId,
      durationMs: meta?.durationMs,
      errorCode: meta?.errorCode,
      meta: meta ? redactSensitiveData(meta) : undefined
    };

    // Store in circular buffer for admin monitoring
    this.recentLogs.push(entry);
    if (this.recentLogs.length > this.maxStoredLogs) {
      this.recentLogs.shift();
    }

    const jsonOutput = JSON.stringify(entry);
    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(jsonOutput);
    } else if (level === 'WARN') {
      console.warn(jsonOutput);
    } else {
      console.log(jsonOutput);
    }
  }

  public debug(service: string, message: string, meta?: Record<string, any>): void {
    this.write('DEBUG', service, message, meta);
  }

  public info(service: string, message: string, meta?: Record<string, any>): void {
    this.write('INFO', service, message, meta);
  }

  public warn(service: string, message: string, meta?: Record<string, any>): void {
    this.write('WARN', service, message, meta);
  }

  public error(service: string, message: string, meta?: Record<string, any>): void {
    this.write('ERROR', service, message, meta);
  }

  public critical(service: string, message: string, meta?: Record<string, any>): void {
    this.write('CRITICAL', service, message, meta);
  }

  public getRecentLogs(limit = 100): StructuredLogEntry[] {
    return this.recentLogs.slice(-limit);
  }

  public getErrorCount(): number {
    return this.recentLogs.filter((l) => l.level === 'ERROR' || l.level === 'CRITICAL').length;
  }
}

export const logger = new StructuredLogger();
