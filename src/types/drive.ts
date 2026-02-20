/**
 * BakedBot Drive - File Storage System Types
 *
 * Google Drive-like storage for super users with:
 * - Folder organization
 * - File uploads
 * - Sharing with granular permissions
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type DriveCategory = 'agents' | 'qr' | 'images' | 'documents' | 'custom';

export type DriveAccessControl =
  | 'public'       // Anyone with link
  | 'link-only'    // Only people with exact link (unlisted)
  | 'email-gated'  // Requires email to access
  | 'users-only'   // Specific users only
  | 'private';     // Owner only

export type DriveAccessLevel = 'view' | 'download' | 'edit';

export type DriveItemType = 'file' | 'folder';

export interface DriveCategoryConfig {
  label: string;
  icon: string;
  description: string;
  mimeTypes?: string[];
  maxFileSize?: number; // bytes
}

export const DRIVE_CATEGORIES: Record<DriveCategory, DriveCategoryConfig> = {
  agents: {
    label: 'Agents',
    icon: 'Bot',
    description: 'Agent avatars, prompts, and configurations',
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/json', 'text/plain'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  qr: {
    label: 'QR Codes',
    icon: 'QrCode',
    description: 'Generated QR codes and tracking assets',
    mimeTypes: ['image/png', 'image/svg+xml'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  images: {
    label: 'Images',
    icon: 'Image',
    description: 'Photos, graphics, and visual assets',
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
    maxFileSize: 25 * 1024 * 1024, // 25MB
  },
  documents: {
    label: 'Documents',
    icon: 'FileText',
    description: 'PDFs, spreadsheets, and text files',
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  custom: {
    label: 'Custom',
    icon: 'Folder',
    description: 'User-created folders',
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
};

export const DRIVE_ACCESS_LEVELS: Record<DriveAccessLevel, { label: string; description: string }> = {
  view: {
    label: 'View',
    description: 'Can view file details and preview',
  },
  download: {
    label: 'Download',
    description: 'Can view and download files',
  },
  edit: {
    label: 'Edit',
    description: 'Can view, download, and modify files',
  },
};

export const DRIVE_ACCESS_CONTROLS: Record<DriveAccessControl, { label: string; description: string }> = {
  public: {
    label: 'Public',
    description: 'Anyone on the internet can access',
  },
  'link-only': {
    label: 'Anyone with link',
    description: 'Only people with the exact link can access',
  },
  'email-gated': {
    label: 'Email required',
    description: 'Must enter email to access (for lead capture)',
  },
  'users-only': {
    label: 'Specific people',
    description: 'Only invited users can access',
  },
  private: {
    label: 'Private',
    description: 'Only you can access',
  },
};

// ============================================================================
// DRIVE FILE
// ============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;

  // Hierarchy
  folderId: string | null; // null = root
  path: string; // "/agents/smokey/assets" - denormalized for breadcrumbs

  // Ownership
  ownerId: string;
  ownerEmail: string;

  // Categorization
  category: DriveCategory;
  tags: string[];

  // Metadata
  description?: string;
  metadata?: Record<string, string>;

  // Sharing
  isShared: boolean;
  shareIds: string[];

  // Tracking
  viewCount: number;
  downloadCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

// ============================================================================
// DRIVE FOLDER
// ============================================================================

export interface DriveFolder {
  id: string;
  name: string;

  // Hierarchy
  parentId: string | null; // null = root
  path: string; // "/agents/smokey" - full path for breadcrumbs
  depth: number; // 0 = root level, 1 = first level, etc.

  // Ownership
  ownerId: string;
  ownerEmail: string;

  // Category (for system folders)
  isSystemFolder: boolean; // true for "agents", "qr", etc.
  category?: DriveCategory;

  // Display
  icon?: string; // Lucide icon name
  color?: string; // Folder color (hex)

  // Aggregates (updated on file changes)
  fileCount: number;
  totalSize: number; // Total bytes in folder

  // Sharing
  isShared: boolean;
  shareIds: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
}

// ============================================================================
// DRIVE SHARE
// ============================================================================

export interface DriveShareUser {
  userId?: string;
  email: string;
  name?: string;
  accessLevel: DriveAccessLevel;
  invitedAt: Date;
  invitedBy: string;
  lastAccessedAt?: Date;
}

export interface DriveShareAccessLog {
  userId?: string;
  email?: string;
  ip?: string;
  action: 'view' | 'download';
  timestamp: Date;
}

export interface DriveShare {
  id: string;

  // Target
  targetType: DriveItemType;
  targetId: string;
  targetPath: string; // Denormalized path for display
  targetName: string; // Denormalized name for display

  // Share settings
  isPublic: boolean;
  shareToken?: string; // Unique token for URLs (e.g., "abc123xyz")

  // Access control
  accessControl: DriveAccessControl;
  accessLevel: DriveAccessLevel;

  // Users
  allowedUsers: DriveShareUser[];

  // Link settings
  passwordHash?: string; // bcrypt hash
  expiresAt?: Date;
  maxDownloads?: number;

  // Tracking
  viewCount: number;
  downloadCount: number;
  accessLog: DriveShareAccessLog[];

  // Ownership
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  updatedAt: Date;

  // Status
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;
}

// ============================================================================
// COMBINED ITEM TYPE (for unified display)
// ============================================================================

export type DriveItem =
  | (DriveFile & { itemType: 'file' })
  | (DriveFolder & { itemType: 'folder' });

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  category?: DriveCategory;
  icon?: string;
  color?: string;
}

export interface UploadFileInput {
  folderId?: string | null;
  category?: DriveCategory;
  tags?: string[];
  description?: string;
}

export interface CreateShareInput {
  targetType: DriveItemType;
  targetId: string;
  accessControl: DriveAccessControl;
  accessLevel: DriveAccessLevel;
  allowedUsers?: Array<{
    email: string;
    name?: string;
    accessLevel?: DriveAccessLevel;
  }>;
  password?: string; // Raw password, will be hashed
  expiresAt?: Date;
  maxDownloads?: number;
}

export interface UpdateShareInput {
  shareId: string;
  accessControl?: DriveAccessControl;
  accessLevel?: DriveAccessLevel;
  addUsers?: Array<{
    email: string;
    name?: string;
    accessLevel?: DriveAccessLevel;
  }>;
  removeUserEmails?: string[];
  password?: string | null; // null to remove
  expiresAt?: Date | null; // null to remove
  maxDownloads?: number | null; // null to remove
}

export interface MoveItemInput {
  itemType: DriveItemType;
  itemId: string;
  newParentId: string | null; // null = move to root
}

export interface RenameItemInput {
  itemType: DriveItemType;
  itemId: string;
  newName: string;
}

export interface SearchFilesInput {
  query: string;
  category?: DriveCategory;
  tags?: string[];
  folderId?: string | null;
  includeDeleted?: boolean;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface DriveActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DriveListResult {
  folders: DriveFolder[];
  files: DriveFile[];
  breadcrumbs: Array<{ id: string; name: string; path: string }>;
  totalSize: number;
  totalCount: number;
  nextCursor?: string; // File ID to fetch next page (cursor-based pagination)
  hasMore?: boolean; // Whether there are more files to load
}

export interface DriveShareLinkResult {
  shareId: string;
  shareToken: string;
  shareUrl: string;
  expiresAt?: Date;
}

export interface DriveStorageStats {
  totalSize: number;
  fileCount: number;
  folderCount: number;
  byCategory: Record<DriveCategory, { size: number; count: number }>;
  recentFiles: DriveFile[];
}

// ============================================================================
// FIRESTORE DOCUMENT TYPES (for serialization)
// ============================================================================

export interface DriveFileDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  folderId: string | null;
  path: string;
  ownerId: string;
  ownerEmail: string;
  category: DriveCategory;
  tags: string[];
  description?: string;
  metadata?: Record<string, string>;
  isShared: boolean;
  shareIds: string[];
  viewCount: number;
  downloadCount: number;
  lastAccessedAt?: number; // Unix timestamp
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  isDeleted: boolean;
  deletedAt?: number;
  deletedBy?: string;
}

export interface DriveFolderDoc {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  depth: number;
  ownerId: string;
  ownerEmail: string;
  isSystemFolder: boolean;
  category?: DriveCategory;
  icon?: string;
  color?: string;
  fileCount: number;
  totalSize: number;
  isShared: boolean;
  shareIds: string[];
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
  deletedAt?: number;
}

export interface DriveShareDoc {
  id: string;
  targetType: DriveItemType;
  targetId: string;
  targetPath: string;
  targetName: string;
  isPublic: boolean;
  shareToken?: string;
  accessControl: DriveAccessControl;
  accessLevel: DriveAccessLevel;
  allowedUsers: Array<{
    userId?: string;
    email: string;
    name?: string;
    accessLevel: DriveAccessLevel;
    invitedAt: number;
    invitedBy: string;
    lastAccessedAt?: number;
  }>;
  passwordHash?: string;
  expiresAt?: number;
  maxDownloads?: number;
  viewCount: number;
  downloadCount: number;
  accessLog: Array<{
    userId?: string;
    email?: string;
    ip?: string;
    action: 'view' | 'download';
    timestamp: number;
  }>;
  createdBy: string;
  createdByEmail: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  revokedAt?: number;
  revokedBy?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Firestore document to DriveFile
 */
