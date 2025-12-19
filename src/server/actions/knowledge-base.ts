
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
// import { textEmbedding004 } from '@genkit-ai/google-genai'; // Not exported in this version
import { createServerClient } from '@/firebase/server-client';
import { getAdminFirestore } from '@/firebase/admin';
import {
    KnowledgeBase,
    KnowledgeDocument,
    CreateKnowledgeBaseSchema,
    AddDocumentSchema,
    KnowledgeBaseOwnerType
} from '@/types/knowledge-base';
import { requireUser } from '@/server/auth/auth';

/**
 * Text Embedding Model
 * Using Google's text-embedding-004 which is efficient and high quality
 */
const EMBEDDING_MODEL = 'googleai/text-embedding-004';

// --- COSINE SIMILARITY UTILS ---

function cosineSimilarity(vecA: number[], vecB: number[]) {
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

// --- ACTIONS ---

/**
 * Create a new Knowledge Base
 */
export async function createKnowledgeBaseAction(input: z.infer<typeof CreateKnowledgeBaseSchema>) {
    const user = await requireUser();

    // Security check: Only 'owner' role can create 'agent' or 'system' KBs
    if (input.ownerType !== 'brand' && user.role !== 'owner') {
        throw new Error('Unauthorized: Only admins can manage Agent/System Knowledge Bases.');
    }

    // If brand KB, enforce ownerId matches user's brand (unless admin)
    if (input.ownerType === 'brand' && user.role !== 'owner' && input.ownerId !== user.brandId) {
        throw new Error('Unauthorized: Cannot create KB for another brand.');
    }

    const firestore = getAdminFirestore();
    const collection = firestore.collection('knowledge_bases');

    // Check if duplicate name exists for this owner
    const existing = await collection
        .where('ownerId', '==', input.ownerId)
        .where('name', '==', input.name)
        .get();

    if (!existing.empty) {
        return { success: false, message: 'A Knowledge Base with this name already exists.' };
    }

    const newKb: KnowledgeBase = {
        id: '', // Set by doc creation
        ownerId: input.ownerId,
        ownerType: input.ownerType as KnowledgeBaseOwnerType,
        name: input.name,
        description: input.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        documentCount: 0,
        enabled: true
    };

    const docRef = await collection.add(newKb);
    // Update ID
    await docRef.update({ id: docRef.id });

    return { success: true, message: 'Knowledge Base created successfully.', id: docRef.id };
}

/**
 * Get all Knowledge Bases for a specific owner (Brand or Agent)
 */
export async function getKnowledgeBasesAction(ownerId: string) {
    await requireUser();
    const { firestore } = await createServerClient();

    const snapshot = await firestore.collection('knowledge_bases')
        .where('ownerId', '==', ownerId)
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => doc.data() as KnowledgeBase);
}

/**
 * Add a document to a Knowledge Base + Generate Embedding
 */
export async function addDocumentAction(input: z.infer<typeof AddDocumentSchema>) {
    await requireUser();
    const firestore = getAdminFirestore();

    try {
        // 1. Generate Embedding
        // Note: Using ai.embed for Genkit, assumption based on Genkit docs
        // If exact syntax differs, we might need a direct model call
        const response: any = await ai.embed({
            embedder: EMBEDDING_MODEL,
            content: input.content
        });

        // Handle both single object and array return types from Genkit
        // The return type is typically { embedding: number[] } or array of them
        const embedding = Array.isArray(response) ? response[0].embedding : response.embedding;

        // 2. Prepare Document
        const newDoc: Omit<KnowledgeDocument, 'id'> = {
            knowledgeBaseId: input.knowledgeBaseId,
            type: input.type as any,
            title: input.title,
            content: input.content, // TODO: Chunk long content if needed
            sourceUrl: input.sourceUrl,
            embedding: embedding as number[],
            tokenCount: input.content.length / 4, // Rough estimate
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'user' // TODO: Get specific user ID
        };

        // 3. Save to subcollection
        const kbRef = firestore.collection('knowledge_bases').doc(input.knowledgeBaseId);

        // Transaction to increment count safely
        await firestore.runTransaction(async (t) => {
            const kbDoc = await t.get(kbRef);
            if (!kbDoc.exists) throw new Error('Knowledge Base not found');

            const docRef = kbRef.collection('documents').doc();
            t.set(docRef, { ...newDoc, id: docRef.id });

            t.update(kbRef, {
                documentCount: (kbDoc.data()?.documentCount || 0) + 1,
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

            t.delete(docRef);

            const kbDoc = await t.get(kbRef);
            const newCount = Math.max(0, (kbDoc.data()?.documentCount || 1) - 1);

            t.update(kbRef, {
                documentCount: newCount,
                updatedAt: new Date()
            });
        });
        return { success: true, message: 'Document deleted.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Get documents for a Knowledge Base
 */
export async function getDocumentsAction(kbId: string) {
    await requireUser();
    const { firestore } = await createServerClient();

    // Exclude embedding field to save bandwidth
    const snapshot = await firestore.collection('knowledge_bases').doc(kbId).collection('documents')
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const { embedding, ...rest } = data; // Strip embedding
        return rest as KnowledgeDocument;
    });
}

/**
 * Semantic Search via Cosine Similarity (In-Memory for now)
 * NOTE: For large datasets, use Vector Search in Firestore (requires pgvector/extensions) or Pinecone.
 * For <1000 docs per agent, this is plenty fast.
 */
export async function searchKnowledgeBaseAction(kbId: string, query: string, limit: number = 3) {

    if (!query || query.length < 3) return [];

    try {
        // 1. Embed query (using imported model reference)
        const response: any = await ai.embed({
            embedder: EMBEDDING_MODEL,
            content: query
        });
        const queryEmbedding = Array.isArray(response) ? response[0].embedding : response.embedding;

        // 2. Fetch all doc embeddings for this KB
        // OPTIMIZATION: Cache these in memory or Redis if frequent
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('knowledge_bases').doc(kbId).collection('documents').get();

        const docs: { id: string; content: string; similarity: number; title: string }[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.embedding) {
                const similarity = cosineSimilarity(queryEmbedding as unknown as number[], data.embedding);
                if (similarity > 0.6) { // Minimum relevance threshold
                    docs.push({
                        id: doc.id,
                        title: data.title,
                        content: data.content,
                        similarity
                    });
                }
            }
        });

        // 3. Sort by similarity
        docs.sort((a, b) => b.similarity - a.similarity);

        return docs.slice(0, limit);

    } catch (error) {
        console.error('[searchKnowledgeBaseAction] Error:', error);
        return [];
    }
}
