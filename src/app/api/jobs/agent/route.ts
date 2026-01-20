
import { NextRequest, NextResponse } from 'next/server';
import { runAgentCore } from '@/server/agents/agent-runner';
import { createServerClient } from '@/firebase/server-client';
import { DecodedIdToken } from 'firebase-admin/auth';

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

        // 3. User Context Strategy
        let userData: any = {};
        const { firestore } = await createServerClient();

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
        const result = await runAgentCore(enhancedInput, persona, options, mockUserToken, jobId);

        // 5. Handle Result
        // Since this is async, we can't return the result to the user directly within the chat request.
        // We typically write the result to a "Job Status" document or push a notification.
        // For Phase 2, we just log it. The UI (polling) would check `jobs/{jobId}`.

        // Sanitize result to ensure it's Firestore-serializable (remove functions, circular refs)
        const sanitizedResult = JSON.parse(JSON.stringify(result, (key, value) => {
            // Remove functions and undefined values
            if (typeof value === 'function') return undefined;
            // Truncate very long strings to prevent Firestore size limits
            if (typeof value === 'string' && value.length > 50000) {
                return value.substring(0, 50000) + '... [truncated]';
            }
            return value;
        }));

        await firestore.collection('jobs').doc(jobId).set({
            status: 'completed',
            result: sanitizedResult,
            completedAt: new Date()
        }, { merge: true });

        console.log(`[Job:${jobId}] Completed Successfully`);

        return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
        console.error(`[Job:${jobId}] Execution Failed:`, error);
        
        // Update job status to failed
        const { firestore } = await createServerClient();
        await firestore.collection('jobs').doc(jobId).set({
            status: 'failed',
            error: error.message,
            failedAt: new Date()
        }, { merge: true });

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
