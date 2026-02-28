import {
  createDriver,
  getDrivers,
  toggleDriverAvailability,
} from '../driver';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('driver action security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks non-super users from creating drivers in another org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await createDriver({
      orgId: 'org-b',
      firstName: 'John',
      lastName: 'Doe',
      phone: '3155551111',
      email: 'john@example.com',
      licenseNumber: 'NY123456',
      licenseState: 'NY',
      licenseExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      vehicleType: 'car',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users from listing another orgs drivers', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await getDrivers('org-b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users from toggling another orgs driver', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const driverRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ orgId: 'org-b', isAvailable: false }),
      }),
      update: jest.fn(),
    };
    const driversCollection = {
      doc: jest.fn().mockReturnValue(driverRef),
    };
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === 'drivers') return driversCollection;
          return {};
        }),
      },
    });

    const result = await toggleDriverAvailability('driver-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(driverRef.update).not.toHaveBeenCalled();
  });

  it('allows super users to toggle cross-org drivers', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-a',
    });

    const driverRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ orgId: 'org-b', isAvailable: false }),
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const driversCollection = {
      doc: jest.fn().mockReturnValue(driverRef),
    };
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === 'drivers') return driversCollection;
          return {};
        }),
      },
    });

    const result = await toggleDriverAvailability('driver-1');

    expect(result.success).toBe(true);
    expect(result.isAvailable).toBe(true);
    expect(driverRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isAvailable: true })
    );
  });

  it('rejects invalid driver ids before loading firestore', async () => {
    const result = await toggleDriverAvailability('bad/id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid driver ID');
    expect(requireUser).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
