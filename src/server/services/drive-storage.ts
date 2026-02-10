/**
 * BakedBot Drive Storage Service
 *
 * Handles uploading and managing files in Firebase Storage for BakedBot Drive.
 * Files are organized by user and category.
 */

import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/lib/logger';
import {
  type DriveCategory,
  DRIVE_CATEGORIES,
  sanitizeFilename,
} from '@/types/drive';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface DriveUploadOptions {
  userId: string;
  userEmail: string;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
  category: DriveCategory;
  folderId?: string | null;
  description?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface DriveUploadResult {
  success: boolean;
  storagePath?: string;
  downloadUrl?: string;
  error?: string;
}

export interface DriveCopyResult {
  success: boolean;
  newStoragePath?: string;
  newDownloadUrl?: string;
  error?: string;
}

// ============================================================================
// DRIVE STORAGE SERVICE CLASS
// ============================================================================

export class DriveStorageService {
  private storage: ReturnType<typeof getStorage>;
  private bucketName: string;

  constructor() {
    this.storage = getStorage();
    this.bucketName =
      process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';
  }

  /**
   * Upload a file to Drive storage
   */
  async uploadFile(options: DriveUploadOptions): Promise<DriveUploadResult> {
    try {
      const { userId, userEmail, file, category, folderId, description, tags, metadata } = options;

      // Validate file type
      const typeValidation = this.validateFileType(file.mimeType, category);
      if (!typeValidation.valid) {
        return { success: false, error: typeValidation.error };
      }

      // Validate file size
      const sizeValidation = this.validateFileSize(file.size, category);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }

      // Generate storage path
      const storagePath = this.generateStoragePath(userId, category, file.originalName, folderId);

      // Get bucket
      const bucket = this.storage.bucket(this.bucketName);

      // Create file reference
      const fileRef = bucket.file(storagePath);

      // Upload file with metadata
      await fileRef.save(file.buffer, {
        contentType: file.mimeType,
        metadata: {
          metadata: {
            ...metadata,
            userId,
            userEmail,
            category,
            folderId: folderId || '',
            originalName: file.originalName,
            description: description || '',
            tags: JSON.stringify(tags || []),
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Generate signed URL (long expiry for internal use)
      const [downloadUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Far future date
      });

      logger.info('Drive file uploaded successfully', {
        userId,
        storagePath,
        category,
        size: file.size,
      });

      return {
        success: true,
        storagePath,
        downloadUrl,
      };
    } catch (error) {
      logger.error('Failed to upload drive file', { error, options: { ...options, file: { ...options.file, buffer: '[BUFFER]' } } });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(storagePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(storagePath).delete();

      logger.info('Drive file deleted successfully', { storagePath });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete drive file', { error, storagePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(
    sourceStoragePath: string,
    destUserId: string,
    destCategory: DriveCategory,
    newFilename: string,
    destFolderId?: string | null
  ): Promise<DriveCopyResult> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const sourceFile = bucket.file(sourceStoragePath);

      // Generate new storage path
      const newStoragePath = this.generateStoragePath(
        destUserId,
        destCategory,
        newFilename,
        destFolderId
      );

      const destFile = bucket.file(newStoragePath);

      // Copy file
      await sourceFile.copy(destFile);

      // Generate signed URL
      const [downloadUrl] = await destFile.getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
      });

      logger.info('Drive file copied successfully', {
        sourceStoragePath,
        newStoragePath,
      });

      return {
        success: true,
        newStoragePath,
        newDownloadUrl: downloadUrl,
      };
    } catch (error) {
      logger.error('Failed to copy drive file', { error, sourceStoragePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Copy failed',
      };
    }
  }

  /**
   * Move a file (copy + delete)
   */
  async moveFile(
    sourceStoragePath: string,
    destUserId: string,
    destCategory: DriveCategory,
    newFilename: string,
    destFolderId?: string | null
  ): Promise<DriveCopyResult> {
    const copyResult = await this.copyFile(
      sourceStoragePath,
      destUserId,
      destCategory,
      newFilename,
      destFolderId
    );

    if (copyResult.success) {
      await this.deleteFile(sourceStoragePath);
    }

    return copyResult;
  }

  /**
   * Generate a new signed URL for a file
   */
  async generateSignedUrl(
    storagePath: string,
    expiresInHours: number = 24
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(storagePath);

      const expires = new Date();
      expires.setHours(expires.getHours() + expiresInHours);

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires,
      });

      return { success: true, url };
    } catch (error) {
      logger.error('Failed to generate signed URL', { error, storagePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate URL',
      };
    }
  }

  /**
   * Get file metadata from storage
   */
  async getFileMetadata(storagePath: string): Promise<{
    success: boolean;
    metadata?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [metadata] = await bucket.file(storagePath).getMetadata();

      return {
        success: true,
        metadata: {
          size: metadata.size,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
          ...metadata.metadata,
        },
      };
    } catch (error) {
      logger.error('Failed to get file metadata', { error, storagePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metadata',
      };
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [exists] = await bucket.file(storagePath).exists();
      return exists;
    } catch {
      return false;
    }
  }

  /**
   * Get file content as buffer (for downloads)
   */
  async downloadFile(storagePath: string): Promise<{
    success: boolean;
    buffer?: Buffer;
    contentType?: string;
    error?: string;
  }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(storagePath);

      const [buffer] = await file.download();
      const [metadata] = await file.getMetadata();

      return {
        success: true,
        buffer,
        contentType: metadata.contentType,
      };
    } catch (error) {
      logger.error('Failed to download file', { error, storagePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Upload file from URL
   */
  async uploadFromUrl(
    url: string,
    options: Omit<DriveUploadOptions, 'file'>
  ): Promise<DriveUploadResult> {
    try {
      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        return { success: false, error: `Failed to fetch URL: ${response.status}` };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      // Extract filename from URL or content-disposition
      let filename = 'downloaded-file';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1];
      } else {
        // Try to get from URL path
        const urlPath = new URL(url).pathname;
        const pathFilename = urlPath.split('/').pop();
        if (pathFilename && pathFilename.includes('.')) {
          filename = pathFilename;
        }
      }

      return this.uploadFile({
        ...options,
        file: {
          buffer,
          originalName: filename,
          mimeType: contentType,
          size: buffer.length,
        },
      });
    } catch (error) {
      logger.error('Failed to upload from URL', { error, url });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload from URL failed',
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate storage path for a drive file
   */
  private generateStoragePath(
    userId: string,
    category: DriveCategory,
    filename: string,
    folderId?: string | null
  ): string {
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(filename);
    const folderPart = folderId ? `custom/${folderId}` : category;
    return `drive/${userId}/${folderPart}/${timestamp}_${sanitized}`;
  }

  /**
   * Validate file type against category
   */
  private validateFileType(
    mimeType: string,
    category: DriveCategory
  ): { valid: boolean; error?: string } {
    const config = DRIVE_CATEGORIES[category];
    if (!config.mimeTypes) {
      // No restrictions for this category
      return { valid: true };
    }

    // Check for wildcard matches (e.g., "image/*")
    const isValid = config.mimeTypes.some((allowed) => {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -2);
        return mimeType.startsWith(prefix);
      }
      return allowed === mimeType;
    });

    if (!isValid) {
      return {
        valid: false,
        error: `Invalid file type for ${config.label}. Allowed: ${config.mimeTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate file size against category limit
   */
  private validateFileSize(
    size: number,
    category: DriveCategory
  ): { valid: boolean; error?: string } {
    const config = DRIVE_CATEGORIES[category];
    const maxSize = config.maxFileSize || 100 * 1024 * 1024; // Default 100MB

    if (size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return {
        valid: false,
        error: `File too large. Maximum size for ${config.label}: ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let serviceInstance: DriveStorageService | null = null;

export function getDriveStorageService(): DriveStorageService {
  if (!serviceInstance) {
    serviceInstance = new DriveStorageService();
  }
  return serviceInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a secure share token
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a password for share protection
 */
export async function hashSharePassword(password: string): Promise<string> {
  // Using crypto instead of bcrypt for edge compatibility
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against hash
 */
export async function verifySharePassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return hash === verifyHash;
  } catch {
    return false;
  }
}
