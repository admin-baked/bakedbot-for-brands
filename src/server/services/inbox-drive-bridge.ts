/**
 * Inbox → Drive Bridge
 *
 * Utility service that saves inbox artifact content to BakedBot Drive
 * and writes the resulting driveFileId back to the InboxArtifact Firestore doc.
 *
 * Usage:
 *   const driveFileId = await saveArtifactToDrive({ artifact, content, orgId, adminUserId, adminEmail });
 *   // driveFileId is now stored in drive_files AND written back to inbox_artifacts/{artifact.id}
 *
 * Categories:
 *   report      → documents
 *   campaign    → agents
 *   qr_code     → qr
 *   image       → images
 *   carousel    → agents
 *   default     → documents
 */

import { getStorage } from 'firebase-admin/storage';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InboxArtifactType } from '@/types/inbox';

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';

type DriveCategory = 'agents' | 'qr' | 'images' | 'documents' | 'custom';

function categoryForArtifactType(type: InboxArtifactType): DriveCategory {
  if (type === 'qr_code') return 'qr';
  if (type === 'carousel' || type === 'creative_content') return 'agents';
  return 'documents';
}

function mimeTypeForArtifactType(type: InboxArtifactType): string {
  if (type === 'qr_code') return 'image/png';
  return 'text/plain';
}

export interface SaveMediaUrlOptions {
  artifactId: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video';
  title: string;
  orgId: string;
  ownerId: string;
  ownerEmail: string;
  platform?: string;
}

/**
 * Register generated images/videos in BakedBot Drive.
 * Does NOT upload to Firebase Storage (avoids large file downloads).
 * Creates drive_files entries pointing to the external CDN URLs.
 * Fire-and-forget safe — returns null on failure.
 */
export async function saveMediaUrlsToDrive(
  opts: SaveMediaUrlOptions
): Promise<string | null> {
  try {
    const { artifactId, mediaUrls, mediaType, title, orgId, ownerId, ownerEmail, platform } = opts;
    if (!mediaUrls.length) return null;

    const db = getAdminFirestore();
    const category: DriveCategory = mediaType === 'image' ? 'images' : 'agents';
    const mimeType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
    const timestamp = Date.now();
    const safeName = title.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const filename = `${mediaType}_${safeName}_${timestamp}`;

    // Find or create a media folder for this org
    const folderSnap = await db.collection('drive_folders')
      .where('ownerId', '==', ownerId)
      .where('name', '==', mediaType === 'image' ? 'Generated Images' : 'Generated Videos')
      .limit(1)
      .get();

    let folderId: string | null = null;
    if (!folderSnap.empty) {
      folderId = folderSnap.docs[0].id;
    } else {
      const folderRef = db.collection('drive_folders').doc();
      folderId = folderRef.id;
      await folderRef.set({
        id: folderId,
        name: mediaType === 'image' ? 'Generated Images' : 'Generated Videos',
        ownerId,
        ownerEmail,
        orgId,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
      });
    }

    // Create a drive_files entry for the primary media URL
    const driveDocRef = db.collection('drive_files').doc();
    const driveFileId = driveDocRef.id;

    await driveDocRef.set({
      id: driveFileId,
      name: filename,
      mimeType,
      size: 0, // Unknown — not downloaded
      storagePath: null, // Externally hosted
      downloadUrl: mediaUrls[0],
      allUrls: mediaUrls,
      folderId,
      path: `/${mediaType === 'image' ? 'Generated Images' : 'Generated Videos'}/${filename}`,
      ownerId,
      ownerEmail,
      category,
      tags: ['inbox', mediaType, orgId, ...(platform ? [platform] : [])],
      description: `AI-generated ${mediaType}: ${title}`,
      metadata: { artifactId, orgId, platform, generatedAt: new Date().toISOString() },
      isShared: false,
      shareIds: [],
      viewCount: 0,
      downloadCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Write driveFileId back to the inbox_artifacts doc
    await db.collection('inbox_artifacts').doc(artifactId).update({
      driveFileId,
      updatedAt: new Date(),
    });

    logger.info('Media URLs saved to Drive', { artifactId, driveFileId, orgId, mediaType });
    return driveFileId;
  } catch (error) {
    logger.error('saveMediaUrlsToDrive failed', { artifactId: opts.artifactId, error });
    return null;
  }
}

export interface SaveArtifactOptions {
  artifactId: string;
  artifactType: InboxArtifactType;
  /** Text content (markdown/JSON) OR raw Buffer for binary (image/qr) */
  content: string | Buffer;
  filename: string;
  orgId: string;
  ownerId: string;
  ownerEmail: string;
}

/**
 * Save an inbox artifact's content to BakedBot Drive.
 *
 * Returns the driveFileId on success, or null on failure (non-blocking).
 * Always writes driveFileId back to the inbox_artifacts Firestore doc.
 */
export async function saveArtifactToDrive(
  opts: SaveArtifactOptions
): Promise<string | null> {
  try {
    const { artifactId, artifactType, content, filename, orgId, ownerId, ownerEmail } = opts;

    const db = getAdminFirestore();
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET_NAME);

    const category = categoryForArtifactType(artifactType);
    const mimeType = mimeTypeForArtifactType(artifactType);
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `drive/${ownerId}/${category}/${timestamp}_${safeName}`;

    // Upload to Firebase Storage
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      contentType: mimeType,
      metadata: {
        metadata: {
          userId: ownerId,
          userEmail: ownerEmail,
          category,
          originalName: filename,
          artifactId,
          orgId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Get signed download URL
    const [downloadUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    // Create drive_files Firestore document
    const driveDocRef = db.collection('drive_files').doc();
    const driveFileId = driveDocRef.id;

    await driveDocRef.set({
      id: driveFileId,
      name: filename,
      mimeType,
      size: buffer.length,
      storagePath,
      downloadUrl,
      folderId: null,
      path: `/${filename}`,
      ownerId,
      ownerEmail,
      category,
      tags: ['inbox', artifactType, orgId],
      description: `Auto-saved from inbox artifact ${artifactId}`,
      metadata: { artifactId, orgId },
      isShared: false,
      shareIds: [],
      viewCount: 0,
      downloadCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Write driveFileId back to the inbox_artifacts doc
    await db.collection('inbox_artifacts').doc(artifactId).update({
      driveFileId,
      updatedAt: new Date(),
    });

    logger.info('Artifact saved to Drive', { artifactId, driveFileId, orgId, category });
    return driveFileId;
  } catch (error) {
    logger.error('saveArtifactToDrive failed', { artifactId: opts.artifactId, error });
    return null;
  }
}
