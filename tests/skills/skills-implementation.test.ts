/** @jest-environment node */

// --- Mocks ---
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', email: 'test@bakedbot.ai', role: 'admin' })
}));

jest.mock('@/server/integrations/slack/service', () => ({
    postMessage: jest.fn().mockResolvedValue({ ok: true })
}));

jest.mock('@/server/integrations/drive/service', () => ({
    uploadFile: jest.fn().mockResolvedValue({ fileId: 'drive-id-123', url: 'https://drive.google.com/file/d/drive-id-123', name: 'test.txt' })
}));

jest.mock('@/server/tools/codebase', () => ({
    readCodebase: jest.fn().mockResolvedValue({ status: 'success', data: { path: 'src/app', type: 'directory', files: [] } })
}));

jest.mock('@/lib/email/dispatcher', () => {
    return {
        sendGenericEmail: jest.fn().mockResolvedValue({ success: true })
    };
});

jest.mock('@/server/tools/gmail', () => ({
    gmailAction: jest.fn().mockResolvedValue({ success: true, data: [] })
}));

jest.mock('@/server/agents/deebo/policy-gate', () => ({
    checkContent: jest.fn().mockResolvedValue({ allowed: true })
}));

jest.mock('util', () => {
    const actual = jest.requireActual('util');
    return {
        ...actual,
        // The terminal skill expects `promisify(exec)` to return a fn that yields `{ stdout, stderr }`.
        // In tests we shortcut and return the input fn which we mock as async.
        promisify: jest.fn((fn) => fn)
    };
});

// Mock child_process for Terminal skill
jest.mock('child_process', () => ({
    exec: jest.fn().mockResolvedValue({ stdout: 'Mock stdout', stderr: '' })
}));

// --- Skills to Test ---
// NOTE: Use `require()` after `jest.mock()` so mocks apply before module initialization.
// (Static imports are hoisted and can execute before mocks in our Jest + SWC setup.)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { postMessageTool } = require('@/skills/domain/slack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadFileTool } = require('@/skills/core/drive');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readCodebaseTool } = require('@/skills/core/codebase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executeTool: terminalExecuteTool } = require('@/skills/core/terminal');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { evaluateJsTool } = require('@/skills/core/analysis');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { marketingSendTool } = require('@/skills/core/email');

describe('Agent Skills Implementation', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('domain/slack', () => {
        it('should call slack postMessage with correct params', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { postMessage } = require('@/server/integrations/slack/service');
            const inputs = { channel: 'general', text: 'Hello' };
            const ctx = { user: { uid: 'user-1' } };

            const result = await postMessageTool.implementation(ctx, inputs);

            expect(postMessage).toHaveBeenCalledWith('test-user', 'general', 'Hello');
            expect(result.status).toBe('success');
        });
    });

    describe('core/drive', () => {
        it('should call drive uploadFile with correct params', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { uploadFile } = require('@/server/integrations/drive/service');
            const inputs = { filename: 'test.txt', content: 'test content' };
            const ctx = { user: { uid: 'user-1' } };

            const result = await uploadFileTool.implementation(ctx, inputs);

            expect(uploadFile).toHaveBeenCalledWith('test-user', 'test.txt', 'test content');
            expect(result.status).toBe('success');
            expect(result.fileId).toBe('drive-id-123');
        });
    });

    describe('core/codebase', () => {
        it('should call readCodebase tool', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { readCodebase } = require('@/server/tools/codebase');
            const inputs = { path: 'src/app' };

            const result = await readCodebaseTool.implementation({}, inputs);

            expect(readCodebase).toHaveBeenCalledWith({ path: 'src/app' });
            expect(result.status).toBe('success');
        });
    });

    describe('core/terminal', () => {
        it('should execute shell commands', async () => {
            const result = await terminalExecuteTool.implementation({}, { command: 'ls -la' });
            expect(result.status).toBe('success');
            expect(result.stdout).toBe('Mock stdout');
        });
    });

    describe('core/analysis', () => {
        it('should evaluate JS in a sandbox', async () => {
            const inputs = { 
                code: 'result = a + b', 
                context: { a: 1, b: 2 } 
            };
            const result = await evaluateJsTool.implementation({}, inputs);

            expect(result.status).toBe('success');
            expect(result.result).toBe(3);
        });

        it('should capture console logs in the sandbox', async () => {
            const inputs = { 
                code: 'console.log("hello world"); result = 42;' 
            };
            const result = await evaluateJsTool.implementation({}, inputs);

            expect(result.logs).toContain('hello world');
            expect(result.result).toBe(42);
        });
    });

    describe('core/email (Compliance Middleware)', () => {
        it('should skip compliance for self-sends', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { checkContent } = require('@/server/agents/deebo/policy-gate');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { requireUser } = require('@/server/auth/auth');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { sendGenericEmail } = require('@/lib/email/dispatcher');

            (requireUser as any).mockResolvedValue({ uid: 'test-user', email: 'me@bakedbot.ai', role: 'admin' });
            
            const inputs = { to: 'me@bakedbot.ai', subject: 'Test', htmlBody: 'Test' };
            const result = await marketingSendTool.implementation({}, inputs);

            expect(checkContent).not.toHaveBeenCalled();
            expect(sendGenericEmail).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.compliance).toBe('skipped (internal/test)');
        });

        it('should enforce compliance for external sends', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { checkContent } = require('@/server/agents/deebo/policy-gate');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { requireUser } = require('@/server/auth/auth');

            (requireUser as any).mockResolvedValue({ uid: 'test-user', email: 'me@bakedbot.ai', role: 'admin' });
            (checkContent as any).mockResolvedValue({ allowed: false, reason: 'Bad words', violations: ['word'] });
            
            const inputs = { to: 'customer@gmail.com', subject: 'Buy Now', htmlBody: 'Great weed' };
            
            await expect(marketingSendTool.implementation({}, inputs)).rejects.toThrow(/Compliance Blocked/);
            expect(checkContent).toHaveBeenCalled();
        });
    });

});
