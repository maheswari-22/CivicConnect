import { pool } from './database.js';
import { AREAS, DEFAULT_AREA } from '../config/areas.js';

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version');
    const applied = new Set(rows.map((row) => row.version));

    if (!applied.has(1)) {
      await client.query(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL CHECK (role IN ('citizen','authority','worker')),
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          mobile TEXT UNIQUE,
          username TEXT UNIQUE,
          employee_id TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          phone TEXT,
          area TEXT,
          worker_id TEXT UNIQUE,
          department TEXT,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE complaints (
          id TEXT PRIMARY KEY,
          citizen_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category TEXT NOT NULL CHECK (category IN ('road','light','garbage','water','other')),
          description TEXT NOT NULL,
          location TEXT NOT NULL,
          lat DOUBLE PRECISION,
          lng DOUBLE PRECISION,
          photo_url TEXT,
          status TEXT NOT NULL CHECK (status IN ('submitted','review','assigned','progress','resolved','rejected')),
          priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
          worker_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          assigned_at TIMESTAMPTZ,
          expected_by TIMESTAMPTZ,
          note TEXT,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE complaint_photos (
          id TEXT PRIMARY KEY,
          complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
          worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('progress','completion')),
          url TEXT NOT NULL,
          caption TEXT,
          created_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          complaint_id TEXT REFERENCES complaints(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL
        );

        CREATE INDEX idx_complaints_citizen ON complaints(citizen_id, created_at DESC);
        CREATE INDEX idx_complaints_worker ON complaints(worker_id, status, created_at DESC);
        CREATE INDEX idx_complaints_status ON complaints(status, created_at DESC);
        CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
        CREATE INDEX idx_photos_complaint ON complaint_photos(complaint_id, created_at ASC);
        CREATE INDEX idx_users_role_active ON users(role, active);
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [1]);
    }

    if (!applied.has(2)) {
      // Area routing: every complaint now belongs to one area, and only the authority
      // (and workers) of that area can see or handle it.
      const known = AREAS.map((a) => `'${a}'`).join(',');
      await client.query(`
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS area TEXT;
        UPDATE complaints c SET area = COALESCE(
          (SELECT u.area FROM users u WHERE u.id = c.citizen_id AND u.area IN (${known})),
          '${DEFAULT_AREA}'
        ) WHERE c.area IS NULL;
        ALTER TABLE complaints ALTER COLUMN area SET NOT NULL;
        UPDATE users SET area = '${DEFAULT_AREA}' WHERE role = 'authority' AND (area IS NULL OR area = '');
        CREATE INDEX IF NOT EXISTS idx_complaints_area ON complaints(area, status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_users_area ON users(role, area);
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [2]);
    }

    if (!applied.has(3)) {
      // Forgot-password: one-time reset links. Only a SHA-256 hash of each token is stored.
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id, created_at DESC);
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [3]);
    }

    if (!applied.has(4)) {
      // Session revocation, collision-free worker codes, and the reject / reopen / feedback flows.
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
        CREATE SEQUENCE IF NOT EXISTS worker_code_seq START 10001;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopen_reason TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopen_count INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5);
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS feedback TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [4]);
    }

    if (!applied.has(5)) {
      // Logout: a signed-out token is remembered here until it would have expired anyway.
      await client.query(`
        CREATE TABLE IF NOT EXISTS revoked_tokens (
          jti TEXT PRIMARY KEY,
          expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expiry ON revoked_tokens(expires_at);
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [5]);
    }

    if (!applied.has(6)) {
      // Worker approval, e-mail verification, single-use authority invites, and e-mail change / verification tokens.
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        -- Accounts that existed before this migration keep working exactly as before.
        UPDATE users SET email_verified = TRUE WHERE email IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_users_pending_workers ON users(area) WHERE role='worker' AND approved=FALSE;

        CREATE TABLE IF NOT EXISTS authority_invites (
          id TEXT PRIMARY KEY,
          code_hash TEXT NOT NULL UNIQUE,
          area TEXT NOT NULL,
          note TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          used_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS email_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          purpose TEXT NOT NULL CHECK (purpose IN ('verify','change')),
          new_email TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_complaints_citizen_created ON complaints(citizen_id, created_at DESC);
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [6]);
    }

    if (!applied.has(7)) {
      // Village / town name, photo fingerprint (blocks re-used photos), the photo check result, and the unassigned-reminder clock.
      await client.query(`
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS place TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS photo_hash TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_label TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_verdict TEXT NOT NULL DEFAULT 'unchecked' CHECK (ai_verdict IN ('match','uncertain','unchecked'));
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS unassigned_alerted_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_complaints_unassigned ON complaints(area, created_at) WHERE worker_id IS NULL AND status IN ('submitted','review');
        CREATE INDEX IF NOT EXISTS idx_complaints_photo_hash ON complaints(created_at DESC) WHERE photo_hash IS NOT NULL;
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [7]);
    }

    if (!applied.has(8)) {
      // AI severity estimate (0-100) from the photo, the citizen's emergency flag, and the escalation counters for overdue handling.
      await client.query(`
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_severity SMALLINT CHECK (ai_severity BETWEEN 0 AND 100);
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS emergency_reason TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalation_level SMALLINT NOT NULL DEFAULT 0;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS worker_alerted_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_complaints_emergency ON complaints(area, created_at) WHERE is_emergency = TRUE AND status NOT IN ('resolved','rejected');
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [8]);
    }

    if (!applied.has(9)) {
      // An officer can decide that an emergency flag was not justified. We keep a record (it limits repeat misuse) and the reason.
      await client.query(`
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS emergency_dismissed BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS emergency_dismiss_reason TEXT;
        ALTER TABLE complaints ADD COLUMN IF NOT EXISTS emergency_dismissed_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_complaints_emergency_history ON complaints(citizen_id, created_at) WHERE is_emergency = TRUE OR emergency_dismissed = TRUE;
      `);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [9]);
    }

    await client.query('COMMIT');
    console.log('PostgreSQL migrations are up to date.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  try {
    await migrate();
  } finally {
    await pool.end();
  }
}
