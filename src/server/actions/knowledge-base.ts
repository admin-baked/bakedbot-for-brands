'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { createServerClient } from '@/firebase/server-client';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    KnowledgeBase,
    KnowledgeDocument,
    CreateKnowledgeBaseSchema,
    AddDocumentSchema,
    UploadDocumentSchema,
    ScrapeUrlSchema,
    KnowledgeBaseOwnerType,
    KnowledgeUsageLimits,
    KnowledgeUsageStatus,
    KNOWLEDGE_LIMITS,
    KnowledgeDocumentSource
} from '@/types/knowledge-base';
import { requireUser, isSuperUser } from '@/server/auth/auth';

/**
 * Text Embedding Model
 * Using Google's text-embedding-004 which produces 768-dimensional vectors
 */
const EMBEDDING_MODEL = 'googleai/text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

// --- HELPER FUNCTIONS ---

/**
 * Get usage limits for a plan
 */
function getLimitsForPlan(planId: string): KnowledgeUsageLimits {
    return KNOWLEDGE_LIMITS[planId] || KNOWLEDGE_LIMITS.free;
}

/**
 * Get user's plan ID from their profile
 */
async function getUserPlanId(userId: string): Promise<string> {
    const { firestore } = await createServerClient();
    const userDoc = await firestore.collection('users').doc(userId).get();
    return userDoc.data()?.planId || 'free';
}

/**
 * Generate embedding using Genkit
 */
async function generateEmbedding(content: string): Promise<number[]> {
    const response: any = await ai.embed({
        embedder: EMBEDDING_MODEL,
        content: content
    });
    const embedding = Array.isArray(response) ? response[0].embedding : response.embedding;
    return embedding as number[];
}

// --- ACTIONS ---

/**
 * Create a new Knowledge Base
 */
export async function createKnowledgeBaseAction(input: z.infer<typeof CreateKnowledgeBaseSchema>) {
    try {
        const user = await requireUser();
        const isSuper = await isSuperUser();

        // Security: System KBs require super user
        if (input.ownerType === 'system' && !isSuper) {
            throw new Error('Unauthorized: Only super admins can create system Knowledge Bases.');
        }

        // Security: Brand/Dispensary must match user's org
        if ((input.ownerType === 'brand' || input.ownerType === 'dispensary') && !isSuper) {
            const userOrgId = user.brandId || user.dispensaryId;
            if (input.ownerId !== userOrgId) {
                throw new Error('Unauthorized: Cannot create KB for another organization.');
            }
        }

        const firestore = getAdminFirestore();
        const collection = firestore.collection('knowledge_bases');

        // Check for duplicate name
        const existing = await collection
            .where('ownerId', '==', input.ownerId)
            .where('name', '==', input.name)
            .get();

        if (!existing.empty) {
            return { success: false, message: 'A Knowledge Base with this name already exists.' };
        }

        const newKb: Omit<KnowledgeBase, 'id'> = {
            ownerId: input.ownerId,
            ownerType: input.ownerType as KnowledgeBaseOwnerType,
            name: input.name,
            description: input.description,
            createdAt: new Date(),
            updatedAt: new Date(),
            documentCount: 0,
            totalBytes: 0,
            enabled: true,
            systemInstructions: input.systemInstructions || ''
        };

        const docRef = await collection.add(newKb);
        await docRef.update({ id: docRef.id });

        return { success: true, message: 'Knowledge Base created successfully.', id: docRef.id };
    } catch (error: any) {
        console.error('[createKnowledgeBaseAction] Error:', error);
        return { success: false, message: error.message || 'Failed to create Knowledge Base.' };
        }
}

/**
 * Update a Knowledge Base (e.g. System Instructions)
 */
export const UpdateKnowledgeBaseSchema = z.object({
    knowledgeBaseId: z.string(),
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    systemInstructions: z.string().optional(),
});

export async function updateKnowledgeBaseAction(input: z.infer<typeof UpdateKnowledgeBaseSchema>) {
    try {
        const user = await requireUser();
        const isSuper = await isSuperUser();
        const firestore = getAdminFirestore();
        const kbRef = firestore.collection('knowledge_bases').doc(input.knowledgeBaseId);

        const doc = await kbRef.get();
        if (!doc.exists) throw new Error('Knowledge Base not found');

        const data = doc.data() as KnowledgeBase;

        // Security Check
        if (data.ownerType === 'system' && !isSuper) {
            throw new Error('Unauthorized: Only super admins can update system KBs.');
        }
        if (data.ownerType !== 'system' && data.ownerId !== user.brandId && data.ownerId !== user.dispensaryId && !isSuper) {
             throw new Error('Unauthorized: Cannot update this KB.');
        }

        const updates: any = { updatedAt: new Date() };
        if (input.name) updates.name = input.name;
        if (input.description) updates.description = input.description;
        if (input.systemInstructions !== undefined) updates.systemInstructions = input.systemInstructions;

        await kbRef.update(updates);
        return { success: true, message: 'Knowledge Base updated.' };
    } catch (error: any) {
         console.error('[updateKnowledgeBaseAction] Error:', error);
         return { success: false, message: error.message };
    }
}

