'use server';

/**
 * Academy Progress Tracking Actions
 *
 * Manages user progress through the Academy curriculum.
 * Syncs with public Academy usage tracking for logged-in users.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import { Timestamp } from '@google-cloud/firestore';

export interface AcademyProgress {
  userId: string;
  email: string;

  // Progress tracking
  videosWatched: string[]; // Episode IDs
  resourcesDownloaded: string[]; // Resource IDs
  completedTracks: string[]; // Track IDs
  currentEpisode?: string;

  // Achievements
  badges: string[];
  certificateEarned: boolean;
  certificateIssuedAt?: Date;

  // Timestamps
  enrolledAt: Date;
  lastActivityAt: Date;
  totalWatchTime: number; // seconds
}

/**
 * Get user's Academy progress
 */
export async function getAcademyProgress(): Promise<{
  success: boolean;
  progress?: AcademyProgress;
  error?: string;
}> {
  try {
    const authResult = await requireUser();
    if (!authResult.success || !authResult.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = authResult.user.uid;
    const db = getAdminFirestore();

    const progressDoc = await db
      .collection('users')
      .doc(userId)
      .collection('academy')
      .doc('progress')
      .get();

    if (!progressDoc.exists) {
      // Create initial progress document
      const initialProgress: AcademyProgress = {
        userId,
        email: authResult.user.email || '',
        videosWatched: [],
        resourcesDownloaded: [],
        completedTracks: [],
        badges: [],
        certificateEarned: false,
        enrolledAt: new Date(),
        lastActivityAt: new Date(),
        totalWatchTime: 0,
      };

      await progressDoc.ref.set({
        ...initialProgress,
        enrolledAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      });

      return { success: true, progress: initialProgress };
    }

    const data = progressDoc.data();
    const progress: AcademyProgress = {
      userId: data?.userId || userId,
      email: data?.email || authResult.user.email || '',
      videosWatched: data?.videosWatched || [],
      resourcesDownloaded: data?.resourcesDownloaded || [],
      completedTracks: data?.completedTracks || [],
      currentEpisode: data?.currentEpisode,
      badges: data?.badges || [],
      certificateEarned: data?.certificateEarned || false,
      certificateIssuedAt: data?.certificateIssuedAt?.toDate(),
      enrolledAt: data?.enrolledAt?.toDate() || new Date(),
      lastActivityAt: data?.lastActivityAt?.toDate() || new Date(),
      totalWatchTime: data?.totalWatchTime || 0,
    };

    return { success: true, progress };
  } catch (error) {
    logger.error('[ACADEMY_PROGRESS] Failed to get progress', { error });
    return {
      success: false,
      error: 'Failed to fetch progress',
    };
  }
}

/**
 * Update user's Academy progress
 */
export async function updateAcademyProgress(input: {
  videoWatched?: string;
  resourceDownloaded?: string;
  trackCompleted?: string;
  watchTime?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authResult = await requireUser();
    if (!authResult.success || !authResult.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = authResult.user.uid;
    const db = getAdminFirestore();

    const progressRef = db
      .collection('users')
      .doc(userId)
      .collection('academy')
      .doc('progress');

    const progressDoc = await progressRef.get();
    const currentData = progressDoc.data() || {};

    const updates: Record<string, any> = {
      lastActivityAt: Timestamp.now(),
    };

    // Add video to watched list
    if (input.videoWatched) {
      const videosWatched = currentData.videosWatched || [];
      if (!videosWatched.includes(input.videoWatched)) {
        updates.videosWatched = [...videosWatched, input.videoWatched];
        updates.currentEpisode = input.videoWatched;
      }
    }

    // Add resource to downloaded list
    if (input.resourceDownloaded) {
      const resourcesDownloaded = currentData.resourcesDownloaded || [];
      if (!resourcesDownloaded.includes(input.resourceDownloaded)) {
        updates.resourcesDownloaded = [...resourcesDownloaded, input.resourceDownloaded];
      }
    }

    // Add completed track
    if (input.trackCompleted) {
      const completedTracks = currentData.completedTracks || [];
      if (!completedTracks.includes(input.trackCompleted)) {
        updates.completedTracks = [...completedTracks, input.trackCompleted];

        // Award badge for completed track
        const badges = currentData.badges || [];
        const badgeId = `completed-${input.trackCompleted}-track`;
        if (!badges.includes(badgeId)) {
          updates.badges = [...badges, badgeId];
        }
      }
    }

    // Add watch time
    if (input.watchTime) {
      updates.totalWatchTime = (currentData.totalWatchTime || 0) + input.watchTime;
    }

    // Check if user earned master certificate (all 7 tracks completed)
    if (updates.completedTracks) {
      const allTracks = ['smokey', 'craig', 'pops', 'ezal', 'money-mike', 'mrs-parker', 'deebo'];
      const completedAll = allTracks.every((track) =>
        updates.completedTracks.includes(track)
      );

      if (completedAll && !currentData.certificateEarned) {
        updates.certificateEarned = true;
        updates.certificateIssuedAt = Timestamp.now();

        const badges = updates.badges || currentData.badges || [];
        if (!badges.includes('master-certificate')) {
          updates.badges = [...badges, 'master-certificate'];
        }
      }
    }

    await progressRef.set(updates, { merge: true });

    logger.info('[ACADEMY_PROGRESS] Updated progress', {
      userId,
      updates: Object.keys(updates),
    });

    return { success: true };
  } catch (error) {
    logger.error('[ACADEMY_PROGRESS] Failed to update progress', { error });
    return {
      success: false,
      error: 'Failed to update progress',
    };
  }
}

/**
 * Get progress completion percentage
 */
export async function getProgressCompletion(): Promise<{
  success: boolean;
  completion?: {
    videosWatched: number;
    totalVideos: number;
    resourcesDownloaded: number;
    totalResources: number;
    tracksCompleted: number;
    totalTracks: number;
    overallPercentage: number;
  };
  error?: string;
}> {
  try {
    const authResult = await requireUser();
    if (!authResult.success || !authResult.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const progressResult = await getAcademyProgress();
    if (!progressResult.success || !progressResult.progress) {
      return { success: false, error: 'Failed to get progress' };
    }

    const progress = progressResult.progress;

    // Constants from curriculum
    const TOTAL_EPISODES = 12;
    const TOTAL_RESOURCES = 15;
    const TOTAL_TRACKS = 7;

    const videosWatched = progress.videosWatched.length;
    const resourcesDownloaded = progress.resourcesDownloaded.length;
    const tracksCompleted = progress.completedTracks.length;

    // Calculate overall percentage (weighted)
    const videoWeight = 0.5; // Videos are 50% of completion
    const resourceWeight = 0.25; // Resources are 25%
    const trackWeight = 0.25; // Tracks are 25%

    const videoPercentage = (videosWatched / TOTAL_EPISODES) * 100;
    const resourcePercentage = (resourcesDownloaded / TOTAL_RESOURCES) * 100;
    const trackPercentage = (tracksCompleted / TOTAL_TRACKS) * 100;

    const overallPercentage = Math.round(
      videoPercentage * videoWeight +
      resourcePercentage * resourceWeight +
      trackPercentage * trackWeight
    );

    return {
      success: true,
      completion: {
        videosWatched,
        totalVideos: TOTAL_EPISODES,
        resourcesDownloaded,
        totalResources: TOTAL_RESOURCES,
        tracksCompleted,
        totalTracks: TOTAL_TRACKS,
        overallPercentage,
      },
    };
  } catch (error) {
    logger.error('[ACADEMY_PROGRESS] Failed to get completion', { error });
    return {
      success: false,
      error: 'Failed to calculate completion',
    };
  }
}
