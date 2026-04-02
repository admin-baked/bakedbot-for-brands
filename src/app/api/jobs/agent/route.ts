
import { NextRequest, NextResponse } from 'next/server';
import { runAgentCore } from '@/server/agents/agent-runner';
import { getAdminFirestore } from '@/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { handlePlaybookStageJob } from '@/server/services/playbook-stage-runner';
import {
    JobDraftPublisher,
    finalizeJobFailure,
    finalizeJobSuccess,
    markJobRunning,
    sanitizeAgentJobResult,
    sanitizeAgentJobText,
} from '@/server/jobs/job-stream';

// Force dynamic rendering - prevents build-time evaluation of agent dependencies
export const dynamic = 'force-dynamic';

// Allow 5 minutes for agent execution on App Hosting / Vercel
export const maxDuration = 300;

function getInboxThreadId(options: Record<string, any> | undefined): string | null {
    if (options?.source !== 'inbox') {
        return null;
    }

    const threadId = options?.context?.threadId;
    return typeof threadId === 'string' && threadId.trim() ? threadId.trim() : null;
}

async function persistInboxThreadAgentMessage(params: {
    firestore: FirebaseFirestore.Firestore;
    threadId: string;
    messageId: string;
    content: string;
}): Promise<void> {
    const { firestore, threadId, messageId, content } = params;
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent) {
        return;
    }

    const threadRef = firestore.collection('inbox_threads').doc(threadId);
    await firestore.runTransaction(async (transaction) => {
        const threadDoc = await transaction.get(threadRef);
        if (!threadDoc.exists) {
            return;
        }

        const data = threadDoc.data() ?? {};
        const messages = Array.isArray(data.messages) ? data.messages : [];
        const existingMessageIndex = messages.findIndex((message) => (
            message
            && typeof message === 'object'
            && 'id' in (message as Record<string, unknown>)
            && (message as { id?: unknown }).id === messageId
        ));
        const nextMessage = {
            id: messageId,
            type: 'agent',
            content: trimmedContent,
            timestamp: new Date().toISOString(),
        };
        const nextMessages = existingMessageIndex >= 0
            ? messages.map((message, index) => (index === existingMessageIndex ? nextMessage : message))
            : [...messages, nextMessage];

        transaction.update(threadRef, {
            messages: nextMessages,
            preview: trimmedContent.slice(0, 50),
            updatedAt: new Date(),
            lastActivityAt: new Date(),
        });
    });
}

/**
 * Cloud Task Worker for Agent Jobs.
 * Receives a pushed task, reconstructs user context, and executes the agent.
 */
