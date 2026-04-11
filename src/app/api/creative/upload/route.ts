export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';

const BUCKET_NAME = 'bakedbot-global-assets';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

/**
 * Detect container format from file header bytes.
 * MPEG-TS (Twitch/streaming recordings) can't be seeked via HTTP,
 * which causes Remotion's OffthreadVideo to render a single still frame.
 */
function detectContainerIssues(buffer: Buffer): string | null {
    // MPEG-TS: sync byte 0x47 at offset 0 (and repeating every 188 bytes)
    if (buffer[0] === 0x47 && buffer.length > 188 && buffer[188] === 0x47) {
        return 'This video is in MPEG-TS format (common from Twitch/streaming recordings). ' +
            'Please convert to MP4 first using: ffmpeg -i input.ts -c:v libx264 -movflags +faststart output.mp4';
    }

    // Check for MP4 container with moov atom after mdat (non-faststart)
    if (buffer.length > 12) {
        const boxType = buffer.slice(4, 8).toString('ascii');
        if (boxType === 'ftyp') {
            // It's an MP4 — check moov vs mdat position
            let moovOffset = -1;
            let mdatOffset = -1;
            let pos = 0;
            while (pos < Math.min(buffer.length - 8, 100 * 1024 * 1024)) {
                const size = buffer.readUInt32BE(pos);
                const type = buffer.slice(pos + 4, pos + 8).toString('ascii');
                if (type === 'moov') moovOffset = pos;
                if (type === 'mdat') mdatOffset = pos;
                if (moovOffset >= 0 && mdatOffset >= 0) break;
                if (size < 8) break; // Avoid infinite loop on corrupt file
                pos += size;
            }
            if (moovOffset >= 0 && mdatOffset >= 0 && moovOffset > mdatOffset) {
                return 'This video is not optimized for streaming (moov atom at end). ' +
                    'Please re-encode with: ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4';
            }
        }
    }

    return null;
}

/**
 * POST /api/creative/upload
 *
 * Accepts a multipart file upload (video or image) and stores it in
 * Firebase Storage under drive/creative/{orgSlug}/. Returns a public
 * GCS URL that Remotion Lambda can access directly.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireUser();

        const formData = await request.formData();
        const file = formData.get('file');
        const orgSlug = formData.get('orgSlug');

        if (!file || typeof file === 'string') {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 },
            );
        }

        if (!orgSlug || typeof orgSlug !== 'string') {
            return NextResponse.json(
                { success: false, error: 'orgSlug is required' },
                { status: 400 },
            );
        }

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: `Unsupported file type: ${file.type}. Allowed: mp4, mov, webm, jpg, png, webp` },
                { status: 400 },
            );
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 },
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Validate video container format for Remotion compatibility
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
        if (isVideo) {
            const containerIssue = detectContainerIssues(buffer);
            if (containerIssue) {
                return NextResponse.json(
                    { success: false, error: containerIssue },
                    { status: 422 },
                );
            }
        }

        const sanitized = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase();
        const storagePath = `drive/creative/${orgSlug}/${Date.now()}-${sanitized}`;

        const bucket = getStorage().bucket(BUCKET_NAME);
        const fileRef = bucket.file(storagePath);

        await fileRef.save(buffer, {
            contentType: file.type,
            metadata: {
                metadata: {
                    uploadedBy: user.uid,
                    orgSlug,
                    originalName: file.name,
                    uploadedAt: new Date().toISOString(),
                },
            },
        });

        // Make publicly readable so Remotion Lambda can access it
        await fileRef.makePublic();

        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;

        logger.info('[creative/upload] File uploaded', {
            userId: user.uid,
            orgSlug,
            storagePath,
            type: isVideo ? 'video' : 'image',
            size: file.size,
        });

        return NextResponse.json({
            success: true,
            data: {
                url: publicUrl,
                storagePath,
                type: isVideo ? 'video' : 'image',
                filename: file.name,
                size: file.size,
            },
        });
    } catch (error) {
        logger.error('[creative/upload] Upload failed', { error });
        return NextResponse.json(
            { success: false, error: 'Upload failed' },
            { status: 500 },
        );
    }
}
