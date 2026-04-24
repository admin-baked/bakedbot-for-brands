/**
 * Unit tests for firebase-build-monitor.ts
 * Keeps build-monitor behavior deterministic with an in-memory Firestore double.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/email-service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/server/services/communications/slack', () => ({
  slackService: {
    postMessage: jest.fn().mockResolvedValue({ sent: true }),
  },
}));

type BuildMonitorModule = typeof import('../firebase-build-monitor');
type BuildMonitorRecord = import('../firebase-build-monitor').BuildMonitorRecord;

type StoredBuildRecord = BuildMonitorRecord & { id: string };

function createFirestoreDouble() {
  const records: StoredBuildRecord[] = [];
  let nextId = 1;

  const makeSnapshot = (items: StoredBuildRecord[]) => ({
    empty: items.length === 0,
    docs: items.map((item) => ({
      id: item.id,
      data: () => ({
        ...item,
        timestamp: {
          toDate: () => item.timestamp,
        },
      }),
      ref: {
        update: jest.fn(async (payload: Partial<BuildMonitorRecord>) => {
          Object.assign(item, payload);
        }),
      },
    })),
  });

  const buildMonitorCollection = {
    doc: jest.fn(() => ({
      set: jest.fn(async (payload: BuildMonitorRecord) => {
        records.push({
          id: `build-${nextId++}`,
          ...payload,
        });
      }),
    })),
    where: jest.fn((field: keyof BuildMonitorRecord, _operator: string, value: unknown) => ({
      limit: jest.fn((limitCount: number) => ({
        get: jest.fn(async () =>
          makeSnapshot(records.filter((record) => record[field] === value).slice(0, limitCount))
        ),
      })),
      get: jest.fn(async () => makeSnapshot(records.filter((record) => record[field] === value))),
    })),
    orderBy: jest.fn((_field: keyof BuildMonitorRecord, _direction: 'desc' | 'asc') => ({
      limit: jest.fn((limitCount: number) => ({
        get: jest.fn(async () =>
          makeSnapshot(
            [...records]
              .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
              .slice(0, limitCount),
          )
        ),
      })),
    })),
  };

  const usersCollection = {
    where: jest.fn(() => ({
      limit: jest.fn(() => ({
        get: jest.fn(async () => ({ docs: [] })),
      })),
    })),
  };

  return {
    reset() {
      records.length = 0;
      nextId = 1;
    },
    collection: jest.fn((name: string) => {
      if (name === 'firebase_build_monitor') {
        return buildMonitorCollection;
      }

      if (name === 'users') {
        return usersCollection;
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };
}

describe('Firebase Build Monitor System', () => {
  const testBuildHash = `test-${Date.now()}`;
  const firestore = createFirestoreDouble();
  let recordBuildStatus: BuildMonitorModule['recordBuildStatus'];
  let getRecentBuildStatuses: BuildMonitorModule['getRecentBuildStatuses'];
  let getLastBuildStatus: BuildMonitorModule['getLastBuildStatus'];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    firestore.reset();

    const adminModule = require('@/firebase/admin') as {
      getAdminFirestore: jest.Mock;
    };
    adminModule.getAdminFirestore.mockReturnValue(firestore);

    const buildMonitorModule = require('../firebase-build-monitor') as BuildMonitorModule;
    recordBuildStatus = buildMonitorModule.recordBuildStatus;
    getRecentBuildStatuses = buildMonitorModule.getRecentBuildStatuses;
    getLastBuildStatus = buildMonitorModule.getLastBuildStatus;
  });

  describe('recordBuildStatus', () => {
    it('should record a successful build', async () => {
      const record: BuildMonitorRecord = {
        commitHash: `${testBuildHash}-success`,
        status: 'success',
        timestamp: new Date('2026-04-24T10:00:00.000Z'),
        duration: 420000,
        errorMessage: undefined,
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      };

      await recordBuildStatus(record);

      const builds = await getRecentBuildStatuses(5);
      const stored = builds.find((build) => build.commitHash === record.commitHash);

      expect(stored?.status).toBe('success');
    });

    it('should record a failed build with error message', async () => {
      const record: BuildMonitorRecord = {
        commitHash: `${testBuildHash}-failed`,
        status: 'failed',
        timestamp: new Date('2026-04-24T10:05:00.000Z'),
        duration: 180000,
        errorMessage: 'Firebase SDK initialization error',
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      };

      await recordBuildStatus(record);

      const builds = await getRecentBuildStatuses(5);
      const stored = builds.find((build) => build.commitHash === record.commitHash);

      expect(stored?.status).toBe('failed');
      expect(stored?.errorMessage).toContain('Firebase');
    });
  });

  describe('getRecentBuildStatuses', () => {
    it('should retrieve recent builds ordered by timestamp', async () => {
      await recordBuildStatus({
        commitHash: `${testBuildHash}-older`,
        status: 'success',
        timestamp: new Date('2026-04-24T10:10:00.000Z'),
        duration: 300000,
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      });

      await recordBuildStatus({
        commitHash: `${testBuildHash}-newer`,
        status: 'failed',
        timestamp: new Date('2026-04-24T10:15:00.000Z'),
        duration: 120000,
        errorMessage: 'Recent failure',
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      });

      const builds = await getRecentBuildStatuses(5);

      expect(builds).toHaveLength(2);
      expect(builds[0].commitHash).toBe(`${testBuildHash}-newer`);
      expect(builds[1].commitHash).toBe(`${testBuildHash}-older`);
    });
  });

  describe('getLastBuildStatus', () => {
    it('should return the most recent build', async () => {
      await recordBuildStatus({
        commitHash: `${testBuildHash}-last`,
        status: 'success',
        timestamp: new Date('2026-04-24T10:20:00.000Z'),
        duration: 60000,
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      });

      const lastBuild = await getLastBuildStatus();

      expect(lastBuild?.commitHash).toBe(`${testBuildHash}-last`);
      expect(lastBuild?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Build Monitoring', () => {
    it('should detect failed builds', async () => {
      await recordBuildStatus({
        commitHash: `${testBuildHash}-fail-test`,
        status: 'failed',
        timestamp: new Date('2026-04-24T10:25:00.000Z'),
        duration: 120000,
        errorMessage: 'Test failure for monitoring',
        notificationsSent: {
          email: false,
          slack: false,
          agent: false,
        },
      });

      const builds = await getRecentBuildStatuses(50);
      const failedBuild = builds.find((build) => build.commitHash.includes('fail-test'));

      expect(failedBuild?.status).toBe('failed');
    });
  });
});
