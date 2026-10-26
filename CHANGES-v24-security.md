# CivicConnect v24 – security review

Backend
- `config/env.js`: weak / missing / placeholder `JWT_SECRET` -> random per-run secret (dev) or refusal to start (production); production also refuses `CORS_ORIGIN=*` and non-https `APP_URL`/`API_URL`; new `LOGIN_MAX_FAILURES`, `LOGIN_LOCK_MINUTES`.
- `services/loginThrottle.js` (new) + `routes/auth.js`: per-account wrong-password limit.
- `server.js`: access logs hide `token` / `sig` / `exp` query values; `Cache-Control: no-store` on `/api`.
- `middleware/error.js`: no parser internals in 400/413 answers.
- `services/complaints.js` + `routes/worker.js`: `redactForWorker` removes the citizen's email, mobile and account id from worker responses.
- `utils/validation.js`: profile name uses the sign-up name rule.
- `db/setup-env.js`: random dev invite code instead of the public `CIVIC-AUTH-2026`.
- Tests: `tests/loginThrottle.test.js` (new, unit), one new integration test (no-store + worker privacy); the authority sign-up test follows the random dev code.

Frontend
- `csp.js` + `vite.config.js`: Content-Security-Policy `<meta>` in production builds (`VITE_CSP=off` to disable); `tests/csp.test.js`.
- `deploy/*`: `*.hf.co` added so the AI model can download under the policy.
- `eslint.config.js`: Node globals for `vite.config.js`.

Docs: `SECURITY.md` (v24 section), `README.md` (invite code), `Backend/.env.example`.

Checked offline: syntax of every changed file; throttle, secret and production-check logic and the CSP builder were run (8 tests pass).
Not run (no network / database here): the full API test suite, `npm run build`, `npm audit`. Please run `npm test` (API running) and `npm run build && npm run preview` once and open each portal and the photo check.
