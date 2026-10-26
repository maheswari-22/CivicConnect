import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';
import { averageHash } from '../utils/photoHash.js';

const uploadRoot = path.resolve(env.uploadDir);
fs.mkdirSync(uploadRoot, { recursive: true });

/* The file extension comes from the verified type, never from the client's file name,
   so a file called "x.html" can never end up being served as a web page. */
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXTENSIONS[file.mimetype] || '.bin'}`),
});

const multerInstance = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1, fields: 20, fieldSize: 64 * 1024 },
  fileFilter: (_req, file, cb) =>
    EXTENSIONS[file.mimetype]
      ? cb(null, true)
      : cb(new AppError(415, 'Unsupported photo type. Please upload a JPG, PNG or WebP image.')),
});

/** Looks at the first bytes of the saved file to confirm it really is the image type it claims to be. */
function looksLikeImage(filePath, mimetype) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 12, 0);
    if (mimetype === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (mimetype === 'image/png') return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === 'image/webp') return head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP';
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

/** Total size of the upload folder, cached for a short time so a busy server does not scan the disk on every request. */
let sizeCache = { at: 0, bytes: 0 };
async function uploadFolderBytes() {
  if (Date.now() - sizeCache.at < 30000) return sizeCache.bytes;
  let bytes = 0;
  for (const name of await fs.promises.readdir(uploadRoot)) {
    try { bytes += (await fs.promises.stat(path.join(uploadRoot, name))).size; } catch { /* removed meanwhile */ }
  }
  sizeCache = { at: Date.now(), bytes };
  return bytes;
}

/** Re-encodes the photo. This (1) proves it really decodes as an image, (2) removes EXIF data such as the GPS position
    of whoever took the photo, and (3) shrinks huge camera photos so the disk lasts longer. */
async function cleanImage(filePath, mimetype) {
  const temp = `${filePath}.clean`;
  let pipeline = sharp(filePath, { limitInputPixels: 50_000_000, failOn: 'error' })
    .rotate() // apply the camera's orientation first, because the orientation tag is removed with the rest of the metadata
    .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true });
  if (mimetype === 'image/jpeg') pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
  else if (mimetype === 'image/png') pipeline = pipeline.png({ compressionLevel: 9 });
  else pipeline = pipeline.webp({ quality: 85 });
  try {
    await pipeline.toFile(temp);
    await fs.promises.rename(temp, filePath);
  } catch (error) {
    try { await fs.promises.unlink(temp); } catch { /* nothing to remove */ }
    throw error;
  }
}

/** Deletes an uploaded file (by multer file object, or by its "/uploads/name" URL). Never throws. */
export async function discardUpload(fileOrUrl) {
  const name = typeof fileOrUrl === 'string' ? path.basename(fileOrUrl) : fileOrUrl?.filename;
  if (!name) return;
  try { await fs.promises.unlink(path.join(uploadRoot, path.basename(name))); } catch { /* already gone */ }
}

/** Accepts one optional image in the given form field; rejects anything that is not a real JPG / PNG / WebP. */
export const photoUpload = (field = 'photo') => async (req, res, next) => {
  try {
    if ((await uploadFolderBytes()) > env.maxUploadDirMb * 1024 * 1024)
      return next(new AppError(503, 'Photo storage is full right now. Please try again later or contact the administrator.'));
  } catch { /* if the folder cannot be measured, do not block uploads */ }
  multerInstance.single(field)(req, res, async (error) => {
    if (error) return next(error);
    if (req.file && !looksLikeImage(req.file.path, req.file.mimetype)) {
      await discardUpload(req.file);
      req.file = undefined;
      return next(new AppError(415, 'That file is not a valid image. Please upload a JPG, PNG or WebP photo.'));
    }
    if (req.file) {
      try {
        await cleanImage(req.file.path, req.file.mimetype);
        req.file.hash = await averageHash(req.file.path); // used to spot a photo that was already reported
        sizeCache.at = 0;
      } catch {
        await discardUpload(req.file);
        req.file = undefined;
        return next(new AppError(415, 'That photo could not be read. Please try a different JPG, PNG or WebP image.'));
      }
    }
    next();
  });
};

/** Wraps a route handler so that the uploaded photo is deleted again if the request then fails. */
export const discardOnError = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    await discardUpload(req.file);
    next(error);
  }
};
