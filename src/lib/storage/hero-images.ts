/**
 * Hero Image Upload Utilities
 *
 * Handle image uploads to Firebase Storage for hero banners.
 */

import { getStorage } from 'firebase-admin/storage';

/**
 * Upload hero image to Firebase Storage
 * @param file - File buffer
 * @param orgId - Organization ID
 * @param fileName - Original file name
 * @param type - 'logo' or 'hero'
 * @returns Public URL of uploaded image
 */
export async function uploadHeroImage(
  file: Buffer,
  orgId: string,
  fileName: string,
  type: 'logo' | 'hero'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `heroes/${orgId}/${type}/${timestamp}_${sanitizedFileName}`;

    // Create file reference
    const fileRef = bucket.file(storagePath);

    // Determine content type
    const contentType = getContentType(fileName);

    // Upload file
    await fileRef.save(file, {
      contentType,
      metadata: {
        metadata: {
          orgId,
          type,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error uploading hero image:', error);
    return { success: false, error: 'Failed to upload image' };
  }
}

/**
 * Delete hero image from Firebase Storage
 * @param url - Public URL of image to delete
 */
export async function deleteHeroImage(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();

    // Extract file path from URL
    const bucketName = bucket.name;
    const urlPattern = new RegExp(`https://storage.googleapis.com/${bucketName}/(.+)`);
    const match = url.match(urlPattern);

    if (!match || !match[1]) {
      return { success: false, error: 'Invalid URL format' };
    }

    const filePath = decodeURIComponent(match[1]);
    const fileRef = bucket.file(filePath);

    // Delete file
    await fileRef.delete();

    return { success: true };
  } catch (error) {
    console.error('Error deleting hero image:', error);
    return { success: false, error: 'Failed to delete image' };
  }
}

/**
 * Get content type from file name
 */
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Validate image file
 * @param file - File buffer
 * @param fileName - File name
 * @returns Validation result
 */
export function validateImageFile(
  file: Buffer,
  fileName: string
): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.length > maxSize) {
    return { valid: false, error: 'Image must be smaller than 5MB' };
  }

  // Check file type
  const ext = fileName.toLowerCase().split('.').pop();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  if (!ext || !allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, SVG' };
  }

  return { valid: true };
}
