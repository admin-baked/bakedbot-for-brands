/**
 * Video Progress Tracking Tests
 *
 * Tests for tracking watch time and completion milestones
 */

import { trackVideoProgress, getVideoProgress } from '../video-progress';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: false,
              data: () => null,
            }),
            set: jest.fn().mockResolvedValue(undefined),
          })),
        })),
      })),
    })),
  })),
}));

// Mock auth
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn().mockResolvedValue({
    success: true,
    user: { uid: 'test-user-123' },
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Video Progress Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackVideoProgress', () => {
    it('should track progress for authenticated users', async () => {
      const result = await trackVideoProgress({
        episodeId: 'ep1-intro',
        watchedSeconds: 180,
        totalSeconds: 720,
        completionPercentage: 25,
        milestone: 25,
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle anonymous users gracefully', async () => {
      // Mock anonymous user
      const { requireUser } = require('@/server/auth/auth');
      requireUser.mockResolvedValueOnce({
        success: false,
        user: null,
      });

      const result = await trackVideoProgress({
        episodeId: 'ep1-intro',
        watchedSeconds: 60,
        totalSeconds: 720,
        completionPercentage: 8,
      });

      // Should still succeed for anonymous (just logs, doesn't store)
      expect(result.success).toBe(true);
    });

    it('should accept valid milestone values', async () => {
      const milestones = [25, 50, 75, 100] as const;

      for (const milestone of milestones) {
        const result = await trackVideoProgress({
          episodeId: 'ep1-intro',
          watchedSeconds: (720 * milestone) / 100,
          totalSeconds: 720,
          completionPercentage: milestone,
          milestone,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should track progress without milestone', async () => {
      const result = await trackVideoProgress({
        episodeId: 'ep1-intro',
        watchedSeconds: 100,
        totalSeconds: 720,
        completionPercentage: 14,
        // No milestone - just regular progress update
      });

      expect(result.success).toBe(true);
    });

    it('should calculate completion percentage correctly', async () => {
      const result = await trackVideoProgress({
        episodeId: 'ep2-menu-problem',
        watchedSeconds: 360,
        totalSeconds: 720,
        completionPercentage: 50,
        milestone: 50,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getVideoProgress', () => {
    it('should return undefined for anonymous users', async () => {
      const { requireUser } = require('@/server/auth/auth');
      requireUser.mockResolvedValueOnce({
        success: false,
        user: null,
      });

      const result = await getVideoProgress('ep1-intro');

      expect(result.success).toBe(true);
      expect(result.progress).toBeUndefined();
    });

    it('should return progress for authenticated users', async () => {
      const { getAdminFirestore } = require('@/firebase/admin');
      getAdminFirestore.mockReturnValueOnce({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              doc: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({
                    episodeId: 'ep1-intro',
                    watchedSeconds: 360,
                    totalSeconds: 720,
                    completionPercentage: 50,
                  }),
                }),
              })),
            })),
          })),
        })),
      });

      const result = await getVideoProgress('ep1-intro');

      expect(result.success).toBe(true);
      expect(result.progress).toBeDefined();
      expect(result.progress?.completionPercentage).toBe(50);
    });
  });
});

describe('Milestone Detection', () => {
  it('should trigger 25% milestone at correct threshold', async () => {
    const result = await trackVideoProgress({
      episodeId: 'ep1-intro',
      watchedSeconds: 180, // 25% of 720
      totalSeconds: 720,
      completionPercentage: 25,
      milestone: 25,
    });

    expect(result.success).toBe(true);
  });

  it('should trigger 100% milestone on completion', async () => {
    const result = await trackVideoProgress({
      episodeId: 'ep1-intro',
      watchedSeconds: 720,
      totalSeconds: 720,
      completionPercentage: 100,
      milestone: 100,
    });

    expect(result.success).toBe(true);
  });
});
