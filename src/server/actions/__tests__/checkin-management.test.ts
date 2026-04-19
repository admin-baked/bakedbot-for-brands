/**
 * Regression tests for auth guards added in 9ef66a10e:
 *   H1 — getCheckinStats / getRecentCheckinVisits / getCheckinConfig / postCheckinBriefingToInbox
 *        all require a session user whose orgId matches the requested org (or super_user)
 *   H2 — linkCustomerToAlleaves verifies the customer's orgId before writing
 *   M3 — getPublicBrandTheme logs on Firestore errors (no more silent catch)
 */

import {
  getCheckinStats,
  getRecentCheckinVisits,
  getCheckinConfig,
  postCheckinBriefingToInbox,
  getPublicBrandTheme,
  getPendingKioskPicks,
  markKioskPickFulfilled,
} from '../checkin-management';
import { linkCustomerToAlleaves } from '../loyalty-tablet';
import { requireUser } from '@/lib/auth-helpers';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { getCustomerOnboardingStatusSummary } from '@/server/services/customer-onboarding';

jest.mock('@/lib/auth-helpers', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/server/services/customer-onboarding', () => ({
  getCustomerOnboardingStatusSummary: jest.fn(),
}));

// linkCustomerToAlleaves uses a dynamic import of requireUser from @/server/auth/auth
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));
import { requireUser as requireUserAuth } from '@/server/auth/auth';

function makeEmptyFirestore() {
  const emptySnap = { docs: [], empty: true };
  const emptyCountSnap = { data: () => ({ count: 0 }) };
  return {
    collection: jest.fn(() => ({
      where: jest.fn(function (this: unknown) { return this; }),
      get: jest.fn(async () => emptySnap),
      count: jest.fn(() => ({ get: jest.fn(async () => emptyCountSnap) })),
      doc: jest.fn(() => ({
        get: jest.fn(async () => ({ exists: false, data: () => undefined })),
        set: jest.fn(),
        update: jest.fn(),
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(async () => ({ exists: false, data: () => undefined })),
          })),
        })),
      })),
    })),
    doc: jest.fn(() => ({
      get: jest.fn(async () => ({ exists: false, data: () => undefined })),
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({ exists: false, data: () => undefined })),
        })),
      })),
    })),
  };
}

// ── H1: Auth guards ──────────────────────────────────────────────────────────

describe('H1: checkin management actions require org-scoped auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue(makeEmptyFirestore());
    (getCustomerOnboardingStatusSummary as jest.Mock).mockResolvedValue({ totalCustomers: 0 });
  });

  it('getCheckinStats — blocks cross-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', role: 'dispensary_admin', orgId: 'org_other' });
    const result = await getCheckinStats('org_thrive_syracuse');
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('getCheckinStats — allows same-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', role: 'dispensary_admin', orgId: 'org_thrive_syracuse' });
    const result = await getCheckinStats('org_thrive_syracuse');
    expect(result.success).toBe(true);
  });

  it('getCheckinStats — allows super_user cross-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'su1', role: 'super_user', orgId: 'org_platform' });
    const result = await getCheckinStats('org_thrive_syracuse');
    expect(result.success).toBe(true);
  });

  it('getRecentCheckinVisits — blocks cross-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u2', role: 'dispensary_admin', orgId: 'org_other' });
    const result = await getRecentCheckinVisits('org_thrive_syracuse');
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('getCheckinConfig — blocks cross-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u3', role: 'dispensary_admin', orgId: 'org_other' });
    const result = await getCheckinConfig('org_thrive_syracuse');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('postCheckinBriefingToInbox — blocks cross-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u4', role: 'dispensary_admin', orgId: 'org_other' });
    const result = await postCheckinBriefingToInbox('org_thrive_syracuse');
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });
});

// ── H2: linkCustomerToAlleaves org guard ──────────────────────────────────────

