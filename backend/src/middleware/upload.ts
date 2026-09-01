import multer from 'multer';
import { env } from '../config/env';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported file type. Only PNG, JPEG, WEBP and SVG images are allowed.'));
      return;
    }
    cb(null, true);
  },
});
