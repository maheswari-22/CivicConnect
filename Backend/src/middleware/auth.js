import { verifyToken } from '../utils/auth.js';
import { AppError } from '../utils/http.js';
import { query } from '../db/database.js';

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next(new AppError(401, 'Authentication required.'));
  try {
    const payload = verifyToken(header.slice(7));
    // One round trip: the account and whether this token was signed out.
    const { rows } = await query(
      'SELECT u.*, EXISTS(SELECT 1 FROM revoked_tokens r WHERE r.jti=$2) AS token_revoked FROM users u WHERE u.id=$1',
      [payload.sub, payload.jti ?? ''],
    );
    const user = rows[0];
    if (!user || !user.active) throw new AppError(401, 'Account is not active.');
    if ((payload.ver ?? 0) !== user.token_version) throw new AppError(401, 'Session expired. Please sign in again.');
    if (payload.jti && user.token_revoked) throw new AppError(401, 'You have been signed out. Please sign in again.');
    if (user.role === 'worker' && user.approved === false) throw new AppError(403, 'Your worker account is waiting for approval.');
    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError' || error?.name === 'NotBeforeError') return next(new AppError(401, 'Session expired. Please sign in again.'));
    next(error);
  }
}

export const allowRoles = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) return next(new AppError(403, 'You do not have permission to perform this action.'));
  next();
};
