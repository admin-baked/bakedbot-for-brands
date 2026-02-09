'use server';

/**
 * Video Progress Tracking
 *
 * Tracks watch time and completion milestones for Academy videos.
 * Powers "continue watching" and completion badges.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import { Timestamp } from '@google-cloud/firestore';

export interface TrackVideoProgressInput {
  episodeId: string;
  watchedSeconds: number;
  totalSeconds: number;
  completionPercentage: number;
  milestone?: 25 | 50 | 75 | 100;
}

/**
 * Track video watch progress
 *
 * Updates user's progress and awards badges for milestones
 */
export async function trackVideoProgress(
  input: TrackVideoProgressInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const authResult = await requireUser();
    if (!authResult.success || !authResult.user) {
      // For anonymous users, just log and return success
      logger.info('[VIDEO_PROGRESS] Anonymous watch progress', input);
      return { success: true };
    }

    const userId = authResult.user.uid;
    const db = getAdminFirestore();

    // Store progress in user's video_progress subcollection
    const progressRef = db
      .collection('users')
      .doc(userId)
      .collection('video_progress')
      .doc(input.episodeId);

    const progressDoc = await progressRef.get();
    const existingData = progressDoc.data();

    // Only update if this is more progress than before
    const currentWatched = existingData?.watchedSeconds || 0;
    if (input.watchedSeconds <= currentWatched) {
      return { success: true }; // No update needed
    }

    const updates: Record<string, any> = {
      episodeId: input.episodeId,
      watchedSeconds: input.watchedSeconds,
      totalSeconds: input.totalSeconds,
      completionPercentage: input.completionPercentage,
      lastWatchedAt: Timestamp.now(),
    };

    // Track milestones reached
    const milestonesReached = existingData?.milestonesReached || [];
    if (input.milestone && !milestonesReached.includes(input.milestone)) {
      milestonesReached.push(input.milestone);
      updates.milestonesReached = milestonesReached;

      // Award badge for 100% completion
      if (input.milestone === 100) {
        const academyProgressRef = db
          .collection('users')
          .doc(userId)
          .collection('academy')
          .doc('progress');

        const academyProgress = await academyProgressRef.get();
        const badges = academyProgress.data()?.badges || [];
        const badgeId = `completed-${input.episodeId}`;

        if (!badges.includes(badgeId)) {
          await academyProgressRef.set(
            {
              badges: [...badges, badgeId],
              lastActivityAt: Timestamp.now(),
            },
            { merge: true }
          );
        }
      }
    }

    await progressRef.set(updates, { merge: true });

    logger.info('[VIDEO_PROGRESS] Progress tracked', {
      userId,
      episodeId: input.episodeId,
      completionPercentage: input.completionPercentage,
      milestone: input.milestone,
    });

    return { success: true };
  } catch (error) {
    logger.error('[VIDEO_PROGRESS] Failed to track progress', { error });
    return {
      success: false,
      error: 'Failed to track progress',
    };
  }
}

/**
 * Get video progress for a specific episode
 */
export async function getVideoProgress(
  episodeId: string
): Promise<{
  success: boolean;
  progress?: TrackVideoProgressInput;
  error?: string;
}> {
  try {
    const authResult = await requireUser();
    if (!authResult.success || !authResult.user) {
      return { success: true, progress: undefined }; // No progress for anonymous
    }

    const userId = authResult.user.uid;
    const db = getAdminFirestore();

    const progressDoc = await db
      .collection('users')
      .doc(userId)
      .collection('video_progress')
      .doc(episodeId)
      .get();

    if (!progressDoc.exists) {
      return { success: true, progress: undefined };
    }

    const data = progressDoc.data();
    return {
      success: true,
      progress: {
        episodeId: data?.episodeId,
        watchedSeconds: data?.watchedSeconds || 0,
        totalSeconds: data?.totalSeconds || 0,
        completionPercentage: data?.completionPercentage || 0,
      },
    };
  } catch (error) {
    logger.error('[VIDEO_PROGRESS] Failed to get progress', { error });
    return {
      success: false,
      error: 'Failed to get progress',
    };
  }
}
