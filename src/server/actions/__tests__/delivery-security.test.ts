import { assignDriver, getDelivery, getDeliveryZones, getDriverPerformance, getPublicDeliveryQr } from '../delivery';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/server/services/delivery-fcm', () => ({
  sendDriverAssignmentPush: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('delivery actions security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks non-super users from reading another orgs delivery zones', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org_a',
    });

    const result = await getDeliveryZones('loc_b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('allows same-org zone reads when actor org maps to location org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org_a',
    });

    const zonesQuery = {
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const locationsCollection = {
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(zonesQuery),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'locations') return locationsCollection;
        return {};
      }),
    });

    const result = await getDeliveryZones('loc_a');

    expect(result.success).toBe(true);
    expect(locationsCollection.doc).toHaveBeenCalledWith('loc_a');
  });

  it('blocks non-super users from assigning drivers to cross-org deliveries', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org_a',
    });

    const deliveryRef = { id: 'delivery-1' };
    const driverRef = { id: 'driver-1' };
    const transaction = {
      get: jest
        .fn()
        .mockImplementation(async (ref: unknown) => {
          if (ref === deliveryRef) {
            return { exists: true, data: () => ({ locationId: 'loc_b' }) };
          }
          if (ref === driverRef) {
            return { exists: true, data: () => ({ orgId: 'org_b', isAvailable: true }) };
          }
          return { exists: false, data: () => ({}) };
        }),
      update: jest.fn(),
    };

    const db = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'deliveries') {
          return { doc: jest.fn().mockReturnValue(deliveryRef) };
        }
        if (name === 'drivers') {
          return { doc: jest.fn().mockReturnValue(driverRef) };
        }
        return {};
      }),
      runTransaction: jest.fn().mockImplementation(async (fn: (txn: typeof transaction) => Promise<void>) => fn(transaction)),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await assignDriver('delivery-1', 'driver-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it('blocks non-super users from reading cross-org driver performance', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org_a',
    });

    const result = await getDriverPerformance('loc_b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('blocks non-super users from reading cross-org delivery details', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org_a',
    });

    const db = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name !== 'deliveries') return {};
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: 'del_1',
              data: () => ({ locationId: 'loc_b' }),
            }),
          }),
        };
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await getDelivery('del_1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns a limited public payload for QR rendering', async () => {
    const db = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name !== 'deliveries') return {};
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: 'del_1',
              data: () => ({
                orderId: 'order_123',
                status: 'assigned',
                deliveryQrCode: 'qr_abc',
                deliveryAddress: { street: '123 Main', city: 'Syracuse', state: 'NY', zip: '13202' },
                driverId: 'driver_999',
                idVerification: { verified: false },
              }),
            }),
          }),
        };
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await getPublicDeliveryQr('del_1');

    expect(result.success).toBe(true);
    expect((result as any).delivery.driverId).toBeUndefined();
    expect((result as any).delivery.idVerification).toBeUndefined();
    expect((result as any).delivery.deliveryQrCode).toBe('qr_abc');
  });

  it('rejects invalid public delivery ids before reading firestore', async () => {
    const result = await getPublicDeliveryQr('bad/id');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid delivery ID');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });
});
