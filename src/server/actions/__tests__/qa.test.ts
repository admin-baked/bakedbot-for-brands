import { generateTestCasesFromSpec } from '../qa';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { callClaude } from '@/ai/claude';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/ai/claude', () => ({
  callClaude: jest.fn(),
}));

jest.mock('@/server/services/qa-notifications', () => ({
  notifyNewBug: jest.fn(),
  notifyBugFixed: jest.fn(),
  notifyBugVerified: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('qa actions: generateTestCasesFromSpec', () => {
  const mockBatchSet = jest.fn();
  const mockBatchCommit = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockDb = {
    batch: jest.fn(),
    collection: mockCollection,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

    mockBatchSet.mockImplementation(() => undefined);
    mockBatchCommit.mockResolvedValue(undefined);
    mockDb.batch.mockReturnValue({
      set: mockBatchSet,
      commit: mockBatchCommit,
    });

    mockDoc.mockImplementation((id: string) => ({ id, path: `qa_test_cases/${id}` }));
    mockCollection.mockImplementation((name: string) => {
      if (name === 'qa_test_cases') {
        return { doc: mockDoc };
      }
      return { doc: jest.fn() };
    });
  });

  it('writes generated test cases using the requested QA area', async () => {
    (callClaude as jest.Mock).mockResolvedValue(
      JSON.stringify([
        {
          title: 'Detect deposit activation',
          steps: '1. Create pending advance\n2. Send deposit\n3. Poll activation',
          expected: 'Advance becomes active',
          priority: 'critical',
        },
      ]),
    );

    const result = await generateTestCasesFromSpec({
      featureName: 'GreenLedger Deposit Flow',
      specContent: 'Spec body',
      area: 'greenledger',
      count: 1,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.testCases?.[0].area).toBe('greenledger');
    }
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        area: 'greenledger',
      }),
    );
  });

  it('clamps requested count and filters invalid test case objects', async () => {
    (callClaude as jest.Mock).mockResolvedValue(
      JSON.stringify([
        {
          title: 'Valid test',
          steps: '1. Step',
          expected: 'Works',
          priority: 'medium',
        },
        {
          title: '',
          steps: '1. Missing title',
          expected: 'Should be rejected',
          priority: 'low',
        },
        {
          title: 'Bad priority',
          steps: '1. Step',
          expected: 'Should be rejected',
          priority: 'urgent',
        },
      ]),
    );

    const result = await generateTestCasesFromSpec({
      featureName: 'Big Feature',
      specContent: 'Long spec',
      area: 'campaigns',
      count: 999,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.testCases).toHaveLength(1);
      expect(result.testCases?.[0].title).toBe('Valid test');
    }
    expect(callClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining('exactly 20'),
      }),
    );
  });

  it('returns a validation error when Claude payload is not a JSON array', async () => {
    (callClaude as jest.Mock).mockResolvedValue(
      JSON.stringify({
        title: 'not-array',
      }),
    );

    const result = await generateTestCasesFromSpec({
      featureName: 'Feature',
      specContent: 'Spec',
      area: 'other',
      count: 2,
    });

    expect(result).toEqual({
      success: false,
      error: 'Claude returned invalid payload - expected a JSON array',
    });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('returns a validation error when feature name or spec is empty', async () => {
    const result = await generateTestCasesFromSpec({
      featureName: '  ',
      specContent: '   ',
      area: 'other',
    });

    expect(result).toEqual({
      success: false,
      error: 'featureName and specContent are required',
    });
    expect(callClaude).not.toHaveBeenCalled();
  });
});
