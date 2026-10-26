import { ZodError } from 'zod';
import multer from 'multer';
import { AppError, fail } from '../utils/http.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, _next) {
  if (error instanceof ZodError)
    return fail(res, 400, 'Validation failed.', error.issues.map(i => ({ path: i.path, message: i.message })));
  if (error?.type === 'entity.parse.failed')
    return fail(res, 400, 'The request body is not valid JSON.');
  if (error?.type === 'entity.too.large')
    return fail(res, 413, 'The request is too large.');
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE')
      return fail(res, 413, `That photo is too large. The limit is ${env.maxUploadMb} MB.`);
    if (error.code === 'LIMIT_UNEXPECTED_FILE')
      return fail(res, 400, 'Unexpected file field. Upload the image in the "photo" field.');
    return fail(res, 400, 'The upload could not be processed. Please try again.');
  }
  if (error?.code === '23505')
    return fail(res, 409, 'A record with those unique details already exists.');
  if (error?.code === '23503')
    return fail(res, 400, 'Referenced record does not exist.');
  const status = error.status || 500;
  if (status >= 500)
    console.error(error);
  return fail(res, status, status >= 500 ? 'Internal server error.' : error.message, error.details);
}