export async function POST(req: NextRequest) {
    // 1. Security Check
    // Verify specific header used by Cloud Tasks or a shared secret
    // For now, we trust the internal network or check for a custom secret if configured
    const taskQueueName = req.headers.get('x-cloudtasks-queuename');
    // const secret = process.env.TASKS_SECRET; // Optional for stronger security

    // 2. Parse Payload
    const body = await req.json();
    const { userId, userInput, persona, options, jobId } = body;

    if (!userId || !userInput) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        console.log(`[Job:${jobId}] Starting Agent Execution for User: ${userId}`);

        if (options?.context?.isPlaybookStage) {
            await handlePlaybookStageJob(options.context);
            console.log(`[Job:${jobId}] Playbook stage completed`);
            return NextResponse.json({ success: true, jobId });
        }

        // 3. User Context Strategy
        let userData: any = {};
        const firestore = getAdminFirestore();
        const draftPublisher = new JobDraftPublisher(jobId, { firestore });
        const runningState = await markJobRunning(jobId, firestore);

        if (!runningState.applied && runningState.status === 'cancelled') {
            console.log(`[Job:${jobId}] Skipping cancelled job before execution start`);
            return NextResponse.json({ success: true, jobId, cancelled: true });
        }

        // CHECK FOR GUEST/SCOUT USER
        const isGuest = userId.startsWith('guest-');
        
        if (isGuest) {
            console.log(`[Job:${jobId}] Guest User detected. Using Scout Context.`);
            userData = {
                role: 'scout',
                email: 'scout@bakedbot.ai',
                brandId: 'guest-brand',
                brandName: 'Guest Discovery'
            };
        } else {
            // STANDARD USER LOOKUP
            const userDoc = await firestore.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                console.error(`[Job:${jobId}] User not found: ${userId}`);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            userData = userDoc.data();
        }
        
        // 3a. Fetch Project Context (if projectId provided AND not guest)
        let projectContext = '';
        if (options?.projectId && !isGuest) {
            const projectDoc = await firestore.collection('users').doc(userId).collection('projects').doc(options.projectId).get();
            if (projectDoc.exists) {
                const projectData = projectDoc.data();
                if (projectData?.systemInstructions) {
                    projectContext = `[PROJECT CONTEXT: ${projectData.name || 'Project'}]\n${projectData.systemInstructions}\n\n---\n\n`;
                    console.log(`[Job:${jobId}] Injecting project context: ${projectData.name}`);
                }
            }
        }
        
        // Prepend project context to user input
        const enhancedInput = projectContext ? `${projectContext}${userInput}` : userInput;
        
        // Construct a mock DecodedIdToken to satisfy `runAgentCore` expectations
        const mockUserToken: DecodedIdToken = {
            uid: userId,
            email: userData?.email || '',
            email_verified: true,
            role: userData?.role || 'customer',
            brandId: userData?.brandId || undefined,
            brandName: userData?.brandName || undefined,
            auth_time: Date.now() / 1000,
            iat: Date.now() / 1000,
            exp: (Date.now() / 1000) + 3600,
            aud: 'bakedbot',
            iss: 'https://securetoken.google.com/bakedbot',
            sub: userId,
            firebase: { identities: {}, sign_in_provider: 'custom' }
        };

        // 4. Execute Agent (Async) with enhanced input
        const result = await runAgentCore(enhancedInput, persona, options, mockUserToken, jobId, {
            onDraftContent: (content, publishOptions) => {
                void draftPublisher.push(sanitizeAgentJobText(content), publishOptions);
            },
        });

        // 5. Handle Result
        const sanitizedResult = sanitizeAgentJobResult(result);
        const finalizeState = await finalizeJobSuccess(jobId, sanitizedResult, firestore);
        draftPublisher.close();

        if (!finalizeState.applied && finalizeState.status === 'cancelled') {
            console.log(`[Job:${jobId}] Job was cancelled before completion persisted`);
            return NextResponse.json({ success: true, jobId, cancelled: true });
        }

        const inboxThreadId = getInboxThreadId(options);
        if (inboxThreadId) {
            try {
                await persistInboxThreadAgentMessage({
                    firestore,
                    threadId: inboxThreadId,
                    messageId: `job-${jobId}`,
                    content: sanitizedResult?.content || '',
                });
            } catch (persistError) {
                console.error(`[Job:${jobId}] Failed to persist inbox thread message:`, persistError);
            }
        }

        console.log(`[Job:${jobId}] Completed Successfully`);

        return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
        console.error(`[Job:${jobId}] Execution Failed:`, error);
        const firestore = getAdminFirestore();
        const errorMessage = error?.message || 'Unknown error';
        const finalizeState = await finalizeJobFailure(jobId, errorMessage, firestore);

        const inboxThreadId = getInboxThreadId(options);
        if (finalizeState.applied && inboxThreadId) {
            try {
                await persistInboxThreadAgentMessage({
                    firestore,
                    threadId: inboxThreadId,
                    messageId: `job-error-${jobId}`,
                    content: `I encountered an error: ${errorMessage}. Please try again.`,
                });
            } catch (persistError) {
                console.error(`[Job:${jobId}] Failed to persist inbox thread failure message:`, persistError);
            }
        }

        if (finalizeState.status === 'cancelled') {
            return NextResponse.json({ success: true, jobId, cancelled: true });
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
