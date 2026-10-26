// Creates an Authority account without the public sign-up form.
//   npm run authority:create -- --employee-id AUTH-010 --name "Asha Rao" --email asha@city.gov.in --phone +919800000000 --area Visakhapatnam
// A random password is printed once if --password is not given. Use this in production and leave
// AUTHORITY_INVITE_CODE empty in Backend/.env so nobody can create an authority account themselves.
import crypto from 'node:crypto';
import { AREAS } from '../config/areas.js';
import { pool } from './database.js';
import { migrate } from './migrate.js';
import { registerUser } from '../services/users.js';
import { authorityRegisterSchema } from '../utils/validation.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const generated = !args.password;
// A random password that always satisfies the password rules (upper + lower case, a digit and a symbol).
const pick = (set) => set[crypto.randomInt(set.length)];
function strongPassword() {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnopqrstuvwxyz', D = '23456789', S = '@#$%&*!?';
  const chars = [pick(U), pick(L), pick(D), pick(S), ...Array.from({ length: 12 }, () => pick(U + L + D + S))];
  for (let i = chars.length - 1; i > 0; i -= 1) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}
const password = args.password || strongPassword();

try {
  const input = authorityRegisterSchema.parse({
    name: args.name,
    employeeId: args['employee-id'],
    email: args.email,
    phone: args.phone,
    area: args.area,
    password,
  });
  await migrate();
  const user = await registerUser({ role: 'authority', ...input, trusted: true });
  console.log(`Created authority ${user.employee_id} (${user.name}) for ${user.area}.`);
  if (generated) console.log(`Temporary password (shown once): ${password}`);
} catch (error) {
  console.error(error?.issues ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n') : error.message);
  console.error(`\nRequired: --employee-id --name --email --area (one of: ${AREAS.join(', ')}). --email. Optional: --phone --password`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
