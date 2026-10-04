/**
 * src/server/authMiddleware.ts
 * Express Authentication & Role-Based Authorization Middleware
 */

import { Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, sendSafeError } from './security';

/**
 * Parses Bearer token and attaches user payload to req.user if valid
 */
export function authenticateToken(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  const payload = AuthService.verifyToken(token);

  if (payload) {
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
  }

  next();
}

/**
 * Blocks request if user is not authenticated
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return sendSafeError(
      res,
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required to access this endpoint. Please provide a valid Bearer token.',
      null,
      req
    );
  }
  next();
}

/**
 * Enforces role-based permissions (e.g. ADMIN, RESEARCHER)
 */
export function requireRole(allowedRoles: Array<'RESEARCHER' | 'ADMIN' | 'ANALYST'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return sendSafeError(
        res,
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication required.',
        null,
        req
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendSafeError(
        res,
        403,
        'INSUFFICIENT_PERMISSIONS',
        `Access denied. Requires one of roles: ${allowedRoles.join(', ')}.`,
        null,
        req
      );
    }

    next();
  };
}
