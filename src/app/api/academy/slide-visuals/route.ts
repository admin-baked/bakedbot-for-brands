import { NextRequest, NextResponse } from 'next/server';
import {
  generateSlideBackground,
  generateAgentIllustration,
  generateAllMissingSlideVisuals,
  getAllCachedSlideBackgrounds,
  getAllCachedAgentIllustrations,
} from '@/server/actions/slide-visuals';

/**
 * GET /api/academy/slide-visuals?type=backgrounds
 * GET /api/academy/slide-visuals?type=agents
 * Returns cached visual asset URLs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'agents') {
    const illustrations = await getAllCachedAgentIllustrations();
    return NextResponse.json({ success: true, illustrations });
  }

  // Default: backgrounds
  const backgrounds = await getAllCachedSlideBackgrounds();
  return NextResponse.json({ success: true, backgrounds });
}

/**
 * POST /api/academy/slide-visuals
 * Generate slide backgrounds and/or agent illustrations.
 *
 * Body options:
 *   { all: true }                              - Generate all missing
 *   { slideType: string, trackColor: string }  - Generate single background
 *   { agentId: string, illustrationType: 'character' | 'scene' } - Generate single agent
 *
 * Requires CRON_SECRET header for protection.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Batch generate all missing
    if (body.all === true) {
      const result = await generateAllMissingSlideVisuals();
      return NextResponse.json({ success: true, ...result });
    }

    // Generate single background
    if (body.slideType && body.trackColor) {
      const result = await generateSlideBackground({
        slideType: body.slideType,
        trackColor: body.trackColor,
      });
      return NextResponse.json(result);
    }

    // Generate single agent illustration
    if (body.agentId && body.illustrationType) {
      const result = await generateAgentIllustration({
        agentId: body.agentId,
        type: body.illustrationType,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: 'Provide { all: true }, { slideType, trackColor }, or { agentId, illustrationType }' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
