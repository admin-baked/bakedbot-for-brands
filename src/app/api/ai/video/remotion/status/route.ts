import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getRemotionVideoRenderStatus } from '@/ai/generators/remotion-video';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RemotionRenderStatusRequestBody {
  renderId: string;
  duration?: number;
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json() as RemotionRenderStatusRequestBody;
    if (!body.renderId?.trim()) {
      return NextResponse.json({ error: 'Render ID is required' }, { status: 400 });
    }

    const status = await getRemotionVideoRenderStatus(body.renderId, {
      ...(body.duration !== undefined ? { duration: body.duration } : {}),
      ...(body.model !== undefined ? { model: body.model } : {}),
    });

    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check Remotion render status';
    logger.error('[API/video/remotion/status] Failed to check render status', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
