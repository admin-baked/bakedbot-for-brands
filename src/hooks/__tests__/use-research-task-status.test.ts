/**
 * Unit tests for useResearchTaskStatus hook
 * Tests polling behavior and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useResearchTaskStatus } from '../use-research-task-status';

// Mock the server action
jest.mock('@/app/dashboard/research/actions', () => ({
    getResearchTaskStatusAction: jest.fn()
}));

import { getResearchTaskStatusAction } from '@/app/dashboard/research/actions';

const mockGetStatus = getResearchTaskStatusAction as jest.MockedFunction<typeof getResearchTaskStatusAction>;

describe('useResearchTaskStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should return initial null state when no taskId', () => {
        const { result } = renderHook(() => 
            useResearchTaskStatus({ taskId: null })
        );

        expect(result.current.status).toBeNull();
        expect(result.current.progress).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isPolling).toBe(false);
    });

    it('should fetch status on mount when taskId provided', async () => {
        mockGetStatus.mockResolvedValue({
            success: true,
            status: 'processing',
            progress: {
                currentStep: 'Searching',
                stepsCompleted: 1,
                totalSteps: 5
            }
        });

        const { result } = renderHook(() => 
            useResearchTaskStatus({ taskId: 'task-123', enabled: true })
        );

        await waitFor(() => {
            expect(mockGetStatus).toHaveBeenCalledWith('task-123');
        });

        await waitFor(() => {
            expect(result.current.status).toBe('processing');
            expect(result.current.progress?.currentStep).toBe('Searching');
        });
    });

    it('should not fetch when disabled', () => {
        const { result } = renderHook(() => 
            useResearchTaskStatus({ taskId: 'task-123', enabled: false })
        );

        expect(mockGetStatus).not.toHaveBeenCalled();
        expect(result.current.status).toBeNull();
    });

    it('should poll at specified interval for processing tasks', async () => {
        mockGetStatus
            .mockResolvedValueOnce({
                success: true,
                status: 'processing',
                progress: { currentStep: 'Searching', stepsCompleted: 1, totalSteps: 5 }
            })
            .mockResolvedValueOnce({
                success: true,
                status: 'processing',
                progress: { currentStep: 'Analyzing', stepsCompleted: 3, totalSteps: 5 }
            });

        const { result } = renderHook(() => 
            useResearchTaskStatus({ 
                taskId: 'task-123', 
                enabled: true,
                pollingInterval: 2000 
            })
        );

        // Initial fetch
        await waitFor(() => {
            expect(result.current.status).toBe('processing');
        });

        // Advance timer for next poll
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(result.current.progress?.currentStep).toBe('Analyzing');
        });

        expect(mockGetStatus).toHaveBeenCalledTimes(2);
    });

    it('should stop polling when task completes', async () => {
        mockGetStatus
            .mockResolvedValueOnce({
                success: true,
                status: 'processing',
                progress: { currentStep: 'Analyzing', stepsCompleted: 4, totalSteps: 5 }
            })
            .mockResolvedValueOnce({
                success: true,
                status: 'completed',
                resultReportId: 'report-456',
                progress: { currentStep: 'Complete', stepsCompleted: 5, totalSteps: 5 }
            });

        const { result } = renderHook(() => 
            useResearchTaskStatus({ 
                taskId: 'task-123', 
                enabled: true,
                pollingInterval: 2000 
            })
        );

        // Initial fetch - processing
        await waitFor(() => {
            expect(result.current.status).toBe('processing');
            expect(result.current.isPolling).toBe(true);
        });

        // Advance timer
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        // Should now be completed and polling should stop
        await waitFor(() => {
            expect(result.current.status).toBe('completed');
            expect(result.current.resultReportId).toBe('report-456');
            expect(result.current.isPolling).toBe(false);
        });
    });

    it('should stop polling when task fails', async () => {
        mockGetStatus.mockResolvedValue({
            success: true,
            status: 'failed',
            error: 'API rate limit exceeded'
        });

        const { result } = renderHook(() => 
            useResearchTaskStatus({ taskId: 'task-123', enabled: true })
        );

        await waitFor(() => {
            expect(result.current.status).toBe('failed');
            expect(result.current.error).toBe('API rate limit exceeded');
            expect(result.current.isPolling).toBe(false);
        });
    });

    it('should handle API errors gracefully', async () => {
        mockGetStatus.mockResolvedValue({
            success: false,
            error: 'Network error'
        });

        const { result } = renderHook(() => 
            useResearchTaskStatus({ taskId: 'task-123', enabled: true })
        );

        await waitFor(() => {
            expect(result.current.error).toBe('Network error');
        });
    });

    it('should allow manual refetch', async () => {
        mockGetStatus.mockResolvedValue({
            success: true,
            status: 'processing',
            progress: { currentStep: 'Browsing', stepsCompleted: 2, totalSteps: 5 }
        });

        const { result } = renderHook(() => 
            useResearchTaskStatus({ taskId: 'task-123', enabled: true })
        );

        await waitFor(() => {
            expect(mockGetStatus).toHaveBeenCalledTimes(1);
        });

        // Trigger manual refetch
        await act(async () => {
            await result.current.refetch();
        });

        expect(mockGetStatus).toHaveBeenCalledTimes(2);
    });
});
