/**
 * POST /api/themes/upload
 *
 * Upload a WordPress theme ZIP for an organization
 *
 * Request:
 *   - Method: POST
 *   - Content-Type: multipart/form-data
 *   - Body:
 *     - file: File (ZIP archive)
 *     - orgId: string (organization ID)
 *
 * Response:
 *   - 200: { success: true, themeId, theme }
 *   - 400: { success: false, error, validationErrors }
 *   - 401: { error: "Unauthorized" }
 *   - 500: { error: "Internal server error" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadThemeAction } from '@/server/actions/themes';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const orgId = formData.get('orgId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { success: false, error: 'File must be a ZIP archive' },
        { status: 400 },
      );
    }

    // Create FormData for server action
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    // Call server action
    const result = await uploadThemeAction(orgId, uploadFormData);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          validationErrors: result.validationErrors,
        },
        { status: 400 },
      );
    }

    logger.info('[API] Theme uploaded', {
      orgId,
      themeId: result.themeId,
      themeName: result.theme?.name,
    });

    return NextResponse.json(
      {
        success: true,
        themeId: result.themeId,
        theme: result.theme,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('[API] Theme upload error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