/**
 * Get all Knowledge Bases for a specific owner
 */
export async function getKnowledgeBasesAction(ownerId: string) {
    await requireUser();
    const { firestore } = await createServerClient();

    const snapshot = await firestore.collection('knowledge_bases')
        .where('ownerId', '==', ownerId)
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt),
            updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(data.updatedAt)
        } as KnowledgeBase;
    });
}

/**
 * Get System Knowledge Bases (for all agents)
 */
export async function getSystemKnowledgeBasesAction() {
    await requireUser();
    const { firestore } = await createServerClient();

    const snapshot = await firestore.collection('knowledge_bases')
        .where('ownerType', '==', 'system')
        .where('enabled', '==', true)
        .get();

    return snapshot.docs.map(doc => {
         const data = doc.data();
         return {
             ...data,
             id: doc.id,
             createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt),
             updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(data.updatedAt)
         } as KnowledgeBase;
    });
}

/**
 * Check usage limits for a Knowledge Base owner
 */
export async function checkUsageLimitsAction(ownerId: string, ownerType: KnowledgeBaseOwnerType): Promise<KnowledgeUsageStatus> {
    const user = await requireUser();
    const isSuper = await isSuperUser();

    // System tier has no limits
    if (ownerType === 'system' || isSuper) {
        return {
            documentCount: 0,
            totalBytes: 0,
            limits: KNOWLEDGE_LIMITS.system,
            isAtLimit: false,
            percentUsed: 0
        };
    }

    // Get plan for user
    const planId = await getUserPlanId(user.uid);
    const limits = getLimitsForPlan(planId);

    // Get current usage
    const { firestore } = await createServerClient();
    const kbsSnapshot = await firestore.collection('knowledge_bases')
        .where('ownerId', '==', ownerId)
        .get();

    let documentCount = 0;
    let totalBytes = 0;

    kbsSnapshot.forEach(doc => {
        const data = doc.data();
        documentCount += data.documentCount || 0;
        totalBytes += data.totalBytes || 0;
    });

    const isAtLimit = documentCount >= limits.maxDocuments || totalBytes >= limits.maxTotalBytes;
    const percentUsed = Math.max(
        (documentCount / limits.maxDocuments) * 100,
        (totalBytes / limits.maxTotalBytes) * 100
    );

    return {
        documentCount,
        totalBytes,
        limits,
        isAtLimit,
        percentUsed: Math.min(percentUsed, 100)
    };
}

/**
 * Add a document to a Knowledge Base + Generate Embedding
 * Now uses Firestore Vector type for native vector search
 */
export async function addDocumentAction(input: z.infer<typeof AddDocumentSchema>) {
    const user = await requireUser();
    const firestore = getAdminFirestore();

    try {
        // Check if KB exists and get owner info
        const kbRef = firestore.collection('knowledge_bases').doc(input.knowledgeBaseId);
        const kbDoc = await kbRef.get();
        if (!kbDoc.exists) throw new Error('Knowledge Base not found');

        const kbData = kbDoc.data() as KnowledgeBase;

        // Check usage limits (skip for system)
        if (kbData.ownerType !== 'system') {
            const usage = await checkUsageLimitsAction(kbData.ownerId, kbData.ownerType);
            if (usage.isAtLimit) {
                return { success: false, message: 'Usage limit reached. Upgrade your plan to add more documents.' };
            }

            // Check source permissions
            if (input.source === 'upload' && !usage.limits.allowUpload) {
                return { success: false, message: 'File upload not available on your plan.' };
            }
            if (input.source === 'drive' && !usage.limits.allowDrive) {
                return { success: false, message: 'Google Drive import not available on your plan.' };
            }
            if (input.source === 'scrape' && !usage.limits.allowScrape) {
                return { success: false, message: 'URL scraping not available on your plan.' };
            }
        }

        // Generate embedding
        const embedding = await generateEmbedding(input.content);
        const byteSize = new Blob([input.content]).size;

        // Prepare document with Firestore Vector
        const newDoc: Omit<KnowledgeDocument, 'id'> = {
            knowledgeBaseId: input.knowledgeBaseId,
            type: input.type as any,
            source: input.source as KnowledgeDocumentSource,
            title: input.title,
            content: input.content,
            sourceUrl: input.sourceUrl,
            driveMetadata: input.driveMetadata,
            embedding: embedding,
            tokenCount: Math.ceil(input.content.length / 4),
            byteSize: byteSize,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.uid
        };

        // Save with transaction
        await firestore.runTransaction(async (t) => {
            const docRef = kbRef.collection('documents').doc();
            t.set(docRef, { ...newDoc, id: docRef.id });

            t.update(kbRef, {
                documentCount: FieldValue.increment(1),
                totalBytes: FieldValue.increment(byteSize),
                updatedAt: new Date()
            });
        });

        return { success: true, message: 'Document added and indexed.' };

    } catch (error: any) {
        console.error('[addDocumentAction] Error:', error);
        return { success: false, message: `Failed to add document: ${error.message}` };
    }
}

