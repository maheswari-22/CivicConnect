import { pool } from './database.js';

try {
  const result = await pool.query('SELECT current_database() AS database, current_user AS user, version() AS version');
  console.log('PostgreSQL connection OK');
  console.log(`Database: ${result.rows[0].database}`);
  console.log(`User: ${result.rows[0].user}`);
} catch (error) {
  console.error('PostgreSQL connection failed. Check DATABASE_URL, PostgreSQL service, username/password, and port 5432.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
