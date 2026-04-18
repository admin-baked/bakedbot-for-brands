import { getPlaybookTemplateStats } from '../playbook-template-admin';
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

describe('playbook-template-admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows super_admin users to fetch cross-org template stats', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-admin-1',
      role: 'super_admin',
    });

    const playbookExecutionsQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ size: 0, docs: [] }),
    };
    const playbooksQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ size: 1, docs: [{ data: () => ({ status: 'active' }) }] }),
    };
    const firestore = {
      collection: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: 'template-1',
              data: () => ({ name: 'Template 1', tier: 'pro' }),
            },
          ],
        }),
      }),
      collectionGroup: jest.fn().mockImplementation((name: string) => {
        if (name === 'playbooks') return playbooksQuery;
        if (name === 'playbook_executions') return playbookExecutionsQuery;
        throw new Error(`Unexpected collectionGroup: ${name}`);
      }),
    };
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getPlaybookTemplateStats();

    expect('templates' in result).toBe(true);
    expect(playbooksQuery.where).toHaveBeenCalledWith('playbookId', '==', 'template-1');
    expect(playbooksQuery.where).not.toHaveBeenCalledWith('orgId', expect.anything());
  });

  it('fails closed when a non-super user has no organization context', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'brand-user-1',
      role: 'brand_admin',
    });

    const result = await getPlaybookTemplateStats();

    expect(result).toEqual({ error: 'Missing organization context' });
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
