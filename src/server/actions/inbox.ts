'use server';

/**
 * Inbox Server Actions
 *
 * Server-side operations for the Unified Inbox including
 * thread CRUD, artifact management, and persistence to Firestore.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
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
    AgentHandoff,
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
    return getAdminFirestore();
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
    id?: string; // Optional: pass client-generated ID to avoid race conditions
    type: InboxThreadType;
    title?: string;
    primaryAgent?: InboxAgentPersona;
    projectId?: string;
    brandId?: string;
    dispensaryId?: string;
    // CRM context
    customerId?: string;
    customerEmail?: string;
    customerSegment?: string;
    tags?: string[];
    color?: string;
    isPinned?: boolean;
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
        // Use client-provided ID if available, otherwise generate new one
        const threadId = input.id || createInboxThreadId();

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
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivityAt: new Date(),
        };

        // Only add optional fields if they have values (Firestore rejects undefined)
        if (input.projectId) thread.projectId = input.projectId;
        if (input.brandId) thread.brandId = input.brandId;
        if (input.dispensaryId) thread.dispensaryId = input.dispensaryId;
        if (input.customerId) thread.customerId = input.customerId;
        if (input.customerEmail) thread.customerEmail = input.customerEmail;
        if (input.customerSegment) thread.customerSegment = input.customerSegment;
        if (input.tags && input.tags.length > 0) thread.tags = input.tags;
        if (input.color) thread.color = input.color;
        if (input.isPinned !== undefined) thread.isPinned = input.isPinned;

        // Build Firestore data - filter out any undefined values to avoid Firestore errors
        const firestoreData: Record<string, unknown> = {
            id: thread.id,
            orgId: thread.orgId,
            userId: thread.userId,
            type: thread.type,
            status: thread.status,
            title: thread.title,
            preview: thread.preview,
            primaryAgent: thread.primaryAgent,
            assignedAgents: thread.assignedAgents,
            artifactIds: thread.artifactIds,
            messages: thread.messages,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        };

        // Add optional fields only if defined
        if (thread.projectId) firestoreData.projectId = thread.projectId;
        if (thread.brandId) firestoreData.brandId = thread.brandId;
        if (thread.dispensaryId) firestoreData.dispensaryId = thread.dispensaryId;
        if (thread.customerId) firestoreData.customerId = thread.customerId;
        if (thread.customerEmail) firestoreData.customerEmail = thread.customerEmail;
        if (thread.customerSegment) firestoreData.customerSegment = thread.customerSegment;
        if (thread.tags && thread.tags.length > 0) firestoreData.tags = thread.tags;
        if (thread.color) firestoreData.color = thread.color;
        if (thread.isPinned !== undefined) firestoreData.isPinned = thread.isPinned;

        await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).set(firestoreData);

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
    cursor?: string; // Document ID to start after (for pagination)
}): Promise<{
    success: boolean;
    threads?: InboxThread[];
    nextCursor?: string;
    hasMore?: boolean;
    error?: string;
}> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const pageSize = options?.limit || 50;

        let query = db
            .collection(INBOX_THREADS_COLLECTION)
            .where('userId', '==', user.uid)
            .orderBy('lastActivityAt', 'desc') // Firestore-level sort (requires composite index)
            .limit(pageSize + 1); // Fetch +1 to check if there are more pages

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

        // Cursor-based pagination: start after the cursor document
        if (options?.cursor) {
            const cursorDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(options.cursor).get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }

        const snapshot = await query.get();

        const threads: InboxThread[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as InboxThread;
            threads.push(serializeThread(data));
        });

        // Check if there are more pages
        const hasMore = threads.length > pageSize;
        if (hasMore) {
            threads.pop(); // Remove the extra document
        }

        // Next cursor is the ID of the last document
        const nextCursor = hasMore && threads.length > 0 ? threads[threads.length - 1].id : undefined;

        return { success: true, threads, nextCursor, hasMore };
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
            case 'blog_post': {
                // Import blog actions dynamically to avoid circular dependencies
                const { createBlogPost } = await import('@/server/actions/blog');
                const blogData = artifact.data as any;

                const blogPost = await createBlogPost({
                    orgId: artifact.orgId,
                    title: blogData.title,
                    subtitle: blogData.subtitle,
                    excerpt: blogData.excerpt,
                    content: blogData.content,
                    category: blogData.category,
                    tags: blogData.tags,
                    seoKeywords: blogData.seoKeywords,
                    featuredImage: blogData.featuredImageUrl ? {
                        id: `img_${Date.now()}`,
                        url: blogData.featuredImageUrl,
                        alt: blogData.title,
                        mimeType: 'image/jpeg',
                    } : undefined,
                    createdBy: 'agent:craig',
                });
                publishedId = blogPost.id;
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
    userMessage: string,
    attachments?: { name: string; type: string; base64: string }[]
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

        // Executive agents (Glenda, Jack, Mike) are restricted to super_user only
        const executiveAgents: InboxAgentPersona[] = ['glenda', 'jack', 'mike'];
        const userRole = (user as any).role || '';
        const isSuperUser = userRole === 'super_user' || userRole === 'super_admin';

        if (executiveAgents.includes(thread.primaryAgent) && !isSuperUser) {
            return { success: false, error: 'This agent is only available in the Boardroom (Super User access required)' };
        }

        // Map inbox agent persona to the agent chat persona ID
        const personaMap: Record<InboxAgentPersona, string> = {
            // Field Agents
            smokey: 'smokey',
            money_mike: 'money_mike',
            craig: 'craig',
            ezal: 'ezal',
            deebo: 'deebo',
            pops: 'pops',
            day_day: 'day_day',
            mrs_parker: 'mrs_parker',
            big_worm: 'big_worm',
            roach: 'roach',
            // Executive Agents
            leo: 'leo',
            jack: 'jack',
            linus: 'linus',
            glenda: 'glenda',
            mike: 'mike_exec',
            // Auto-routing
            auto: 'puff', // Auto routes through Puff for intelligent routing
        };

        const personaId = personaMap[thread.primaryAgent] || 'puff';

        // Build context for the agent based on thread type
        const threadContext = await buildThreadContext(thread);

        // === REMOTE SIDECAR ROUTING ===
        // Route heavy research agents to remote Python sidecar if available
        const REMOTE_THREAD_TYPES = ['deep_research', 'compliance_research', 'market_research'];
        const REMOTE_AGENTS: InboxAgentPersona[] = ['big_worm', 'roach'];

        const shouldUseRemote =
            REMOTE_THREAD_TYPES.includes(thread.type) ||
            REMOTE_AGENTS.includes(thread.primaryAgent);

        if (shouldUseRemote && process.env.PYTHON_SIDECAR_ENDPOINT) {
            try {
                const { getRemoteMcpClient } = await import('@/server/services/remote-mcp-client');
                const sidecarClient = getRemoteMcpClient();

                if (sidecarClient) {
                    logger.info('Routing to remote sidecar', {
                        threadId,
                        threadType: thread.type,
                        agent: thread.primaryAgent,
                    });

                    // Start remote job
                    const jobResult = await sidecarClient.startJob({
                        method: 'agent.execute',
                        params: {
                            agent: thread.primaryAgent,
                            query: userMessage,
                            context: {
                                threadId,
                                threadType: thread.type,
                                threadContext,
                                orgId: thread.orgId,
                            },
                        },
                    });

                    if (jobResult.success && jobResult.data?.jobId) {
                        // Return job ID for client polling
                        return {
                            success: true,
                            jobId: jobResult.data.jobId,
                        };
                    } else {
                        logger.warn('Sidecar job failed, falling back to local execution', {
                            error: jobResult.error,
                        });
                    }
                } else {
                    logger.warn('Sidecar unavailable, falling back to local execution', {
                        threadId,
                    });
                }
            } catch (sidecarError) {
                logger.error('Sidecar routing error, falling back to local execution', {
                    error: sidecarError,
                    threadId,
                });
            }
        }

        // === LOCAL EXECUTION (Default or Fallback) ===
        const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
        const agentResult = await runAgentChat(
            `${threadContext}\n\nUser: ${userMessage}`,
            personaId,
            {
                modelLevel: 'standard',
                source: 'inbox',
                attachments, // Pass file attachments for multimodal processing
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

        // FALLBACK: Also check tool call results for carousel/bundle/creative artifacts
        // This ensures artifacts are created even if the agent doesn't include the marker in the response
        if (agentResult.toolCalls && agentResult.toolCalls.length > 0) {
            for (const toolCall of agentResult.toolCalls) {
                if (toolCall.name === 'createCarouselArtifact' && toolCall.status === 'success') {
                    try {
                        const toolResult = typeof toolCall.result === 'string'
                            ? JSON.parse(toolCall.result)
                            : toolCall.result;
                        if (toolResult?.success && toolResult?.carousel) {
                            // Check if we already parsed this from content
                            const alreadyParsed = parsedArtifacts.some(
                                p => p.type === 'carousel' && p.title === toolResult.carousel.title
                            );
                            if (!alreadyParsed) {
                                parsedArtifacts.push({
                                    type: 'carousel',
                                    title: toolResult.carousel.title,
                                    content: JSON.stringify(toolResult.carousel),
                                    metadata: {
                                        inboxData: {
                                            rationale: toolResult.rationale,
                                            carousel: {
                                                productIds: toolResult.carousel.productIds || [],
                                                displayOrder: toolResult.carousel.displayOrder || 0,
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        logger.warn('[INBOX] Failed to parse carousel from tool result', { error: e });
                    }
                }
                // Similar patterns for bundle and creative artifacts
                if (toolCall.name === 'createBundleArtifact' && toolCall.status === 'success') {
                    try {
                        const toolResult = typeof toolCall.result === 'string'
                            ? JSON.parse(toolCall.result)
                            : toolCall.result;
                        if (toolResult?.success && toolResult?.bundle) {
                            const alreadyParsed = parsedArtifacts.some(
                                p => p.type === 'bundle' && p.title === toolResult.bundle.name
                            );
                            if (!alreadyParsed) {
                                parsedArtifacts.push({
                                    type: 'bundle',
                                    title: toolResult.bundle.name,
                                    content: JSON.stringify(toolResult.bundle),
                                    metadata: { inboxData: { rationale: toolResult.rationale } }
                                });
                            }
                        }
                    } catch (e) {
                        logger.warn('[INBOX] Failed to parse bundle from tool result', { error: e });
                    }
                }
                if (toolCall.name === 'createCreativeArtifact' && toolCall.status === 'success') {
                    try {
                        const toolResult = typeof toolCall.result === 'string'
                            ? JSON.parse(toolCall.result)
                            : toolCall.result;
                        if (toolResult?.success && toolResult?.content) {
                            const alreadyParsed = parsedArtifacts.some(
                                p => p.type === 'creative_post' && p.title?.includes(toolResult.content.platform)
                            );
                            if (!alreadyParsed) {
                                parsedArtifacts.push({
                                    type: 'creative_post',
                                    title: `${toolResult.content.platform} Post`,
                                    content: JSON.stringify(toolResult.content),
                                    metadata: { inboxData: { rationale: toolResult.rationale } }
                                });
                            }
                        }
                    } catch (e) {
                        logger.warn('[INBOX] Failed to parse creative from tool result', { error: e });
                    }
                }
            }
        }

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
            thinking: agentResult.thinking,
            metadata: agentResult.metadata,
        };

        // Add message to thread
        await addMessageToInboxThread(threadId, agentMessage);

        return {
            success: true,
            message: agentMessage,
            artifacts: createdArtifacts,
        };
    } catch (error: any) {
        logger.error('Failed to run inbox agent chat', { error: error?.message || error, threadId });
        // Return more specific error message for debugging
        const errorMessage = error?.message || 'Failed to run agent chat';
        return {
            success: false,
            error: errorMessage.includes('Unauthorized') || errorMessage.includes('session')
                ? 'Session expired. Please refresh and log in again.'
                : errorMessage
        };
    }
}

/**
 * Build context string for the agent based on thread type
 */
