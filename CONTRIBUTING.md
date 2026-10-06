# Contributing Guidelines

## Development Workflow

1. **Strict TypeScript Discipline**:
   - Zero `any` where typed interfaces can be constructed.
   - Run `npm run lint` before committing.

2. **Zero Look-Ahead Bias**:
   - Every indicator or strategy calculation must strictly operate on closed historical bars.
   - Never access future candle data or leaking timestamps.

3. **Deterministic Financial Testing**:
   - When adding new financial metrics or risk checks, add unit tests to `src/services/tests/`.
   - Run `npm test` and verify that all tests pass without errors.

4. **Secret Protection**:
   - Never commit `.env` files or API credentials.
   - Verify that all external service keys are injected via server environment variables.
