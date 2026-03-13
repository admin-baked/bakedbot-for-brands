import { playbookTelemetry } from '@/server/services/playbook-telemetry';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    }
}));

describe('playbookTelemetry', () => {
    let mockSet: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSet = jest.fn().mockResolvedValue(undefined);

        const mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    set: mockSet
                })
            })
        };
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('should successfully record telemetry event', async () => {
        await playbookTelemetry.recordEvent({
            playbookId: 'pb_1',
            runId: 'run_1',
            stageName: 'validating',
            metrics: { durationMs: 1500, tokenInput: 100 },
            success: true
        });

        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
            playbookId: 'pb_1',
            runId: 'run_1',
            stageName: 'validating',
            metrics: { durationMs: 1500, tokenInput: 100 },
            success: true,
            id: expect.any(String),
            createdAt: expect.any(String)
        }));
    });

    it('should swallow errors and log warning if firestore fails', async () => {
        mockSet.mockRejectedValue(new Error('Firestore down'));

        // Should not throw
        await playbookTelemetry.recordEvent({
            playbookId: 'pb_1',
            runId: 'run_1',
            metrics: { durationMs: 50 },
            success: false,
            errorCode: 'TEST_ERROR'
        });

        expect(mockSet).toHaveBeenCalled();
        const { logger } = require('@/lib/logger');
        expect(logger.warn).toHaveBeenCalledWith(
            '[Telemetry] Failed to record event',
            expect.objectContaining({ error: 'Firestore down' })
        );
    });
});
