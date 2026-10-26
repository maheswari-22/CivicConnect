// Creates Backend/.env (and ../F11/.env) from the .env.example files if they do not exist yet:  npm run setup:env
// It generates a fresh random JWT_SECRET and a random DEVELOPMENT-ONLY shared authority invite code (printed once, never a public default).
// An existing .env is never touched.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const make = (dir, tweak = (t) => t) => {
  const target = path.join(dir, '.env');
  const example = path.join(dir, '.env.example');
  if (fs.existsSync(target)) return console.log(`${path.relative(process.cwd(), target) || '.env'} already exists - left unchanged.`);
  if (!fs.existsSync(example)) return console.log(`No ${example}, skipped.`);
  fs.writeFileSync(target, tweak(fs.readFileSync(example, 'utf8')));
  console.log(`Created ${path.relative(process.cwd(), target) || '.env'}`);
};
// A code that is the same in every copy of the project would let anybody who finds a dev server register as an officer.
const inviteCode = `CIVIC-DEV-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const hadEnv = fs.existsSync(path.join(backend, '.env'));
make(backend, (t) => t
  .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`)
  .replace(/^AUTHORITY_INVITE_CODE=.*$/m, `AUTHORITY_INVITE_CODE=${inviteCode}`));
if (!hadEnv) console.log(`Development authority sign-up code (saved in Backend/.env as AUTHORITY_INVITE_CODE): ${inviteCode}`);
make(path.resolve(backend, '..', 'F11'));
