import { captureEmailLead, getLeads } from '../email-capture';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/auth', () => ({
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
    debug: jest.fn(),
  },
}));

describe('email-capture security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks non-super users from querying another orgs leads', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await getLeads('org-b');

    expect(result).toEqual([]);
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('scopes default non-super lead query to actor org only', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const queryForBrand = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const queryForDispensary = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const where = jest.fn()
      .mockImplementationOnce((field: string, _op: string, value: string) => {
        expect(field).toBe('brandId');
        expect(value).toBe('org-a');
        return queryForBrand;
      })
      .mockImplementationOnce((field: string, _op: string, value: string) => {
        expect(field).toBe('dispensaryId');
        expect(value).toBe('org-a');
        return queryForDispensary;
      });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({ where }),
    });

    const result = await getLeads();

    expect(Array.isArray(result)).toBe(true);
    expect(where).toHaveBeenCalledTimes(2);
  });

  it('allows super users to query all leads without filters', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-a',
    });

    const get = jest.fn().mockResolvedValue({
      docs: [
        {
          id: 'lead-1',
          data: () => ({
            email: 'a@example.com',
            capturedAt: 100,
            emailConsent: true,
            smsConsent: false,
            ageVerified: true,
            source: 'menu',
            tags: [],
          }),
        },
      ],
    });

    const orderBy = jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({ get }),
    });

    const collection = jest.fn().mockReturnValue({ orderBy });
    (getAdminFirestore as jest.Mock).mockReturnValue({ collection });

    const result = await getLeads();

    expect(collection).toHaveBeenCalledWith('email_leads');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lead-1');
  });

  it('does not overwrite another org lead when email matches', async () => {
    const existingUpdate = jest.fn().mockResolvedValue(undefined);
    const emailGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'lead-org-a',
          get: (field: string) => (field === 'brandId' ? 'org-a' : undefined),
          ref: { update: existingUpdate },
        },
      ],
    });
    const phoneGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    const add = jest.fn().mockResolvedValue({ id: 'lead-org-b' });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockImplementation((name: string) => {
        if (name !== 'email_leads') return { add: jest.fn(), where: jest.fn() };
        return {
          where: jest.fn().mockImplementation((field: string) => {
            if (field === 'email') return { get: emailGet };
            if (field === 'phone') return { get: phoneGet };
            return { get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) };
          }),
          add,
        };
      }),
    });

    const result = await captureEmailLead({
      email: 'same@example.com',
      emailConsent: false,
      smsConsent: false,
      brandId: 'org-b',
      source: 'menu',
    });

    expect(result.success).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    expect(existingUpdate).not.toHaveBeenCalled();
  });

  it('updates existing lead when scope matches', async () => {
    const existingUpdate = jest.fn().mockResolvedValue(undefined);
    const emailGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'lead-org-a',
          get: (field: string) => (field === 'brandId' ? 'org-a' : undefined),
          ref: { update: existingUpdate },
        },
      ],
    });
    const add = jest.fn().mockResolvedValue({ id: 'lead-new' });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockImplementation((name: string) => {
        if (name !== 'email_leads') return { add: jest.fn(), where: jest.fn() };
        return {
          where: jest.fn().mockImplementation((field: string) => {
            if (field === 'email') return { get: emailGet };
            return { get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) };
          }),
          add,
        };
      }),
    });

    const result = await captureEmailLead({
      email: 'same@example.com',
      emailConsent: false,
      smsConsent: false,
      brandId: 'org-a',
      source: 'menu',
    });

    expect(result.success).toBe(true);
    expect(existingUpdate).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
  });
});
