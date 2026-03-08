/**
 * Brand Assets Server Actions
 *
 * Server actions for uploading and managing brand assets.
 */

'use server';

import { getBrandAssetUploader, validateAssetType, validateFileSize } from '@/server/services/brand-asset-uploader';
import type { BrandAsset } from '@/types/brand-guide';
import { logger } from '@/lib/logger';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

const MAX_FETCH_REDIRECTS = 3;

function isPrivateIpv4(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (/^127\./.test(lower) || lower === '0.0.0.0') return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  return false;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true;

  // Handle bracketed IPv6 edge-cases defensively
  const normalized = lower.replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === '::1' || normalized === '::') return true;

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }

  if (ipVersion === 6) {
    // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1, etc.)
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
      if (mapped?.[1] && isPrivateIpv4(mapped[1])) return true;
      // Conservative: block mapped IPv6 forms we cannot reliably decode here.
      return true;
    }

    // Unique local addresses fc00::/7 and link-local fe80::/10
    if (/^(fc|fd)/i.test(normalized)) return true;
    if (/^fe[89ab]/i.test(normalized)) return true;
  }

  return false;
}

async function assertHostIsPublic(hostname: string): Promise<string | null> {
  if (isPrivateOrLocalHostname(hostname)) {
    return 'Private or local source URLs are not allowed';
  }

  if (isIP(hostname)) {
    return null;
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.some((record) => isPrivateOrLocalHostname(record.address))) {
      return 'Source hostname resolves to a private or local address';
    }
  } catch {
    return 'Failed to resolve source hostname';
  }

  return null;
}

async function fetchImageWithValidatedRedirects(sourceUrl: URL): Promise<Response | { error: string }> {
  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= MAX_FETCH_REDIRECTS; redirectCount += 1) {
    const hostValidationError = await assertHostIsPublic(currentUrl.hostname);
    if (hostValidationError) {
      return { error: hostValidationError };
    }

    const response = await fetch(currentUrl.toString(), { redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { error: 'Redirect response did not include a Location header' };
      }

      const nextUrl = new URL(location, currentUrl);
      if (!['http:', 'https:'].includes(nextUrl.protocol)) {
        return { error: 'Only HTTP(S) source URLs are supported' };
      }

      currentUrl = nextUrl;
      continue;
    }

    return response;
  }

  return { error: `Too many redirects (max ${MAX_FETCH_REDIRECTS})` };
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

    const hostValidationError = await assertHostIsPublic(parsedUrl.hostname);
    if (hostValidationError) {
      return { success: false, error: hostValidationError };
    }

    const fetchResult = await fetchImageWithValidatedRedirects(parsedUrl);
    if ('error' in fetchResult) {
      return { success: false, error: fetchResult.error };
    }

    const response = fetchResult;
    if (!response.ok) {
      return { success: false, error: `Failed to fetch source image (${response.status})` };
    }

    const category = input.category || 'image';
    const contentLengthHeader = response.headers.get('content-length');
    const declaredSize = contentLengthHeader ? Number(contentLengthHeader) : NaN;
    if (Number.isFinite(declaredSize) && declaredSize > 0) {
      const sizeValidation = validateFileSize(declaredSize, category);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }
    }

    const contentTypeHeader = response.headers.get('content-type');
    if (!contentTypeHeader) {
      return { success: false, error: 'Source URL must include a Content-Type header' };
    }

    const mimeType = contentTypeHeader.split(';')[0]?.trim().toLowerCase();
    if (!mimeType || !mimeType.startsWith('image/')) {
      return { success: false, error: 'Source URL did not return an image' };
    }

    const typeValidation = validateAssetType(mimeType, category);
    if (!typeValidation.valid) {
      return { success: false, error: typeValidation.error };
    }

    if (!response.body) {
      return { success: false, error: 'Source image response had no body' };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalSize += value.byteLength;

      const sizeValidation = validateFileSize(totalSize, category);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }

      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalSize);

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
      category,
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
