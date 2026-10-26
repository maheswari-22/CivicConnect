export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }
}

export const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });
export const fail = (res, status, message, details) => res.status(status).json({ ok: false, error: message, ...(details ? { details } : {}) });

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
