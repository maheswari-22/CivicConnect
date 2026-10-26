import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { AppError } from './http.js';

export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

/** `ver` is the user's token_version: bumping it in the database signs the user out everywhere. */
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, ver: user.token_version ?? 0 }, env.jwtSecret, { expiresIn: user.role === 'authority' ? env.jwtExpiresAuthority : env.jwtExpiresDefault, jwtid: crypto.randomUUID() });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Invalid or expired authentication token.');
  }
}
