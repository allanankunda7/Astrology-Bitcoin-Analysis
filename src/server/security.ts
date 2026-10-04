/**
 * src/server/security.ts
 * Enterprise Security Suite: Security Headers, CORS, Rate Limiting & Safe Error Handling
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from './logger';

export interface AuthenticatedRequest extends Request {
  id?: string;
  user?: {
    id: string;
    email: string;
    role: 'RESEARCHER' | 'ADMIN' | 'ANALYST';
  };
  startTime?: number;
}

/**
 * 1. Request ID & Observability Tracing Middleware
 */
export function requestIdMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', reqId);

  res.on('finish', () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;

    if (statusCode >= 500) {
      logger.error('HTTP', `${req.method} ${req.originalUrl} - ${statusCode}`, {
        requestId: req.id,
        durationMs,
        statusCode,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip
      });
    } else if (statusCode >= 400) {
      logger.warn('HTTP', `${req.method} ${req.originalUrl} - ${statusCode}`, {
        requestId: req.id,
        durationMs,
        statusCode,
        method: req.method,
        path: req.originalUrl
      });
    } else if (req.originalUrl.startsWith('/api/')) {
      logger.debug('HTTP', `${req.method} ${req.originalUrl} - ${statusCode}`, {
        requestId: req.id,
        durationMs,
        statusCode
      });
    }
  });

  next();
}

/**
 * 2. Hardened Security Headers Middleware (Helmet Equivalent)
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

/**
 * 3. Strict CORS Middleware
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowedOrigins = [
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000'
  ].filter(Boolean) as string[];

  const origin = req.headers.origin;

  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

/**
 * 4. In-Memory Sliding-Window Rate Limiter
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(maxRequests: number, windowMs: number, limiterName: string) {
  const buckets = new Map<string, RateLimitBucket>();

  // Periodically clean expired buckets every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${limiterName}:${req.user?.id || ip}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 1, resetAt: now + windowMs };
      buckets.set(key, bucket);
    } else {
      bucket.count++;
    }

    const remaining = Math.max(0, maxRequests - bucket.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > maxRequests) {
      logger.warn('RATE_LIMIT', `Rate limit exceeded on ${limiterName}`, {
        ip,
        userId: req.user?.id,
        path: req.originalUrl,
        requestId: req.id
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests to ${limiterName}. Please slow down and try again in ${Math.ceil((bucket.resetAt - now) / 1000)} seconds.`,
          requestId: req.id
        }
      });
      return;
    }

    next();
  };
}

/**
 * 5. Centralized Structured Error Formatter (Never exposes internal stack traces or paths)
 */
export function sendSafeError(
  res: Response,
  statusCode: number,
  errorCode: string,
  safeMessage: string,
  internalError?: any,
  req?: AuthenticatedRequest
): void {
  if (internalError) {
    logger.error('API_ERROR', safeMessage, {
      requestId: req?.id,
      errorCode,
      statusCode,
      rawError: internalError.message || String(internalError),
      stack: process.env.NODE_ENV !== 'production' ? internalError.stack : undefined
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: safeMessage,
      requestId: req?.id || undefined
    }
  });
}
