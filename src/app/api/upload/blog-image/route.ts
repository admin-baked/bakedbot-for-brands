export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = 'bakedbot-prod.appspot.com';

/**
 * POST /api/upload/blog-image
 * Upload a blog post image to Firebase Storage.
 * Request: FormData with file, orgId, and optional postId
 * Response: { success: boolean; url?: string; fileId?: string; error?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireUser();
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const orgId = formData.get('orgId') as string;
        const postId = formData.get('postId') as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
        }

        if (!orgId) {
            return NextResponse.json({ success: false, error: 'Organization ID is required' }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Only JPG, PNG, WebP, and GIF images are allowed' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, error: 'File size must be less than 5MB' }, { status: 413 });
        }

        const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
        const fileId = uuidv4();
        const filename = `${fileId}.${ext}`;
        const folder = postId ? `blog/${orgId}/${postId}` : `blog/${orgId}`;
        const path = `${folder}/${filename}`;

        const storage = getStorage();
        const bucket = storage.bucket(BUCKET_NAME);
        const fileRef = bucket.file(path);

        const buffer = await file.arrayBuffer();
        await fileRef.save(Buffer.from(buffer), {
            metadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000',
                metadata: {
                    uploadedBy: user.uid,
                    uploadedAt: new Date().toISOString(),
                    orgId,
                    ...(postId && { postId }),
                },
            },
        });

        await fileRef.makePublic();

        const cdnUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${path}`;

        logger.info(`[BlogImageUpload] Uploaded ${filename} for org ${orgId}`);

        return NextResponse.json({
            success: true,
            url: cdnUrl,
            fileId,
        });
    } catch (error) {
        logger.error('[BlogImageUpload] Error:', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ success: false, error: 'Failed to upload image' }, { status: 500 });
    }
}
