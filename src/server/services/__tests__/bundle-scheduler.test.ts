/**
 * Bundle Scheduler Service Tests
 */

import { BundleSchedulerService } from '../bundle-scheduler';
import type { BundleDeal, BundleStatus } from '@/types/bundles';

// Mock Firestore
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(() => ({
          docs: [],
          size: 0,
        })),
      })),
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
      })),
    })),
  })),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('BundleSchedulerService', () => {
  let service: BundleSchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BundleSchedulerService();
  });

  describe('isWithinTimeWindow', () => {
    it('returns true when no time restrictions configured', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
      } as BundleDeal;

      const now = new Date('2026-02-20T14:30:00Z'); // Thursday 2:30 PM

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(true);
    });

    it('returns false when current day not in daysOfWeek', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
        daysOfWeek: [1, 2, 3], // Mon, Tue, Wed
      } as BundleDeal;

      const now = new Date('2026-02-20T14:30:00Z'); // Friday (day 5)

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(false);
    });

    it('returns true when current day in daysOfWeek', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
        daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
      } as BundleDeal;

      const now = new Date('2026-02-20T14:30:00Z'); // Friday (day 5)

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(true);
    });

    it('returns false when time before timeStart', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
        timeStart: '09:00',
        timeEnd: '17:00',
      } as BundleDeal;

      // Use local time, not UTC
      const now = new Date(2026, 1, 20, 8, 30, 0); // 8:30 AM local

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(false);
    });

    it('returns false when time after timeEnd', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
        timeStart: '09:00',
        timeEnd: '17:00',
      } as BundleDeal;

      // Use local time, not UTC
      const now = new Date(2026, 1, 20, 18, 30, 0); // 6:30 PM local

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(false);
    });

    it('returns true when time within window', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
        timeStart: '09:00',
        timeEnd: '17:00',
      } as BundleDeal;

      // Use local time, not UTC
      const now = new Date(2026, 1, 20, 14, 30, 0); // 2:30 PM local

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(true);
    });

    it('returns false when day wrong AND time wrong', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
        daysOfWeek: [1, 2, 3], // Mon, Tue, Wed
        timeStart: '09:00',
        timeEnd: '17:00',
      } as BundleDeal;

      const now = new Date('2026-02-21T18:30:00Z'); // Saturday 6:30 PM (day 6)

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(false);
    });

    it('returns true when day right AND time right', () => {
      const bundle: Partial<BundleDeal> = {
        id: 'test-bundle',
        name: 'Test Bundle',
        daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
        timeStart: '09:00',
        timeEnd: '17:00',
      } as BundleDeal;

      // Use local time for consistent day-of-week matching
      const now = new Date(2026, 1, 20, 14, 30, 0); // Friday 2:30 PM (day 5)

      const result = service.isWithinTimeWindow(now, bundle as BundleDeal);

      expect(result).toBe(true);
    });
  });

  describe('transitionBundles', () => {
    it('handles empty result set gracefully', async () => {
      const result = await service.transitionBundles();

      expect(result.success).toBe(true);
      expect(result.transitionsPerformed).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });
});
