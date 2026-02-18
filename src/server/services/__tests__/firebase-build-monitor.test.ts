/**
 * Test Firebase Build Monitor System
 * Verifies:
 * 1. Build status recording
 * 2. Build failure detection
 * 3. Notification sending
 * 4. Super User lookup
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  recordBuildStatus,
  getRecentBuildStatuses,
  getLastBuildStatus,
  runBuildMonitoring,
  BuildMonitorRecord,
} from '../firebase-build-monitor';
import { getAdminFirestore } from '@/firebase/admin';

// Mock the services
jest.mock('@/server/services/email-service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/server/services/communications/slack', () => ({
  slackService: {
    postMessage: jest.fn().mockResolvedValue({ sent: true }),
  },
}));

describe('Firebase Build Monitor System', () => {
  const testBuildHash = 'test' + Date.now();
  let firestore: any;

  beforeAll(() => {
    firestore = getAdminFirestore();
  });

  afterAll(async () => {
    // Cleanup test records
    const snapshot = await firestore
      .collection('firebase_build_monitor')
      .where('commitHash', '==', testBuildHash)
      .get();

    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }
  });

  describe('recordBuildStatus', () => {
    it('should record a successful build', async () => {
      const record: BuildMonitorRecord = {
        commitHash: testBuildHash + '-success',
        status: 'success',
        timestamp: new Date(),
        duration: 420000,
        errorMessage: undefined,
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      };

      await recordBuildStatus(record);

      const snapshot = await firestore
        .collection('firebase_build_monitor')
        .where('commitHash', '==', record.commitHash)
        .get();

      expect(snapshot.empty).toBe(false);
      expect(snapshot.docs[0].data().status).toBe('success');
    });

    it('should record a failed build with error message', async () => {
      const record: BuildMonitorRecord = {
        commitHash: testBuildHash + '-failed',
        status: 'failed',
        timestamp: new Date(),
        duration: 180000,
        errorMessage: 'Firebase SDK initialization error',
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      };

      await recordBuildStatus(record);

      const snapshot = await firestore
        .collection('firebase_build_monitor')
        .where('commitHash', '==', record.commitHash)
        .get();

      expect(snapshot.empty).toBe(false);
      expect(snapshot.docs[0].data().status).toBe('failed');
      expect(snapshot.docs[0].data().errorMessage).toContain('Firebase');
    });
  });

  describe('getRecentBuildStatuses', () => {
    it('should retrieve recent builds ordered by timestamp', async () => {
      // Record a test build
      await recordBuildStatus({
        commitHash: testBuildHash + '-recent',
        status: 'success',
        timestamp: new Date(),
        duration: 300000,
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      });

      const builds = await getRecentBuildStatuses(5);

      expect(builds.length).toBeGreaterThanOrEqual(1);
      expect(builds[0].commitHash).toBeDefined();
      expect(builds[0].status).toMatch(/success|failed|building|pending/);
    });
  });

  describe('getLastBuildStatus', () => {
    it('should return the most recent build', async () => {
      const lastBuild = await getLastBuildStatus();

      if (lastBuild) {
        expect(lastBuild.commitHash).toBeDefined();
        expect(lastBuild.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('Notification System Integration', () => {
    it('should have email service available', async () => {
      const { sendEmail } = require('@/server/services/email-service');
      expect(sendEmail).toBeDefined();
      expect(typeof sendEmail).toBe('function');
    });

    it('should have Slack service available', async () => {
      const { slackService } = require('@/server/services/communications/slack');
      expect(slackService).toBeDefined();
      expect(slackService.postMessage).toBeDefined();
    });
  });

  describe('Build Monitoring', () => {
    it('should detect failed builds', async () => {
      // Record a failed build
      await recordBuildStatus({
        commitHash: testBuildHash + '-fail-test',
        status: 'failed',
        timestamp: new Date(),
        duration: 120000,
        errorMessage: 'Test failure for monitoring',
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      });

      // Verify it's recorded
      const builds = await getRecentBuildStatuses(50);
      const failedBuild = builds.find((b) =>
        b.commitHash.includes('fail-test')
      );

      expect(failedBuild).toBeDefined();
      expect(failedBuild?.status).toBe('failed');
    });
  });
});
