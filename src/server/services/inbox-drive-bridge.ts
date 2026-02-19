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
