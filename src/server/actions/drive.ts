'use server';

/**
 * BakedBot Drive Server Actions
 *
 * CRUD operations for files, folders, and shares.
 * All actions require an authenticated paid role (super_user, brand, or dispensary).
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  getDriveStorageService,
  generateShareToken,
  hashSharePassword,
} from '@/server/services/drive-storage';
import type {
  DriveFile,
  DriveFolder,
  DriveShare,
  DriveFileDoc,
  DriveFolderDoc,
  DriveShareDoc,
  DriveCategory,
  DriveItemType,
  DriveActionResult,
  DriveListResult,
  DriveShareLinkResult,
  DriveStorageStats,
  CreateFolderInput,
  CreateShareInput,
  UpdateShareInput,
  MoveItemInput,
  RenameItemInput,
  SearchFilesInput,
} from '@/types/drive';
import { DRIVE_CATEGORIES, toFile, toFolder, toShare } from '@/types/drive';

// ============================================================================
// COLLECTIONS
// ============================================================================

const COLLECTIONS = {
  FILES: 'drive_files',
  FOLDERS: 'drive_folders',
  SHARES: 'drive_shares',
} as const;

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

/**
 * Initialize system folders for a user (agents, qr, images, documents)
 */
export async function initializeSystemFolders(): Promise<DriveActionResult<DriveFolder[]>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const now = Date.now();

    const systemCategories: DriveCategory[] = ['agents', 'qr', 'images', 'documents'];
    const folders: DriveFolder[] = [];

    for (const category of systemCategories) {
      const config = DRIVE_CATEGORIES[category];

      // Check if system folder already exists
      const existing = await db
        .collection(COLLECTIONS.FOLDERS)
        .where('ownerId', '==', user.uid)
        .where('isSystemFolder', '==', true)
        .where('category', '==', category)
        .limit(1)
        .get();

      if (!existing.empty) {
        const doc = existing.docs[0];
        folders.push(toFolder(doc.data() as DriveFolderDoc));
        continue;
      }

      // Create system folder
      const folderDoc: DriveFolderDoc = {
        id: '', // Will be set after creation
        name: config.label,
        parentId: null,
        path: `/${category}`,
        depth: 0,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        isSystemFolder: true,
        category,
        icon: config.icon,
        fileCount: 0,
        totalSize: 0,
        isShared: false,
        shareIds: [],
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      };

      const docRef = await db.collection(COLLECTIONS.FOLDERS).add(folderDoc);
      await docRef.update({ id: docRef.id });
      folderDoc.id = docRef.id;

      folders.push(toFolder(folderDoc));
    }

    logger.info('System folders initialized', { userId: user.uid, count: folders.length });
    return { success: true, data: folders };
  } catch (error) {
    logger.error('Failed to initialize system folders', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to initialize folders' };
  }
}

/**
 * Create a new folder
 */
export async function createFolder(input: CreateFolderInput): Promise<DriveActionResult<DriveFolder>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const now = Date.now();

    // Get parent folder to build path
    let parentPath = '';
    let depth = 0;
    if (input.parentId) {
      const parentDoc = await db.collection(COLLECTIONS.FOLDERS).doc(input.parentId).get();
      if (!parentDoc.exists) {
        return { success: false, error: 'Parent folder not found' };
      }
      const parent = parentDoc.data() as DriveFolderDoc;
      if (parent.ownerId !== user.uid) {
        return { success: false, error: 'Access denied to parent folder' };
      }
      parentPath = parent.path;
      depth = parent.depth + 1;
    }

    const folderDoc: DriveFolderDoc = {
      id: '',
      name: input.name,
      parentId: input.parentId || null,
      path: `${parentPath}/${input.name.toLowerCase().replace(/\s+/g, '-')}`,
      depth,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      isSystemFolder: false,
      category: input.category || 'custom',
      icon: input.icon,
      color: input.color,
      fileCount: 0,
      totalSize: 0,
      isShared: false,
      shareIds: [],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    const docRef = await db.collection(COLLECTIONS.FOLDERS).add(folderDoc);
    await docRef.update({ id: docRef.id });
    folderDoc.id = docRef.id;

    logger.info('Folder created', { userId: user.uid, folderId: docRef.id, name: input.name });
    return { success: true, data: toFolder(folderDoc) };
  } catch (error) {
    logger.error('Failed to create folder', { error, input });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create folder' };
  }
}

/**
 * Get folder contents (files + subfolders)
 */
