# Security Policy & Hardening Guide

## Threat Model & Security Posture

The Astrology-Bitcoin-Analysis platform processes sensitive market intelligence and simulated capital allocations. It adheres strictly to zero-trust principles:

1. **Secret & Key Isolation**
   - No API keys, credentials, private keys, or passwords ever appear in frontend bundles, browser `localStorage`, or git history.
   - All external API calls (Gemini AI, Market Data) are proxied exclusively through server-side endpoints.
   - `.env.example` contains variable names only with no credentials.

2. **Authentication & Password Storage**
   - Passwords hashed using **PBKDF2-SHA512** with a 16-byte cryptographically secure random salt and 25,000 iterations.
   - Password validation requires minimum 8 characters, uppercase, lowercase, and numeric digits.
   - Session tokens generated using **HMAC-SHA256** signed payloads with explicit expiration and constant-time signature verification (`crypto.timingSafeEqual`).
   - Single-use, expiring password reset tokens preventing token reuse attacks.

3. **Role-Based Access Control (RBAC)**
   - `RESEARCHER`: Strategy creation, backtesting, paper order execution, replay sessions.
   - `ANALYST`: Read-only market structure, technical indicators, and report inspection.
   - `ADMIN`: Database backups, restores, audit log review, and system configuration.
   - Backend enforces tenant isolation: users can only inspect their own orders, strategies, and portfolio records.

4. **HTTP Security & API Hardening**
   - **X-Content-Type-Options**: `nosniff`
   - **X-Frame-Options**: `SAMEORIGIN`
   - **X-XSS-Protection**: `1; mode=block`
   - **Referrer-Policy**: `strict-origin-when-cross-origin`
   - **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload`
   - **CORS**: Explicit origin whitelisting (`APP_URL`, localhost development origins). Wildcards (`*`) are disallowed.

5. **Rate Limiting**
   - IP and user-based token bucket limiters:
     - `/api/auth/*`: 20 requests per minute
     - `/api/chat`: 30 requests per minute
     - `/api/backtest` & `/api/walk-forward`: 35 requests per minute
     - General API routes: 180 requests per minute

6. **Structured Error Handling & Sanitization**
   - Centralized error handlers catch all exceptions and return sanitized JSON responses (`{ error: { code, message, requestId } }`).
   - Internal file paths, database queries, and stack traces are suppressed in production.
   - Logger automatically redacts sensitive dictionary keys (`password`, `token`, `secret`, `apiKey`).

7. **Vulnerability Reporting**
   - Report security advisories to: `allanankunda7@gmail.com`.
