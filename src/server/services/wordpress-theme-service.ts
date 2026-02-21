/**
 * WordPress Theme Service
 *
 * Handles:
 * - Theme ZIP validation and extraction
 * - Metadata parsing from style.css
 * - Firestore storage and retrieval
 * - Firebase Storage file management
 * - Theme activation and deletion
 * - Error handling and audit logging
 */

import { getAdminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/lib/logger';
import {
  WordPressTheme,
  ThemeMetadata,
  ThemeValidationError,
  ThemeValidationErrorType,
  REQUIRED_THEME_FILES,
  THEME_UPLOAD_CONSTRAINTS,
  THEME_VALIDATION_MESSAGES,
} from '@/types/wordpress-theme';
import { Timestamp, FieldValue } from '@google-cloud/firestore';

/**
 * WordPress theme service
 *
 * Singleton pattern with lazy initialization
 */
class WordPressThemeService {
  private static instance: WordPressThemeService;

  private constructor() {}

  static getInstance(): WordPressThemeService {
    if (!WordPressThemeService.instance) {
      WordPressThemeService.instance = new WordPressThemeService();
    }
    return WordPressThemeService.instance;
  }

  /**
   * Upload and validate a WordPress theme
   *
   * @param orgId Organization ID
   * @param buffer ZIP file buffer
   * @param fileName Original file name
   * @param userId User ID of uploader
   * @returns WordPressTheme object or error
   */
  async uploadTheme(
    orgId: string,
    buffer: Buffer,
    fileName: string,
    userId: string,
  ): Promise<{ success: boolean; theme?: WordPressTheme; error?: string; validationErrors?: ThemeValidationError[] }> {
    try {
      // Validate file size
      if (buffer.length > THEME_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_MB * 1024 * 1024) {
        return {
          success: false,
          error: THEME_VALIDATION_MESSAGES.zip_too_large,
          validationErrors: [
            {
              type: 'zip_too_large',
              message: THEME_VALIDATION_MESSAGES.zip_too_large,
            },
          ],
        };
      }

      // Validate ZIP format and extract metadata
      const validationResult = await this.validateThemeZip(buffer);
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'Theme ZIP validation failed',
          validationErrors: validationResult.errors,
        };
      }

      // Extract metadata from style.css
      const metadata = await this.extractThemeMetadata(buffer);
      if (!metadata) {
        return {
          success: false,
          error: THEME_VALIDATION_MESSAGES.invalid_style_css_format,
          validationErrors: [
            {
              type: 'invalid_style_css_format',
              message: THEME_VALIDATION_MESSAGES.invalid_style_css_format,
            },
          ],
        };
      }

      // Generate theme ID
      const themeId = `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Upload ZIP to Firebase Storage
      const zipPath = `themes/${orgId}/${themeId}/theme-${metadata.version}.zip`;
      const bucket = getStorage().bucket();
      const file = bucket.file(zipPath);

      await file.save(buffer, {
        metadata: {
          contentType: 'application/zip',
          metadata: {
            orgId,
            themeId,
            themeName: metadata.name,
          },
        },
      });

      // Create signed URL (far-future expiration)
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000, // ~100 years
      });

      // Create Firestore document
      const db = getAdminFirestore();
      const themeDoc: WordPressTheme = {
        id: themeId,
        orgId,
        active: false,
        name: metadata.name,
        version: metadata.version,
        author: metadata.author,
        description: metadata.description,
        license: metadata.license,
        themeUri: metadata.themeUri,
        zipUrl: signedUrl,
        zipPath,
        fileSize: buffer.length,
        fileMimeType: 'application/zip',
        uploadedBy: userId,
        uploadedAt: new Date(),
        fileName,
        validationErrors: undefined,
        lastValidatedAt: new Date(),
        lastActivatedAt: undefined,
        activationCount: 0,
      };

      await db
        .collection('orgs')
        .doc(orgId)
        .collection('themes')
        .doc(themeId)
        .set(themeDoc);

      // Log upload
      logger.info('[Theme Service] Theme uploaded', {
        orgId,
        themeId,
        themeName: metadata.name,
        version: metadata.version,
        uploadedBy: userId,
        fileSize: buffer.length,
      });

      return { success: true, theme: themeDoc };
    } catch (error) {
      logger.error('[Theme Service] Upload failed', { orgId, fileName, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate WordPress theme ZIP structure
   *
   * Checks for required files:
   * - style.css (with valid header)
   * - functions.php
   * - index.php
   *
   * @param buffer ZIP file buffer
   * @returns Validation result with error details if invalid
   */
  private async validateThemeZip(
    buffer: Buffer,
  ): Promise<{ valid: boolean; errors: ThemeValidationError[] }> {
    try {
      // Dynamic import to avoid build issues
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      try {
        await zip.loadAsync(buffer);
      } catch {
        return {
          valid: false,
          errors: [
            {
              type: 'invalid_zip_format',
              message: THEME_VALIDATION_MESSAGES.invalid_zip_format,
            },
          ],
        };
      }

      // Check for required files
      const errors: ThemeValidationError[] = [];
      const fileNames = Object.keys(zip.files);

      for (const requiredFile of REQUIRED_THEME_FILES) {
        const hasFile = fileNames.some((f) => f.endsWith(requiredFile));
        if (!hasFile) {
          const errorType: ThemeValidationErrorType = `missing_${requiredFile.replace('.', '_')}` as ThemeValidationErrorType;
          errors.push({
            type: errorType,
            message: THEME_VALIDATION_MESSAGES[errorType] || `Missing ${requiredFile}`,
            file: requiredFile,
          });
        }
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      logger.error('[Theme Service] ZIP validation error', { error });
      return {
        valid: false,
        errors: [
          {
            type: 'corrupted_file',
            message: THEME_VALIDATION_MESSAGES.corrupted_file,
            details: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  /**
   * Extract theme metadata from style.css header
   *
   * Parses the WordPress theme metadata header:
   * ```
   * /
   * Theme Name: My Theme
   * Theme URI: https://example.com
   * Author: John Doe
   * Version: 1.0.0
   * ...
   * /
   * ```
   *
   * @param buffer ZIP file buffer
   * @returns Parsed metadata or null if extraction fails
   */
  private async extractThemeMetadata(buffer: Buffer): Promise<ThemeMetadata | null> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await zip.loadAsync(buffer);

      // Find and read style.css
      const styleCssFile = zip.file('style.css');
      if (!styleCssFile) {
        return null;
      }

      const content = await styleCssFile.async('text');

      // Parse metadata header (format: Theme Name: value)
      const metadata: ThemeMetadata = {
        name: 'Unknown Theme',
        version: '1.0.0',
      };

      const lines = content.split('\n').slice(0, 30); // Header is in first 30 lines

      for (const line of lines) {
        const match = line.match(/^[\s*]*([^:]+):\s*(.+)$/);
        if (!match) continue;

        const [, key, value] = match;
        const normalizedKey = key.trim().toLowerCase();
        const normalizedValue = value.trim();

        switch (normalizedKey) {
          case 'theme name':
            metadata.name = normalizedValue;
            break;
          case 'version':
            metadata.version = normalizedValue;
            break;
          case 'author':
            metadata.author = normalizedValue;
            break;
          case 'author uri':
            metadata.authorUri = normalizedValue;
            break;
          case 'description':
            metadata.description = normalizedValue;
            break;
          case 'license':
            metadata.license = normalizedValue;
            break;
          case 'license uri':
            metadata.licenseUri = normalizedValue;
            break;
          case 'theme uri':
            metadata.themeUri = normalizedValue;
            break;
          case 'text domain':
            metadata.textDomain = normalizedValue;
            break;
          case 'domain path':
            metadata.domainPath = normalizedValue;
            break;
        }
      }

      logger.info('[Theme Service] Metadata extracted', {
        name: metadata.name,
        version: metadata.version,
        author: metadata.author,
      });

      return metadata;
    } catch (error) {
      logger.error('[Theme Service] Metadata extraction error', { error });
      return null;
    }
  }

  /**
   * List themes for an organization
   *
   * @param orgId Organization ID
   * @param pageSize Number of themes per page (default: 5)
   * @param pageNumber Page number (1-indexed, default: 1)
   * @returns Array of themes (active first, sorted by uploadedAt DESC)
   */
  async listThemesByOrg(
    orgId: string,
    pageSize: number = 5,
    pageNumber: number = 1,
  ): Promise<{ themes: WordPressTheme[]; total: number; hasMore: boolean }> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection('orgs')
        .doc(orgId)
        .collection('themes')
        .orderBy('active', 'desc')
        .orderBy('uploadedAt', 'desc')
        .get();

      const allThemes = snapshot.docs.map((doc) => ({
        ...doc.data(),
        uploadedAt: (doc.data().uploadedAt as Timestamp).toDate(),
        lastValidatedAt: doc.data().lastValidatedAt
          ? (doc.data().lastValidatedAt as Timestamp).toDate()
          : undefined,
        lastActivatedAt: doc.data().lastActivatedAt
          ? (doc.data().lastActivatedAt as Timestamp).toDate()
          : undefined,
      })) as WordPressTheme[];

      const total = allThemes.length;
      const skip = (pageNumber - 1) * pageSize;
      const paginated = allThemes.slice(skip, skip + pageSize);
      const hasMore = skip + pageSize < total;

      return { themes: paginated, total, hasMore };
    } catch (error) {
      logger.error('[Theme Service] List themes error', { orgId, error });
      return { themes: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get a specific theme by ID
   *
   * @param orgId Organization ID
   * @param themeId Theme ID
   * @returns Theme document or null if not found
   */
  async getThemeById(orgId: string, themeId: string): Promise<WordPressTheme | null> {
    try {
      const db = getAdminFirestore();
      const doc = await db
        .collection('orgs')
        .doc(orgId)
        .collection('themes')
        .doc(themeId)
        .get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as WordPressTheme;
      return {
        ...data,
        uploadedAt: (data.uploadedAt as any).toDate(),
        lastValidatedAt: data.lastValidatedAt ? (data.lastValidatedAt as any).toDate() : undefined,
        lastActivatedAt: data.lastActivatedAt ? (data.lastActivatedAt as any).toDate() : undefined,
      };
    } catch (error) {
      logger.error('[Theme Service] Get theme error', { orgId, themeId, error });
      return null;
    }
  }

  /**
   * Activate a theme for an organization
   *
   * @param orgId Organization ID
   * @param themeId Theme ID to activate
   * @returns Updated org theme config
   */
  async activateTheme(orgId: string, themeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getAdminFirestore();

      // Deactivate all other themes
      const snapshot = await db
        .collection('orgs')
        .doc(orgId)
        .collection('themes')
        .where('active', '==', true)
        .get();

      const batch = db.batch();

      // Deactivate previous active themes
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { active: false });
      });

      // Activate new theme
      const themeRef = db.collection('orgs').doc(orgId).collection('themes').doc(themeId);
      batch.update(themeRef, {
        active: true,
        lastActivatedAt: Timestamp.now(),
        activationCount: FieldValue.increment(1),
      });

      // Update org document
      const orgRef = db.collection('orgs').doc(orgId);
      batch.update(orgRef, {
        activeThemeId: themeId,
        lastThemeActivatedAt: Timestamp.now(),
      });

      await batch.commit();

      logger.info('[Theme Service] Theme activated', { orgId, themeId });

      return { success: true };
    } catch (error) {
      logger.error('[Theme Service] Activate theme error', { orgId, themeId, error });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete a theme
   *
   * If the deleted theme is active, reverts to default BakedBot theme.
   *
   * @param orgId Organization ID
   * @param themeId Theme ID to delete
   * @returns Success status
   */
  async deleteTheme(orgId: string, themeId: string): Promise<{ success: boolean; error?: string; revertedToDefault?: boolean }> {
    try {
      const db = getAdminFirestore();

      // Check if theme is active
      const themeDoc = await this.getThemeById(orgId, themeId);
      if (!themeDoc) {
        return { success: false, error: 'Theme not found' };
      }

      const wasActive = themeDoc.active;

      // Delete from Firestore
      await db.collection('orgs').doc(orgId).collection('themes').doc(themeId).delete();

      // Delete from Storage
      if (themeDoc.zipPath) {
        try {
          const bucket = getStorage().bucket();
          await bucket.file(themeDoc.zipPath).delete();
        } catch (storageError) {
          logger.warn('[Theme Service] Could not delete storage file', {
            orgId,
            themeId,
            zipPath: themeDoc.zipPath,
            error: storageError,
          });
        }
      }

      // If deleted theme was active, revert to default
      if (wasActive) {
        await db.collection('orgs').doc(orgId).update({
          activeThemeId: null,
        });

        logger.info('[Theme Service] Active theme deleted; reverted to default', { orgId, themeId });
        return { success: true, revertedToDefault: true };
      }

      logger.info('[Theme Service] Theme deleted', { orgId, themeId });
      return { success: true, revertedToDefault: false };
    } catch (error) {
      logger.error('[Theme Service] Delete theme error', { orgId, themeId, error });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get active theme for an organization
   *
   * @param orgId Organization ID
   * @returns Active theme or null if none set
   */
  async getActiveTheme(orgId: string): Promise<WordPressTheme | null> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection('orgs')
        .doc(orgId)
        .collection('themes')
        .where('active', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data() as WordPressTheme;
      return {
        ...data,
        uploadedAt: (data.uploadedAt as any).toDate(),
        lastValidatedAt: data.lastValidatedAt ? (data.lastValidatedAt as any).toDate() : undefined,
        lastActivatedAt: data.lastActivatedAt ? (data.lastActivatedAt as any).toDate() : undefined,
      };
    } catch (error) {
      logger.error('[Theme Service] Get active theme error', { orgId, error });
      return null;
    }
  }

  /**
   * Check org theme quota
   *
   * @param orgId Organization ID
   * @returns Number of themes already uploaded
   */
  async getThemeCount(orgId: string): Promise<number> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection('orgs')
        .doc(orgId)
        .collection('themes')
        .select()
        .get();

      return snapshot.size;
    } catch (error) {
      logger.error('[Theme Service] Get theme count error', { orgId, error });
      return 0;
    }
  }
}

// Export singleton instance
export const wordPressThemeService = WordPressThemeService.getInstance();
