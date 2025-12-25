
import { createServerClient } from '@/firebase/server-client';

/**
 * Emits a "Thought Signature" (intermediate reasoning step) to the job log.
 * Used for visualizing the agent's thinking process in the UI during async execution.
 * 
 * @param jobId - The ID of the currently running Cloud Task job
 * @param title - Short title of the thought (e.g. "Searching Web", "Analyzing Data")
 * @param detail - More detailed context or result summary
 * @param metadata - Optional raw data/JSON
 */
export async function emitThought(
    jobId: string | undefined, 
    title: string, 
    detail: string = '', 
    metadata?: any
) {
    // If no jobId, we are likely in synchronous mode (or dev test), so we just log to console.
    if (!jobId) {
        console.log(`[💭 Thought] ${title}: ${detail}`);
        return;
    }

    try {
        const { firestore } = await createServerClient();
        
        // Add to the 'thoughts' subcollection for real-time listening
        const thoughtRef = firestore.collection('jobs').doc(jobId).collection('thoughts').doc();
        
        await thoughtRef.set({
            title,
            detail,
            metadata: metadata || null,
            timestamp: new Date(),
            order: Date.now() // Simple ordering
        });
        
    } catch (error) {
        console.error(`Failed to emit thought for job ${jobId}:`, error);
    }
}