describe('H2: linkCustomerToAlleaves verifies customer org before writing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when customer belongs to a different org', async () => {
    (requireUserAuth as jest.Mock).mockResolvedValue({ uid: 'u5', role: 'dispensary_admin', orgId: 'org_thrive_syracuse' });
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({ orgId: 'org_other' }), // customer belongs to different org
          })),
          update: jest.fn(),
        })),
      })),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await linkCustomerToAlleaves('org_thrive_syracuse', 'customer_from_other_org', 'alv_123');
    expect(result).toEqual({ success: false });
    // Firestore update must NOT be called
    const docMock = db.collection().doc();
    expect(docMock.update).not.toHaveBeenCalled();
  });

  it('proceeds when customer orgId matches', async () => {
    (requireUserAuth as jest.Mock).mockResolvedValue({ uid: 'u6', role: 'dispensary_admin', orgId: 'org_thrive_syracuse' });
    const setMock = jest.fn();
    const db = {
      collection: jest.fn((col: string) => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => col === 'customers' ? { orgId: 'org_thrive_syracuse' } : { totalSpent: 0, orderCount: 0 },
          })),
          set: setMock,
          collection: jest.fn((subCol: string) => ({
            doc: jest.fn(() => ({
              get: jest.fn(async () => ({
                exists: subCol === 'customer_spending',
                data: () => ({ totalSpent: 120, orderCount: 3 }),
              })),
            })),
          })),
        })),
      })),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await linkCustomerToAlleaves('org_thrive_syracuse', 'customer_own_org', 'alv_456');
    expect(result.success).toBe(true);
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ alleavesCustomerId: 'alv_456' }), { merge: true });
  });
});

// ── Kiosk Picks ───────────────────────────────────────────────────────────────

describe('getPendingKioskPicks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns pending picks for an authorised dispensary user', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', role: 'dispensary_admin', orgId: 'org_thrive_syracuse' });
    const pickDoc = {
      id: 'pick_001',
      data: () => ({
        firstName: 'Tamika',
        mood: 'relaxed',
        productNames: ['Blue Dream', 'Sunny Side Cart'],
        productIds: ['prod-flower', 'prod-vape'],
        status: 'pending',
        createdAt: { toDate: () => new Date('2026-04-19T14:00:00Z') },
      }),
    };
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(function (this: unknown) { return this; }),
            orderBy: jest.fn(function (this: unknown) { return this; }),
            limit: jest.fn(function (this: unknown) { return this; }),
            get: jest.fn(async () => ({ docs: [pickDoc] })),
          })),
        })),
      })),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await getPendingKioskPicks('org_thrive_syracuse');

    expect(result.success).toBe(true);
    expect(result.picks).toHaveLength(1);
    expect(result.picks![0]).toMatchObject({
      id: 'pick_001',
      firstName: 'Tamika',
      mood: 'relaxed',
      productNames: ['Blue Dream', 'Sunny Side Cart'],
      productIds: ['prod-flower', 'prod-vape'],
      status: 'pending',
      createdAt: '2026-04-19T14:00:00.000Z',
    });
  });

  it('returns failure when requireUser throws (unauthenticated)', async () => {
    (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthenticated'));
    (getAdminFirestore as jest.Mock).mockReturnValue(makeEmptyFirestore());

    const result = await getPendingKioskPicks('org_thrive_syracuse');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch kiosk picks');
  });

  it('returns an empty picks array when there are no pending picks', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u2', role: 'dispensary_admin', orgId: 'org_thrive_syracuse' });
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(function (this: unknown) { return this; }),
            orderBy: jest.fn(function (this: unknown) { return this; }),
            limit: jest.fn(function (this: unknown) { return this; }),
            get: jest.fn(async () => ({ docs: [] })),
          })),
        })),
      })),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await getPendingKioskPicks('org_thrive_syracuse');

    expect(result.success).toBe(true);
    expect(result.picks).toEqual([]);
  });
});

describe('markKioskPickFulfilled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the pick status to fulfilled', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', role: 'dispensary_admin', orgId: 'org_thrive_syracuse' });
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({ update: updateMock })),
          })),
        })),
      })),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await markKioskPickFulfilled('org_thrive_syracuse', 'pick_001');

    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'fulfilled', fulfilledAt: expect.any(Date) }),
    );
  });

  it('returns failure when requireUser throws (unauthenticated)', async () => {
    (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthenticated'));
    (getAdminFirestore as jest.Mock).mockReturnValue(makeEmptyFirestore());

    const result = await markKioskPickFulfilled('org_thrive_syracuse', 'pick_001');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to mark pick as fulfilled');
  });
});

// ── M3: getPublicBrandTheme logs on error ─────────────────────────────────────

describe('M3: getPublicBrandTheme logs instead of silently catching errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a warning when Firestore throws during brand theme fetch', async () => {
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () => { throw new Error('Firestore unavailable'); }),
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({
              get: jest.fn(async () => { throw new Error('Firestore unavailable'); }),
            })),
          })),
        })),
      })),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const theme = await getPublicBrandTheme('org_thrive_syracuse');

    // Returns default theme (not null/undefined)
    expect(theme).toBeTruthy();
    expect(theme.colors).toBeDefined();
    // Logged the error
    expect(logger.warn).toHaveBeenCalledWith(
      '[CheckinManagement] getPublicBrandTheme failed',
      expect.objectContaining({ orgId: 'org_thrive_syracuse' }),
    );
  });
});
