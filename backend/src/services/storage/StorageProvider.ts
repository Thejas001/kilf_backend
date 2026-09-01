export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  /** Logical folder, e.g. "sponsors" or "festivals" */
  folder: string;
}

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Abstraction over file storage so the concrete backend (local disk today,
 * S3/Cloudinary/etc. later) can change without touching callers.
 */
export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}