export async function getFolderContents(
  folderId: string | null,
  options?: { category?: DriveCategory; sortBy?: 'name' | 'date' | 'size' }
): Promise<DriveActionResult<DriveListResult>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    // Initialize system folders if this is the root view
    if (folderId === null) {
      await initializeSystemFolders();
    }

    // Get subfolders
    let foldersQuery = db
      .collection(COLLECTIONS.FOLDERS)
      .where('ownerId', '==', user.uid)
      .where('parentId', '==', folderId)
      .where('isDeleted', '==', false);

    const foldersSnapshot = await foldersQuery.get();
    const folders = foldersSnapshot.docs.map((doc) => toFolder(doc.data() as DriveFolderDoc));

    // Get files
    let filesQuery = db
      .collection(COLLECTIONS.FILES)
      .where('ownerId', '==', user.uid)
      .where('folderId', '==', folderId)
      .where('isDeleted', '==', false);

    if (options?.category) {
      filesQuery = filesQuery.where('category', '==', options.category);
    }

    const filesSnapshot = await filesQuery.get();
    const files = filesSnapshot.docs.map((doc) => toFile(doc.data() as DriveFileDoc));

    // Sort
    const sortBy = options?.sortBy || 'date';
    if (sortBy === 'name') {
      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'date') {
      folders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sortBy === 'size') {
      files.sort((a, b) => b.size - a.size);
    }

    // Build breadcrumbs
    const breadcrumbs: Array<{ id: string; name: string; path: string }> = [];
    if (folderId) {
      let currentId: string | null = folderId;
      while (currentId) {
        const folderDoc = await db.collection(COLLECTIONS.FOLDERS).doc(currentId).get();
        if (!folderDoc.exists) break;
        const folder = folderDoc.data() as DriveFolderDoc;
        breadcrumbs.unshift({ id: folder.id, name: folder.name, path: folder.path });
        currentId = folder.parentId;
      }
    }

    // Calculate totals
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalCount = folders.length + files.length;

    return {
      success: true,
      data: { folders, files, breadcrumbs, totalSize, totalCount },
    };
  } catch (error) {
    logger.error('Failed to get folder contents', { error, folderId });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get folder contents' };
  }
}

/**
 * Get folder tree for navigation
 */
