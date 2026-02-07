/**
 * Brand Assets Server Actions
 *
 * Server actions for uploading and managing brand assets.
 */

'use server';

import { getBrandAssetUploader, validateAssetType, validateFileSize } from '@/server/services/brand-asset-uploader';
import type { BrandAsset } from '@/types/brand-guide';
import { logger } from '@/lib/logger';

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
