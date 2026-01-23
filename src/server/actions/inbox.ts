'use server';

/**
 * Inbox Server Actions
 *
 * Server-side operations for the Unified Inbox including
 * thread CRUD, artifact management, and persistence to Firestore.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import type { ChatMessage } from '@/lib/store/agent-chat-store';
import type {
    InboxThread,
    InboxThreadType,
    InboxThreadStatus,
    InboxAgentPersona,
    InboxArtifact,
    InboxArtifactType,
    InboxArtifactStatus,
} from '@/types/inbox';
import { parseArtifactsFromContent } from '@/types/artifact';
import {
    createInboxThreadId,
    createInboxArtifactId,
    getDefaultAgentForThreadType,
    getSupportingAgentsForThreadType,
    CreateInboxThreadSchema,
    UpdateInboxThreadSchema,
} from '@/types/inbox';
import type { Carousel } from '@/types/carousels';
import type { BundleDeal } from '@/types/bundles';
import type { CreativeContent } from '@/types/creative-content';

// ============ Firestore Collections ============

const INBOX_THREADS_COLLECTION = 'inbox_threads';
const INBOX_ARTIFACTS_COLLECTION = 'inbox_artifacts';

// ============ Helper Functions ============

function getDb() {
    return getFirestore();
}

/**
 * Convert Firestore timestamp to Date
 */
function toDate(timestamp: unknown): Date {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        return (timestamp as { toDate: () => Date }).toDate();
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    if (typeof timestamp === 'string') {
        return new Date(timestamp);
    }
    return new Date();
}

/**
 * Serialize thread for client (convert Dates to ISO strings)
 */
function serializeThread(thread: InboxThread): InboxThread {
    return {
        ...thread,
        createdAt: toDate(thread.createdAt),
        updatedAt: toDate(thread.updatedAt),
        lastActivityAt: toDate(thread.lastActivityAt),
        messages: thread.messages.map((msg) => ({
            ...msg,
            timestamp: toDate(msg.timestamp),
        })),
    };
}

/**
 * Serialize artifact for client
 */
function serializeArtifact(artifact: InboxArtifact): InboxArtifact {
    return {
        ...artifact,
        createdAt: toDate(artifact.createdAt),
        updatedAt: toDate(artifact.updatedAt),
        approvedAt: artifact.approvedAt ? toDate(artifact.approvedAt) : undefined,
        publishedAt: artifact.publishedAt ? toDate(artifact.publishedAt) : undefined,
    };
}

// ============ Thread Actions ============

/**
 * Create a new inbox thread
 */
export async function createInboxThread(input: {
    type: InboxThreadType;
    title?: string;
    primaryAgent?: InboxAgentPersona;
    projectId?: string;
    brandId?: string;
    dispensaryId?: string;
    initialMessage?: ChatMessage;
}): Promise<{ success: boolean; thread?: InboxThread; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Validate input
        const validation = CreateInboxThreadSchema.safeParse(input);
        if (!validation.success) {
            return { success: false, error: validation.error.message };
        }

        const db = getDb();
        const threadId = createInboxThreadId();

        const thread: InboxThread = {
            id: threadId,
            orgId: input.brandId || input.dispensaryId || user.uid,
            userId: user.uid,
            type: input.type,
            status: 'active',
            title: input.title || `New ${input.type} conversation`,
            preview: input.initialMessage?.content.slice(0, 50) || '',
            primaryAgent: input.primaryAgent || getDefaultAgentForThreadType(input.type),
            assignedAgents: [
                input.primaryAgent || getDefaultAgentForThreadType(input.type),
                ...getSupportingAgentsForThreadType(input.type),
            ],
            artifactIds: [],
            messages: input.initialMessage ? [input.initialMessage] : [],
            projectId: input.projectId,
            brandId: input.brandId,
            dispensaryId: input.dispensaryId,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivityAt: new Date(),
        };

        await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).set({
            ...thread,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });

        logger.info('Created inbox thread', { threadId, type: input.type, userId: user.uid });

        return { success: true, thread: serializeThread(thread) };
    } catch (error) {
        logger.error('Failed to create inbox thread', { error });
        return { success: false, error: 'Failed to create thread' };
    }
}

/**
 * Get inbox threads for the current user
 */
