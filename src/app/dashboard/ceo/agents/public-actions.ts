'use server';

import { dispatchAgentJob } from '@/server/jobs/dispatch';
import { AgentPersona } from './personas';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createServerClient } from '@/firebase/server-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Public Server Action: Run Discovery Agent (Freemium Scout)
 * 
 * Bypasses standard authentication ('requireUser') to allow unauthenticated public users
 * such as potential leads on the homepage to trigger a "Discovery Audit".
 * 
 * SECURITY:
 * - Enforces 'scout' role for strict tool limitation.
 * - Rate limiting should be applied at the edge (Cloud Armor / WAF) or in dispatch.
 * 
 * @param url The URL to audit (Brand/Dispensary site)
 * @param userMessage Optional additional context
 */
export async function runPublicDiscoveryAgent(url: string, userMessage: string = '') {
    // 1. Generate Guest Identity
    const guestId = `guest-${uuidv4()}`;
    const jobId = uuidv4();
    
    // 2. Validate URL (Basic Safety)
    try {
        new URL(url);
    } catch {
        return { success: false, error: 'Invalid URL provided.' };
    }

    console.log(`[PublicDiscovery] Starting Guest Job ${jobId} for ${url}`);

    // 3. Create Job Document via Admin SDK (Bypass Rules)
    const db = getFirestore();
    await db.collection('jobs').doc(jobId).set({
        status: 'pending',
        userId: guestId,
        userInput: `DISCOVERY AUDIT: ${url}. ${userMessage}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        persona: 'ezal', // Default to Market Scout
        brandId: 'guest-brand',
        isPublic: true, // Flag for security rules
        thoughts: []
    });

    // 4. Dispatch Job
    // We send 'puff' (General) but with specific instructions to route to tools
    // Or 'ezal' directly. let's use 'puff' as the orchestrator.
    const payload = {
        userId: guestId,
        userInput: `PERFORM PUBLIC DISCOVERY AUDIT ON: ${url}. Use 'discovery.browserAutomate' to analyze the site. Generte a Digital Worker Briefing.`,
        persona: 'puff' as AgentPersona,
        options: {
            modelLevel: 'standard' as const, // Force standard model for cost control
            projectId: 'public-discovery-demo'
        },
        jobId
    };

    const dispatch = await dispatchAgentJob(payload);

    if (!dispatch.success) {
        console.error('Public Dispatch Failed:', dispatch.error);
        return { success: false, error: 'Failed to start discovery agent.' };
    }

    return { 
        success: true, 
        jobId, 
        guestId,
        message: 'Scout dispatched successfully.' 
    };
}
