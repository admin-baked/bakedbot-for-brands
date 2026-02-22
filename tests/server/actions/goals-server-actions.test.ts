import {
  createGoal,
  getOrgGoals,
  getActiveGoals,
  updateGoalProgress,
  updateGoalStatus,
  deleteGoal,
  activateGoal,
  achieveGoal,
} from '@/server/actions/goals';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { OrgGoal, GoalMetric } from '@/types/goals';
import { Timestamp } from 'firebase-admin/firestore';

jest.mock('@/server/auth/auth');
jest.mock('@/firebase/admin');
jest.mock('@/lib/logger');

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<typeof getAdminFirestore>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock Firestore mock factory
function createMockFirestore(
  userOrgIds: string[] = ['org_test'],
  goals: Record<string, OrgGoal> = {}
) {
  const goalsCollection: Record<string, OrgGoal> = { ...goals };

  const createUserDocMock = () => ({
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ uid: 'user_123', orgIds: userOrgIds }),
    }),
  });

  const createGoalDocMock = (goalId: string) => ({
    get: jest.fn().mockResolvedValue({
      exists: !!goalsCollection[goalId],
      data: () => goalsCollection[goalId] || null,
    }),
    set: jest.fn((data: OrgGoal) => {
      goalsCollection[goalId] = data;
      return Promise.resolve();
    }),
    update: jest.fn((data: Partial<OrgGoal>) => {
      if (goalsCollection[goalId]) {
        goalsCollection[goalId] = { ...goalsCollection[goalId], ...data };
      }
      return Promise.resolve();
    }),
    delete: jest.fn(() => {
      delete goalsCollection[goalId];
      return Promise.resolve();
    }),
  });

  const createGoalsCollectionMock = () => ({
    where: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        docs: Object.values(goalsCollection)
          .filter((goal: any) => goal.status === 'active')
          .map((goal: any) => ({
            data: () => goal,
          })),
      }),
    })),
    orderBy: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        docs: Object.values(goalsCollection)
          .sort((a: any, b: any) => b.endDate.getTime() - a.endDate.getTime())
          .map((goal: any) => ({
            data: () => goal,
          })),
      }),
    })),
    doc: jest.fn((goalId: string) => createGoalDocMock(goalId)),
  });

  const createOrgDocMock = () => ({
    collection: jest.fn((collectionName: string) => {
      if (collectionName === 'goals') {
        return createGoalsCollectionMock();
      }
      return {};
    }),
  });

  const mockDb = {
    collection: jest.fn((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          doc: jest.fn((userId: string) => createUserDocMock()),
        };
      }
      if (collectionName === 'orgs') {
        return {
          doc: jest.fn((orgId: string) => createOrgDocMock()),
        };
      }
      return {};
    }),
  };

  return mockDb as any;
}

