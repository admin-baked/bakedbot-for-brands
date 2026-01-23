/**
 * @jest-environment node
 */
import { POST } from '@/app/api/browser/workflow/[workflowId]/run/route';
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { browserSessionManager } from '@/server/services/browser-automation/session-manager';
import { workflowRecorder } from '@/server/services/browser-automation/workflow-recorder';

// Mocks
jest.mock('@/server/auth/auth');
jest.mock('@/server/services/browser-automation/session-manager');
jest.mock('@/server/services/browser-automation/workflow-recorder');
jest.mock('@/lib/logger');

describe('POST /api/browser/workflow/[workflowId]/run', () => {
    const mockParams = Promise.resolve({ workflowId: 'workflow-123' });
    const mockSession = { uid: 'user-123' };

    beforeEach(() => {
        jest.clearAllMocks();
        (requireSuperUser as jest.Mock).mockResolvedValue(mockSession);
    });

    const createRequest = (body: any = {}) => {
        return new NextRequest('http://localhost/api/browser/workflow/workflow-123/run', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    };

    it('should return 503 when no devices are available', async () => {
        (browserSessionManager.getActiveSession as jest.Mock).mockResolvedValue(null);
        (browserSessionManager.createSession as jest.Mock).mockResolvedValue({
            success: false,
            error: 'No available devices found. Please sign in to the Chrome extension at least once.',
        });

        const response = await POST(createRequest(), { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(503);
        expect(data.error).toContain('No available devices');
    });

    it('should return 500 when session creation fails for other reasons', async () => {
        (browserSessionManager.getActiveSession as jest.Mock).mockResolvedValue(null);
        (browserSessionManager.createSession as jest.Mock).mockResolvedValue({
            success: false,
            error: 'Database error',
        });

        const response = await POST(createRequest(), { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Database error');
    });

    it('should return 404 when workflow is not found', async () => {
        (browserSessionManager.getActiveSession as jest.Mock).mockResolvedValue({ id: 'session-123' });
        (workflowRecorder.runWorkflow as jest.Mock).mockResolvedValue({
            success: false,
            error: 'Workflow not found',
        });

        const response = await POST(createRequest(), { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Workflow not found');
    });

    it('should return 400 when workflow execution fails', async () => {
        (browserSessionManager.getActiveSession as jest.Mock).mockResolvedValue({ id: 'session-123' });
        (workflowRecorder.runWorkflow as jest.Mock).mockResolvedValue({
            success: false,
            error: 'Step 1 failed: Element not found',
        });

        const response = await POST(createRequest(), { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Step 1 failed');
    });

    it('should return 200 when workflow runs successfully', async () => {
        (browserSessionManager.getActiveSession as jest.Mock).mockResolvedValue({ id: 'session-123' });
        (workflowRecorder.runWorkflow as jest.Mock).mockResolvedValue({
            success: true,
            data: { stepsCompleted: 5 },
        });

        const response = await POST(createRequest(), { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
