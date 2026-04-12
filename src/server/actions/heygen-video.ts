'use server';

/**
 * HeyGen Video Generation — Server Actions
 *
 * Allows Super Users to generate avatar videos from the Creative Center dashboard.
 * Uses the HeyGen API v2 with the Martez Knox avatar.
 */

import { logger } from '@/lib/logger';
import { getServerSessionUser } from '@/server/auth/session';

const API_BASE = 'https://api.heygen.com';
const AVATAR_ID = process.env.HEYGEN_AVATAR_ID || '';
const VOICE_ID = process.env.HEYGEN_VOICE_ID || '';
const API_KEY = process.env.HEYGEN_API_KEY || '';

// Storage base URL for uploaded assets
const STORAGE_BASE = 'https://storage.googleapis.com/bakedbot-global-assets/onboarding';

interface GenerateVideoInput {
  title: string;
  narration: string;
  backgroundUrl?: string; // Optional image URL for background
  layout?: 'circle' | 'fullscreen';
}

interface VideoStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

async function heygenFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  if (!API_KEY) throw new Error('HEYGEN_API_KEY not configured');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HeyGen API ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Generate a video via HeyGen API.
 * Super Users only.
 */
export async function generateHeyGenVideo(input: GenerateVideoInput): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    const user = await getServerSessionUser();
    if (!user || user.role !== 'super_user') {
      return { success: false, error: 'Unauthorized — Super Users only' };
    }

    if (!AVATAR_ID || !VOICE_ID) {
      return { success: false, error: 'HeyGen avatar/voice not configured' };
    }

    const useCircle = input.layout !== 'fullscreen';

    const character: Record<string, unknown> = {
      type: 'avatar',
      avatar_id: AVATAR_ID,
      avatar_style: useCircle ? 'circle' : 'normal',
    };

    if (useCircle) {
      character.scale = 0.4;
      character.offset = { x: 0.3, y: 0.3 };
    }

    const background = input.backgroundUrl
      ? { type: 'image', url: input.backgroundUrl }
      : { type: 'color', value: '#1a1a2e' };

    const body = {
      video_inputs: [{
        character,
        voice: {
          type: 'text',
          input_text: input.narration,
          voice_id: VOICE_ID,
          speed: 1.0,
        },
        background,
      }],
      dimension: { width: 1920, height: 1080 },
      test: false,
      title: input.title,
    };

    const result = await heygenFetch('/v2/video/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as { data?: { video_id: string }; error?: { message: string } };

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    logger.info('[HeyGen] Video generation submitted', {
      videoId: result.data?.video_id,
      title: input.title,
      layout: input.layout || 'circle',
    });

    return { success: true, videoId: result.data?.video_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[HeyGen] Video generation failed', { error: message });
    return { success: false, error: message };
  }
}

/**
 * Check the status of a HeyGen video.
 */
export async function getHeyGenVideoStatus(videoId: string): Promise<VideoStatusResult> {
  try {
    const user = await getServerSessionUser();
    if (!user || user.role !== 'super_user') {
      return { status: 'failed', error: 'Unauthorized' };
    }

    const result = await heygenFetch(`/v1/video_status.get?video_id=${videoId}`) as {
      data: { status: string; video_url?: string; error?: unknown };
    };

    const errorMsg = result.data.error
      ? (typeof result.data.error === 'object' ? JSON.stringify(result.data.error) : String(result.data.error))
      : undefined;

    return {
      status: result.data.status as VideoStatusResult['status'],
      videoUrl: result.data.video_url || undefined,
      error: errorMsg,
    };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * List available onboarding video background images.
 */
export async function getOnboardingBackgrounds(): Promise<{ stepId: string; url: string; label: string }[]> {
  return [
    { stepId: 'brand-guide', url: `${STORAGE_BASE}/screenshots/brand-guide.png`, label: 'Brand Guide' },
    { stepId: 'link-dispensary', url: `${STORAGE_BASE}/screenshots/link-dispensary.png`, label: 'Link Dispensary' },
    { stepId: 'connect-menu', url: `${STORAGE_BASE}/screenshots/connect-menu.png`, label: 'Connect Menu' },
    { stepId: 'checkin-setup', url: `${STORAGE_BASE}/screenshots/checkin-setup.png`, label: 'Check-In Setup' },
    { stepId: 'qr-training', url: `${STORAGE_BASE}/screenshots/qr-training.png`, label: 'QR & Training' },
    { stepId: 'creative-center', url: `${STORAGE_BASE}/screenshots/creative-center.png`, label: 'Creative Center' },
    { stepId: 'content-calendar', url: `${STORAGE_BASE}/screenshots/content-calendar.png`, label: 'Content Calendar' },
    { stepId: 'welcome-playbook', url: `${STORAGE_BASE}/screenshots/welcome-playbook.png`, label: 'Welcome Playbook' },
    { stepId: 'inbox-tour', url: `${STORAGE_BASE}/screenshots/inbox-tour.png`, label: 'Inbox Tour' },
    { stepId: 'competitive-intel', url: `${STORAGE_BASE}/screenshots/competitive-intel.png`, label: 'Competitive Intel' },
  ];
}

/**
 * Check if HeyGen is configured and available.
 */
export async function isHeyGenConfigured(): Promise<boolean> {
  return !!(API_KEY && AVATAR_ID && VOICE_ID);
}