async function buildThreadContext(thread: InboxThread): Promise<string> {
    // Load project context if available
    let projectContext = '';
    if (thread.projectId) {
        try {
            const { getProject } = await import('@/server/actions/projects');
            const project = await getProject(thread.projectId);
            if (project) {
                projectContext = `\n\nProject Context: "${project.name}"${project.description ? `\nDescription: ${project.description}` : ''}${project.systemInstructions ? `\n\nProject Instructions:\n${project.systemInstructions}` : ''}`;
            }
        } catch (error) {
            logger.warn('Failed to load project context', { projectId: thread.projectId, error });
        }
    }

    const typeContexts: Record<InboxThreadType, string> = {
        carousel: `You are helping create a product carousel for a dispensary.
Use the createCarouselArtifact tool to generate carousel suggestions with product selections.
CRITICAL: When the tool returns, you MUST include its marker output in your response.
The marker format is: :::artifact:carousel:Title
{json data}
:::
Include this marker block in your final response so the system can create the artifact.`,

        hero: `You are helping create a hero banner for a dispensary or brand storefront.
Focus on a clear value proposition, compliant copy, and strong visual direction.
Return structured artifacts using the :::artifact:creative_post:Title format when possible.`,

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

        qr_code: `You are helping create trackable QR codes for marketing campaigns.
Generate QR codes for products, menus, promotions, events, or loyalty programs.
Provide the target URL, customization options (colors, logo), and tracking analytics.
Return structured artifacts using the :::artifact:qr_code:Title format.`,

        blog: `You are helping create blog posts for cannabis education and marketing.
Generate SEO-optimized, compliant blog content about cannabis products, education, industry news, or company updates.
Use the createBlogPostArtifact tool to generate blog post drafts.
Return structured artifacts using the :::artifact:blog_post:Title format.
Always follow cannabis compliance rules (no medical claims, age-appropriate content).`,

        retail_partner: `You are helping create materials to pitch retail partners (dispensaries).
Generate sell sheets, pitch decks, and partnership proposals.
Focus on margin opportunities, sell-through data, and brand story.`,

        launch: `You are helping coordinate a product launch.
This involves creating carousels, bundles, and social content together.
Generate a comprehensive launch package with multiple coordinated artifacts.`,

        performance: `You are helping analyze marketing performance.
Review recent campaigns, carousels, bundles, and content performance.
Provide data-driven insights and optimization recommendations.
Generate report artifacts with actionable insights.`,

        outreach: `You are helping draft customer outreach messages.
This can be SMS or email campaigns.
Ensure compliance with cannabis advertising regulations.
Generate outreach draft artifacts ready for review and sending.`,

        inventory_promo: `You are helping create promotions to move inventory.
Focus on slow-moving or excess stock items.
Generate bundle deals and promotional content that protect margins while driving volume.`,

        event: `You are helping plan marketing for an event.
Create promotional materials, social content, and event-specific bundles.
Generate coordinated artifacts for the event marketing package.`,

        general: `You are a helpful assistant for a cannabis dispensary or brand.
Answer questions and help with various tasks related to marketing and operations.`,

        product_discovery: `You are helping a customer find products.
Use your product knowledge to make personalized recommendations.`,

        support: `You are providing customer support.
Be helpful, empathetic, and provide clear guidance.`,

        // Super User: Growth Management thread types
        growth_review: `You are Jack, the CRO, helping review growth metrics and KPIs.
Analyze key metrics: MRR, growth rates (WoW/MoM), customer acquisition, retention.
Identify momentum indicators and growth opportunities.
Generate growth report artifacts with actionable insights.`,

        churn_risk: `You are Jack, the CRO, helping identify and retain at-risk customers.
Analyze customer health signals: engagement, usage patterns, support tickets.
Score churn risk and prioritize intervention strategies.
Generate churn scorecard artifacts with specific retention actions.`,

        revenue_forecast: `You are Money Mike, the CFO, helping model and forecast revenue.
Build revenue projections based on current trends and growth assumptions.
Create scenario models (conservative, base, optimistic).
Generate revenue model artifacts with detailed forecasts.`,

        pipeline: `You are Jack, the CRO, helping track the sales pipeline.
Review deal stages, conversion rates, and sales velocity.
Identify bottlenecks and opportunities in the funnel.
Generate pipeline report artifacts with deal analysis.`,

        customer_health: `You are Jack, the CRO, monitoring customer segment health.
Analyze engagement metrics, feature adoption, and satisfaction by segment.
Identify healthy vs at-risk segments and growth opportunities.
Generate health scorecard artifacts with segment-level insights.`,

        market_intel: `You are Ezal, the competitive intelligence specialist.
Analyze market positioning, competitor moves, and market share trends.
Identify competitive threats and opportunities.
Generate market analysis artifacts with strategic recommendations.`,

        bizdev: `You are Glenda, the CMO, helping with business development.
Plan partnership outreach and expansion strategies.
Create pitch materials and partnership proposals.
Generate partnership deck artifacts for outreach.`,

        experiment: `You are Linus, the CTO, helping plan and analyze growth experiments.
Design A/B tests and growth experiments with clear hypotheses.
Analyze results and determine statistical significance.
Generate experiment plan artifacts with test designs and analysis.`,

        // Super User: Company Operations thread types
        daily_standup: `You are Leo, the COO, running the daily standup.
Gather updates from all operational areas. What shipped? What's blocked? What's next?
Generate standup notes artifacts with action items.`,

        sprint_planning: `You are Linus, the CTO, helping plan the next sprint.
Review the backlog, prioritize stories, and allocate capacity.
Generate sprint plan artifacts with goals and stories.`,

        incident_response: `You are Linus, the CTO, investigating a production issue.
Gather details, identify root cause, and coordinate resolution.
Generate incident report and postmortem artifacts.`,

        feature_spec: `You are Linus, the CTO, helping scope a new feature.
Write user stories, acceptance criteria, and technical requirements.
Generate feature spec and technical design artifacts.`,

        code_review: `You are Linus, the CTO, helping with code review and architecture.
Review changes, provide feedback, and document decisions.
Generate meeting notes artifacts with decisions and action items.`,

        release: `You are Linus, the CTO, preparing a release.
Review what's ready, coordinate testing, and prepare changelog.
Generate release notes artifacts with migration guides.`,

        customer_onboarding: `You are Mrs. Parker, the customer success lead.
Review and optimize customer onboarding flows.
Generate onboarding checklist artifacts for new customers.`,

        customer_feedback: `You are Jack, the CRO, reviewing customer feedback.
Analyze feature requests, complaints, and satisfaction trends.
Generate report artifacts with prioritized insights.`,

        support_escalation: `You are Leo, the COO, handling an escalated support ticket.
Coordinate resolution and ensure customer satisfaction.
Generate meeting notes artifacts with resolution steps.`,

        content_calendar: `You are Glenda, the CMO, planning content.
Plan blog posts, social media, and email content by channel and date.
Generate content calendar artifacts.`,

        launch_campaign: `You are Glenda, the CMO, planning a product or feature launch.
Coordinate marketing materials, social content, and outreach.
Generate creative content and outreach draft artifacts.`,

        seo_sprint: `You are Day Day, the SEO specialist.
Plan technical and content SEO improvements.
Generate report artifacts with prioritized optimizations.`,

        partnership_outreach: `You are Glenda, the CMO, reaching out to partners.
Plan integration partner and reseller outreach.
Generate partnership deck artifacts for pitches.`,

        billing_review: `You are Mike, the CFO, reviewing billing.
Analyze invoicing, payments, and collections.
Generate report artifacts with billing insights.`,

        budget_planning: `You are Mike, the CFO, planning budgets.
Build quarterly or annual budget forecasts.
Generate budget model artifacts with projections.`,

        vendor_management: `You are Mike, the CFO, managing vendors.
Review API costs, subscriptions, and vendor relationships.
Generate report artifacts with cost analysis.`,

        compliance_audit: `You are Deebo, the compliance enforcer.
Audit SOC2 status, privacy requirements, and cannabis regulations.
Generate compliance brief artifacts with findings.`,

        weekly_sync: `You are Leo, the COO, running the executive weekly sync.
Gather updates from all departments and align on priorities.
Generate meeting notes artifacts with decisions and action items.`,

        quarterly_planning: `You are Leo, the COO, planning the quarter.
Set OKRs and strategic priorities.
Generate OKR document artifacts.`,

        board_prep: `You are Mike, the CFO, preparing for the board.
Draft investor updates and board presentations.
Generate board deck artifacts.`,

        hiring: `You are Leo, the COO, managing hiring.
Define roles, review candidates, and track interview feedback.
Generate job spec artifacts for open positions.`,

        // Super User: Research thread types
        deep_research: `You are Big Worm, the deep research specialist.
Conduct comprehensive research with data analysis.
Generate research brief artifacts with findings.`,

        compliance_research: `You are Roach, the compliance research librarian.
Research compliance requirements and regulations.
Generate compliance brief artifacts with guidance.`,

        market_research: `You are Big Worm, conducting market analysis.
Analyze market trends, competitors, and strategic opportunities.
Generate market analysis and research brief artifacts.`,

        // CRM / Customer Intelligence
        crm_customer: `You are managing a customer relationship for a cannabis dispensary.
Use CRM tools (lookupCustomer, getCustomerHistory, getSegmentSummary, getAtRiskCustomers, getUpcomingBirthdays, getCustomerComms) to access real customer data.
Personalize all outreach based on the customer's segment, spending patterns, and preferences.
You can draft emails, SMS, loyalty offers, and win-back campaigns.
When referencing customer data, be specific with names, amounts, and dates.
Always validate compliance with Deebo before sending any campaigns.`,
    };

    // Inject customer context when thread is about a specific customer
    let customerContext = '';
    if (thread.customerId) {
        try {
            const { lookupCustomer } = await import('@/server/tools/crm-tools');
            const result = await lookupCustomer(thread.customerId, thread.orgId);
            if (result?.customer) {
                const c = result.customer;
                customerContext = `\n\n=== CUSTOMER CONTEXT ===
Name: ${c.displayName ?? 'Unknown'} | Email: ${c.email ?? 'N/A'} | Phone: ${c.phone || 'N/A'}
Segment: ${c.segment ?? 'unknown'} | Tier: ${c.tier ?? 'N/A'} | Points: ${c.points ?? 0}
LTV: $${Number(c.totalSpent ?? 0).toLocaleString()} | Orders: ${c.orderCount ?? 0} | AOV: $${Number(c.avgOrderValue ?? 0).toFixed(2)}
Last Order: ${c.lastOrderDate || 'Never'} | Days Inactive: ${c.daysSinceLastOrder ?? 'N/A'}
Tags: ${Array.isArray(c.customTags) ? c.customTags.join(', ') : 'None'}
Notes: ${c.notes || 'None'}
=== END CUSTOMER CONTEXT ===`;
            }
        } catch {
            // Silently fail - agent can still use CRM tools to look up customer
        }
    }

    return `Thread Context: ${thread.title}
Thread Type: ${thread.type}${projectContext}${customerContext}

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

// =============================================================================
// INJECT AGENT MESSAGE (server-side, no auth required)
// =============================================================================

/**
 * Inject a message from an agent into an existing thread.
 * Used by background services (heartbeat, campaign sender) to push proactive updates.
 * Does NOT require user auth — uses admin Firestore directly.
 */
export async function injectAgentMessage(
    threadId: string,
    agent: string,
    message: string,
): Promise<boolean> {
    try {
        const db = getDb();
        const threadRef = db.collection(INBOX_THREADS_COLLECTION).doc(threadId);
        const doc = await threadRef.get();

        if (!doc.exists) {
            logger.warn('[INBOX] Cannot inject message — thread not found', { threadId });
            return false;
        }

        const agentMessage = {
            id: `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: 'assistant',
            content: message,
            timestamp: new Date().toISOString(),
            agentPersona: agent,
        };

        await threadRef.update({
            messages: FieldValue.arrayUnion(agentMessage),
            preview: message.slice(0, 50),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });

        logger.info('[INBOX] Agent message injected', {
            threadId,
            agent,
            messageLength: message.length,
        });

        return true;
    } catch (error) {
        logger.error('[INBOX] Failed to inject agent message', {
            error: (error as Error).message,
            threadId,
        });
        return false;
    }
}
