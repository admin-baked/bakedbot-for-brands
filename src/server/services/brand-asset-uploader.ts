/**
 * Brand Asset Uploader Service
 *
 * Handles uploading and managing brand assets (logos, images, fonts, etc.)
 * to Firebase Storage with proper organization and access control.
 */

import { getStorage } from 'firebase-admin/storage';
import type { BrandAsset } from '@/types/brand-guide';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadOptions {
  brandId: string;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
  category: 'logo' | 'image' | 'video' | 'template' | 'document' | 'font';
  tags?: string[];
  metadata?: Record<string, string>;
  makePublic?: boolean;
}

export interface UploadResult {
  success: boolean;
  asset?: BrandAsset;
  error?: string;
}

// ============================================================================
// BRAND ASSET UPLOADER CLASS
// ============================================================================

export class BrandAssetUploader {
  private storage: ReturnType<typeof getStorage>;
  private bucketName: string;

  constructor() {
    this.storage = getStorage();
    // Use environment variable or default bucket
    this.bucketName =
      process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-ai.appspot.com';
  }

  /**
   * Upload a brand asset
   */
  async uploadAsset(options: UploadOptions): Promise<UploadResult> {
    try {
      const { brandId, file, category, tags, metadata, makePublic } = options;

      // Generate storage path
      const storagePath = this.generateStoragePath(
        brandId,
        category,
        file.originalName
      );

      // Get bucket
      const bucket = this.storage.bucket(this.bucketName);

      // Create file reference
      const fileRef = bucket.file(storagePath);

      // Upload file
      await fileRef.save(file.buffer, {
        contentType: file.mimeType,
        metadata: {
          metadata: {
            ...metadata,
            brandId,
            category,
            originalName: file.originalName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make public if requested
      if (makePublic) {
        await fileRef.makePublic();
      }

      // Get download URL
      const [url] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Far future date
      });

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (
        category === 'image' &&
        file.mimeType.startsWith('image/') &&
        file.mimeType !== 'image/svg+xml'
      ) {
        thumbnailUrl = await this.generateThumbnail(fileRef, storagePath);
      }

      // Get dimensions for images
      let dimensions: { width: number; height: number } | undefined;
      if (file.mimeType.startsWith('image/')) {
        dimensions = await this.getImageDimensions(file.buffer);
      }

      // Create asset record
      const asset: BrandAsset = {
        id: this.generateAssetId(),
        type: category,
        name: file.originalName,
        url,
        thumbnailUrl,
        fileSize: file.size,
        dimensions,
        format: this.getFileExtension(file.originalName),
        category: category,
        tags: tags || [],
        uploadedBy: brandId, // TODO: Get from auth context
        uploadedAt: new Date(),
        metadata,
      };

      logger.info('Asset uploaded successfully', {
        brandId,
        assetId: asset.id,
        category,
      });

      return { success: true, asset };
    } catch (error) {
      logger.error('Failed to upload asset', { error, options });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete an asset
   */
  async deleteAsset(brandId: string, assetUrl: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);

      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(assetUrl);
      if (!filePath) {
        throw new Error('Invalid asset URL');
      }

      // Delete file
      await bucket.file(filePath).delete();

      // Delete thumbnail if exists
      const thumbnailPath = filePath.replace(
        /(\.[^.]+)$/,
        '_thumb$1'
      );
      try {
        await bucket.file(thumbnailPath).delete();
      } catch {
        // Thumbnail may not exist
      }

      logger.info('Asset deleted successfully', { brandId, assetUrl });
      return true;
    } catch (error) {
      logger.error('Failed to delete asset', { error, brandId, assetUrl });
      return false;
    }
  }

  /**
   * Get all assets for a brand
   */
  async listAssets(
    brandId: string,
    category?: BrandAsset['type']
  ): Promise<BrandAsset[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const prefix = `brands/${brandId}/assets${category ? `/${category}` : ''}`;

      const [files] = await bucket.getFiles({ prefix });

      const assets: BrandAsset[] = await Promise.all(
        files
          .filter((file) => !file.name.includes('_thumb'))
          .map(async (file) => {
            const [metadata] = await file.getMetadata();
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: '03-01-2500',
            });

            return {
              id: file.name.split('/').pop() || '',
              type: (metadata.metadata?.category as BrandAsset['type']) || 'image',
              name: metadata.metadata?.originalName || file.name,
              url,
              fileSize: parseInt(String(metadata.size || '0')),
              format: this.getFileExtension(file.name),
              uploadedBy: brandId,
              uploadedAt: new Date(metadata.timeCreated || Date.now()),
              metadata: metadata.metadata,
            } as BrandAsset;
          })
      );

      return assets;
    } catch (error) {
      logger.error('Failed to list assets', { error, brandId, category });
      return [];
    }
  }

  /**
   * Get asset metadata
   */
  async getAssetMetadata(assetUrl: string): Promise<Record<string, unknown> | null> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const filePath = this.extractFilePathFromUrl(assetUrl);
      if (!filePath) return null;

      const [metadata] = await bucket.file(filePath).getMetadata();
      return metadata.metadata || null;
    } catch (error) {
      logger.error('Failed to get asset metadata', { error, assetUrl });
      return null;
    }
  }

  /**
   * Update asset metadata
   */
  async updateAssetMetadata(
    assetUrl: string,
    metadata: Record<string, string>
  ): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const filePath = this.extractFilePathFromUrl(assetUrl);
      if (!filePath) return false;

      await bucket.file(filePath).setMetadata({
        metadata,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update asset metadata', { error, assetUrl });
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate storage path for asset
   */
  private generateStoragePath(
    brandId: string,
    category: string,
    fileName: string
  ): string {
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(fileName);
    return `brands/${brandId}/assets/${category}/${timestamp}_${sanitizedFileName}`;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '_')
      .replace(/_+/g, '_');
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()! : '';
  }

  /**
   * Extract file path from storage URL
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      // Handle different URL formats
      if (url.includes('firebasestorage.googleapis.com')) {
        const match = url.match(/\/o\/(.*?)\?/);
        return match ? decodeURIComponent(match[1]) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate unique asset ID
   */
  private generateAssetId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate thumbnail for image
   */
  private async generateThumbnail(
    fileRef: any,
    storagePath: string
  ): Promise<string | undefined> {
    try {
      // In production, use Cloud Functions to generate thumbnails
      // For now, return undefined - thumbnail generation would be done by a Cloud Function
      return undefined;
    } catch (error) {
      logger.warn('Failed to generate thumbnail', { error, storagePath });
      return undefined;
    }
  }

  /**
   * Get image dimensions from buffer
   */
  private async getImageDimensions(
    buffer: Buffer
  ): Promise<{ width: number; height: number } | undefined> {
    try {
      // This is a placeholder - in production, use sharp or similar library
      // For now, return undefined
      return undefined;
    } catch (error) {
      logger.warn('Failed to get image dimensions', { error });
      return undefined;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

let uploaderInstance: BrandAssetUploader | null = null;

export function getBrandAssetUploader(): BrandAssetUploader {
  if (!uploaderInstance) {
    uploaderInstance = new BrandAssetUploader();
  }
  return uploaderInstance;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate file type for brand assets
 */
export function validateAssetType(
  mimeType: string,
  category: BrandAsset['type']
): { valid: boolean; error?: string } {
  const validTypes: Record<BrandAsset['type'], string[]> = {
    logo: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    template: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/vnd.adobe.photoshop',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    font: [
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/x-font-ttf',
      'application/x-font-otf',
    ],
  };

  const allowedTypes = validTypes[category];
  if (!allowedTypes) {
    return { valid: false, error: 'Invalid category' };
  }

  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type for ${category}. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  category: BrandAsset['type']
): { valid: boolean; error?: string } {
  const maxSizes: Record<BrandAsset['type'], number> = {
    logo: 5 * 1024 * 1024, // 5MB
    image: 10 * 1024 * 1024, // 10MB
    video: 100 * 1024 * 1024, // 100MB
    template: 50 * 1024 * 1024, // 50MB
    document: 25 * 1024 * 1024, // 25MB
    font: 5 * 1024 * 1024, // 5MB
  };

  const maxSize = maxSizes[category];
  if (size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${category}: ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  return { valid: true };
}
