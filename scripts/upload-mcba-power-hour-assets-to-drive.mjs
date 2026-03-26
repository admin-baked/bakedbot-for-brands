import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(ROOT, '.env.local');

const SUPER_ADMIN_OWNER_UID = 'LCP9qj7a6VQynPO18Md3tm6opvX2';
const SUPER_ADMIN_OWNER_EMAIL = 'martez@bakedbot.ai';

const FOLDER_NAME = 'MCBA Power Hour AMA';
const FOLDER_PATH = '/mcba-power-hour-ama';

const ASSETS = [
  {
    fileId: 'mcba_power_hour_ama_bakedbot_necann_recap_1',
    localPath: 'C:\\Users\\admin\\Downloads\\BakedBotNecannRecap1.mp4',
    fileName: 'BakedBotNecannRecap1.mp4',
    storagePath: 'campaigns/mcba-power-hour-ama/bakedbot-necann-recap-1.mp4',
    publicUrl: 'https://storage.googleapis.com/bakedbot-global-assets/campaigns/mcba-power-hour-ama/bakedbot-necann-recap-1.mp4',
  },
  {
    fileId: 'mcba_power_hour_ama_smokeyai_4',
    localPath: 'C:\\Users\\admin\\Downloads\\smokeyai-4.mp4',
    fileName: 'smokeyai-4.mp4',
    storagePath: 'campaigns/mcba-power-hour-ama/smokeyai-4.mp4',
    publicUrl: 'https://storage.googleapis.com/bakedbot-global-assets/campaigns/mcba-power-hour-ama/smokeyai-4.mp4',
  },
];

function parseServiceAccount(rawValue) {
  if (!rawValue) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return JSON.parse(Buffer.from(rawValue, 'base64').toString('utf8'));
  }
}

async function ensureFolder(db) {
  const existingFolder = await db
    .collection('drive_folders')
    .where('ownerId', '==', SUPER_ADMIN_OWNER_UID)
    .where('path', '==', FOLDER_PATH)
    .limit(1)
    .get();

  if (!existingFolder.empty) {
    const doc = existingFolder.docs[0];
    const folderId = doc.id;
    const now = Date.now();

    await db.collection('drive_folders').doc(folderId).set(
      {
        id: folderId,
        name: FOLDER_NAME,
        parentId: null,
        path: FOLDER_PATH,
        depth: 0,
        ownerId: SUPER_ADMIN_OWNER_UID,
        ownerEmail: SUPER_ADMIN_OWNER_EMAIL,
        isSystemFolder: false,
        category: 'custom',
        icon: 'Folder',
        updatedAt: now,
        isDeleted: false,
      },
      { merge: true }
    );

    return folderId;
  }

  const folderId = 'folder_mcba_power_hour_ama_martez';
  const now = Date.now();

  await db.collection('drive_folders').doc(folderId).set({
    id: folderId,
    name: FOLDER_NAME,
    parentId: null,
    path: FOLDER_PATH,
    depth: 0,
    ownerId: SUPER_ADMIN_OWNER_UID,
    ownerEmail: SUPER_ADMIN_OWNER_EMAIL,
    isSystemFolder: false,
    category: 'custom',
    icon: 'Folder',
    fileCount: 0,
    totalSize: 0,
    isShared: false,
    shareIds: [],
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  });

  return folderId;
}

async function resolveFileId(db, asset) {
  const existingFile = await db
    .collection('drive_files')
    .where('ownerId', '==', SUPER_ADMIN_OWNER_UID)
    .where('storagePath', '==', asset.storagePath)
    .limit(1)
    .get();

  if (!existingFile.empty) {
    return existingFile.docs[0].id;
  }

  return asset.fileId;
}

async function updateFolderAggregates(db, folderId) {
  const folderFiles = await db
    .collection('drive_files')
    .where('folderId', '==', folderId)
    .where('isDeleted', '==', false)
    .get();

  const fileCount = folderFiles.size;
  const totalSize = folderFiles.docs.reduce((sum, doc) => sum + Number(doc.data().size || 0), 0);

  await db.collection('drive_folders').doc(folderId).set(
    {
      fileCount,
      totalSize,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

async function main() {
  dotenv.config({ path: ENV_PATH });
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';

  const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '');

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: storageBucket,
    });
  }

  const db = getFirestore();
  const bucket = getStorage().bucket(storageBucket);
  const folderId = await ensureFolder(db);

  console.log(`Saving MCBA assets to Drive folder ${FOLDER_PATH} for ${SUPER_ADMIN_OWNER_EMAIL}`);

  for (const asset of ASSETS) {
    const absolutePath = resolve(asset.localPath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Asset not found: ${absolutePath}`);
    }

    const buffer = readFileSync(absolutePath);
    const storageFile = bucket.file(asset.storagePath);
    const fileId = await resolveFileId(db, asset);
    const now = Date.now();

    await storageFile.save(buffer, {
      contentType: 'video/mp4',
      metadata: {
        cacheControl: 'public, max-age=3600',
        metadata: {
          campaign: 'mcba_power_hour_ama',
          originalName: asset.fileName,
          ownerId: SUPER_ADMIN_OWNER_UID,
          ownerEmail: SUPER_ADMIN_OWNER_EMAIL,
          uploadedBy: 'upload-mcba-power-hour-assets-to-drive',
        },
      },
    });
    await storageFile.makePublic();

    const existingFileDoc = await db.collection('drive_files').doc(fileId).get();
    const createdAt = existingFileDoc.exists ? Number(existingFileDoc.data()?.createdAt || now) : now;

    await db.collection('drive_files').doc(fileId).set({
      id: fileId,
      name: asset.fileName,
      mimeType: 'video/mp4',
      size: buffer.length,
      storagePath: asset.storagePath,
      downloadUrl: asset.publicUrl,
      folderId,
      path: `${FOLDER_PATH}/${asset.fileName}`,
      ownerId: SUPER_ADMIN_OWNER_UID,
      ownerEmail: SUPER_ADMIN_OWNER_EMAIL,
      category: 'custom',
      tags: ['mcba', 'power-hour', 'ama', 'campaign', 'video'],
      description: 'MCBA Power Hour AMA campaign asset',
      metadata: {
        uploadedBy: 'upload-mcba-power-hour-assets-to-drive',
        campaign: 'mcba_power_hour_ama',
      },
      source: 'user_upload',
      isShared: false,
      shareIds: [],
      viewCount: 0,
      downloadCount: 0,
      createdAt,
      updatedAt: now,
      isDeleted: false,
    });

    console.log(`Uploaded ${asset.fileName}`);
    console.log(`  storagePath: ${asset.storagePath}`);
    console.log(`  driveFileId: ${fileId}`);
    console.log(`  folderId: ${folderId}`);
    console.log(`  ownerEmail: ${SUPER_ADMIN_OWNER_EMAIL}`);
    console.log(`  publicUrl: ${asset.publicUrl}`);
  }

  await updateFolderAggregates(db, folderId);
  console.log('MCBA Power Hour AMA assets are now available in Super Admin Drive.');
}

main().catch((error) => {
  console.error('Failed to upload MCBA assets:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
