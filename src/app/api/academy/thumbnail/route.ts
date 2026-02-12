import { NextRequest, NextResponse } from 'next/server';
import {
  generateEpisodeThumbnail,
  getEpisodeThumbnail,
  generateAllMissingThumbnails,
  getAllCachedThumbnails,
} from '@/server/actions/academy-thumbnails';
import { ACADEMY_EPISODES } from '@/lib/academy/curriculum';

/**
 * GET /api/academy/thumbnail?episodeId=ep1-intro
 * Returns cached thumbnail URL for an episode.
 *
 * GET /api/academy/thumbnail?all=true
 * Returns all cached thumbnail URLs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Get all cached thumbnails
  if (searchParams.get('all') === 'true') {
    const thumbnails = await getAllCachedThumbnails();
    return NextResponse.json({ success: true, thumbnails });
  }

  // Get single thumbnail
  const episodeId = searchParams.get('episodeId');
  if (!episodeId) {
    return NextResponse.json(
      { success: false, error: 'episodeId query parameter is required' },
      { status: 400 }
    );
  }

  const imageUrl = await getEpisodeThumbnail(episodeId);
  if (!imageUrl) {
    return NextResponse.json(
      { success: false, error: 'Thumbnail not found. Generate it first via POST.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, imageUrl });
}

/**
 * POST /api/academy/thumbnail
 * Generate thumbnail(s) for academy episodes.
 *
 * Body: { episodeId: string } - Generate single
 * Body: { all: true } - Generate all missing
 *
 * Requires CRON_SECRET header for protection.
 */
export async function POST(request: NextRequest) {
  // Simple auth check - reuse CRON_SECRET pattern from other cron routes
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
      const result = await generateAllMissingThumbnails();
      return NextResponse.json({ success: true, ...result });
    }

    // Generate single
    const { episodeId } = body;
    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'episodeId is required' },
        { status: 400 }
      );
    }

    const episode = ACADEMY_EPISODES.find((ep) => ep.id === episodeId);
    if (!episode) {
      return NextResponse.json(
        { success: false, error: `Episode not found: ${episodeId}` },
        { status: 404 }
      );
    }

    const result = await generateEpisodeThumbnail({
      episodeId: episode.id,
      track: episode.track,
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      description: episode.description,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
