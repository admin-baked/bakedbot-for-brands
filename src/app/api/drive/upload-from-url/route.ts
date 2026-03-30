import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { uploadFileFromUrl } from '@/server/actions/drive';
import { type DriveCategory, DRIVE_CATEGORIES } from '@/types/drive';

function getDriveErrorStatus(error?: string): number {
  if (error?.startsWith('Unauthorized')) {
    return 401;
  }

  if (error?.startsWith('Forbidden')) {
    return 403;
  }

  return 400;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    const folderId = typeof body?.folderId === 'string' ? body.folderId.trim() : '';
    const rawCategory = typeof body?.category === 'string' ? body.category.trim() : '';

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 },
      );
    }

    let category: DriveCategory | undefined;
    if (rawCategory) {
      if (!(rawCategory in DRIVE_CATEGORIES)) {
        return NextResponse.json(
          { success: false, error: 'Invalid drive category' },
          { status: 400 },
        );
      }

      category = rawCategory as DriveCategory;
    }

    const result = await uploadFileFromUrl(
      url,
      folderId || null,
      category,
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Upload from URL failed',
        },
        { status: getDriveErrorStatus(result.error) },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('[API] Drive URL upload failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