export async function getFolderTree(): Promise<DriveActionResult<DriveFolder[]>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    // Initialize system folders first
    await initializeSystemFolders();

    const snapshot = await db
      .collection(COLLECTIONS.FOLDERS)
      .where('ownerId', '==', user.uid)
      .where('isDeleted', '==', false)
      .orderBy('depth', 'asc')
      .get();

    const folders = snapshot.docs.map((doc) => toFolder(doc.data() as DriveFolderDoc));
    return { success: true, data: folders };
  } catch (error) {
    logger.error('Failed to get folder tree', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get folder tree' };
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Upload a file
 */
export async function uploadFile(formData: FormData): Promise<DriveActionResult<DriveFile>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const storageService = getDriveStorageService();
    const now = Date.now();

    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;
    const category = (formData.get('category') as DriveCategory) || 'custom';
    const description = formData.get('description') as string | undefined;
    const tagsJson = formData.get('tags') as string | undefined;
    const tags = tagsJson ? JSON.parse(tagsJson) : [];

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Get folder path for the file
    let folderPath = '';
    if (folderId) {
      const folderDoc = await db.collection(COLLECTIONS.FOLDERS).doc(folderId).get();
      if (folderDoc.exists) {
        folderPath = (folderDoc.data() as DriveFolderDoc).path;
      }
    }

    // Upload to storage
    const uploadResult = await storageService.uploadFile({
      userId: user.uid,
      userEmail: user.email || '',
      file: {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
      category,
      folderId,
      description,
      tags,
    });

    if (!uploadResult.success || !uploadResult.storagePath || !uploadResult.downloadUrl) {
      return { success: false, error: uploadResult.error || 'Upload failed' };
    }

    // Create file record in Firestore
    const fileDoc: DriveFileDoc = {
      id: '',
      name: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: uploadResult.storagePath,
      downloadUrl: uploadResult.downloadUrl,
      folderId: folderId || null,
      path: `${folderPath}/${file.name}`,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      category,
      tags,
      description,
      isShared: false,
      shareIds: [],
      viewCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    const docRef = await db.collection(COLLECTIONS.FILES).add(fileDoc);
    await docRef.update({ id: docRef.id });
    fileDoc.id = docRef.id;

    // Update folder aggregates
    if (folderId) {
      await updateFolderAggregates(db, folderId);
    }

    logger.info('File uploaded', { userId: user.uid, fileId: docRef.id, name: file.name, size: file.size });
    return { success: true, data: toFile(fileDoc) };
  } catch (error) {
    logger.error('Failed to upload file', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

/**
 * Upload file from URL
 */
export async function uploadFileFromUrl(
  url: string,
  folderId?: string | null,
  category?: DriveCategory
): Promise<DriveActionResult<DriveFile>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const storageService = getDriveStorageService();
    const now = Date.now();

    // Upload from URL
    const uploadResult = await storageService.uploadFromUrl(url, {
      userId: user.uid,
      userEmail: user.email || '',
      category: category || 'custom',
      folderId,
    });

    if (!uploadResult.success || !uploadResult.storagePath || !uploadResult.downloadUrl) {
      return { success: false, error: uploadResult.error || 'Upload from URL failed' };
    }

    // Extract filename from storage path
    const pathParts = uploadResult.storagePath.split('/');
    const filename = pathParts[pathParts.length - 1].replace(/^\d+_/, '');

    // Get folder path
    let folderPath = '';
    if (folderId) {
      const folderDoc = await db.collection(COLLECTIONS.FOLDERS).doc(folderId).get();
      if (folderDoc.exists) {
        folderPath = (folderDoc.data() as DriveFolderDoc).path;
      }
    }

    // Get file metadata from storage
    const metadata = await storageService.getFileMetadata(uploadResult.storagePath);
    const size = metadata.success ? Number(metadata.metadata?.size || 0) : 0;
    const mimeType = metadata.success ? String(metadata.metadata?.contentType || 'application/octet-stream') : 'application/octet-stream';

    // Create file record
    const fileDoc: DriveFileDoc = {
      id: '',
      name: filename,
      mimeType,
      size,
      storagePath: uploadResult.storagePath,
      downloadUrl: uploadResult.downloadUrl,
      folderId: folderId || null,
      path: `${folderPath}/${filename}`,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      category: category || 'custom',
      tags: [],
      metadata: { sourceUrl: url },
      isShared: false,
      shareIds: [],
      viewCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    const docRef = await db.collection(COLLECTIONS.FILES).add(fileDoc);
    await docRef.update({ id: docRef.id });
    fileDoc.id = docRef.id;

    // Update folder aggregates
    if (folderId) {
      await updateFolderAggregates(db, folderId);
    }

    logger.info('File uploaded from URL', { userId: user.uid, fileId: docRef.id, url });
    return { success: true, data: toFile(fileDoc) };
  } catch (error) {
    logger.error('Failed to upload from URL', { error, url });
    return { success: false, error: error instanceof Error ? error.message : 'Upload from URL failed' };
  }
}

/**
 * Get file details
 */
export async function getFile(fileId: string): Promise<DriveActionResult<DriveFile>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    const doc = await db.collection(COLLECTIONS.FILES).doc(fileId).get();
    if (!doc.exists) {
      return { success: false, error: 'File not found' };
    }

    const fileDoc = doc.data() as DriveFileDoc;
    if (fileDoc.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, data: toFile(fileDoc) };
  } catch (error) {
    logger.error('Failed to get file', { error, fileId });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get file' };
  }
}

/**
 * Search files
 */
export async function searchFiles(input: SearchFilesInput): Promise<DriveActionResult<DriveFile[]>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    // Start with base query
    let query = db
      .collection(COLLECTIONS.FILES)
      .where('ownerId', '==', user.uid)
      .where('isDeleted', '==', input.includeDeleted ? true : false);

    if (input.category) {
      query = query.where('category', '==', input.category);
    }

    if (input.folderId !== undefined) {
      query = query.where('folderId', '==', input.folderId);
    }

    const snapshot = await query.get();

    // Filter by name/query (Firestore doesn't support full-text search)
    const queryLower = input.query.toLowerCase();
    const files = snapshot.docs
      .map((doc) => toFile(doc.data() as DriveFileDoc))
      .filter((file) => {
        const nameMatch = file.name.toLowerCase().includes(queryLower);
        const descMatch = file.description?.toLowerCase().includes(queryLower);
        const tagMatch = file.tags.some((tag) => tag.toLowerCase().includes(queryLower));
        return nameMatch || descMatch || tagMatch;
      });

    return { success: true, data: files };
  } catch (error) {
    logger.error('Failed to search files', { error, input });
    return { success: false, error: error instanceof Error ? error.message : 'Search failed' };
  }
}

/**
 * Get recent files
 */
export async function getRecentFiles(limit: number = 10): Promise<DriveActionResult<DriveFile[]>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.FILES)
      .where('ownerId', '==', user.uid)
      .where('isDeleted', '==', false)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    const files = snapshot.docs.map((doc) => toFile(doc.data() as DriveFileDoc));
    return { success: true, data: files };
  } catch (error) {
    logger.error('Failed to get recent files', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get recent files' };
  }
}

// ============================================================================
// ITEM OPERATIONS (Files or Folders)
// ============================================================================

/**
 * Rename a file or folder
 */
