// Prints a strong random JWT_SECRET:  npm run gen:secret
import crypto from 'node:crypto';
console.log(crypto.randomBytes(48).toString('hex'));
