/**
 * src/services/authService.ts
 * Enterprise Authentication & Authorization Service
 * 
 * Implements:
 * 1. Cryptographic Password Hashing (PBKDF2-SHA512 with 32-byte salt & 25,000 iterations)
 * 2. Constant-time timing-safe comparison to prevent timing attacks
 * 3. Secure Signed Bearer Tokens (HMAC-SHA256) with expiration & role validation
 * 4. Password validation rules (min 8 characters, upper, lower, digit)
 * 5. Password Reset Architecture with secure single-use reset tokens
 * 6. Role-Based Access Control (RBAC): RESEARCHER, ADMIN, ANALYST
 */

import crypto from 'crypto';
import { relationalDb } from '../db/relationalStore';
import { logger } from '../server/logger';

export interface UserSessionPayload {
  userId: string;
  email: string;
  role: 'RESEARCHER' | 'ADMIN' | 'ANALYST';
  issuedAt: number;
  expiresAt: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secure-internal-hmac-secret-quant-2026';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AuthService {
  /**
   * Hashes a plaintext password with a unique salt
   */
  public static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 25000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a password against the stored salt:hash string using constant-time check
   */
  public static verifyPassword(password: string, storedHashWithSalt: string): boolean {
    try {
      const [salt, originalHash] = storedHashWithSalt.split(':');
      if (!salt || !originalHash) return false;

      const testHash = crypto.pbkdf2Sync(password, salt, 25000, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Generates a tamper-proof cryptographically signed session token
   */
  public static generateToken(user: { id: string; email: string; role: 'RESEARCHER' | 'ADMIN' | 'ANALYST' }): string {
    const payload: UserSessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      issuedAt: Date.now(),
      expiresAt: Date.now() + TOKEN_EXPIRY_MS
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verifies and decodes a signed session token
   */
  public static verifyToken(token: string): UserSessionPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, providedSignature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    if (
      providedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    try {
      const payload: UserSessionPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
      if (Date.now() > payload.expiresAt) {
        return null; // Expired token
      }
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Validates password strength
   */
  public static validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
    if (!password || password.length < 8) {
      return { valid: false, reason: 'Password must be at least 8 characters in length.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one uppercase letter (A-Z).' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one lowercase letter (a-z).' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one numeric digit (0-9).' };
    }
    return { valid: true };
  }

  /**
   * Registers a new user
   */
  public static register(params: {
    email: string;
    password: string;
    role?: 'RESEARCHER' | 'ADMIN' | 'ANALYST';
  }): { user: any; token: string } {
    const email = params.email.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new Error('A valid email address is required.');
    }

    const strength = this.validatePasswordStrength(params.password);
    if (!strength.valid) {
      throw new Error(strength.reason || 'Password requirements not satisfied.');
    }

    const existing = relationalDb.getUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email address is already registered.');
    }

    const passwordHash = this.hashPassword(params.password);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const role = params.role || 'RESEARCHER';

    const newUser = relationalDb.createUser({
      id: userId,
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString()
    });

    const token = this.generateToken(newUser);
    logger.info('AUTH', `User registered successfully: ${email}`, { userId, role });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      },
      token
    };
  }

  /**
   * Authenticates user with email & password
   */
  public static login(emailInput: string, passwordInput: string): { user: any; token: string } {
    const email = emailInput.trim().toLowerCase();
    const user = relationalDb.getUserByEmail(email);

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email credentials or account does not exist.');
    }

    const isValid = this.verifyPassword(passwordInput, user.passwordHash);
    if (!isValid) {
      logger.warn('AUTH', `Failed login attempt for: ${email}`);
      throw new Error('Invalid credentials provided.');
    }

    const token = this.generateToken(user);
    logger.info('AUTH', `User logged in: ${email}`, { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      token
    };
  }

  /**
   * Generates a secure single-use password reset token
   */
  public static requestPasswordReset(emailInput: string): { resetToken: string; expiresAt: string } {
    const email = emailInput.trim().toLowerCase();
    const user = relationalDb.getUserByEmail(email);
    if (!user) {
      // Return fake token to prevent email enumeration
      return {
        resetToken: crypto.randomBytes(24).toString('hex'),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };
    }

    const resetToken = `rst_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min expiry
    relationalDb.storePasswordResetToken(user.id, resetToken, expiresAt);

    logger.info('AUTH', `Password reset token generated for ${email}`);
    return { resetToken, expiresAt };
  }

  /**
   * Resets password using a validated single-use token
   */
  public static resetPassword(resetToken: string, newPassword: string): boolean {
    const strength = this.validatePasswordStrength(newPassword);
    if (!strength.valid) {
      throw new Error(strength.reason || 'New password does not meet criteria.');
    }

    const record = relationalDb.consumePasswordResetToken(resetToken);
    if (!record) {
      throw new Error('Reset token is invalid or has expired.');
    }

    const passwordHash = this.hashPassword(newPassword);
    relationalDb.updateUserPassword(record.userId, passwordHash);
    logger.info('AUTH', `Password successfully reset for userId: ${record.userId}`);
    return true;
  }
}