export async function renameItem(input: RenameItemInput): Promise<DriveActionResult> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const collection = input.itemType === 'file' ? COLLECTIONS.FILES : COLLECTIONS.FOLDERS;

    const doc = await db.collection(collection).doc(input.itemId).get();
    if (!doc.exists) {
      return { success: false, error: `${input.itemType} not found` };
    }

    const data = doc.data() as DriveFileDoc | DriveFolderDoc;
    if (data.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    // Update name and path
    const oldPath = data.path;
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = input.newName.toLowerCase().replace(/\s+/g, '-');
    const newPath = pathParts.join('/');

    await db.collection(collection).doc(input.itemId).update({
      name: input.newName,
      path: newPath,
      updatedAt: Date.now(),
    });

    // If it's a folder, update all children paths
    if (input.itemType === 'folder') {
      await updateChildPaths(db, user.uid, oldPath, newPath);
    }

    logger.info('Item renamed', { userId: user.uid, itemType: input.itemType, itemId: input.itemId, newName: input.newName });
    return { success: true };
  } catch (error) {
    logger.error('Failed to rename item', { error, input });
    return { success: false, error: error instanceof Error ? error.message : 'Rename failed' };
  }
}

/**
 * Move a file or folder
 */
export async function moveItem(input: MoveItemInput): Promise<DriveActionResult> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const collection = input.itemType === 'file' ? COLLECTIONS.FILES : COLLECTIONS.FOLDERS;

    const doc = await db.collection(collection).doc(input.itemId).get();
    if (!doc.exists) {
      return { success: false, error: `${input.itemType} not found` };
    }

    const data = doc.data() as DriveFileDoc | DriveFolderDoc;
    if (data.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    const oldFolderId = input.itemType === 'file' ? (data as DriveFileDoc).folderId : (data as DriveFolderDoc).parentId;

    // Get new parent path
    let newParentPath = '';
    let newDepth = 0;
    if (input.newParentId) {
      const parentDoc = await db.collection(COLLECTIONS.FOLDERS).doc(input.newParentId).get();
      if (!parentDoc.exists) {
        return { success: false, error: 'Destination folder not found' };
      }
      const parent = parentDoc.data() as DriveFolderDoc;
      if (parent.ownerId !== user.uid) {
        return { success: false, error: 'Access denied to destination folder' };
      }

      // Prevent moving folder into itself or its children
      if (input.itemType === 'folder' && parent.path.startsWith(data.path)) {
        return { success: false, error: 'Cannot move folder into itself' };
      }

      newParentPath = parent.path;
      newDepth = parent.depth + 1;
    }

    const name = data.name.toLowerCase().replace(/\s+/g, '-');
    const oldPath = data.path;
    const newPath = `${newParentPath}/${name}`;

    const updateData: Record<string, unknown> = {
      path: newPath,
      updatedAt: Date.now(),
    };

    if (input.itemType === 'file') {
      updateData.folderId = input.newParentId;
    } else {
      updateData.parentId = input.newParentId;
      updateData.depth = newDepth;
    }

    await db.collection(collection).doc(input.itemId).update(updateData);

    // Update children paths for folders
    if (input.itemType === 'folder') {
      await updateChildPaths(db, user.uid, oldPath, newPath);
    }

    // Update aggregates for old and new folders
    if (oldFolderId) {
      await updateFolderAggregates(db, oldFolderId);
    }
    if (input.newParentId) {
      await updateFolderAggregates(db, input.newParentId);
    }

    logger.info('Item moved', { userId: user.uid, itemType: input.itemType, itemId: input.itemId, newParentId: input.newParentId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to move item', { error, input });
    return { success: false, error: error instanceof Error ? error.message : 'Move failed' };
  }
}

/**
 * Delete a file or folder (soft delete)
 */
export async function deleteItem(itemType: DriveItemType, itemId: string): Promise<DriveActionResult> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const collection = itemType === 'file' ? COLLECTIONS.FILES : COLLECTIONS.FOLDERS;

    const doc = await db.collection(collection).doc(itemId).get();
    if (!doc.exists) {
      return { success: false, error: `${itemType} not found` };
    }

    const data = doc.data() as DriveFileDoc | DriveFolderDoc;
    if (data.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    const folderId = itemType === 'file' ? (data as DriveFileDoc).folderId : (data as DriveFolderDoc).parentId;

    await db.collection(collection).doc(itemId).update({
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user.uid,
    });

    // If folder, soft delete all children
    if (itemType === 'folder') {
      await softDeleteChildren(db, user.uid, data.path);
    }

    // Update folder aggregates
    if (folderId) {
      await updateFolderAggregates(db, folderId);
    }

    logger.info('Item deleted', { userId: user.uid, itemType, itemId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to delete item', { error, itemType, itemId });
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
}

/**
 * Restore a deleted item
 */
export async function restoreItem(itemType: DriveItemType, itemId: string): Promise<DriveActionResult> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const collection = itemType === 'file' ? COLLECTIONS.FILES : COLLECTIONS.FOLDERS;

    const doc = await db.collection(collection).doc(itemId).get();
    if (!doc.exists) {
      return { success: false, error: `${itemType} not found` };
    }

    const data = doc.data() as DriveFileDoc | DriveFolderDoc;
    if (data.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    await db.collection(collection).doc(itemId).update({
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: Date.now(),
    });

    // Update folder aggregates
    const folderId = itemType === 'file' ? (data as DriveFileDoc).folderId : (data as DriveFolderDoc).parentId;
    if (folderId) {
      await updateFolderAggregates(db, folderId);
    }

    logger.info('Item restored', { userId: user.uid, itemType, itemId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to restore item', { error, itemType, itemId });
    return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
  }
}

/**
 * Permanently delete (hard delete)
 */
export async function permanentlyDelete(itemType: DriveItemType, itemId: string): Promise<DriveActionResult> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const storageService = getDriveStorageService();
    const collection = itemType === 'file' ? COLLECTIONS.FILES : COLLECTIONS.FOLDERS;

    const doc = await db.collection(collection).doc(itemId).get();
    if (!doc.exists) {
      return { success: false, error: `${itemType} not found` };
    }

    const data = doc.data() as DriveFileDoc | DriveFolderDoc;
    if (data.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    if (itemType === 'file') {
      // Delete from storage
      await storageService.deleteFile((data as DriveFileDoc).storagePath);
    } else {
      // Permanently delete all children
      await permanentlyDeleteChildren(db, storageService, user.uid, data.path);
    }

    // Delete shares
    const sharesSnapshot = await db
      .collection(COLLECTIONS.SHARES)
      .where('targetId', '==', itemId)
      .get();
    const batch = db.batch();
    sharesSnapshot.docs.forEach((share) => batch.delete(share.ref));

    // Delete the item
    batch.delete(db.collection(collection).doc(itemId));
    await batch.commit();

    logger.info('Item permanently deleted', { userId: user.uid, itemType, itemId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to permanently delete', { error, itemType, itemId });
    return { success: false, error: error instanceof Error ? error.message : 'Permanent delete failed' };
  }
}

/**
 * Get trash items
 */
export async function getTrash(): Promise<DriveActionResult<DriveListResult>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    const [filesSnapshot, foldersSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.FILES).where('ownerId', '==', user.uid).where('isDeleted', '==', true).get(),
      db.collection(COLLECTIONS.FOLDERS).where('ownerId', '==', user.uid).where('isDeleted', '==', true).get(),
    ]);

    const files = filesSnapshot.docs.map((doc) => toFile(doc.data() as DriveFileDoc));
    const folders = foldersSnapshot.docs.map((doc) => toFolder(doc.data() as DriveFolderDoc));

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalCount = files.length + folders.length;

    return {
      success: true,
      data: { folders, files, breadcrumbs: [], totalSize, totalCount },
    };
  } catch (error) {
    logger.error('Failed to get trash', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get trash' };
  }
}

/**
 * Empty trash
 */
export async function emptyTrash(): Promise<DriveActionResult<{ deletedCount: number }>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const storageService = getDriveStorageService();

    const [filesSnapshot, foldersSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.FILES).where('ownerId', '==', user.uid).where('isDeleted', '==', true).get(),
      db.collection(COLLECTIONS.FOLDERS).where('ownerId', '==', user.uid).where('isDeleted', '==', true).get(),
    ]);

    // Delete files from storage
    for (const doc of filesSnapshot.docs) {
      const file = doc.data() as DriveFileDoc;
      await storageService.deleteFile(file.storagePath);
    }

    // Delete from Firestore
    const batch = db.batch();
    filesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    foldersSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    const deletedCount = filesSnapshot.size + foldersSnapshot.size;
    logger.info('Trash emptied', { userId: user.uid, deletedCount });
    return { success: true, data: { deletedCount } };
  } catch (error) {
    logger.error('Failed to empty trash', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to empty trash' };
  }
}

