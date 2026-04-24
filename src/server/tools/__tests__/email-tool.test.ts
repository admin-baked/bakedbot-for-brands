
import { EmailTool } from '../email-tool';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// Mock firebase admin auth — execute() calls getAdminAuth().getUser()
jest.mock('@/firebase/admin', () => ({
    getAdminAuth: jest.fn(() => ({
        getUser: jest.fn().mockResolvedValue({
            customClaims: { role: 'super_user' }
        })
    }))
}));

describe('EmailTool', () => {
    let tool: EmailTool;
    const mockContext: any = {
        userId: 'user123',
        tenantId: 'tenant456'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        tool = new EmailTool();
    });

    it('should have correct metadata', () => {
        expect(tool.id).toBe('email.send');
        expect(tool.name).toBe('Send Email');
        // Description changed: no longer mentions "connected Gmail", now just says "Gmail when available"
        expect(tool.description).toContain('Gmail');
    });

    it('should execute successfully for a single recipient', async () => {
        (sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const input = {
            to: 'customer@example.com',
            subject: 'Welcome',
            body: 'Hello World',
            bodyType: 'text' as const
        };

        const result = await tool.execute(input, mockContext);

        expect(result.success).toBe(true);
        expect(sendGenericEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'customer@example.com',
            subject: 'Welcome',
            textBody: 'Hello World',
            userId: 'user123',
        }));
        expect(result.data?.sent).toBe(true);
        expect(result.data?.recipients).toContain('customer@example.com');
    });

    it('should handle multi-recipient sending', async () => {
        (sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const input = {
            to: ['a@test.com', 'b@test.com'],
            subject: 'Broadcast',
            body: 'Hey all',
        };

        const result = await tool.execute(input, mockContext);

        expect(result.success).toBe(true);
        expect(sendGenericEmail).toHaveBeenCalledTimes(2);
        expect(result.data?.recipients).toHaveLength(2);
    });

    it('should fail when all deliveries fail', async () => {
        (sendGenericEmail as jest.Mock).mockResolvedValue({ success: false, error: 'No provider available' });

        const input = {
            to: 'test@test.com',
            subject: 'Fail',
            body: 'Fail'
        };

        const result = await tool.execute(input, mockContext);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Email delivery error');
    });

    it('should handle partial failures', async () => {
        (sendGenericEmail as jest.Mock)
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({ success: false, error: 'Bounce' });

        const input = {
            to: ['good@test.com', 'bad@test.com'],
            subject: 'Partial',
            body: 'Try it',
        };

        const result = await tool.execute(input, mockContext);

        expect(result.success).toBe(true);
        expect(result.data?.recipients).toHaveLength(1);
        expect(result.data?.recipients).toContain('good@test.com');
    });
});
