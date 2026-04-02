import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { generateMarketingVideo } from '@/ai/flows/generate-video';
import type { GenerateVideoInput } from '@/ai/video-types';
import type { SafeVideoProvider } from '@/server/actions/super-admin/safe-settings-types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface GenerateVideoRequestBody {
  input: GenerateVideoInput;
  allowFallbackDemo?: boolean;
  forceProvider?: SafeVideoProvider;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json() as GenerateVideoRequestBody;
    if (!body.input?.prompt?.trim()) {
      return NextResponse.json({ error: 'Video prompt is required' }, { status: 400 });
    }

    const result = await generateMarketingVideo(body.input, {
      allowFallbackDemo: body.allowFallbackDemo,
      forceProvider: body.forceProvider,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Video generation failed';
    logger.error('[API/video] Generation failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
