/** @jest-environment node */
import { jest } from '@jest/globals';

// --- Mocks ---
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', email: 'test@bakedbot.ai', role: 'admin' })
}));

jest.mock('@/server/integrations/slack/service', () => ({
    postMessage: jest.fn().mockResolvedValue({ ok: true })
}));

jest.mock('@/server/integrations/drive/service', () => ({
    uploadFile: jest.fn().mockResolvedValue({ id: 'drive-id-123' })
}));

jest.mock('@/server/tools/codebase', () => ({
    readCodebase: jest.fn().mockResolvedValue({ type: 'file', content: 'Mock code' })
}));

jest.mock('@/lib/email/dispatcher', () => {
    return {
        sendGenericEmail: jest.fn().mockResolvedValue(true)
    };
}, { virtual: true });

jest.mock('@/server/tools/gmail', () => ({
    gmailAction: jest.fn().mockResolvedValue({ success: true, data: [] })
}));

jest.mock('@/server/agents/deebo/policy-gate', () => ({
    checkContent: jest.fn().mockResolvedValue({ allowed: true })
}));

jest.mock('util', () => ({
    promisify: jest.fn((fn) => fn) // Simple pass-through for mocks
}));

// Mock child_process for Terminal skill
jest.mock('child_process', () => ({
    exec: jest.fn().mockResolvedValue({ stdout: 'Mock stdout', stderr: '' })
}));

// --- Skills to Test ---
import { postMessageTool } from '@/skills/domain/slack';
import { uploadFileTool } from '@/skills/core/drive';
import { readCodebaseTool } from '@/skills/core/codebase';
import { executeTool as terminalExecuteTool } from '@/skills/core/terminal';
import { evaluateJsTool } from '@/skills/core/analysis';
import { marketingSendTool } from '@/skills/core/email';

describe('Agent Skills Implementation', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('domain/slack', () => {
        it('should call slack postMessage with correct params', async () => {
            const { postMessage } = await import('@/server/integrations/slack/service');
            const inputs = { channel: 'general', text: 'Hello' };
            const ctx = { user: { uid: 'user-1' } };

            const result = await postMessageTool.implementation(ctx, inputs);

            expect(postMessage).toHaveBeenCalledWith('test-user', 'general', 'Hello');
            expect(result.status).toBe('success');
        });
    });

    describe('core/drive', () => {
        it('should call drive uploadFile with correct params', async () => {
            const { uploadFile } = await import('@/server/integrations/drive/service');
            const inputs = { filename: 'test.txt', content: 'test content' };
            const ctx = { user: { uid: 'user-1' } };

            const result = await uploadFileTool.implementation(ctx, inputs);

            expect(uploadFile).toHaveBeenCalledWith('test-user', 'test.txt', 'test content', 'text/plain');
            expect(result.status).toBe('success');
            expect(result.fileId).toBe('drive-id-123');
        });
    });

    describe('core/codebase', () => {
        it('should call readCodebase tool', async () => {
            const { readCodebase } = await import('@/server/tools/codebase');
            const inputs = { path: 'src/app' };

            const result = await readCodebaseTool.implementation({}, inputs);

            expect(readCodebase).toHaveBeenCalledWith(inputs);
            expect(result.status).toBe('success');
        });
    });

    describe('core/terminal', () => {
        it('should execute shell commands', async () => {
            const { executeTool } = await import('@/skills/core/terminal');
            const result = await executeTool.implementation({}, { command: 'ls -la' });
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
            const { checkContent } = await import('@/server/agents/deebo/policy-gate');
            const { requireUser } = await import('@/server/auth/auth');
            const { sendGenericEmail } = await import('@/lib/email/dispatcher');

            (requireUser as jest.Mock).mockResolvedValue({ email: 'me@bakedbot.ai' });
            
            const inputs = { to: 'me@bakedbot.ai', subject: 'Test', htmlBody: 'Test' };
            const result = await marketingSendTool.implementation({}, inputs);

            expect(checkContent).not.toHaveBeenCalled();
            expect(sendGenericEmail).toHaveBeenCalled();
            expect(result.compliance).toBe('skipped (internal/test)');
        });

        it('should enforce compliance for external sends', async () => {
            const { checkContent } = await import('@/server/agents/deebo/policy-gate');
            const { requireUser } = await import('@/server/auth/auth');

            (requireUser as jest.Mock).mockResolvedValue({ email: 'me@bakedbot.ai' });
            (checkContent as jest.Mock).mockResolvedValue({ allowed: false, reason: 'Bad words', violations: ['word'] });
            
            const inputs = { to: 'customer@gmail.com', subject: 'Buy Now', htmlBody: 'Great weed' };
            
            await expect(marketingSendTool.implementation({}, inputs)).rejects.toThrow(/Compliance Blocked/);
            expect(checkContent).toHaveBeenCalled();
        });
    });

});
