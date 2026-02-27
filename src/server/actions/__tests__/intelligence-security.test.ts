import { getAgentCognitiveState, getAllAgentCognitiveStates } from '../intelligence';
import { requireUser } from '@/server/auth/auth';
import { cognitiveStateManager } from '@/server/services/letta/cognitive-state-manager';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/server/services/letta/cognitive-state-manager', () => ({
  cognitiveStateManager: {
    getState: jest.fn(),
    getAllAgentStates: jest.fn(),
    setPersonalityMode: jest.fn(),
    updateSliders: jest.fn(),
    applyPreset: jest.fn(),
  },
}));

jest.mock('@/server/services/letta/memory-gardening', () => ({
  memoryGardeningService: {
    getHealthMetrics: jest.fn(),
    gardenAgentMemory: jest.fn(),
  },
}));

jest.mock('@/server/services/letta/completeness-doctrine', () => ({
  completenessDoctrineService: {
    getCompletenessMetrics: jest.fn(),
  },
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
  })),
}));

describe('intelligence actions security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses currentOrgId context for cognitive state lookups', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'super_user',
      currentOrgId: 'org-current',
      orgId: 'org-fallback',
      brandId: 'brand-fallback',
    });
    (cognitiveStateManager.getState as jest.Mock).mockResolvedValue(null);

    await getAgentCognitiveState('agent-1');

    expect(cognitiveStateManager.getState).toHaveBeenCalledWith('agent-1', 'org-current');
  });

  it('rejects when organization context is missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });

    await expect(getAgentCognitiveState('agent-1')).rejects.toThrow(
      'Missing organization context for getAgentCognitiveState'
    );
    expect(cognitiveStateManager.getState).not.toHaveBeenCalled();
  });

  it('uses brandId when orgId/currentOrgId are missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      brandId: 'brand-org',
    });
    (cognitiveStateManager.getAllAgentStates as jest.Mock).mockResolvedValue([]);

    await getAllAgentCognitiveStates();

    expect(cognitiveStateManager.getAllAgentStates).toHaveBeenCalledWith('brand-org');
  });
});