export function toFile(doc: DriveFileDoc): DriveFile {
  return {
    ...doc,
    lastAccessedAt: doc.lastAccessedAt ? new Date(doc.lastAccessedAt) : undefined,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : undefined,
  };
}

/**
 * Convert Firestore document to DriveFolder
 */
export function toFolder(doc: DriveFolderDoc): DriveFolder {
  return {
    ...doc,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : undefined,
  };
}

/**
 * Convert Firestore document to DriveShare
 */
export function toShare(doc: DriveShareDoc): DriveShare {
  return {
    ...doc,
    allowedUsers: doc.allowedUsers.map(u => ({
      ...u,
      invitedAt: new Date(u.invitedAt),
      lastAccessedAt: u.lastAccessedAt ? new Date(u.lastAccessedAt) : undefined,
    })),
    accessLog: doc.accessLog.map(l => ({
      ...l,
      timestamp: new Date(l.timestamp),
    })),
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : undefined,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt) : undefined,
  };
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Get icon name for file type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Music';
  if (mimeType === 'application/pdf') return 'FileText';
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return 'Table';
  if (mimeType.includes('presentation')) return 'Presentation';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'FileText';
  if (mimeType === 'application/json') return 'Braces';
  if (mimeType.startsWith('text/')) return 'FileCode';
  return 'File';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\.{2,}/g, '.')
    .trim();
}

/**
 * Generate a storage path for a file
 */
export function generateStoragePath(
  userId: string,
  category: DriveCategory,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(filename);
  return `drive/${userId}/${category}/${timestamp}_${sanitized}`;
}