// ============================================================================
// SHARING OPERATIONS
// ============================================================================

/**
 * Create a share
 */
export async function createShare(input: CreateShareInput): Promise<DriveActionResult<DriveShareLinkResult>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const now = Date.now();

    // Get target item
    const collection = input.targetType === 'file' ? COLLECTIONS.FILES : COLLECTIONS.FOLDERS;
    const targetDoc = await db.collection(collection).doc(input.targetId).get();
    if (!targetDoc.exists) {
      return { success: false, error: `${input.targetType} not found` };
    }

    const target = targetDoc.data() as DriveFileDoc | DriveFolderDoc;
    if (target.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    // Generate share token
    const shareToken = generateShareToken();

    // Hash password if provided
    let passwordHash: string | undefined;
    if (input.password) {
      passwordHash = await hashSharePassword(input.password);
    }

    // Create share document
    const shareDoc: DriveShareDoc = {
      id: '',
      targetType: input.targetType,
      targetId: input.targetId,
      targetPath: target.path,
      targetName: target.name,
      isPublic: input.accessControl === 'public' || input.accessControl === 'link-only',
      shareToken,
      accessControl: input.accessControl,
      accessLevel: input.accessLevel,
      allowedUsers: (input.allowedUsers || []).map((u) => ({
        email: u.email,
        name: u.name ?? undefined,
        accessLevel: u.accessLevel || input.accessLevel,
        invitedAt: now,
        invitedBy: user.uid,
      })),
      passwordHash,
      expiresAt: input.expiresAt?.getTime(),
      maxDownloads: input.maxDownloads,
      viewCount: 0,
      downloadCount: 0,
      accessLog: [],
      createdBy: user.uid,
      createdByEmail: user.email || '',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    const docRef = await db.collection(COLLECTIONS.SHARES).add(shareDoc);
    await docRef.update({ id: docRef.id });

    // Update target item's share status
    await db.collection(collection).doc(input.targetId).update({
      isShared: true,
      shareIds: [...target.shareIds, docRef.id],
      updatedAt: now,
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai'}/api/drive/share/${shareToken}`;

    logger.info('Share created', { userId: user.uid, shareId: docRef.id, targetType: input.targetType, targetId: input.targetId });
    return {
      success: true,
      data: {
        shareId: docRef.id,
        shareToken,
        shareUrl,
        expiresAt: input.expiresAt,
      },
    };
  } catch (error) {
    logger.error('Failed to create share', { error, input });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create share' };
  }
}

/**
 * Update share settings
 */
export async function updateShare(input: UpdateShareInput): Promise<DriveActionResult<DriveShare>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const now = Date.now();

    const doc = await db.collection(COLLECTIONS.SHARES).doc(input.shareId).get();
    if (!doc.exists) {
      return { success: false, error: 'Share not found' };
    }

    const share = doc.data() as DriveShareDoc;
    if (share.createdBy !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    const updates: Partial<DriveShareDoc> = { updatedAt: now };

    if (input.accessControl !== undefined) {
      updates.accessControl = input.accessControl;
      updates.isPublic = input.accessControl === 'public' || input.accessControl === 'link-only';
    }
    if (input.accessLevel !== undefined) {
      updates.accessLevel = input.accessLevel;
    }
    if (input.password !== undefined) {
      updates.passwordHash = input.password ? await hashSharePassword(input.password) : undefined;
    }
    if (input.expiresAt !== undefined) {
      updates.expiresAt = input.expiresAt?.getTime();
    }
    if (input.maxDownloads !== undefined) {
      updates.maxDownloads = input.maxDownloads || undefined;
    }

    // Handle user additions
    let allowedUsers = [...share.allowedUsers];
    if (input.addUsers) {
      for (const newUser of input.addUsers) {
        if (!allowedUsers.some((u) => u.email === newUser.email)) {
          allowedUsers.push({
            email: newUser.email,
            name: newUser.name ?? undefined,
            accessLevel: newUser.accessLevel || share.accessLevel,
            invitedAt: now,
            invitedBy: user.uid,
          });
        }
      }
    }

    // Handle user removals
    if (input.removeUserEmails) {
      allowedUsers = allowedUsers.filter((u) => !input.removeUserEmails!.includes(u.email));
    }

    updates.allowedUsers = allowedUsers;

    await db.collection(COLLECTIONS.SHARES).doc(input.shareId).update(updates);

    const updatedDoc = await db.collection(COLLECTIONS.SHARES).doc(input.shareId).get();
    const updatedShare = toShare(updatedDoc.data() as DriveShareDoc);

    logger.info('Share updated', { userId: user.uid, shareId: input.shareId });
    return { success: true, data: updatedShare };
  } catch (error) {
    logger.error('Failed to update share', { error, input });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update share' };
  }
}

/**
 * Revoke a share
 */
export async function revokeShare(shareId: string): Promise<DriveActionResult> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const now = Date.now();

    const doc = await db.collection(COLLECTIONS.SHARES).doc(shareId).get();
    if (!doc.exists) {
      return { success: false, error: 'Share not found' };
    }

    const share = doc.data() as DriveShareDoc;
    if (share.createdBy !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    await db.collection(COLLECTIONS.SHARES).doc(shareId).update({
      isActive: false,
      revokedAt: now,
      revokedBy: user.uid,
      updatedAt: now,
    });

    // Update target item
    const collection = share.targetType === 'file' ? COLLECTIONS.FILES : COLLECTIONS.FOLDERS;
    const targetDoc = await db.collection(collection).doc(share.targetId).get();
    if (targetDoc.exists) {
      const target = targetDoc.data() as DriveFileDoc | DriveFolderDoc;
      const remainingShareIds = target.shareIds.filter((id) => id !== shareId);
      await db.collection(collection).doc(share.targetId).update({
        shareIds: remainingShareIds,
        isShared: remainingShareIds.length > 0,
        updatedAt: now,
      });
    }

    logger.info('Share revoked', { userId: user.uid, shareId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to revoke share', { error, shareId });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to revoke share' };
  }
}

/**
 * Get shares for an item
 */
export async function getSharesForItem(
  itemType: DriveItemType,
  itemId: string
): Promise<DriveActionResult<DriveShare[]>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.SHARES)
      .where('targetId', '==', itemId)
      .where('isActive', '==', true)
      .get();

    const shares = snapshot.docs
      .map((doc) => toShare(doc.data() as DriveShareDoc))
      .filter((share) => share.createdBy === user.uid);

    return { success: true, data: shares };
  } catch (error) {
    logger.error('Failed to get shares', { error, itemType, itemId });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get shares' };
  }
}

