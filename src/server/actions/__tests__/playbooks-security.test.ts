import {
  listBrandPlaybooks,
  createPlaybook,
  runPlaybookTest,
} from '../playbooks';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

describe('playbooks security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from listing playbooks for another org', async () => {
    const result = await listBrandPlaybooks('org-b');
    expect(result).toEqual([]);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users from creating playbooks for another org', async () => {
    const result = await createPlaybook('org-b', {
      name: 'Cross Org Playbook',
      description: 'x',
      agent: 'craig',
      category: 'marketing',
      triggers: [{ type: 'manual' }],
      steps: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users from running playbook tests for another org', async () => {
    const result = await runPlaybookTest('org-b', 'pb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('allows super users cross-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });

    const update = jest.fn().mockResolvedValue(undefined);
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({ update }),
          }),
        }),
      }),
    };
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await runPlaybookTest('org-b', 'pb-1');

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalled();
  });
});

