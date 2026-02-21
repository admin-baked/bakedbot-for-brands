/**
 * WordPress Theme Management System Types
 *
 * Defines types for uploading, validating, and managing custom WordPress themes
 * on BakedBot public menu sites (brand.bakedbot.ai/[org] and /dispensaries/[slug])
 *
 * Storage: Firestore `orgs/{orgId}/themes/{themeId}` + Firebase Storage `gs://bucket/themes/{orgId}/{themeId}/...`
 */

/**
 * WordPress theme validation error types
 */
export type ThemeValidationErrorType =
  | 'missing_style_css'
  | 'missing_functions_php'
  | 'missing_index_php'
  | 'missing_screenshot'
  | 'invalid_zip_structure'
  | 'zip_too_large'
  | 'invalid_zip_format'
  | 'invalid_style_css_format'
  | 'corrupted_file';

/**
 * Theme validation error details
 */
export interface ThemeValidationError {
  type: ThemeValidationErrorType;
  message: string;
  file?: string; // Specific file that failed validation
  details?: unknown; // Additional context (file size, mime type, etc.)
}

/**
 * Extracted WordPress theme metadata from style.css header
 *
 * WordPress themes must have a style.css file with a header block:
 * ```
 * /
 * Theme Name: My Theme
 * Theme URI: https://example.com/my-theme
 * Author: John Doe
 * Author URI: https://example.com
 * Description: A short description
 * Version: 1.0.0
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: my-theme
 * Domain Path: /languages
 * /
 * ```
 */
export interface ThemeMetadata {
  name: string; // Theme Name
  version: string; // Version (defaults to "1.0.0" if not found)
  author?: string; // Author
  authorUri?: string; // Author URI
  description?: string; // Description
  license?: string; // License (defaults to "GPL v2 or later")
  licenseUri?: string; // License URI
  themeUri?: string; // Theme URI (homepage)
  textDomain?: string; // Text Domain
  domainPath?: string; // Domain Path
}

/**
 * WordPress theme document in Firestore
 *
 * Location: `orgs/{orgId}/themes/{themeId}`
 *
 * File storage: `gs://bucket/themes/{orgId}/{themeId}/theme-{version}.zip`
 * Screenshot: `gs://bucket/themes/{orgId}/{themeId}/screenshot.png`
 */
export interface WordPressTheme {
  // Firestore metadata
  id: string; // Unique theme ID (e.g., "theme_abc123xyz")
  orgId: string; // Organization ID (brand or dispensary)
  active: boolean; // Whether this theme is currently active

  // Theme metadata extracted from style.css
  name: string; // Theme display name
  version: string; // Theme version (e.g., "1.0.0")
  author?: string; // Theme author
  description?: string; // Theme description
  license?: string; // License type
  themeUri?: string; // Theme homepage URL

  // Storage & access
  zipUrl: string; // Firebase Storage signed URL to theme ZIP
  zipPath: string; // GCS path: gs://bucket/themes/{orgId}/{themeId}/theme-{version}.zip
  screenshotUrl?: string; // Firebase Storage signed URL to screenshot.png
  screenshotPath?: string; // GCS path: gs://bucket/themes/{orgId}/{themeId}/screenshot.png

  // File metadata
  fileSize: number; // ZIP file size in bytes
  fileMimeType: string; // MIME type (application/zip)

  // Upload metadata
  uploadedBy: string; // User ID of uploader
  uploadedAt: Date; // ISO 8601 timestamp
  fileName: string; // Original file name (e.g., "my-theme.zip")

  // Validation & errors
  validationErrors?: ThemeValidationError[]; // If upload failed, validation errors
  lastValidatedAt?: Date; // Last time theme was validated

  // Audit trail
  lastActivatedAt?: Date; // When theme was last activated
  activationCount: number; // Total times activated
}

/**
 * Theme preview metadata (safe for rendering in iframes)
 *
 * Used for generating previews without executing PHP code.
 * Shows CSS/HTML structure and screenshot only.
 */