/**
 * Get all shares created by user
 */
export async function getMyShares(): Promise<DriveActionResult<DriveShare[]>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.SHARES)
      .where('createdBy', '==', user.uid)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const shares = snapshot.docs.map((doc) => toShare(doc.data() as DriveShareDoc));
    return { success: true, data: shares };
  } catch (error) {
    logger.error('Failed to get my shares', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get shares' };
  }
}

/**
 * Generate quick share link (creates a link-only share)
 */
export async function generateQuickShareLink(
  itemType: DriveItemType,
  itemId: string
): Promise<DriveActionResult<DriveShareLinkResult>> {
  return createShare({
    targetType: itemType,
    targetId: itemId,
    accessControl: 'link-only',
    accessLevel: 'view',
  });
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<DriveActionResult<DriveStorageStats>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();

    const [filesSnapshot, foldersSnapshot, recentSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.FILES).where('ownerId', '==', user.uid).where('isDeleted', '==', false).get(),
      db.collection(COLLECTIONS.FOLDERS).where('ownerId', '==', user.uid).where('isDeleted', '==', false).get(),
      db
        .collection(COLLECTIONS.FILES)
        .where('ownerId', '==', user.uid)
        .where('isDeleted', '==', false)
        .orderBy('updatedAt', 'desc')
        .limit(5)
        .get(),
    ]);

    const files = filesSnapshot.docs.map((doc) => toFile(doc.data() as DriveFileDoc));
    const recentFiles = recentSnapshot.docs.map((doc) => toFile(doc.data() as DriveFileDoc));

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const byCategory: Record<DriveCategory, { size: number; count: number }> = {
      agents: { size: 0, count: 0 },
      qr: { size: 0, count: 0 },
      images: { size: 0, count: 0 },
      documents: { size: 0, count: 0 },
      custom: { size: 0, count: 0 },
    };

    for (const file of files) {
      byCategory[file.category].size += file.size;
      byCategory[file.category].count += 1;
    }

    return {
      success: true,
      data: {
        totalSize,
        fileCount: files.length,
        folderCount: foldersSnapshot.size,
        byCategory,
        recentFiles,
      },
    };
  } catch (error) {
    logger.error('Failed to get storage stats', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get stats' };
  }
}

