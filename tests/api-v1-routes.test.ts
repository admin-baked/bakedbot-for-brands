// tests/api-v1-routes.test.ts
// Integration tests for /api/v1/ route handlers
// Tests: compliance/check, research (POST+GET), workflows (GET+POST)

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// NextResponse.json uses Response.json() static method which is not available in jsdom.
// Mock next/server so NextResponse.json returns a plain testable object.
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body: unknown, init?: { status?: number }) => ({
            status: init?.status ?? 200,
            json: async () => body,
            ok: (init?.status ?? 200) < 400,
        })),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock API key auth
// ─────────────────────────────────────────────────────────────────────────────

const mockRequireAPIKey = jest.fn();

jest.mock('@/server/auth/api-key-auth', () => {
    class APIKeyError extends Error {
        readonly statusCode: number;
        readonly code: string;
        constructor(statusCode: number, code: string, message: string) {
            super(message);
            this.name = 'APIKeyError';
            this.statusCode = statusCode;
            this.code = code;
        }
        toResponse() {
            // Response.json() static method is not available in jsdom — use new Response()
            return {
                status: this.statusCode,
                json: async () => ({ success: false, error: { code: this.code, message: this.message } }),
            };
        }
    }
    return {
        requireAPIKey: (...args: unknown[]) => mockRequireAPIKey(...args),
        APIKeyError,
    };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock downstream services
// ─────────────────────────────────────────────────────────────────────────────

const mockCheckBlogCompliance = jest.fn();
jest.mock('@/server/services/blog-compliance', () => ({
    checkBlogCompliance: (...args: unknown[]) => mockCheckBlogCompliance(...args),
}));

const mockAdd = jest.fn();
const mockGet = jest.fn();
const mockDocGet = jest.fn();
const mockCollection = jest.fn(() => ({
    add: mockAdd,
    doc: jest.fn(() => ({ get: mockDocGet })),
    where: jest.fn().mockReturnThis(),
    get: mockGet,
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: { collection: mockCollection },
    }),
}));

const mockListWorkflows = jest.fn(() => []);
jest.mock('@/server/services/workflow-registry', () => ({
    listWorkflows: () => mockListWorkflows(),
    registerWorkflow: jest.fn(),
    getWorkflow: jest.fn(),
}));

const mockExecuteWorkflow = jest.fn();
jest.mock('@/server/services/workflow-runtime', () => ({
    executeWorkflow: (...args: unknown[]) => mockExecuteWorkflow(...args),
}));

// Mock global fetch for the fire-and-forget research trigger
global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

import { APIKeyError } from '@/server/auth/api-key-auth';

// ─────────────────────────────────────────────────────────────────────────────
// Import route handlers (Next.js route exports)
// ─────────────────────────────────────────────────────────────────────────────

// We import after mocks are set up
let compliancePOST: (req: Request) => Promise<Response>;
let researchPOST: (req: Request) => Promise<Response>;
let researchGET: (req: Request) => Promise<Response>;
let workflowsGET: (req: Request) => Promise<Response>;
let workflowsPOST: (req: Request) => Promise<Response>;

