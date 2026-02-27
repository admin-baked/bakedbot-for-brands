import { getDynamicPromptSuggestions } from '../dynamic-prompts';
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

describe('dynamic-prompts security', () => {
  function mockEmptyFirestore(): void {
    const emptyQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    };
    const usersCollection = {
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: () => ({}) }),
      }),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'users') return usersCollection;
        return emptyQuery;
      }),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks non-super users from cross-org prompt reads', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await getDynamicPromptSuggestions('org-b', 'user-1');

    expect(result).toEqual([]);
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('blocks non-super users from querying another users onboarding context', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await getDynamicPromptSuggestions('org-a', 'user-2');

    expect(result).toEqual([]);
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('allows same-org reads for the authenticated user', async () => {
    mockEmptyFirestore();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await getDynamicPromptSuggestions('org-a', 'user-1');

    expect(Array.isArray(result)).toBe(true);
    expect(getAdminFirestore).toHaveBeenCalled();
  });

  it('allows super users to read cross-org prompt context', async () => {
    mockEmptyFirestore();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-a',
    });

    const result = await getDynamicPromptSuggestions('org-b', 'user-2');

    expect(Array.isArray(result)).toBe(true);
    expect(getAdminFirestore).toHaveBeenCalled();
  });
});
