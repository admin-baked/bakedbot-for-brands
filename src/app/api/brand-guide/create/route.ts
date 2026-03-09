import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { createBrandGuide } from '@/server/actions/brand-guide';
import type { CreateBrandGuideInput } from '@/types/brand-guide';
import { logger } from '@/lib/logger';

function parseCreateBrandGuideInput(body: unknown): CreateBrandGuideInput | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as Partial<CreateBrandGuideInput>;

  if (!candidate.brandId || typeof candidate.brandId !== 'string') return null;
  if (!candidate.brandName || typeof candidate.brandName !== 'string') return null;
  if (!candidate.method || !['url', 'template', 'manual'].includes(candidate.method)) return null;

  return {
    brandId: candidate.brandId,
    brandName: candidate.brandName,
    method: candidate.method,
    sourceUrl: candidate.sourceUrl,
    socialHandles: candidate.socialHandles,
    templateId: candidate.templateId,
    initialData: candidate.initialData,
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireUser([
      'brand',
      'brand_admin',
      'brand_member',
      'dispensary',
      'dispensary_admin',
      'dispensary_staff',
      'super_user',
    ]);

    const payload = parseCreateBrandGuideInput(await request.json().catch(() => null));
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid brand guide payload' }, { status: 400 });
    }

    const result = await createBrandGuide(payload);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('Unauthorized') || message.startsWith('Forbidden')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    logger.error('[api/brand-guide/create] Failed to create brand guide', {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ success: false, error: 'Failed to create brand guide' }, { status: 500 });
  }
}
