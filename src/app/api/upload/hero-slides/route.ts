import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = 'bakedbot-prod.appspot.com';

/**
 * POST /api/upload/hero-slides
 * Upload a hero slide image to Firebase Storage
 * Request: FormData with file and orgId
 * Response: { success: boolean; url?: string; error?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireUser();
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const orgId = formData.get('orgId') as string;

        // Validation: file exists
        if (!file) {
            logger.warn('[HeroSlidesUpload] Missing file in request');
            return NextResponse.json(
                { success: false, error: 'File is required' },
                { status: 400 }
            );
        }

        // Validation: orgId exists
        if (!orgId) {
            logger.warn('[HeroSlidesUpload] Missing orgId in request');
            return NextResponse.json(
                { success: false, error: 'Organization ID is required' },
                { status: 400 }
            );
        }

        // Validation: mime type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            logger.warn(`[HeroSlidesUpload] Invalid file type: ${file.type}`);
            return NextResponse.json(
                { success: false, error: 'Only JPG, PNG, and WebP images are allowed' },
                { status: 400 }
            );
        }

        // Validation: file size
        if (file.size > MAX_FILE_SIZE) {
            logger.warn(`[HeroSlidesUpload] File too large: ${file.size} bytes`);
            return NextResponse.json(
                { success: false, error: 'File size must be less than 5MB' },
                { status: 413 }
            );
        }

        // Verify user org access
        const db = getAdminFirestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            logger.warn(`[HeroSlidesUpload] User ${user.uid} not found`);
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 403 }
            );
        }

        const userData = userDoc.data();
        const userOrgId = userData?.currentOrgId || userData?.orgId;
        if (userOrgId !== orgId) {
            logger.warn(
                `[HeroSlidesUpload] Org mismatch: user ${user.uid} (${userOrgId}) vs target (${orgId})`
            );
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Generate unique filename
        const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
        const filename = `${uuidv4()}.${ext}`;
        const path = `hero-slides/${orgId}/${filename}`;

        // Upload to Firebase Storage
        const storage = getStorage();
        const bucket = storage.bucket(BUCKET_NAME);
        const file_ref = bucket.file(path);

        const buffer = await file.arrayBuffer();
        await file_ref.save(Buffer.from(buffer), {
            metadata: {
                contentType: file.type,
                metadata: {
                    uploadedBy: user.uid,
                    uploadedAt: new Date().toISOString(),
                    orgId,
                },
            },
        });

        // Make file publicly readable
        await file_ref.makePublic();

        // Generate CDN URL
        const cdnUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${path}`;

        logger.info(
            `[HeroSlidesUpload] Uploaded image for org ${orgId} by user ${user.uid}: ${filename}`
        );

        return NextResponse.json({
            success: true,
            url: cdnUrl,
        });
    } catch (error) {
        logger.error('[HeroSlidesUpload] Error uploading file:', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}
