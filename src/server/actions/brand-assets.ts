/**
 * Brand Assets Server Actions
 *
 * Server actions for uploading and managing brand assets.
 */

'use server';

import { getBrandAssetUploader, validateAssetType, validateFileSize } from '@/server/services/brand-asset-uploader';
import type { BrandAsset } from '@/types/brand-guide';
import { logger } from '@/lib/logger';

function isPrivateOrLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true;
  if (lower === '127.0.0.1' || lower === '0.0.0.0' || lower === '::1') return true;

  // IPv4 private ranges
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;

  return false;
}

export async function mirrorBrandAssetFromUrl(
  brandId: string,
  input: {
    sourceUrl: string;
    category?: 'logo' | 'image';
    preferredName?: string;
  }
  ): Promise<{ success: boolean; assetUrl?: string; error?: string }> {
  try {
    if (!input.sourceUrl) {
      return { success: false, error: 'Source URL is required' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(input.sourceUrl);
    } catch {
      return { success: false, error: 'Invalid source URL' };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { success: false, error: 'Only HTTP(S) source URLs are supported' };
    }

    if (isPrivateOrLocalHostname(parsedUrl.hostname)) {
      return { success: false, error: 'Private or local source URLs are not allowed' };
    }

    const response = await fetch(parsedUrl.toString());
    if (!response.ok) {
      return { success: false, error: `Failed to fetch source image (${response.status})` };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/png';

    if (!mimeType.startsWith('image/')) {
      return { success: false, error: 'Source URL did not return an image' };
    }

    const extension = mimeType.includes('svg')
      ? 'svg'
      : mimeType.includes('jpeg')
        ? 'jpg'
        : mimeType.includes('webp')
          ? 'webp'
          : 'png';

    const originalName = `${input.preferredName || (input.category === 'logo' ? 'logo' : 'featured-image')}.${extension}`;

    const uploader = getBrandAssetUploader();
    const result = await uploader.uploadAsset({
      brandId,
      file: {
        buffer,
        originalName,
        mimeType,
        size: buffer.byteLength,
      },
      category: input.category || 'image',
      makePublic: true,
      tags: ['brand-guide', 'mirrored'],
      metadata: {
        sourceUrl: input.sourceUrl,
      },
    });

    if (!result.success || !result.asset) {
      return { success: false, error: result.error || 'Failed to mirror image' };
    }

    return { success: true, assetUrl: result.asset.url };
  } catch (error) {
    logger.error('Failed to mirror brand asset from URL', { error, brandId, sourceUrl: input.sourceUrl });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mirror image',
    };
  }
}

// ============================================================================
// ASSET UPLOAD ACTIONS
// ============================================================================

/**
 * Upload a brand asset
 */
export async function uploadBrandAsset(
  brandId: string,
  formData: FormData
): Promise<{ success: boolean; asset?: BrandAsset; error?: string }> {
  try {
    const file = formData.get('file') as File;
    const category = formData.get('category') as BrandAsset['type'];
    const tags = formData.get('tags') as string | null;
    const makePublic = formData.get('makePublic') === 'true';

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (!category) {
      return { success: false, error: 'Category is required' };
    }

    // Validate file type
    const typeValidation = validateAssetType(file.type, category);
    if (!typeValidation.valid) {
      return { success: false, error: typeValidation.error };
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size, category);
    if (!sizeValidation.valid) {
      return { success: false, error: sizeValidation.error };
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload asset
    const uploader = getBrandAssetUploader();
    const result = await uploader.uploadAsset({
      brandId,
      file: {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
      category,
      tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
      makePublic,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, asset: result.asset };
  } catch (error) {
    logger.error('Failed to upload brand asset', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a brand asset
 */
export async function deleteBrandAsset(
  brandId: string,
  assetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const uploader = getBrandAssetUploader();
    const success = await uploader.deleteAsset(brandId, assetUrl);

    if (!success) {
      return { success: false, error: 'Failed to delete asset' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete brand asset', { error, brandId, assetUrl });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * List all assets for a brand
 */
export async function listBrandAssets(
  brandId: string,
  category?: BrandAsset['type']
): Promise<{ success: boolean; assets?: BrandAsset[]; error?: string }> {
  try {
    const uploader = getBrandAssetUploader();
    const assets = await uploader.listAssets(brandId, category);

    return { success: true, assets };
  } catch (error) {
    logger.error('Failed to list brand assets', { error, brandId, category });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list assets',
    };
  }
}

/**
 * Get asset metadata
 */
export async function getBrandAssetMetadata(
  assetUrl: string
): Promise<{ success: boolean; metadata?: Record<string, unknown>; error?: string }> {
  try {
    const uploader = getBrandAssetUploader();
    const metadata = await uploader.getAssetMetadata(assetUrl);

    if (!metadata) {
      return { success: false, error: 'Asset not found' };
    }

    return { success: true, metadata };
  } catch (error) {
    logger.error('Failed to get asset metadata', { error, assetUrl });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metadata',
    };
  }
}

/**
 * Update asset metadata
 */
export async function updateBrandAssetMetadata(
  assetUrl: string,
  metadata: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const uploader = getBrandAssetUploader();
    const success = await uploader.updateAssetMetadata(assetUrl, metadata);

    if (!success) {
      return { success: false, error: 'Failed to update metadata' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to update asset metadata', { error, assetUrl });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update metadata',
    };
  }
}
