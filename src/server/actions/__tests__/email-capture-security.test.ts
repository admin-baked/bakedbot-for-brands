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

  // Source now uses SHA256 deterministic doc IDs + runTransaction (atomic upsert).
  // Different orgs always get different doc IDs for the same email/phone.

  it('does not overwrite another org lead when email matches', async () => {
    const txSet = jest.fn();
    const txUpdate = jest.fn();
    const leadRef = { id: 'computed-hash-org-b' };

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(leadRef),
      }),
      runTransaction: jest.fn(async (handler: any) => {
        await handler({
          get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          set: txSet,
          update: txUpdate,
        });
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
    expect(result.isNewLead).toBe(true);
    expect(txSet).toHaveBeenCalledTimes(1);
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('updates existing lead when scope matches', async () => {
    const txSet = jest.fn();
    const txUpdate = jest.fn();
    const leadRef = { id: 'computed-hash-org-a' };

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(leadRef),
      }),
      runTransaction: jest.fn(async (handler: any) => {
        await handler({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ brandId: 'org-a', email: 'same@example.com' }),
          }),
          set: txSet,
          update: txUpdate,
        });
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
    expect(result.isNewLead).toBe(false);
    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(txSet).not.toHaveBeenCalled();
  });

  it('returns isNewLead=true when a new phone lead is created', async () => {
    const txSet = jest.fn();
    const leadRef = { id: 'computed-hash-phone-new' };

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(leadRef),
      }),
      runTransaction: jest.fn(async (handler: any) => {
        await handler({
          get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          set: txSet,
          update: jest.fn(),
        });
      }),
    });

    const result = await captureEmailLead({
      phone: '315-555-1212',
      emailConsent: false,
      smsConsent: false,
      brandId: 'org-a',
      source: 'menu',
    });

    expect(result.success).toBe(true);
    expect(result.isNewLead).toBe(true);
    expect(result.leadId).toEqual(expect.any(String));
    expect(txSet).toHaveBeenCalledWith(
      leadRef,
      expect.objectContaining({ phone: '+13155551212' }),
    );
  });

  it('returns isNewLead=false when an existing phone lead is updated', async () => {
    const txUpdate = jest.fn();
    const leadRef = { id: 'computed-hash-phone-existing' };

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(leadRef),
      }),
      runTransaction: jest.fn(async (handler: any) => {
        await handler({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ phone: '+13155551212', brandId: 'org-a' }),
          }),
          set: jest.fn(),
          update: txUpdate,
        });
      }),
    });

    const result = await captureEmailLead({
      phone: '(315) 555-1212',
      emailConsent: false,
      smsConsent: false,
      brandId: 'org-a',
      source: 'menu',
    });

    expect(result.success).toBe(true);
    expect(result.isNewLead).toBe(false);
    expect(txUpdate).toHaveBeenCalledWith(
      leadRef,
      expect.objectContaining({ phone: '+13155551212' }),
    );
  });

  it('normalizes phone numbers before deduping existing leads', async () => {
    const txSet = jest.fn();
    const docFn = jest.fn().mockReturnValue({ id: 'normalized-hash' });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({ doc: docFn }),
      runTransaction: jest.fn(async (handler: any) => {
        await handler({
          get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          set: txSet,
          update: jest.fn(),
        });
      }),
    });

    await captureEmailLead({
      phone: '(315) 555-1212',
      emailConsent: false,
      smsConsent: false,
      brandId: 'org-a',
      source: 'menu',
    });

    // The normalized phone +13155551212 is baked into the doc ID hash and the lead data
    expect(txSet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ phone: '+13155551212' }),
    );
  });
});
