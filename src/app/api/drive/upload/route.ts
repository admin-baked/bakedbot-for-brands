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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folderId = formData.get('folderId');
    const category = formData.get('category');
    const description = formData.get('description');
    const tags = formData.get('tags');

    if (!(file instanceof File)) {
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

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    if (typeof folderId === 'string' && folderId.trim()) {
      uploadFormData.append('folderId', folderId);
    }

    if (typeof category === 'string' && category.trim()) {
      uploadFormData.append('category', category);
    }

    if (typeof description === 'string' && description.trim()) {
      uploadFormData.append('description', description);
    }

    if (typeof tags === 'string' && tags.trim()) {
      uploadFormData.append('tags', tags);
    }

    const result = await uploadFile(uploadFormData);

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
