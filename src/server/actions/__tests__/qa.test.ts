import { generateTestCasesFromSpec, getBugById, getQAReport } from '../qa';
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

describe('qa actions: getBugById access control', () => {
  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
    });
    mockCollection.mockImplementation((name: string) => {
      if (name === 'qa_bugs') {
        return {
          doc: mockDoc,
        };
      }
      return { doc: jest.fn() };
    });
    mockDoc.mockImplementation(() => ({ get: mockGet }));
  });

  it('hides cross-org bugs from non-super users', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
      brandId: 'org-a',
    });
    mockGet.mockResolvedValue({
      exists: true,
      id: 'bug-1',
      data: () => ({
        affectedOrgId: 'org-b',
        reportedBy: 'user-2',
        status: 'open',
      }),
    });

    const result = await getBugById('bug-1');

    expect(result).toBeNull();
  });

  it('allows non-super users to view bugs affecting their org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
      brandId: 'org-a',
    });
    mockGet.mockResolvedValue({
      exists: true,
      id: 'bug-2',
      data: () => ({
        affectedOrgId: 'org-a',
        reportedBy: 'user-2',
        status: 'open',
      }),
    });

    const result = await getBugById('bug-2');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'bug-2',
        affectedOrgId: 'org-a',
      }),
    );
  });

  it('allows non-super users to view bugs they reported', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
      brandId: 'org-a',
    });
    mockGet.mockResolvedValue({
      exists: true,
      id: 'bug-3',
      data: () => ({
        affectedOrgId: 'org-z',
        reportedBy: 'user-1',
        status: 'open',
      }),
    });

    const result = await getBugById('bug-3');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'bug-3',
        reportedBy: 'user-1',
      }),
    );
  });

  it('allows super users to view any bug', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });
    mockGet.mockResolvedValue({
      exists: true,
      id: 'bug-4',
      data: () => ({
        affectedOrgId: 'org-z',
        reportedBy: 'user-99',
        status: 'open',
      }),
    });

    const result = await getBugById('bug-4');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'bug-4',
        affectedOrgId: 'org-z',
      }),
    );
  });
});

describe('qa actions: getQAReport scoping', () => {
  const bugsWhere = jest.fn();
  const bugsGet = jest.fn();
  const testCasesGet = jest.fn();
  const mockCollection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    bugsWhere.mockReturnThis();
    bugsGet.mockResolvedValue({ docs: [] });
    testCasesGet.mockResolvedValue({ docs: [] });

    mockCollection.mockImplementation((name: string) => {
      if (name === 'qa_bugs') {
        return {
          where: bugsWhere,
          get: bugsGet,
        };
      }
      if (name === 'qa_test_cases') {
        return {
          get: testCasesGet,
        };
      }
      return { get: jest.fn().mockResolvedValue({ docs: [] }) };
    });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
    });
  });

  it('forces non-super users to their own org scope even when an orgId filter is provided', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
      brandId: 'org-a',
    });

    await getQAReport('org-b');

    expect(bugsWhere).toHaveBeenCalledWith('affectedOrgId', '==', 'org-a');
  });

  it('allows super users to request a specific org scope', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    await getQAReport('org-b');

    expect(bugsWhere).toHaveBeenCalledWith('affectedOrgId', '==', 'org-b');
  });
});
