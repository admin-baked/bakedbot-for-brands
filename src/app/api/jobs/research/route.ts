import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { researchService } from '@/server/services/research-service';
import { jinaSearch, jinaReadUrl } from '@/server/tools/jina-tools';
import { callClaude } from '@/ai/claude';
import type { ResearchSource } from '@/types/research';
import type { DriveFileDoc } from '@/types/drive';

/**
 * Research Task Job Processor
 *
 * Processes pending research tasks using Jina AI (search + read) and Claude (synthesis).
 * Replaces the old Firecrawl-based pipeline (which ran out of credits).
 *
 * Pipeline per task:
 *   Step 1: Generate 5-step research plan via Claude
 *   Steps 2-6: Jina Search + Reader per plan step → accumulate findings + sources
 *   Step 7: Claude synthesis → structured markdown report
 *   Step 8: Drive auto-save (non-blocking)
 *   Step 9: Mark complete
 *
 * Triggered by:
 *   1. Self-trigger from createResearchTaskAction (fire-and-forget, starts in seconds)
 *   2. Cloud Scheduler (every 5 minutes as fallback)
 *
 * Cloud Scheduler Setup:
 *   gcloud scheduler jobs create http process-research-jobs
 *     --schedule "0/5 * * * *"
 *     --uri "https://bakedbot.ai/api/jobs/research"
 *     --http-method POST
 *     --headers "Authorization=Bearer ${CRON_SECRET}"
 *     --location us-central1
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
    // CRON_SECRET auth — reject unsigned calls in production
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const db = getAdminFirestore();

        // Fetch at most 2 pending tasks to stay within timeout budget
        const pendingTasksSnapshot = await db
            .collection('research_tasks')
            .where('status', '==', 'pending')
            .limit(2)
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
                    currentStep: 'Planning research...',
                    stepsCompleted: 0,
                    totalSteps: 7,
                    sourcesFound: 0,
                    lastUpdate: new Date().toISOString(),
                });

                // -------------------------------------------------------
                // STEP 1: Generate 5-step research plan via Claude
                // -------------------------------------------------------
                let plan: string[] = [];
                try {
                    const planText = await callClaude({
                        systemPrompt: 'You are a research assistant. Generate exactly 5 specific, targeted research sub-questions for the given topic. Return ONLY a JSON array of 5 strings — no markdown, no explanation.',
                        userMessage: `Research topic: "${task.query}"\n\nGenerate 5 specific research questions that together will comprehensively cover this topic.`,
                        maxTokens: 400,
                    });
                    const cleaned = planText.trim().replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '');
                    plan = JSON.parse(cleaned);
                    if (!Array.isArray(plan) || plan.length === 0) throw new Error('Invalid plan format');
                    plan = plan.slice(0, 5).map(String);
                } catch {
                    plan = [
                        `Overview and background on ${task.query}`,
                        `Key players and market landscape for ${task.query}`,
                        `Recent trends and developments in ${task.query}`,
                        `Opportunities and challenges related to ${task.query}`,
                        `Best practices and recommendations for ${task.query}`,
                    ];
                }

                // Store plan immediately so UI shows it right away
                await db.collection('research_tasks').doc(taskId).update({ plan });

                await researchService.updateTaskProgress(taskId, 'processing', {
                    currentStep: `Researching: ${plan[0]}`,
                    stepsCompleted: 1,
                    totalSteps: 7,
                    sourcesFound: 0,
                    lastUpdate: new Date().toISOString(),
                });

                // -------------------------------------------------------
                // STEPS 2-6: Jina Search + Reader per plan step
                // -------------------------------------------------------
                const allFindings: string[] = [];
                const allSources: ResearchSource[] = [];
                let totalSources = 0;

                for (let i = 0; i < plan.length; i++) {
                    const step = plan[i];

                    await researchService.updateTaskProgress(taskId, 'processing', {
                        currentStep: step,
                        stepsCompleted: i + 2,
                        totalSteps: 7,
                        sourcesFound: totalSources,
                        lastUpdate: new Date().toISOString(),
                    });

                    try {
                        const searchResults = await jinaSearch(step);
                        if (searchResults.length === 0) continue;

                        for (const r of searchResults.slice(0, 5)) {
                            if (r.url && !allSources.find(s => s.url === r.url)) {
                                allSources.push({ title: r.title, url: r.url, snippet: r.snippet });
                            }
                        }

                        // Deep-read top 2 results
                        const topUrls = searchResults.slice(0, 2).map(r => r.url).filter(Boolean);
                        const readContents = await Promise.all(
                            topUrls.map(url => jinaReadUrl(url).catch(() => ''))
                        );

                        totalSources += searchResults.length;

                        allFindings.push(
                            `## Research Step ${i + 1}: ${step}\n\n` +
                            searchResults.slice(0, 3).map(r => `**${r.title}** (${r.url})\n${r.snippet}`).join('\n\n') +
                            (readContents.filter(Boolean).length > 0
                                ? '\n\n### Deep Read:\n' + readContents.filter(Boolean).join('\n\n---\n\n').substring(0, 4000)
                                : '')
                        );
                    } catch (stepErr) {
                        logger.warn('[ResearchJobs] Step failed, continuing', { taskId, step, error: String(stepErr) });
                    }

                    // Update source count incrementally so UI shows live progress
                    await db.collection('research_tasks').doc(taskId).update({
                        'progress.sourcesFound': totalSources,
                        'progress.lastUpdate': new Date().toISOString(),
                    });
                }

                // -------------------------------------------------------
                // STEP 7: Claude synthesis → structured markdown report
                // -------------------------------------------------------
                await researchService.updateTaskProgress(taskId, 'processing', {
                    currentStep: 'Synthesizing findings...',
                    stepsCompleted: 7,
                    totalSteps: 7,
                    sourcesFound: totalSources,
                    lastUpdate: new Date().toISOString(),
                });

                const rawFindings = allFindings.join('\n\n---\n\n').substring(0, 20000);
                const reportContent = await callClaude({
                    systemPrompt: `You are Big Worm, BakedBot's deep research agent. You synthesize research findings into comprehensive, actionable reports.

Write a thorough research report with these exact sections:
## Executive Summary
(2-3 sentence overview of key insights)

## Key Findings
(5-7 bullet points with the most important discoveries)

## Detailed Analysis
(3-5 paragraphs with in-depth analysis)

## Opportunities & Recommendations
(3-5 actionable recommendations)

## Sources
(List the key sources used)

Be authoritative, data-rich, and street-wise. Format everything in clean markdown.`,
                    userMessage: `Research Topic: "${task.query}"\n\nResearch Plan:\n${plan.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nFindings:\n${rawFindings}`,
                    maxTokens: 3000,
                });

                // Extract summary from Executive Summary section
                const summaryMatch = reportContent.match(/##\s*Executive Summary\s*\n+([\s\S]+?)(?=\n##|$)/i);
                const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 500) : `Research on "${task.query}" complete.`;

                const reportId = await researchService.createReport({
                    taskId,
                    brandId: task.brandId,
                    userId: task.userId,
                    title: `Research: ${task.query.substring(0, 80)}`,
                    summary,
                    content: reportContent,
                    sources: allSources.slice(0, 15),
                    createdAt: new Date(),
                });

                await researchService.completeTask(taskId, reportId);

                results.push({ taskId, status: 'completed' });

                logger.info('[ResearchJobs] Research task completed', {
                    taskId,
                    reportId,
                    sourcesFound: totalSources,
                });

                // -------------------------------------------------------
                // STEP 8: Drive auto-save (non-blocking)
                // -------------------------------------------------------
                setImmediate(async () => {
                    try {
                        await saveToDrive(taskId, reportId, task, reportContent, allSources);
                    } catch (driveErr) {
                        logger.warn('[ResearchJobs] Drive save failed (non-fatal)', {
                            taskId,
                            error: String(driveErr),
                        });
                    }
                });

            } catch (error: unknown) {
                const err = error as Error;

                await researchService.updateTaskProgress(
                    taskId,
                    'failed',
                    {
                        currentStep: 'Failed',
                        stepsCompleted: 0,
                        totalSteps: 7,
                        lastUpdate: new Date().toISOString(),
                    },
                    err.message
                );

                results.push({ taskId, status: 'failed', error: err.message });
                logger.error(`[ResearchJobs] Research task failed: ${err.message}`, { taskId });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`[ResearchJobs] Job processor failed: ${err.message}`);
        return NextResponse.json(
            { success: false, error: err.message || 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * GET — manual testing (injects auth header automatically)
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const headers = new Headers(request.headers);
        headers.set('Authorization', `Bearer ${cronSecret}`);
        return POST(new NextRequest(request.url, { method: 'POST', headers }));
    }
    return POST(request);
}

// =============================================================================
// DRIVE AUTO-SAVE
// =============================================================================

async function saveToDrive(
    taskId: string,
    reportId: string,
    task: Record<string, unknown>,
    reportContent: string,
    sources: ResearchSource[]
): Promise<void> {
    const { getDriveStorageService } = await import('@/server/services/drive-storage');
    const firestore = getAdminFirestore();
    const driveService = getDriveStorageService();

    const userId = String(task.userId || 'system');
    const userEmail = String(task.userEmail || 'system@bakedbot.ai');
    const query = String(task.query || 'Research');
    const brandId = String(task.brandId || '');

    const fullMarkdown = reportContent +
        (sources.length > 0
            ? `\n\n---\n\n## Sources Visited\n\n` +
              sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join('\n')
            : '');

    const buffer = Buffer.from(fullMarkdown, 'utf-8');
    const filename = `deep-research-${taskId.substring(0, 8)}.md`;

    const uploadResult = await driveService.uploadFile({
        userId,
        userEmail,
        file: {
            buffer,
            originalName: filename,
            mimeType: 'text/plain',
            size: buffer.length,
        },
        category: 'documents',
        description: `Deep Research: ${query.substring(0, 80)}`,
        tags: ['research', 'automated', 'big-worm'],
        metadata: {
            orgId: brandId,
            taskId,
            reportId,
            generatedAt: new Date().toISOString(),
        },
    });

    if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Drive upload failed');
    }

    const now = Date.now();
    const fileDoc: DriveFileDoc = {
        id: '',
        name: filename,
        mimeType: 'text/plain',
        size: buffer.length,
        storagePath: uploadResult.storagePath!,
        downloadUrl: uploadResult.downloadUrl!,
        folderId: null,
        path: `/${filename}`,
        ownerId: userId,
        ownerEmail: userEmail,
        category: 'documents',
        tags: ['research', 'automated', 'big-worm'],
        description: `Deep Research: ${query.substring(0, 80)}`,
        metadata: {
            orgId: brandId,
            taskId,
            reportId,
            generatedAt: new Date().toISOString(),
        },
        isShared: false,
        shareIds: [],
        viewCount: 0,
        downloadCount: 0,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
    };

    const driveFileRef = await firestore.collection('drive_files').add(fileDoc);
    await driveFileRef.update({ id: driveFileRef.id });

    // Store driveFileId back on task and report so UI can show "Saved to Drive" badge
    await Promise.all([
        firestore.collection('research_tasks').doc(taskId).update({ driveFileId: driveFileRef.id }),
        firestore.collection('research_reports').doc(reportId).update({ driveFileId: driveFileRef.id }),
    ]);

    logger.info('[ResearchJobs] Saved to Drive', { taskId, reportId, driveFileId: driveFileRef.id });
}
