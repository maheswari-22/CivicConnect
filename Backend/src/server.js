import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { AREAS } from './config/areas.js';
import { migrate } from './db/migrate.js';
import { pool } from './db/database.js';
import authRoutes from './routes/auth.js';
import citizenRoutes from './routes/citizen.js';
import { createGeoRouter } from './routes/geo.js';
import { requireAuth } from './middleware/auth.js';
import authorityRoutes from './routes/authority.js';
import workerRoutes from './routes/worker.js';
import { errorHandler, notFound } from './middleware/error.js';
import { AppError } from './utils/http.js';
import { hasValidUploadSignature } from './utils/signedUrl.js';
import { checkMailOnStartup } from './mail/mailer.js';
import { remindUnassigned, remindOverdueWork } from './services/complaints.js';

const app = express();
app.disable('x-powered-by');
// Only trust X-Forwarded-For when a real reverse proxy is in front (TRUST_PROXY=1). Otherwise anybody could fake their IP
// and escape the rate limits.
app.set('trust proxy', env.trustProxy);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigin.split(',').map((s) => s.trim()), credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// One-time email tokens (?token=) and photo-link signatures (?sig=) must not end up in access logs.
morgan.token('safe-url', (req) => String(req.originalUrl || req.url).replace(/([?&](?:token|sig|exp)=)[^&]*/gi, '$1[hidden]'));
app.use(morgan(env.nodeEnv === 'production'
  ? ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
  : ':method :safe-url :status :response-time ms - :res[content-length]'));
// API answers hold personal data (names, phones, complaints): never let a browser or proxy keep a copy on a shared computer.
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const uploadRoot = path.resolve(env.uploadDir);
fs.mkdirSync(uploadRoot, { recursive: true });

// Photos are served only with a valid signed link (see utils/signedUrl.js), never as a public folder.
app.get('/uploads/:name', (req, res, next) => {
  const name = path.basename(req.params.name);
  if (!hasValidUploadSignature(name, req.query.exp, req.query.sig)) {
    return next(new AppError(403, 'This photo link is invalid or has expired. Reload the page to get a fresh one.'));
  }
  // Uploaded files never change (every upload gets a new random name), and the link carries its own expiry.
  const secondsLeft = Math.max(0, Math.floor(Number(req.query.exp) - Date.now() / 1000));
  res.set('Cache-Control', `private, max-age=${Math.min(secondsLeft, 86400)}, immutable`);
  res.sendFile(path.join(uploadRoot, name), { etag: true, lastModified: true }, (error) => error && !res.headersSent && next(new AppError(404, 'Photo not found.')));
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter, authRoutes);
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many requests. Please slow down.' } });
const geoLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many location lookups. Please wait a moment.' } });
app.use('/api/geo', requireAuth, geoLimiter, createGeoRouter());
app.use('/api/citizen', apiLimiter, citizenRoutes);
app.use('/api/authority', apiLimiter, authorityRoutes);
app.use('/api/worker', apiLimiter, workerRoutes);

app.get('/api/areas', (_req, res) => res.json({ ok: true, data: { areas: AREAS } }));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, data: { service: 'civicconnect-api', database: 'postgresql', status: 'healthy', time: new Date().toISOString() } }),
);

app.use(notFound);
app.use(errorHandler);

await migrate();
const server = app.listen(env.port, () => {
  console.log(`CivicConnect API listening on http://localhost:${env.port}`);
  void checkMailOnStartup();
});

// Reminds authorities about complaints that still have no worker (see remindUnassigned). Runs on a timer, not per request.
let reminderTimer = null;
if (env.nodeEnv !== 'test' && env.reminderCheckMinutes > 0) {
  const tick = async () => {
    try {
      const n = await remindUnassigned();
      if (n) console.log(`[reminders] ${n} unassigned complaint(s) reminded`);
      const late = await remindOverdueWork();
      if (late) console.log(`[reminders] ${late} overdue task(s) reminded`);
    } catch (error) {
      console.error('[reminders] failed:', error.message);
    }
  };
  setTimeout(tick, 20_000).unref();
  reminderTimer = setInterval(tick, env.reminderCheckMinutes * 60_000);
  reminderTimer.unref();
}

const shutdown = async () => {
  clearInterval(reminderTimer);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
