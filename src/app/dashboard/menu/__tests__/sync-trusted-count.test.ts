import { getTrustedSyncCount } from '@/app/dashboard/menu/sync-guards';

describe('getTrustedSyncCount', () => {
  it('preserves previous baseline when stale deletion is skipped', () => {
    expect(getTrustedSyncCount({
      staleDeletionSkipped: true,
      previousSyncCount: 120,
      currentSyncCount: 12,
    })).toBe(120);
  });

  it('uses current count when stale deletion is not skipped', () => {
    expect(getTrustedSyncCount({
      staleDeletionSkipped: false,
      previousSyncCount: 120,
      currentSyncCount: 95,
    })).toBe(95);
  });

  it('uses current count when previous baseline is missing', () => {
    expect(getTrustedSyncCount({
      staleDeletionSkipped: true,
      previousSyncCount: null,
      currentSyncCount: 15,
    })).toBe(15);
  });
});