export async function getInboxThreads(options?: {
    type?: InboxThreadType;
    status?: InboxThreadStatus;
    limit?: number;
    orgId?: string;
}): Promise<{ success: boolean; threads?: InboxThread[]; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        let query = db.collection(INBOX_THREADS_COLLECTION).where('userId', '==', user.uid);

        // Apply filters
        if (options?.type) {
            query = query.where('type', '==', options.type);
        }
        if (options?.status) {
            query = query.where('status', '==', options.status);
        }
        if (options?.orgId) {
            query = query.where('orgId', '==', options.orgId);
        }

        const snapshot = await query.limit(options?.limit || 50).get();

        const threads: InboxThread[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as InboxThread;
            threads.push(serializeThread(data));
        });

        // Sort by lastActivityAt descending (in-memory to avoid composite index)
        threads.sort((a, b) => {
            const aTime = new Date(a.lastActivityAt).getTime();
            const bTime = new Date(b.lastActivityAt).getTime();
            return bTime - aTime;
        });

        return { success: true, threads };
    } catch (error) {
        logger.error('Failed to get inbox threads', { error });
        return { success: false, error: 'Failed to get threads' };
    }
}

/**
 * Get a single inbox thread by ID
 */
export async function getInboxThread(
    threadId: string
): Promise<{ success: boolean; thread?: InboxThread; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const doc = await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).get();

        if (!doc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = doc.data() as InboxThread;

        // Verify ownership
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        return { success: true, thread: serializeThread(thread) };
    } catch (error) {
        logger.error('Failed to get inbox thread', { error, threadId });
        return { success: false, error: 'Failed to get thread' };
    }
}

/**
 * Update an inbox thread
 */