beforeAll(async () => {
    ({ POST: compliancePOST } = await import('../src/app/api/v1/compliance/check/route'));
    ({ POST: researchPOST, GET: researchGET } = await import('../src/app/api/v1/research/route'));
    ({ GET: workflowsGET, POST: workflowsPOST } = await import('../src/app/api/v1/workflows/route'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeKeyRecord(id = 'key-1', orgId = 'org-1') {
    return {
        id, orgId,
        keyHash: 'hash', keyPrefix: 'bb_live_a',
        name: 'Test', permissions: ['compliance:check'],
        rateLimitPerMinute: 60, createdAt: new Date(), active: true,
    };
}

function makeRequest(body?: unknown, url = 'https://bakedbot.ai/api/v1/test', method = 'POST'): Request {
    const req = new Request(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bb_live_test' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    // Override .json() directly on the instance — jsdom Request body streams are unreliable in Jest.
    // Routes call request.json().catch(() => null), so we short-circuit to the original value.
    if (body !== undefined) {
        (req as any).json = async () => JSON.parse(JSON.stringify(body));
    } else {
        (req as any).json = async () => { throw new SyntaxError('Unexpected end of JSON input'); };
    }
    return req;
}

function makeGETRequest(searchParams: Record<string, string> = {}): Request {
    const url = new URL('https://bakedbot.ai/api/v1/research');
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
    const req = new Request(url.toString(), {
        method: 'GET',
        headers: { Authorization: 'Bearer bb_live_test' },
    });
    // NextRequest has a .nextUrl property — shim it so route handlers can read searchParams
    (req as any).nextUrl = url;
    return req;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAPIKey.mockResolvedValue(makeKeyRecord());
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth guard (shared across all routes)
// ─────────────────────────────────────────────────────────────────────────────

describe('API v1 — auth guard', () => {
    test('compliance/check returns 401 when API key missing', async () => {
        mockRequireAPIKey.mockRejectedValue(new APIKeyError(401, 'missing_api_key', 'No key'));

        const res = await compliancePOST(makeRequest({ content: 'test' }));
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.error.code).toBe('missing_api_key');
    });

    test('research POST returns 403 when permissions insufficient', async () => {
        mockRequireAPIKey.mockRejectedValue(new APIKeyError(403, 'insufficient_permissions', 'No access'));

        const res = await researchPOST(makeRequest({ query: 'test' }));
        expect(res.status).toBe(403);
    });

    test('workflows GET returns 401 for invalid key', async () => {
        mockRequireAPIKey.mockRejectedValue(new APIKeyError(401, 'invalid_api_key', 'Bad key'));

        const res = await workflowsGET(makeRequest(undefined, 'https://bakedbot.ai/api/v1/workflows', 'GET'));
        expect(res.status).toBe(401);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/compliance/check
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/compliance/check', () => {
    test('returns 400 when body is missing content field', async () => {
        const res = await compliancePOST(makeRequest({ rulePack: 'ny' }));
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.error?.code).toBe('invalid_request');
        expect(body.error?.message).toContain('content');
    });

    test('returns 400 for empty/invalid body', async () => {
        const req = new Request('https://bakedbot.ai/api/v1/compliance/check', {
            method: 'POST',
            headers: { Authorization: 'Bearer bb_live_test' },
            body: 'not json',
        });

        const res = await compliancePOST(req);
        expect(res.status).toBe(400);
    });

    test('returns passed=true when compliance check passes', async () => {
        mockCheckBlogCompliance.mockResolvedValue({
            status: 'approved',
            issues: [],
        });

        const res = await compliancePOST(makeRequest({ content: 'Safe cannabis content' }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.passed).toBe(true);
        expect(body.data.violations).toEqual([]);
    });

    test('returns passed=false with violations when compliance fails', async () => {
        mockCheckBlogCompliance.mockResolvedValue({
            status: 'failed',
            issues: [
                { message: 'Medical claim detected' },
                { message: 'Unqualified health benefit claim' },
            ],
        });

        const res = await compliancePOST(makeRequest({ content: 'This cures everything!' }));
        expect(res.status).toBe(200); // still 200, compliance result is in body

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.passed).toBe(false);
        expect(body.data.violations).toHaveLength(2);
        expect(body.data.violations[0]).toBe('Medical claim detected');
    });

    test('returns rulePack from request body in response', async () => {
        mockCheckBlogCompliance.mockResolvedValue({ status: 'approved', issues: [] });

        const res = await compliancePOST(makeRequest({ content: 'Content', rulePack: 'ny-retail' }));
        const body = await res.json();

        expect(body.data.rulePack).toBe('ny-retail');
    });

    test('defaults rulePack to "default" when not provided', async () => {
        mockCheckBlogCompliance.mockResolvedValue({ status: 'approved', issues: [] });

        const res = await compliancePOST(makeRequest({ content: 'Content' }));
        const body = await res.json();

        expect(body.data.rulePack).toBe('default');
    });

    test('includes meta with requestId, durationMs, version in response', async () => {
        mockCheckBlogCompliance.mockResolvedValue({ status: 'approved', issues: [] });

        const res = await compliancePOST(makeRequest({ content: 'Content' }));
        const body = await res.json();

        expect(body.meta).toBeDefined();
        expect(body.meta.version).toBe('v1');
        expect(typeof body.meta.durationMs).toBe('number');
    });

    test('returns 500 when checkBlogCompliance throws', async () => {
        mockCheckBlogCompliance.mockRejectedValue(new Error('Service unavailable'));

        const res = await compliancePOST(makeRequest({ content: 'Content' }));
        expect(res.status).toBe(500);

        const body = await res.json();
        expect(body.error?.code).toBe('internal_error');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/research
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/research', () => {
    beforeEach(() => {
        mockAdd.mockResolvedValue({ id: 'task-abc123' });
    });

    test('returns 400 when query is missing', async () => {
        const res = await researchPOST(makeRequest({ orgId: 'org-1' }));
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.error?.code).toBe('invalid_request');
        expect(body.error?.message).toContain('query');
    });

    test('creates research task in Firestore', async () => {
        const res = await researchPOST(makeRequest({ query: 'cannabis market trends' }));
        expect(res.status).toBe(201);

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                query: 'cannabis market trends',
                status: 'queued',
                progress: 0,
            }),
        );
    });

    test('returns 201 with taskId and status queued', async () => {
        const res = await researchPOST(makeRequest({ query: 'test query' }));
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.taskId).toBe('task-abc123');
        expect(body.data.status).toBe('queued');
        expect(body.data.query).toBe('test query');
    });

    test('uses key record orgId when request body lacks orgId', async () => {
        mockRequireAPIKey.mockResolvedValue(makeKeyRecord('key-1', 'org-from-key'));

        await researchPOST(makeRequest({ query: 'test' }));

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({ orgId: 'org-from-key' }),
        );
    });

    test('overrides orgId with body orgId when provided', async () => {
        mockRequireAPIKey.mockResolvedValue(makeKeyRecord('key-1', 'org-from-key'));

        await researchPOST(makeRequest({ query: 'test', orgId: 'org-override' }));

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({ orgId: 'org-override' }),
        );
    });

    test('fires research job trigger non-blocking', async () => {
        await researchPOST(makeRequest({ query: 'test' }));

        // fetch is called fire-and-forget; give microtasks time to flush
        await Promise.resolve();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/jobs/research'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    test('returns 500 on Firestore error', async () => {
        mockAdd.mockRejectedValue(new Error('Firestore unavailable'));

        const res = await researchPOST(makeRequest({ query: 'test' }));
        expect(res.status).toBe(500);

        const body = await res.json();
        expect(body.error?.code).toBe('internal_error');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/research
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/research', () => {
    test('returns 400 when taskId query param is missing', async () => {
        const req = makeGETRequest(); // no taskId
        const res = await researchGET(req);
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.error?.code).toBe('invalid_request');
        expect(body.error?.message).toContain('taskId');
    });

    test('returns 404 when task not found', async () => {
        mockDocGet.mockResolvedValue({ exists: false });

        const req = makeGETRequest({ taskId: 'nonexistent-task' });
        const res = await researchGET(req);
        expect(res.status).toBe(404);

        const body = await res.json();
        expect(body.error?.code).toBe('not_found');
    });

    test('returns task data when found', async () => {
        const taskData = {
            status: 'completed',
            progress: 100,
            query: 'cannabis trends',
            report: '# Report\nFull research...',
            plan: ['step1', 'step2'],
            sources: ['https://example.com'],
            createdAt: { toDate: () => new Date('2026-03-01') },
            completedAt: { toDate: () => new Date('2026-03-01T01:00:00') },
        };

        mockDocGet.mockResolvedValue({ exists: true, data: () => taskData });

        const req = makeGETRequest({ taskId: 'task-123' });
        const res = await researchGET(req);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.taskId).toBe('task-123');
        expect(body.data.status).toBe('completed');
        expect(body.data.progress).toBe(100);
        expect(body.data.query).toBe('cannabis trends');
        expect(body.data.report).toBe('# Report\nFull research...');
        expect(body.data.sources).toHaveLength(1);
    });

    test('returns null for optional fields when missing', async () => {
        mockDocGet.mockResolvedValue({
            exists: true,
            data: () => ({
                status: 'queued',
                progress: 0,
                query: 'test',
                createdAt: null,
                completedAt: null,
            }),
        });

        const req = makeGETRequest({ taskId: 'task-queued' });
        const res = await researchGET(req);
        const body = await res.json();

        expect(body.data.report).toBeNull();
        expect(body.data.plan).toBeNull();
        expect(body.data.sources).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/workflows
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/workflows', () => {
    test('returns empty array when no workflows registered', async () => {
        mockListWorkflows.mockReturnValue([]);

        const req = new Request('https://bakedbot.ai/api/v1/workflows', {
            method: 'GET',
            headers: { Authorization: 'Bearer bb_live_test' },
        });
        const res = await workflowsGET(req);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toEqual([]);
    });

    test('returns workflow summaries without step details', async () => {
        mockListWorkflows.mockReturnValue([{
            id: 'wf-1',
            name: 'Blog Post Generator',
            description: 'Generate and publish blog posts',
            version: 1,
            agent: 'craig',
            category: 'content',
            tags: ['blog', 'content'],
            trigger: { type: 'manual' },
            steps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
        }]);

        const req = new Request('https://bakedbot.ai/api/v1/workflows', {
            method: 'GET',
            headers: { Authorization: 'Bearer bb_live_test' },
        });
        const res = await workflowsGET(req);
        const body = await res.json();

        const wf = body.data[0];
        expect(wf.id).toBe('wf-1');
        expect(wf.name).toBe('Blog Post Generator');
        expect(wf.stepCount).toBe(3);
        // Steps themselves should NOT be in the summary
        expect(wf.steps).toBeUndefined();
    });

    test('returns multiple workflows', async () => {
        mockListWorkflows.mockReturnValue([
            { id: 'wf-1', name: 'A', description: 'd', version: 1, agent: 'craig', category: 'c', tags: [], trigger: {}, steps: [] },
            { id: 'wf-2', name: 'B', description: 'd', version: 2, agent: 'leo', category: 'c', tags: [], trigger: {}, steps: [{}, {}] },
        ]);

        const req = new Request('https://bakedbot.ai/api/v1/workflows', { method: 'GET', headers: { Authorization: 'Bearer test' } });
        const res = await workflowsGET(req);
        const body = await res.json();

        expect(body.data).toHaveLength(2);
        expect(body.data[1].stepCount).toBe(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/workflows
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/workflows', () => {
    test('returns 400 when workflowId is missing', async () => {
        const res = await workflowsPOST(makeRequest({ variables: {} }));
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.error?.code).toBe('invalid_request');
        expect(body.error?.message).toContain('workflowId');
    });

    test('executes workflow and returns execution result', async () => {
        mockExecuteWorkflow.mockResolvedValue({
            id: 'exec-123',
            workflowId: 'wf-blog',
            status: 'completed',
            durationMs: 5000,
            stepResults: [
                { id: 's1', status: 'completed' },
                { id: 's2', status: 'completed' },
            ],
            error: undefined,
        });

        const res = await workflowsPOST(makeRequest({ workflowId: 'wf-blog' }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.executionId).toBe('exec-123');
        expect(body.data.workflowId).toBe('wf-blog');
        expect(body.data.status).toBe('completed');
        expect(body.data.stepsCompleted).toBe(2);
        expect(body.data.stepsFailed).toBe(0);
    });

    test('returns partial failure counts correctly', async () => {
        mockExecuteWorkflow.mockResolvedValue({
            id: 'exec-456',
            workflowId: 'wf-complex',
            status: 'failed',
            durationMs: 3000,
            stepResults: [
                { id: 's1', status: 'completed' },
                { id: 's2', status: 'failed' },
                { id: 's3', status: 'failed' },
            ],
            error: 'Step 2 failed',
        });

        const res = await workflowsPOST(makeRequest({ workflowId: 'wf-complex' }));
        const body = await res.json();

        expect(body.data.stepsCompleted).toBe(1);
        expect(body.data.stepsFailed).toBe(2);
        expect(body.data.error).toBe('Step 2 failed');
    });

    test('passes variables to executeWorkflow', async () => {
        mockExecuteWorkflow.mockResolvedValue({
            id: 'exec-1', workflowId: 'wf-1', status: 'completed',
            durationMs: 1, stepResults: [], error: undefined,
        });

        const vars = { brandId: 'brand-xyz', topic: 'cannabis trends' };
        await workflowsPOST(makeRequest({ workflowId: 'wf-1', variables: vars }));

        expect(mockExecuteWorkflow).toHaveBeenCalledWith(
            'wf-1',
            expect.objectContaining({ variables: vars }),
        );
    });

    test('passes triggeredBy as api_key:{keyId}', async () => {
        mockRequireAPIKey.mockResolvedValue(makeKeyRecord('my-key-id'));
        mockExecuteWorkflow.mockResolvedValue({
            id: 'exec-1', workflowId: 'wf-1', status: 'completed',
            durationMs: 1, stepResults: [], error: undefined,
        });

        await workflowsPOST(makeRequest({ workflowId: 'wf-1' }));

        expect(mockExecuteWorkflow).toHaveBeenCalledWith(
            'wf-1',
            expect.objectContaining({ triggeredBy: 'api_key:my-key-id' }),
        );
    });

    test('returns 404 when workflow not found in registry', async () => {
        mockExecuteWorkflow.mockRejectedValue(new Error('Workflow not found in registry: wf-missing'));

        const res = await workflowsPOST(makeRequest({ workflowId: 'wf-missing' }));
        expect(res.status).toBe(404);

        const body = await res.json();
        expect(body.error?.code).toBe('not_found');
    });

    test('returns 500 on unexpected execution error', async () => {
        mockExecuteWorkflow.mockRejectedValue(new Error('Internal execution failure'));

        const res = await workflowsPOST(makeRequest({ workflowId: 'wf-1' }));
        expect(res.status).toBe(500);

        const body = await res.json();
        expect(body.error?.code).toBe('internal_error');
    });
});
