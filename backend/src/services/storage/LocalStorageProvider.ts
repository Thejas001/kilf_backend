import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { StorageProvider, UploadInput, UploadResult } from './StorageProvider';

const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

export class LocalStorageProvider implements StorageProvider {
  async upload({ buffer, originalName, folder }: UploadInput): Promise<UploadResult> {
    const dir = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(originalName) || '';
    const filename = `${randomUUID()}${ext}`;
    const key = `${folder}/${filename}`;
    const fullPath = path.join(UPLOAD_ROOT, key);

    await fs.promises.writeFile(fullPath, buffer);

    return { key, url: this.getUrl(key) };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    await fs.promises.rm(fullPath, { force: true });
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
