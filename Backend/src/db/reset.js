import { query, pool } from './database.js';
import { env } from '../config/env.js';

// Wipes EVERY table. Refuses to run in production, and asks you to confirm anywhere else.
//   npm run reset -- --yes
if (env.nodeEnv === 'production') {
  console.error('Refusing to reset the database while NODE_ENV=production.');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This deletes ALL data in the database. Run it again with --yes if you really mean it:  npm run reset -- --yes');
  process.exit(1);
}
await query('DROP TABLE IF EXISTS email_tokens, authority_invites, revoked_tokens, password_resets, notifications, complaint_photos, complaints, users, schema_migrations CASCADE');
await query('DROP SEQUENCE IF EXISTS worker_code_seq');
console.log('PostgreSQL schema reset. Run npm run migrate then npm run seed.');
await pool.end();
