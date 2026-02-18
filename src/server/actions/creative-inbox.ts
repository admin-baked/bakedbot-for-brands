'use server';

/**
 * Creative Inbox Bridge
 *
 * Server action to send Creative Studio content to the Inbox as a draft artifact.
 * Creates an inbox thread + artifact in a single call.
 */

import { createInboxThread, createInboxArtifact } from '@/server/actions/inbox';
import { logger } from '@/lib/logger';
import type { CreativeContent, SocialPlatform } from '@/types/creative-content';

export async function sendCreativeToInbox(
  content: CreativeContent,
  platform: SocialPlatform,
): Promise<{ success: boolean; threadId?: string; artifactId?: string; error?: string }> {
  try {
    // 1. Create a creative inbox thread
    const threadResult = await createInboxThread({
      type: 'creative',
      title: `Studio: ${platform.charAt(0).toUpperCase() + platform.slice(1)} post`,
      primaryAgent: 'craig',
    });

    if (!threadResult.success || !threadResult.thread) {
      return { success: false, error: threadResult.error || 'Failed to create inbox thread' };
    }

    const threadId = threadResult.thread.id;

    // 2. Create the artifact linked to the thread
    const artifactResult = await createInboxArtifact({
      threadId,
      type: 'creative_content',
      data: content,
      rationale: `Generated in Creative Studio for ${platform}`,
    });

    if (!artifactResult.success || !artifactResult.artifact) {
      return { success: false, error: artifactResult.error || 'Failed to create artifact' };
    }

    logger.info('[CreativeInbox] Sent content to inbox', {
      threadId,
      artifactId: artifactResult.artifact.id,
      platform,
    });

    return {
      success: true,
      threadId,
      artifactId: artifactResult.artifact.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[CreativeInbox] Failed to send to inbox', { error: message });
    return { success: false, error: message };
  }
}