/**
 * Duplicate a file
 */
export async function duplicateFile(fileId: string, newName?: string): Promise<DriveActionResult<DriveFile>> {
  try {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const db = getAdminFirestore();
    const storageService = getDriveStorageService();
    const now = Date.now();

    const doc = await db.collection(COLLECTIONS.FILES).doc(fileId).get();
    if (!doc.exists) {
      return { success: false, error: 'File not found' };
    }

    const original = doc.data() as DriveFileDoc;
    if (original.ownerId !== user.uid) {
      return { success: false, error: 'Access denied' };
    }

    // Copy file in storage
    const duplicateName = newName || `Copy of ${original.name}`;
    const copyResult = await storageService.copyFile(
      original.storagePath,
      user.uid,
      original.category,
      duplicateName,
      original.folderId
    );

    if (!copyResult.success || !copyResult.newStoragePath || !copyResult.newDownloadUrl) {
      return { success: false, error: copyResult.error || 'Failed to copy file' };
    }

    // Create new file record
    const newFileDoc: DriveFileDoc = {
      ...original,
      id: '',
      name: duplicateName,
      storagePath: copyResult.newStoragePath,
      downloadUrl: copyResult.newDownloadUrl,
      isShared: false,
      shareIds: [],
      viewCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const newDocRef = await db.collection(COLLECTIONS.FILES).add(newFileDoc);
    await newDocRef.update({ id: newDocRef.id });
    newFileDoc.id = newDocRef.id;

    // Update folder aggregates
    if (original.folderId) {
      await updateFolderAggregates(db, original.folderId);
    }

    logger.info('File duplicated', { userId: user.uid, originalId: fileId, newId: newDocRef.id });
    return { success: true, data: toFile(newFileDoc) };
  } catch (error) {
    logger.error('Failed to duplicate file', { error, fileId });
    return { success: false, error: error instanceof Error ? error.message : 'Duplicate failed' };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update folder aggregates (file count and total size)
 */
async function updateFolderAggregates(
  db: FirebaseFirestore.Firestore,
  folderId: string
): Promise<void> {
  try {
    const filesSnapshot = await db
      .collection(COLLECTIONS.FILES)
      .where('folderId', '==', folderId)
      .where('isDeleted', '==', false)
      .get();

    const fileCount = filesSnapshot.size;
    const totalSize = filesSnapshot.docs.reduce((sum, doc) => sum + (doc.data() as DriveFileDoc).size, 0);

    await db.collection(COLLECTIONS.FOLDERS).doc(folderId).update({
      fileCount,
      totalSize,
      updatedAt: Date.now(),
    });
  } catch (error) {
    logger.warn('Failed to update folder aggregates', { error, folderId });
  }
}

/**
 * Update child paths when a folder is renamed/moved
 */
async function updateChildPaths(
  db: FirebaseFirestore.Firestore,
  ownerId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  try {
    // Update child folders
    const foldersSnapshot = await db
      .collection(COLLECTIONS.FOLDERS)
      .where('ownerId', '==', ownerId)
      .get();

    const batch = db.batch();
    for (const doc of foldersSnapshot.docs) {
      const folder = doc.data() as DriveFolderDoc;
      if (folder.path.startsWith(oldPath + '/')) {
        batch.update(doc.ref, {
          path: folder.path.replace(oldPath, newPath),
          updatedAt: Date.now(),
        });
      }
    }

    // Update child files
    const filesSnapshot = await db
      .collection(COLLECTIONS.FILES)
      .where('ownerId', '==', ownerId)
      .get();

    for (const doc of filesSnapshot.docs) {
      const file = doc.data() as DriveFileDoc;
      if (file.path.startsWith(oldPath + '/')) {
        batch.update(doc.ref, {
          path: file.path.replace(oldPath, newPath),
          updatedAt: Date.now(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    logger.warn('Failed to update child paths', { error, oldPath, newPath });
  }
}

/**
 * Soft delete all children of a folder
 */
async function softDeleteChildren(
  db: FirebaseFirestore.Firestore,
  ownerId: string,
  folderPath: string
): Promise<void> {
  try {
    const now = Date.now();
    const batch = db.batch();

    // Soft delete child folders
    const foldersSnapshot = await db
      .collection(COLLECTIONS.FOLDERS)
      .where('ownerId', '==', ownerId)
      .where('isDeleted', '==', false)
      .get();

    for (const doc of foldersSnapshot.docs) {
      const folder = doc.data() as DriveFolderDoc;
      if (folder.path.startsWith(folderPath + '/')) {
        batch.update(doc.ref, { isDeleted: true, deletedAt: now, deletedBy: ownerId });
      }
    }

    // Soft delete child files
    const filesSnapshot = await db
      .collection(COLLECTIONS.FILES)
      .where('ownerId', '==', ownerId)
      .where('isDeleted', '==', false)
      .get();

    for (const doc of filesSnapshot.docs) {
      const file = doc.data() as DriveFileDoc;
      if (file.path.startsWith(folderPath + '/')) {
        batch.update(doc.ref, { isDeleted: true, deletedAt: now, deletedBy: ownerId });
      }
    }

    await batch.commit();
  } catch (error) {
    logger.warn('Failed to soft delete children', { error, folderPath });
  }
}

/**
 * Permanently delete all children of a folder
 */
async function permanentlyDeleteChildren(
  db: FirebaseFirestore.Firestore,
  storageService: ReturnType<typeof getDriveStorageService>,
  ownerId: string,
  folderPath: string
): Promise<void> {
  try {
    // Delete child files from storage and Firestore
    const filesSnapshot = await db.collection(COLLECTIONS.FILES).where('ownerId', '==', ownerId).get();

    for (const doc of filesSnapshot.docs) {
      const file = doc.data() as DriveFileDoc;
      if (file.path.startsWith(folderPath + '/')) {
        await storageService.deleteFile(file.storagePath);
        await doc.ref.delete();
      }
    }

    // Delete child folders from Firestore
    const foldersSnapshot = await db.collection(COLLECTIONS.FOLDERS).where('ownerId', '==', ownerId).get();

    for (const doc of foldersSnapshot.docs) {
      const folder = doc.data() as DriveFolderDoc;
      if (folder.path.startsWith(folderPath + '/')) {
        await doc.ref.delete();
      }
    }
  } catch (error) {
    logger.warn('Failed to permanently delete children', { error, folderPath });
  }
}
