/**
 * Hero Image Upload API Route
 *
 * Handles image uploads for hero banners (logo and hero image).
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadHeroImage, validateImageFile } from '@/lib/storage/hero-images';

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const orgId = formData.get('orgId') as string;
    const type = formData.get('type') as 'logo' | 'hero';

    if (!file || !orgId || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'logo' && type !== 'hero') {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "logo" or "hero"' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file
    const validation = validateImageFile(buffer, file.name);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload to Firebase Storage
    const result = await uploadHeroImage(buffer, orgId, file.name, type);

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in upload handler:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
