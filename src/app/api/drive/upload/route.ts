import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { DRIVE_CATEGORIES } from '@/types/drive';
import { uploadFile } from '@/server/actions/drive';

function getDriveErrorStatus(error?: string): number {
  if (error?.startsWith('Unauthorized')) {
    return 401;
  }

  if (error?.startsWith('Forbidden')) {
    return 403;
  }

  return 400;
}

function hasDriveUploadFileEntry(value: FormDataEntryValue | null): value is Exclude<FormDataEntryValue, string> {
  return value !== null && typeof value !== 'string';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const category = formData.get('category');

    if (!hasDriveUploadFileEntry(file)) {
      logger.warn('[API] Drive upload rejected: invalid multipart file payload', {
        hasFileEntry: file !== null,
        fileEntryType: typeof file,
      });

      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (typeof category === 'string' && category.trim() && !(category in DRIVE_CATEGORIES)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drive category' },
        { status: 400 },
      );
    }

    const result = await uploadFile(formData);

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Upload failed',
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
    logger.error('[API] Drive file upload failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
