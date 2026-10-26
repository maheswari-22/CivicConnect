// Makes a single-use invite code for ONE area. The authority types it on the sign-up page; it then stops working.
//   npm run authority:invite -- --area Visakhapatnam [--days 7] [--note "for Asha Rao"]
import { AREAS } from '../config/areas.js';
import { pool } from './database.js';
import { migrate } from './migrate.js';
import { createInvite } from '../services/invites.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
try {
  if (!AREAS.includes(args.area)) throw new Error(`--area must be one of: ${AREAS.join(', ')}`);
  const days = Number(args.days || 7);
  if (!Number.isFinite(days) || days < 1 || days > 90) throw new Error('--days must be between 1 and 90');
  await migrate();
  const invite = await createInvite({ area: args.area, days, note: args.note || null });
  console.log(`\nInvite code for ${invite.area} (single use, expires ${invite.expiresAt.toLocaleString()}):\n\n    ${invite.code}\n\nShown only once. Give it to the officer privately.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
