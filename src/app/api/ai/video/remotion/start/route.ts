import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { startRemotionVideoRender } from '@/ai/generators/remotion-video';
import type { GenerateVideoInput } from '@/ai/video-types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface StartRemotionVideoRequestBody {
  input: GenerateVideoInput;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json() as StartRemotionVideoRequestBody;
    if (!body.input?.prompt?.trim()) {
      return NextResponse.json({ error: 'Video prompt is required' }, { status: 400 });
    }

    const render = await startRemotionVideoRender(body.input);

    return NextResponse.json(
      {
        status: 'pending',
        ...render,
      },
      { status: 202 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start Remotion render';
    logger.error('[API/video/remotion/start] Failed to start render', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
