/**
 * Unit tests for Research Dashboard Actions
 * Tests server actions for creating and fetching research tasks
 */

// Mock the research service
jest.mock('@/server/services/research-service', () => ({
    researchService: {
        createTask: jest.fn(),
        getTask: jest.fn(),
        getTasksByBrand: jest.fn(),
        getReport: jest.fn()
    }
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

import { 
    createResearchTaskAction, 
    getResearchTasksAction,
    getResearchTaskStatusAction,
    getResearchReportAction
} from '../actions';
import { researchService } from '@/server/services/research-service';
import { revalidatePath } from 'next/cache';

const mockResearchService = researchService as jest.Mocked<typeof researchService>;

describe('Research Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createResearchTaskAction', () => {
        it('should create a task and return success with taskId', async () => {
            mockResearchService.createTask.mockResolvedValue('task-abc123');
            
            const result = await createResearchTaskAction(
                'user-123',
                'brand-456',
                'Analyze competitor pricing'
            );
            
            expect(result.success).toBe(true);
            expect(result.taskId).toBe('task-abc123');
            expect(mockResearchService.createTask).toHaveBeenCalledWith(
                'user-123',
                'brand-456',
                'Analyze competitor pricing'
            );
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard/research');
        });

        it('should return error on failure', async () => {
            mockResearchService.createTask.mockRejectedValue(new Error('Database error'));
            
            const result = await createResearchTaskAction(
                'user-123',
                'brand-456',
                'Some query'
            );
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });

    describe('getResearchTasksAction', () => {
        it('should return tasks for a brand', async () => {
            const mockTasks = [
                {
                    id: 'task-1',
                    userId: 'user-123',
                    brandId: 'brand-456',
                    query: 'Query 1',
                    depth: 3,
                    breadth: 3,
                    status: 'completed' as const,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'task-2',
                    userId: 'user-123',
                    brandId: 'brand-456',
                    query: 'Query 2',
                    depth: 3,
                    breadth: 3,
                    status: 'processing' as const,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];
            mockResearchService.getTasksByBrand.mockResolvedValue(mockTasks);
            
            const result = await getResearchTasksAction('brand-456');
            
            expect(result.success).toBe(true);
            expect(result.tasks).toHaveLength(2);
            expect(mockResearchService.getTasksByBrand).toHaveBeenCalledWith('brand-456');
        });

        it('should return error on failure', async () => {
            mockResearchService.getTasksByBrand.mockRejectedValue(new Error('Query failed'));
            
            const result = await getResearchTasksAction('brand-456');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Query failed');
        });
    });

    describe('getResearchTaskStatusAction', () => {
        it('should return task status for polling', async () => {
            const mockTask = {
                id: 'task-123',
                userId: 'user-456',
                brandId: 'brand-789',
                query: 'Some query',
                depth: 3,
                breadth: 3,
                status: 'processing' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
                progress: {
                    currentStep: 'Analyzing',
                    stepsCompleted: 3,
                    totalSteps: 5,
                    sourcesFound: 8
                }
            };
            mockResearchService.getTask.mockResolvedValue(mockTask);
            
            const result = await getResearchTaskStatusAction('task-123');
            
            expect(result.success).toBe(true);
            expect(result.status).toBe('processing');
            expect(result.progress).toBeDefined();
            expect(result.progress?.currentStep).toBe('Analyzing');
            expect(result.progress?.sourcesFound).toBe(8);
        });

        it('should return error when task not found', async () => {
            mockResearchService.getTask.mockResolvedValue(null);
            
            const result = await getResearchTaskStatusAction('nonexistent-task');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Task not found');
        });

        it('should return completed task with reportId', async () => {
            const mockTask = {
                id: 'task-complete',
                userId: 'user-456',
                brandId: 'brand-789',
                query: 'Completed query',
                depth: 3,
                breadth: 3,
                status: 'completed' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
                resultReportId: 'report-999',
                progress: {
                    currentStep: 'Complete',
                    stepsCompleted: 5,
                    totalSteps: 5
                }
            };
            mockResearchService.getTask.mockResolvedValue(mockTask);
            
            const result = await getResearchTaskStatusAction('task-complete');
            
            expect(result.success).toBe(true);
            expect(result.status).toBe('completed');
            expect(result.resultReportId).toBe('report-999');
        });

        it('should return failed task with error', async () => {
            const mockTask = {
                id: 'task-failed',
                userId: 'user-456',
                brandId: 'brand-789',
                query: 'Failed query',
                depth: 3,
                breadth: 3,
                status: 'failed' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
                error: 'API rate limit exceeded'
            };
            mockResearchService.getTask.mockResolvedValue(mockTask);
            
            const result = await getResearchTaskStatusAction('task-failed');
            
            expect(result.success).toBe(true);
            expect(result.status).toBe('failed');
            expect(result.error).toBe('API rate limit exceeded');
        });
    });

    describe('getResearchReportAction', () => {
        it('should return report when found', async () => {
            const mockReport = {
                id: 'report-123',
                taskId: 'task-456',
                title: 'Competitor Analysis',
                summary: 'A detailed analysis...',
                content: '# Report\n\nContent here...',
                sources: [
                    { title: 'Source 1', url: 'https://example.com' }
                ],
                createdAt: new Date()
            };
            mockResearchService.getReport.mockResolvedValue(mockReport);
            
            const result = await getResearchReportAction('report-123');
            
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            expect(result.report?.title).toBe('Competitor Analysis');
            expect(result.report?.sources).toHaveLength(1);
        });

        it('should return error when report not found', async () => {
            mockResearchService.getReport.mockResolvedValue(null);
            
            const result = await getResearchReportAction('nonexistent-report');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Report not found');
        });
    });
});
