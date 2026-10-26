import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;
export const pool = new Pool({ connectionString: env.databaseUrl, max: env.dbPoolMax, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error', err));

export async function query(text, params = []) { return pool.query(text, params); }
export async function withTransaction(fn) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