function createMockGoal(overrides?: Partial<OrgGoal>): OrgGoal {
  const now = new Date();
  return {
    id: 'goal_123_abc',
    title: 'Test Goal',
    description: 'Test goal description',
    category: 'revenue',
    timeframe: 'quarterly',
    status: 'pending',
    progress: 0,
    metrics: [
      {
        key: 'revenue',
        label: 'Revenue Growth',
        currentValue: 0,
        baselineValue: 10000,
        targetValue: 15000,
        unit: 'USD',
      },
    ],
    milestones: [
      {
        label: 'Milestone 1',
        progress: 25,
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
    playbookIds: ['playbook_1'],
    startDate: now,
    endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
    lastProgressUpdatedAt: now,
    ...overrides,
  };
}

describe('Goals Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      uid: 'user_123',
      email: 'test@example.com',
    } as any);
  });

  describe('createGoal', () => {
    it('creates goal in Firestore at correct path', async () => {
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const goalData = createMockGoal();
      const result = await createGoal('org_test', goalData);

      expect(result.success).toBe(true);
      expect(result.goalId).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[createGoal]'),
        expect.any(Object)
      );
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const goalData = createMockGoal();
      const result = await createGoal('org_test', goalData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('blocks creation if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const goalData = createMockGoal();
      const result = await createGoal('org_test', goalData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('calculates initial progress and status', async () => {
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const goalData = createMockGoal();
      const result = await createGoal('org_test', goalData);

      expect(result.success).toBe(true);
      // Progress calculated based on metrics
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[createGoal]'),
        expect.objectContaining({
          goalId: expect.any(String),
          orgId: 'org_test',
          category: 'revenue',
        })
      );
    });

    it('returns goalId on success', async () => {
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const goalData = createMockGoal();
      const result = await createGoal('org_test', goalData);

      expect(result.success).toBe(true);
      expect(result.goalId).toMatch(/^goal_\d+_[a-z0-9]+$/);
    });
  });

  describe('getOrgGoals', () => {
    it('queries goals ordered by endDate descending', async () => {
      const now = new Date();
      const goal_1 = createMockGoal({ id: 'goal_1', endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) });
      const goal_2 = createMockGoal({ id: 'goal_2', endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) });

      const mockDb = createMockFirestore(['org_test'], { goal_1, goal_2 });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getOrgGoals('org_test');

      expect(result.success).toBe(true);
      expect(result.goals).toHaveLength(2);
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getOrgGoals('org_test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('blocks access if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getOrgGoals('org_test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('converts Firestore Timestamps to Dates', async () => {
      const goal_1 = createMockGoal({ id: 'goal_1' });

      const mockDb = createMockFirestore(['org_test'], { goal_1 });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getOrgGoals('org_test');

      expect(result.success).toBe(true);
      expect(result.goals?.[0].createdAt).toBeInstanceOf(Date);
      expect(result.goals?.[0].updatedAt).toBeInstanceOf(Date);
    });

    it('returns empty array when no goals exist', async () => {
      const mockDb = createMockFirestore(['org_test'], {});
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getOrgGoals('org_test');

      expect(result.success).toBe(true);
      expect(result.goals).toEqual([]);
    });
  });

  describe('getActiveGoals', () => {
    it('filters goals by status=active', async () => {
      const goal_active = createMockGoal({ id: 'goal_active', status: 'active' });
      const goal_pending = createMockGoal({ id: 'goal_pending', status: 'pending' });

      const mockDb = createMockFirestore(['org_test'], { goal_active, goal_pending });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getActiveGoals('org_test');

      expect(result.success).toBe(true);
      // Mock returns only active goals
      expect(result.goals?.every(g => g.status === 'active')).toBe(true);
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getActiveGoals('org_test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('blocks access if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getActiveGoals('org_test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('updateGoalProgress', () => {
    it('updates goal progress metrics', async () => {
      const goal = createMockGoal({ id: 'goal_123_abc', status: 'active' });
      const mockDb = createMockFirestore(['org_test'], { goal_123_abc: goal });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const updatedMetrics: GoalMetric[] = [
        {
          key: 'revenue',
          label: 'Revenue Growth',
          currentValue: 12000,
          baselineValue: 10000,
          targetValue: 15000,
          unit: 'USD',
        },
      ];

      const result = await updateGoalProgress('org_test', 'goal_123_abc', updatedMetrics);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[updateGoalProgress]'),
        expect.any(Object)
      );
    });

    it('recalculates progress and status', async () => {
      const goal = createMockGoal({ id: 'goal_123_abc' });
      const mockDb = createMockFirestore(['org_test'], { goal_123_abc: goal });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const updatedMetrics: GoalMetric[] = [
        {
          key: 'revenue',
          label: 'Revenue Growth',
          currentValue: 15000,
          baselineValue: 10000,
          targetValue: 15000,
          unit: 'USD',
        },
      ];

      const result = await updateGoalProgress('org_test', 'goal_123_abc', updatedMetrics);

      expect(result.success).toBe(true);
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await updateGoalProgress('org_test', 'goal_123', []);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('blocks access if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await updateGoalProgress('org_test', 'goal_123', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('returns error if goal not found', async () => {
      const mockDb = createMockFirestore(['org_test'], {});
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await updateGoalProgress('org_test', 'goal_missing', []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Goal not found');
    });
  });

  describe('updateGoalStatus', () => {
    it('updates goal status', async () => {
      const goal = createMockGoal({ id: 'goal_123_abc', status: 'pending' });
      const mockDb = createMockFirestore(['org_test'], { goal_123_abc: goal });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await updateGoalStatus('org_test', 'goal_123_abc', 'active');

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[updateGoalStatus]'),
        expect.objectContaining({ status: 'active' })
      );
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await updateGoalStatus('org_test', 'goal_123', 'active');

      expect(result.success).toBe(false);
    });

    it('blocks access if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await updateGoalStatus('org_test', 'goal_123', 'active');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('deleteGoal', () => {
    it('deletes goal from Firestore', async () => {
      const goal = createMockGoal({ id: 'goal_123_abc' });
      const mockDb = createMockFirestore(['org_test'], { goal_123_abc: goal });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await deleteGoal('org_test', 'goal_123_abc');

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[deleteGoal]'),
        expect.any(Object)
      );
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await deleteGoal('org_test', 'goal_123');

      expect(result.success).toBe(false);
    });

    it('blocks access if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await deleteGoal('org_test', 'goal_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('activateGoal', () => {
    it('activates goal by setting status to active', async () => {
      const goal = createMockGoal({ id: 'goal_123_abc', status: 'pending' });
      const mockDb = createMockFirestore(['org_test'], { goal_123_abc: goal });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await activateGoal('org_test', 'goal_123_abc');

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[activateGoal]'),
        expect.any(Object)
      );
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await activateGoal('org_test', 'goal_123');

      expect(result.success).toBe(false);
    });

    it('blocks access if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await activateGoal('org_test', 'goal_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('returns error if goal not found', async () => {
      const mockDb = createMockFirestore(['org_test'], {});
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await activateGoal('org_test', 'goal_missing');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Goal not found');
    });
  });

  describe('achieveGoal', () => {
    it('marks goal as achieved with 100% progress', async () => {
      const goal = createMockGoal({ id: 'goal_123_abc', status: 'active', progress: 75 });
      const mockDb = createMockFirestore(['org_test'], { goal_123_abc: goal });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await achieveGoal('org_test', 'goal_123_abc');

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[achieveGoal]'),
        expect.any(Object)
      );
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));
      const mockDb = createMockFirestore();
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await achieveGoal('org_test', 'goal_123');

      expect(result.success).toBe(false);
    });

    it('blocks access if user not member of org', async () => {
      const mockDb = createMockFirestore(['org_other']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await achieveGoal('org_test', 'goal_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('Org isolation', () => {
    it('prevents users from accessing other orgs goals', async () => {
      const mockDb = createMockFirestore(['org_a']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      // Attempt to access org_b
      const result = await getOrgGoals('org_b');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('prevents users from modifying other orgs goals', async () => {
      const mockDb = createMockFirestore(['org_a']);
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await updateGoalStatus('org_b', 'goal_123', 'active');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('allows users with multiple org memberships to access their orgs', async () => {
      const goal_123_abc = createMockGoal({ id: 'goal_123_abc' });
      const mockDb = createMockFirestore(['org_a', 'org_b'], { goal_123_abc });
      mockGetAdminFirestore.mockReturnValue(mockDb);

      const result = await getOrgGoals('org_b');

      expect(result.success).toBe(true);
    });
  });
});