export interface ThemePreview {
  themeId: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  screenshot?: string; // Base64 image or URL
  cssPreviewUrl?: string; // URL to extracted CSS preview
  previewHtml?: string; // Safe HTML preview (no PHP)
}

/**
 * Organization theme configuration
 *
 * Stored on the org document in Firestore (e.g., `orgs/{orgId}`)
 */
export interface OrgThemeConfig {
  activeThemeId?: string; // ID of currently active theme (null = use default BakedBot theme)
  themeCount: number; // Total themes uploaded (for quota tracking)
  lastThemeActivatedAt?: Date; // Audit trail
  defaultFallbackTheme: 'bakedbot'; // Fallback if active theme is deleted (always BakedBot default)
}

/**
 * Theme upload request from client
 */
export interface ThemeUploadRequest {
  orgId: string;
  file: File; // ZIP file from form data
}

/**
 * Theme upload response to client
 */
export interface ThemeUploadResponse {
  success: boolean;
  themeId?: string; // If successful
  theme?: WordPressTheme; // Full theme object if successful
  error?: string; // Human-readable error message
  validationErrors?: ThemeValidationError[]; // If validation failed
}

/**
 * Theme list response (paginated)
 */
export interface ThemeListResponse {
  success: boolean;
  themes: WordPressTheme[];
  total: number; // Total theme count for this org
  pageSize: number;
  hasMore: boolean;
  error?: string;
}

/**
 * Theme activation request
 */
export interface ThemeActivationRequest {
  orgId: string;
  themeId: string;
}

/**
 * Theme activation response
 */
export interface ThemeActivationResponse {
  success: boolean;
  activeThemeId?: string;
  error?: string;
}

/**
 * Theme deletion request
 */
export interface ThemeDeletionRequest {
  orgId: string;
  themeId: string;
}

/**
 * Theme deletion response
 */
export interface ThemeDeletionResponse {
  success: boolean;
  deletedThemeId?: string;
  error?: string;
  fallbackToDefault?: boolean; // If deleted theme was active, fell back to BakedBot default
}

/**
 * WordPress theme ZIP file structure validation
 *
 * Required files:
 * - style.css (with theme metadata header)
 * - functions.php
 * - index.php
 * - screenshot.png (recommended)
 *
 * Optional files:
 * - header.php, footer.php, single.php, page.php, archive.php
 * - template-loader.php, search.php, 404.php, etc.
 * - /css/, /js/, /images/, /languages/ directories
 *
 * See: https://developer.wordpress.org/themes/getting-started/what-is-a-theme/
 */
export const REQUIRED_THEME_FILES = [
  'style.css',
  'functions.php',
  'index.php',
];

export const RECOMMENDED_THEME_FILES = [
  'screenshot.png',
  'header.php',
  'footer.php',
  'single.php',
  'page.php',
  'archive.php',
];

/**
 * Theme upload constraints
 */
export const THEME_UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE_MB: 50, // 50 MB limit
  MAX_THEMES_PER_ORG: 20, // Maximum themes per organization
  ALLOWED_MIME_TYPES: ['application/zip', 'application/x-zip-compressed'],
  FILE_EXTENSION: '.zip',
} as const;

/**
 * Error messages for theme validation
 */
export const THEME_VALIDATION_MESSAGES: Record<ThemeValidationErrorType, string> = {
  missing_style_css: 'Theme ZIP must contain a style.css file',
  missing_functions_php: 'Theme ZIP must contain a functions.php file',
  missing_index_php: 'Theme ZIP must contain an index.php file',
  missing_screenshot: 'Theme ZIP should contain a screenshot.png for preview',
  invalid_zip_structure: 'Invalid ZIP file structure',
  zip_too_large: `Theme ZIP must be smaller than ${THEME_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_MB}MB`,
  invalid_zip_format: 'Uploaded file is not a valid ZIP archive',
  invalid_style_css_format: 'style.css file is invalid or corrupted',
  corrupted_file: 'Theme file is corrupted or unreadable',
} as const;