/**
 * Delete a document
 */
export async function deleteDocumentAction(kbId: string, docId: string) {
    await requireUser();
    const firestore = getAdminFirestore();
    const kbRef = firestore.collection('knowledge_bases').doc(kbId);
    const docRef = kbRef.collection('documents').doc(docId);

    try {
        await firestore.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) throw new Error('Document not found');

            const docData = doc.data();
            const byteSize = docData?.byteSize || 0;

            t.delete(docRef);

            t.update(kbRef, {
                documentCount: FieldValue.increment(-1),
                totalBytes: FieldValue.increment(-byteSize),
                updatedAt: new Date()
            });
        });
        return { success: true, message: 'Document deleted.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Get documents for a Knowledge Base (excludes embedding for performance)
 */
export async function getDocumentsAction(kbId: string) {
    await requireUser();
    const { firestore } = await createServerClient();

    const snapshot = await firestore.collection('knowledge_bases').doc(kbId).collection('documents')
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const { embedding, ...rest } = data;
        return {
            ...rest,
            id: doc.id,
            createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt),
            updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(data.updatedAt)
        } as Omit<KnowledgeDocument, 'embedding'>;
    });
}

/**
 * Semantic Search using Firestore Vector Search (findNearest)
 * Falls back to in-memory cosine similarity if vector index not yet created
 */
export async function searchKnowledgeBaseAction(kbId: string, query: string, limit: number = 5) {
    if (!query || query.length < 3) return [];

    try {
        const queryEmbedding = await generateEmbedding(query);
        const firestore = getAdminFirestore();

        // Try Firestore Vector Search first
        try {
            const docsRef = firestore.collection('knowledge_bases').doc(kbId).collection('documents');

            // Use findNearest for native vector search
            const vectorQuery = docsRef.findNearest('embedding', queryEmbedding, {
                limit: limit,
                distanceMeasure: 'COSINE'
            });

            const snapshot = await vectorQuery.get();

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    source: data.source,
                    similarity: 1 - (data.distance || 0) // Convert distance to similarity
                };
            });

        } catch (vectorError: any) {
            // Fallback to in-memory cosine if vector index doesn't exist
            console.warn('[searchKnowledgeBaseAction] Vector search unavailable, using fallback:', vectorError.message);

            const snapshot = await firestore.collection('knowledge_bases').doc(kbId).collection('documents').get();

            const results: { id: string; title: string; content: string; source: string; similarity: number }[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.embedding && Array.isArray(data.embedding)) {
                    const similarity = cosineSimilarity(queryEmbedding, data.embedding);
                    if (similarity > 0.6) {
                        results.push({
                            id: doc.id,
                            title: data.title,
                            content: data.content,
                            source: data.source || 'paste',
                            similarity
                        });
                    }
                }
            });

            results.sort((a, b) => b.similarity - a.similarity);
            return results.slice(0, limit);
        }

    } catch (error) {
        console.error('[searchKnowledgeBaseAction] Error:', error);
        return [];
    }
}

/**
 * Search across ALL system KBs (for agent context)
 */
export async function searchSystemKnowledgeAction(query: string, limit: number = 5) {
    if (!query || query.length < 3) return [];

    try {
        const systemKbs = await getSystemKnowledgeBasesAction();
        const allResults: any[] = [];

        for (const kb of systemKbs) {
            const results = await searchKnowledgeBaseAction(kb.id, query, limit);
            allResults.push(...results);
        }

        // Sort by similarity and return top
        allResults.sort((a, b) => b.similarity - a.similarity);
        return allResults.slice(0, limit);

    } catch (error) {
        console.error('[searchSystemKnowledgeAction] Error:', error);
        return [];
    }
}

/**
 * Scrape URL and add as document
 */
export async function scrapeUrlAction(input: z.infer<typeof ScrapeUrlSchema>) {
    await requireUser();

    try {
        // Fetch URL content
        const response = await fetch(input.url, {
            headers: { 'User-Agent': 'BakedBot-Crawler/1.0' }
        });

        if (!response.ok) {
            return { success: false, message: `Failed to fetch URL: ${response.status}` };
        }

        const html = await response.text();

        // Simple text extraction (strip HTML tags)
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 50000); // Limit content length

        if (textContent.length < 50) {
            return { success: false, message: 'URL contains insufficient text content.' };
        }

        // Extract title from URL or HTML
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = input.title || titleMatch?.[1]?.trim() || new URL(input.url).hostname;

        // Add as document
        return addDocumentAction({
            knowledgeBaseId: input.knowledgeBaseId,
            type: 'link',
            source: 'scrape',
            title: title,
            content: textContent,
            sourceUrl: input.url
        });

    } catch (error: any) {
        console.error('[scrapeUrlAction] Error:', error);
        return { success: false, message: `Failed to scrape URL: ${error.message}` };
    }
}

// --- COSINE SIMILARITY FALLBACK ---

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
