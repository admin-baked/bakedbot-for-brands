/**
 * Unit tests for Research Types
 * Tests ResearchTask, ResearchReport, and ResearchTaskProgress interfaces
 */

import { 
    ResearchTaskStatus, 
    ResearchTask, 
    ResearchTaskProgress, 
    ResearchReport, 
    ResearchSource 
} from '../research';

describe('Research Types', () => {
    describe('ResearchTaskStatus', () => {
        it('should support all valid status values', () => {
            const validStatuses: ResearchTaskStatus[] = ['pending', 'processing', 'completed', 'failed'];
            validStatuses.forEach(status => {
                const task: Partial<ResearchTask> = { status };
                expect(task.status).toBe(status);
            });
        });
    });

    describe('ResearchTaskProgress', () => {
        it('should have all required fields', () => {
            const progress: ResearchTaskProgress = {
                currentStep: 'Searching',
                stepsCompleted: 2,
                totalSteps: 5
            };
            expect(progress.currentStep).toBe('Searching');
            expect(progress.stepsCompleted).toBe(2);
            expect(progress.totalSteps).toBe(5);
        });

        it('should allow optional fields', () => {
            const progress: ResearchTaskProgress = {
                currentStep: 'Analyzing',
                stepsCompleted: 3,
                totalSteps: 5,
                sourcesFound: 10,
                lastUpdate: '2025-12-28T12:00:00Z'
            };
            expect(progress.sourcesFound).toBe(10);
            expect(progress.lastUpdate).toBe('2025-12-28T12:00:00Z');
        });
    });

    describe('ResearchTask', () => {
        it('should have all required fields', () => {
            const task: ResearchTask = {
                id: 'task-123',
                userId: 'user-456',
                brandId: 'brand-789',
                query: 'Analyze competitor pricing in California',
                depth: 3,
                breadth: 3,
                status: 'pending',
                createdAt: new Date('2025-12-28T10:00:00Z'),
                updatedAt: new Date('2025-12-28T10:00:00Z')
            };
            expect(task.id).toBe('task-123');
            expect(task.query).toContain('competitor');
            expect(task.status).toBe('pending');
        });

        it('should allow optional progress field', () => {
            const task: ResearchTask = {
                id: 'task-123',
                userId: 'user-456',
                brandId: 'brand-789',
                query: 'Market analysis',
                depth: 3,
                breadth: 3,
                status: 'processing',
                createdAt: new Date(),
                updatedAt: new Date(),
                progress: {
                    currentStep: 'Browsing',
                    stepsCompleted: 2,
                    totalSteps: 5,
                    sourcesFound: 5
                }
            };
            expect(task.progress).toBeDefined();
            expect(task.progress?.currentStep).toBe('Browsing');
            expect(task.progress?.sourcesFound).toBe(5);
        });

        it('should allow optional error field', () => {
            const task: ResearchTask = {
                id: 'task-failed',
                userId: 'user-456',
                brandId: 'brand-789',
                query: 'Failed query',
                depth: 3,
                breadth: 3,
                status: 'failed',
                createdAt: new Date(),
                updatedAt: new Date(),
                error: 'API rate limit exceeded'
            };
            expect(task.error).toBe('API rate limit exceeded');
        });

        it('should allow optional resultReportId for completed tasks', () => {
            const task: ResearchTask = {
                id: 'task-complete',
                userId: 'user-456',
                brandId: 'brand-789',
                query: 'Completed query',
                depth: 3,
                breadth: 3,
                status: 'completed',
                createdAt: new Date(),
                updatedAt: new Date(),
                resultReportId: 'report-999'
            };
            expect(task.resultReportId).toBe('report-999');
        });
    });

    describe('ResearchReport', () => {
        it('should have all required fields', () => {
            const report: ResearchReport = {
                id: 'report-123',
                taskId: 'task-456',
                title: 'Competitor Analysis Report',
                summary: 'A comprehensive analysis of competitors...',
                content: '# Report\n\n## Introduction...',
                sources: [],
                createdAt: new Date()
            };
            expect(report.id).toBe('report-123');
            expect(report.taskId).toBe('task-456');
            expect(report.title).toContain('Competitor');
        });

        it('should support sources array', () => {
            const source: ResearchSource = {
                title: 'Industry Report 2025',
                url: 'https://example.com/report',
                snippet: 'Key findings from the industry...',
                credibility_score: 0.95
            };
            const report: ResearchReport = {
                id: 'report-123',
                taskId: 'task-456',
                title: 'Test Report',
                summary: 'Summary',
                content: 'Content',
                sources: [source],
                createdAt: new Date()
            };
            expect(report.sources.length).toBe(1);
            expect(report.sources[0].credibility_score).toBe(0.95);
        });

        it('should allow optional metadata', () => {
            const report: ResearchReport = {
                id: 'report-123',
                taskId: 'task-456',
                title: 'Test Report',
                summary: 'Summary',
                content: 'Content',
                sources: [],
                createdAt: new Date(),
                metadata: {
                    total_tokens: 15000,
                    execution_time_ms: 45000,
                    agent_version: '1.0.0'
                }
            };
            expect(report.metadata?.total_tokens).toBe(15000);
            expect(report.metadata?.execution_time_ms).toBe(45000);
        });
    });

    describe('ResearchSource', () => {
        it('should have required fields', () => {
            const source: ResearchSource = {
                title: 'Example Source',
                url: 'https://example.com'
            };
            expect(source.title).toBe('Example Source');
            expect(source.url).toBe('https://example.com');
        });

        it('should allow optional fields', () => {
            const source: ResearchSource = {
                title: 'Detailed Source',
                url: 'https://example.com',
                snippet: 'This is a snippet of content...',
                credibility_score: 0.85
            };
            expect(source.snippet).toContain('snippet');
            expect(source.credibility_score).toBe(0.85);
        });
    });
});
