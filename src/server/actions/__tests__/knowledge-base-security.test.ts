jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
  isSuperUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/ai/genkit', () => ({
  ai: {
    embed: jest.fn(),
  },
}));

import { requireUser, isSuperUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { getKnowledgeBasesAction } from '../knowledge-base';

describe('knowledge-base security', () => {
  function mockKnowledgeBaseQuery() {
    const get = jest.fn().mockResolvedValue({
      docs: [
        {
          id: 'kb-1',
          data: () => ({
            ownerId: 'org-a',
            name: 'Org A KB',
            createdAt: new Date('2026-02-27T00:00:00.000Z'),
            updatedAt: new Date('2026-02-27T00:00:00.000Z'),
          }),
        },
      ],
    });
    const where = jest.fn().mockReturnValue({ get });
    const collection = jest.fn().mockReturnValue({ where });
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: { collection },
    });
    return { collection };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (isSuperUser as jest.Mock).mockResolvedValue(false);
  });

  it('blocks non-super cross-org knowledge base reads', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'brand_admin',
      currentOrgId: 'org-a',
    });

    const result = await getKnowledgeBasesAction('org-b');

    expect(result).toEqual([]);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('allows same-org knowledge base reads', async () => {
    const { collection } = mockKnowledgeBaseQuery();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'brand_admin',
      currentOrgId: 'org-a',
    });

    const result = await getKnowledgeBasesAction('org-a');

    expect(createServerClient).toHaveBeenCalled();
    expect(collection).toHaveBeenCalledWith('knowledge_bases');
    expect(result).toHaveLength(1);
  });

  it('allows super users cross-org knowledge base reads', async () => {
    mockKnowledgeBaseQuery();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-a',
    });

    const result = await getKnowledgeBasesAction('org-b');

    expect(createServerClient).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('blocks non-super system-owner reads', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'brand_admin',
      currentOrgId: 'org-a',
    });

    const result = await getKnowledgeBasesAction('system');

    expect(result).toEqual([]);
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