export async function updateInboxThread(
    threadId: string,
    updates: {
        title?: string;
        status?: InboxThreadStatus;
        primaryAgent?: InboxAgentPersona;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Validate input
        const validation = UpdateInboxThreadSchema.safeParse(updates);
        if (!validation.success) {
            return { success: false, error: validation.error.message };
        }

        const db = getDb();
        const threadRef = db.collection(INBOX_THREADS_COLLECTION).doc(threadId);
        const doc = await threadRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = doc.data() as InboxThread;

        // Verify ownership
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        await threadRef.update({
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Updated inbox thread', { threadId, updates });

        return { success: true };
    } catch (error) {
        logger.error('Failed to update inbox thread', { error, threadId });
        return { success: false, error: 'Failed to update thread' };
    }
}

/**
 * Add a message to an inbox thread
 */
export async function addMessageToInboxThread(
    threadId: string,
    message: ChatMessage
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const threadRef = db.collection(INBOX_THREADS_COLLECTION).doc(threadId);
        const doc = await threadRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = doc.data() as InboxThread;

        // Verify ownership
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Add message with serialized timestamp
        const messageToAdd = {
            ...message,
            timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp,
        };

        await threadRef.update({
            messages: FieldValue.arrayUnion(messageToAdd),
            preview: message.content.slice(0, 50),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        logger.error('Failed to add message to thread', { error, threadId });
        return { success: false, error: 'Failed to add message' };
    }
}

/**
 * Archive an inbox thread
 */
export async function archiveInboxThread(
    threadId: string
): Promise<{ success: boolean; error?: string }> {
    return updateInboxThread(threadId, { status: 'archived' });
}

/**
 * Delete an inbox thread
 */
export async function deleteInboxThread(
    threadId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const threadRef = db.collection(INBOX_THREADS_COLLECTION).doc(threadId);
        const doc = await threadRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = doc.data() as InboxThread;

        // Verify ownership
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Delete associated artifacts
        const artifactDeletions = thread.artifactIds.map((artifactId) =>
            db.collection(INBOX_ARTIFACTS_COLLECTION).doc(artifactId).delete()
        );

        await Promise.all([threadRef.delete(), ...artifactDeletions]);

        logger.info('Deleted inbox thread', { threadId, userId: user.uid });

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete inbox thread', { error, threadId });
        return { success: false, error: 'Failed to delete thread' };
    }
}

// ============ Artifact Actions ============

/**
 * Create an inbox artifact
 */
export async function createInboxArtifact(input: {
    threadId: string;
    type: InboxArtifactType;
    data: Carousel | BundleDeal | CreativeContent;
    rationale?: string;
}): Promise<{ success: boolean; artifact?: InboxArtifact; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();

        // Verify thread ownership
        const threadDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(input.threadId).get();
        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = threadDoc.data() as InboxThread;
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        const artifactId = createInboxArtifactId();

        const artifact: InboxArtifact = {
            id: artifactId,
            threadId: input.threadId,
            orgId: thread.orgId,
            type: input.type,
            status: 'draft',
            data: input.data,
            rationale: input.rationale,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.uid,
        };

        // Create artifact document
        await db.collection(INBOX_ARTIFACTS_COLLECTION).doc(artifactId).set({
            ...artifact,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Update thread with artifact reference
        await db.collection(INBOX_THREADS_COLLECTION).doc(input.threadId).update({
            artifactIds: FieldValue.arrayUnion(artifactId),
            status: 'draft',
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Created inbox artifact', { artifactId, type: input.type, threadId: input.threadId });

        return { success: true, artifact: serializeArtifact(artifact) };
    } catch (error) {
        logger.error('Failed to create inbox artifact', { error });
        return { success: false, error: 'Failed to create artifact' };
    }
}

/**
 * Get artifacts for a thread
 */
export async function getInboxArtifacts(
    threadId: string
): Promise<{ success: boolean; artifacts?: InboxArtifact[]; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();

        // Verify thread ownership
        const threadDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).get();
        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = threadDoc.data() as InboxThread;
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Get artifacts
        const snapshot = await db
            .collection(INBOX_ARTIFACTS_COLLECTION)
            .where('threadId', '==', threadId)
            .get();

        const artifacts: InboxArtifact[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as InboxArtifact;
            artifacts.push(serializeArtifact(data));
        });

        return { success: true, artifacts };
    } catch (error) {
        logger.error('Failed to get inbox artifacts', { error, threadId });
        return { success: false, error: 'Failed to get artifacts' };
    }
}

/**
 * Update artifact status
 */
export async function updateInboxArtifactStatus(
    artifactId: string,
    status: InboxArtifactStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const artifactRef = db.collection(INBOX_ARTIFACTS_COLLECTION).doc(artifactId);
        const doc = await artifactRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Artifact not found' };
        }

        const artifact = doc.data() as InboxArtifact;

        // Verify ownership via thread
        const threadDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(artifact.threadId).get();
        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = threadDoc.data() as InboxThread;
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        const updateData: Record<string, unknown> = {
            status,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (status === 'approved') {
            updateData.approvedBy = user.uid;
            updateData.approvedAt = FieldValue.serverTimestamp();
        }

        if (status === 'published') {
            updateData.publishedAt = FieldValue.serverTimestamp();
        }

        await artifactRef.update(updateData);

        logger.info('Updated inbox artifact status', { artifactId, status });

        return { success: true };
    } catch (error) {
        logger.error('Failed to update inbox artifact status', { error, artifactId });
        return { success: false, error: 'Failed to update artifact' };
    }
}

/**
 * Approve and publish an artifact to its destination collection
 */
export async function approveAndPublishArtifact(
    artifactId: string
): Promise<{ success: boolean; publishedId?: string; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const artifactRef = db.collection(INBOX_ARTIFACTS_COLLECTION).doc(artifactId);
        const doc = await artifactRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Artifact not found' };
        }

        const artifact = doc.data() as InboxArtifact;

        // Verify ownership via thread
        const threadDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(artifact.threadId).get();
        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = threadDoc.data() as InboxThread;
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        let publishedId: string | undefined;

        // Publish to destination collection based on type
        switch (artifact.type) {
            case 'carousel': {
                const carouselData = artifact.data as Carousel;
                const carouselRef = db.collection('carousels').doc();
                publishedId = carouselRef.id;
                await carouselRef.set({
                    ...carouselData,
                    id: publishedId,
                    orgId: artifact.orgId,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                break;
            }

            case 'bundle': {
                const bundleData = artifact.data as BundleDeal;
                const bundleRef = db.collection('bundles').doc();
                publishedId = bundleRef.id;
                await bundleRef.set({
                    ...bundleData,
                    id: publishedId,
                    orgId: artifact.orgId,
                    status: 'active',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                break;
            }

            case 'creative_content': {
                const contentData = artifact.data as CreativeContent;
                const contentRef = db
                    .collection('tenants')
                    .doc(artifact.orgId)
                    .collection('creative_content')
                    .doc();
                publishedId = contentRef.id;
                await contentRef.set({
                    ...contentData,
                    id: publishedId,
                    status: 'approved',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                break;
            }
        }

        // Update artifact status
        await artifactRef.update({
            status: 'published',
            approvedBy: user.uid,
            approvedAt: FieldValue.serverTimestamp(),
            publishedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Update thread status if all artifacts are published
        const allArtifacts = await db
            .collection(INBOX_ARTIFACTS_COLLECTION)
            .where('threadId', '==', artifact.threadId)
            .get();

        const allPublished = allArtifacts.docs.every(
            (d) => d.id === artifactId || d.data().status === 'published'
        );

        if (allPublished) {
            await db.collection(INBOX_THREADS_COLLECTION).doc(artifact.threadId).update({
                status: 'completed',
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        logger.info('Approved and published inbox artifact', {
            artifactId,
            type: artifact.type,
            publishedId,
        });

        return { success: true, publishedId };
    } catch (error) {
        logger.error('Failed to approve and publish artifact', { error, artifactId });
        return { success: false, error: 'Failed to publish artifact' };
    }
}

/**
 * Delete an inbox artifact
 */
export async function deleteInboxArtifact(
    artifactId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const artifactRef = db.collection(INBOX_ARTIFACTS_COLLECTION).doc(artifactId);
        const doc = await artifactRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Artifact not found' };
        }

        const artifact = doc.data() as InboxArtifact;

        // Verify ownership via thread
        const threadDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(artifact.threadId).get();
        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = threadDoc.data() as InboxThread;
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Remove from thread's artifact list
        await db.collection(INBOX_THREADS_COLLECTION).doc(artifact.threadId).update({
            artifactIds: FieldValue.arrayRemove(artifactId),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Delete artifact
        await artifactRef.delete();

        logger.info('Deleted inbox artifact', { artifactId });

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete inbox artifact', { error, artifactId });
        return { success: false, error: 'Failed to delete artifact' };
    }
}

// ============ Agent Chat Action ============

/**
 * Result of an inbox agent chat
 */
export interface InboxChatResult {
    success: boolean;
    message?: ChatMessage;
    artifacts?: InboxArtifact[];
    jobId?: string;
    error?: string;
}

/**
 * Run agent chat for an inbox thread
 *
 * This routes the user message to the appropriate agent based on thread type,
 * parses any artifacts from the response, and creates them in the database.
 */
export async function runInboxAgentChat(
    threadId: string,
    userMessage: string
): Promise<InboxChatResult> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();

        // Get thread to determine agent and context
        const threadDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).get();
        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const thread = threadDoc.data() as InboxThread;
        if (thread.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Map inbox agent persona to the agent chat persona ID
        const personaMap: Record<InboxAgentPersona, string> = {
            smokey: 'smokey',
            money_mike: 'money_mike',
            craig: 'craig',
            glenda: 'glenda',
            ezal: 'ezal',
            deebo: 'deebo',
            pops: 'pops',
            auto: 'puff', // Auto routes through Puff for intelligent routing
        };

        const personaId = personaMap[thread.primaryAgent] || 'puff';

        // Build context for the agent based on thread type
        const threadContext = buildThreadContext(thread);

        // Call the agent chat
        const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
        const agentResult = await runAgentChat(
            `${threadContext}\n\nUser: ${userMessage}`,
            personaId,
            {
                modelLevel: 'standard',
                source: 'inbox',
                context: {
                    threadId,
                    threadType: thread.type,
                    orgId: thread.orgId,
                },
            }
        );

        // If we got a job ID, return it for polling
        if (agentResult.metadata?.jobId) {
            return {
                success: true,
                jobId: agentResult.metadata.jobId,
            };
        }

        // Parse artifacts from the agent response
        const { artifacts: parsedArtifacts, cleanedContent } = parseArtifactsFromContent(
            agentResult.content
        );

        // Create inbox artifacts for any parsed artifacts
        const createdArtifacts: InboxArtifact[] = [];
        for (const parsed of parsedArtifacts) {
            if (parsed.type && ['carousel', 'bundle', 'creative_post'].includes(parsed.type)) {
                const artifactType = parsed.type === 'creative_post' ? 'creative_content' : parsed.type;

                // Build artifact data based on type
                const artifactData = buildArtifactData(
                    artifactType as InboxArtifactType,
                    parsed.content || '',
                    parsed.title || '',
                    thread.orgId
                );

                if (artifactData) {
                    const result = await createInboxArtifact({
                        threadId,
                        type: artifactType as InboxArtifactType,
                        data: artifactData,
                        rationale: parsed.metadata?.inboxData?.rationale,
                    });

                    if (result.success && result.artifact) {
                        createdArtifacts.push(result.artifact);
                    }
                }
            }
        }

        // Build the agent message (artifacts are tracked separately in the store)
        const agentMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: cleanedContent || agentResult.content,
            timestamp: new Date(),
        };

        // Add message to thread
        await addMessageToInboxThread(threadId, agentMessage);

        return {
            success: true,
            message: agentMessage,
            artifacts: createdArtifacts,
        };
    } catch (error) {
        logger.error('Failed to run inbox agent chat', { error, threadId });
        return { success: false, error: 'Failed to run agent chat' };
    }
}

/**
 * Build context string for the agent based on thread type
 */
function buildThreadContext(thread: InboxThread): string {
    const typeContexts: Record<InboxThreadType, string> = {
        carousel: `You are helping create a product carousel for a dispensary.
Use the createCarouselArtifact tool to generate carousel suggestions with product selections.
Return structured artifacts using the :::artifact:carousel:Title format.`,

        bundle: `You are helping create bundle deals for a dispensary.
Use the createBundleArtifact tool to generate bundle suggestions with pricing and margin analysis.
Return structured artifacts using the :::artifact:bundle:Title format.
Always protect margins and flag deals with savings over 25%.`,

        creative: `You are helping create social media content for a cannabis brand.
Use the createCreativeArtifact tool to generate platform-specific content.
Return structured artifacts using the :::artifact:creative_post:Title format.
Always consider cannabis advertising compliance rules.`,

        campaign: `You are helping plan and execute a marketing campaign.
Coordinate with other agents (Craig for content, Smokey for products, Money Mike for pricing).
Break down the campaign into actionable artifacts.`,

        general: `You are a helpful assistant for a cannabis dispensary or brand.
Answer questions and help with various tasks related to marketing and operations.`,

        product_discovery: `You are helping a customer find products.
Use your product knowledge to make personalized recommendations.`,

        support: `You are providing customer support.
Be helpful, empathetic, and provide clear guidance.`,
    };

    return `Thread Context: ${thread.title}
Thread Type: ${thread.type}

${typeContexts[thread.type]}

Previous messages in this conversation: ${thread.messages.length}`;
}

/**
 * Build artifact data from parsed content
 */
function buildArtifactData(
    type: InboxArtifactType,
    content: string,
    title: string,
    orgId: string
): Carousel | BundleDeal | CreativeContent | null {
    try {
        const parsed = JSON.parse(content);

        switch (type) {
            case 'carousel':
                return {
                    id: '',
                    orgId,
                    title: title || parsed.title || 'New Carousel',
                    description: parsed.description,
                    productIds: parsed.productIds || [],
                    active: false,
                    displayOrder: parsed.displayOrder || 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as Carousel;

            case 'bundle':
                return {
                    id: '',
                    orgId,
                    name: title || parsed.name || 'New Bundle',
                    description: parsed.description || '',
                    type: parsed.type || 'fixed_price',
                    status: 'draft',
                    createdBy: 'dispensary',
                    products: parsed.products || [],
                    originalTotal: parsed.originalTotal || 0,
                    bundlePrice: parsed.bundlePrice || 0,
                    savingsAmount: parsed.savingsAmount || 0,
                    savingsPercent: parsed.savingsPercent || 0,
                    currentRedemptions: 0,
                    featured: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as BundleDeal;

            case 'creative_content':
                return {
                    id: '',
                    tenantId: orgId,
                    brandId: orgId,
                    platform: parsed.platform || 'instagram',
                    status: 'draft',
                    complianceStatus: 'review_needed',
                    caption: parsed.caption || '',
                    hashtags: parsed.hashtags,
                    mediaUrls: parsed.mediaUrls || [],
                    mediaType: parsed.mediaType || 'image',
                    generatedBy: 'nano-banana',
                    createdBy: 'agent',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                } as CreativeContent;

            default:
                return null;
        }
    } catch {
        // Content is not valid JSON
        return null;
    }
}

/**
 * Get display title for an artifact
 */
function getArtifactTitle(artifact: InboxArtifact): string {
    switch (artifact.type) {
        case 'carousel':
            return (artifact.data as Carousel).title;
        case 'bundle':
            return (artifact.data as BundleDeal).name;
        case 'creative_content': {
            const content = artifact.data as CreativeContent;
            return `${content.platform} Post`;
        }
        default:
            return 'Artifact';
    }
}
