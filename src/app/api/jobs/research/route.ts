import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { researchService } from '@/server/services/research-service';
import type { ResearchSource } from '@/types/research';

/**
 * Research Task Job Processor
 *
 * Processes pending research tasks created by the Research page.
 * Uses Firecrawl Discovery for deep web research.
 *
 * Can be triggered:
 * 1. By Cloud Scheduler (every 5 minutes)
 * 2. Manually for testing
 *
 * Cloud Scheduler Setup (run in terminal):
 * gcloud scheduler jobs create http process-research-jobs
 *   --schedule "0/5 * * * *"
 *   --uri "https://bakedbot.ai/api/jobs/research"
 *   --http-method POST
 *   --location us-central1
 */

export const dynamic = 'force-dynamic';

// Max execution time per task (in ms)
const TASK_TIMEOUT = 60000; // 60 seconds

export async function POST(request: NextRequest) {
    try {
        const db = getAdminFirestore();

        // Get pending research tasks (limit to 3 to avoid timeout)
        const pendingTasksSnapshot = await db
            .collection('research_tasks')
            .where('status', '==', 'pending')
            .limit(3)
            .get();

        if (pendingTasksSnapshot.empty) {
            return NextResponse.json({
                success: true,
                processed: 0,
                message: 'No pending research tasks',
            });
        }

        const results: Array<{
            taskId: string;
            status: 'completed' | 'failed';
            error?: string;
        }> = [];

        // Process each task
        for (const doc of pendingTasksSnapshot.docs) {
            const task = doc.data();
            const taskId = doc.id;

            try {
                logger.info('[ResearchJobs] Processing research task', {
                    taskId,
                    query: task.query?.substring(0, 50),
                    userId: task.userId,
                });

                // Mark as running
                await researchService.updateTaskProgress(taskId, 'processing', {
                    currentStep: 'Starting research...',
                    stepsCompleted: 1,
                    totalSteps: 5,
                    lastUpdate: new Date().toISOString(),
                });

                // Step 1: Initial search
                await researchService.updateTaskProgress(taskId, 'processing', {
                    currentStep: 'Searching the web...',
                    stepsCompleted: 2,
                    totalSteps: 5,
                    lastUpdate: new Date().toISOString(),
                });

                // Perform the deep dive research
                const researchResult = await researchService.performDeepDive(
                    task.query,
                    task.depth || 2
                );

                if (researchResult.error) {
                    throw new Error(researchResult.error);
                }

                // Step 2: Analyzing results
                await researchService.updateTaskProgress(taskId, 'processing', {
                    currentStep: 'Analyzing results...',
                    stepsCompleted: 3,
                    totalSteps: 5,
                    lastUpdate: new Date().toISOString(),
                });

                // Step 3: Creating report
                await researchService.updateTaskProgress(taskId, 'processing', {
                    currentStep: 'Generating report...',
                    stepsCompleted: 4,
                    totalSteps: 5,
                    lastUpdate: new Date().toISOString(),
                });

                // Create the report
                const reportId = await researchService.createReport({
                    taskId,
                    brandId: task.brandId,
                    userId: task.userId,
                    title: `Research: ${task.query.substring(0, 50)}...`,
                    summary: generateSummary(researchResult),
                    content: formatContent(researchResult),
                    sources: extractSources(researchResult),
                    createdAt: new Date(),
                });

                // Mark as complete
                await researchService.completeTask(taskId, reportId);

                results.push({
                    taskId,
                    status: 'completed',
                });

                logger.info('[ResearchJobs] Research task completed', {
                    taskId,
                    reportId,
                });
            } catch (error: unknown) {
                const err = error as Error;

                // Mark as failed
                await researchService.updateTaskProgress(
                    taskId,
                    'failed',
                    {
                        currentStep: 'Failed',
                        stepsCompleted: 0,
                        totalSteps: 5,
                        lastUpdate: new Date().toISOString(),
                    },
                    err.message
                );

                results.push({
                    taskId,
                    status: 'failed',
                    error: err.message,
                });

                logger.error('[ResearchJobs] Research task failed', {
                    taskId,
                    error: err.message,
                });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[ResearchJobs] Job processor failed', {
            error: err.message,
        });

        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
    return POST(request);
}

// Helper functions for formatting research results

function generateSummary(result: any): string {
    if (result.error) {
        return `Research could not be completed: ${result.error}`;
    }

    const resultCount = result.results?.length || 0;
    return `Found ${resultCount} relevant sources for "${result.query}". Analysis conducted at depth level ${result.depth}.`;
}

function formatContent(result: any): string {
    if (result.error) {
        return `## Error\n\n${result.error}`;
    }

    const results = result.results || [];
    if (results.length === 0) {
        return '## No Results Found\n\nThe search did not return any relevant results. Try refining your query.';
    }

    let content = `## Research Results for: ${result.query}\n\n`;
    content += `**Search Depth:** ${result.depth}\n`;
    content += `**Sources Found:** ${results.length}\n\n`;
    content += `---\n\n`;

    results.forEach((item: any, index: number) => {
        content += `### ${index + 1}. ${item.title || 'Untitled'}\n\n`;
        if (item.url) {
            content += `**Source:** [${item.url}](${item.url})\n\n`;
        }
        if (item.description || item.snippet) {
            content += `${item.description || item.snippet}\n\n`;
        }
        content += `---\n\n`;
    });

    return content;
}

function extractSources(result: any): ResearchSource[] {
    if (result.error || !result.results) {
        return [];
    }

    return result.results
        .filter((item: any) => item.url)
        .map((item: any) => ({
            title: item.title || 'Untitled',
            url: item.url,
            snippet: item.description || item.snippet,
        }))
        .slice(0, 10); // Limit to 10 sources
}
