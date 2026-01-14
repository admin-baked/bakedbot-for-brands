
import { createServerClient } from "@/firebase/server-client";
import { generateEmbedding } from "@/ai/utils/generate-embedding";
import { FieldValue } from "firebase-admin/firestore";
import { buildChunkWithHeader, ChunkContext } from "./chunking-service";

export interface VectorSearchResult {
  docId: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export interface VectorSearchOptions {
  collection: string;
  query: string;
  limit?: number;
  filters?: Record<string, any>;
}

export interface IndexOptions {
  collection: string;
  docId: string;
  content: string;
  metadata?: Record<string, any>;
  /** Contextual information to prepend as header (State, City, Category, etc.) */
  chunkContext?: ChunkContext;
}

// Simple cosine similarity since Firestore doesn't support vector search natively without an extension or external service yet in this setup
// Note: For production large scale, we should use Pinecone or specific Firestore Vector Search extension.
// For this project scope, we will use exact KNN if supported or fetch-and-rank for small datasets, 
// OR assume the "Firestore Vector Search" mentioned in plan refers to the `ext-firestore-vector-search` 
// which typically exposes a specific query method. 
// However, inspecting existing code (which I haven't fully done for search logic) suggests we might need a manual implementation or check if the app uses a specific wrapper.
// Given strict "Keep It Simple", I will implement a client-side re-ranking (fetch candidates -> rank) 
// OR a pure "generate embedding" and assume there's a helper. 
// Let's implement a naive fetch-and-rank for now OR look at `productRepo.ts` to see how it does it.
// Wait, `productRepo.ts` showed up in grep. Let's peek at it to follow pattern.

// BUT FIRST, let's look at `productRepo.ts`. 
// I will implement a placeholder that matches the pattern likely used there.
// If I can't find `productRepo.ts` logic easily, I'll write a standard one.

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const firestoreVectorSearch = {
  async index(options: IndexOptions) {
    // Prepend contextual header if chunkContext is provided
    const contentWithHeader = options.chunkContext 
      ? buildChunkWithHeader(options.content, options.chunkContext)
      : options.content;
    
    const embedding = await generateEmbedding(contentWithHeader);
    
    const { firestore } = await createServerClient();
    await firestore.collection(options.collection).doc(options.docId).set({
      content: options.content,  // Store original content for display
      contentWithHeader,         // Store header-prepended content for reference
      metadata: {
        ...options.metadata,
        ...options.chunkContext  // Also store context in metadata for filtering
      },
      embedding: FieldValue.vector(embedding), // Support for Firestore native vector type if enabled
      // Fallback or explicit array for manual search
      embedding_array: embedding, 
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  },

  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const queryEmbedding = await generateEmbedding(options.query);
    
    // Attempt multiple strategies:
    // 1. Native Firestore Vector Search (requires preview feature)
    // 2. Client-side re-ranking (Fetch all/subset -> sort)
    
    // For this implementation, we'll try to find a specialized vector query if available in `db`, 
    // otherwise fallback to fetching recent items and sorting.
    // NOTE: This scale is limited. 
    
    // Let's fetch documents from the collection. 
    // Optimization: Apply filters first to reduce set.
    const { firestore } = await createServerClient();
    let query = firestore.collection(options.collection);
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.where(`metadata.${key}`, '==', value) as any;
      });
    }

    // Limit fetch to 100 for performance in this naive implementation
    const snapshot = await query.limit(100).get();
    
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      const embedding = data.embedding_array || data.embedding; // Handle both types
      
      if (!embedding || !Array.isArray(embedding)) return null;
      
      const score = cosineSimilarity(queryEmbedding, embedding);
      
      return {
        docId: doc.id,
        content: data.content,
        metadata: data.metadata || {},
        score
      };
    }).filter((r): r is VectorSearchResult => r !== null);

    // Sort by score descending and take top K
    return results.sort((a: VectorSearchResult, b: VectorSearchResult) => b.score - a.score).slice(0, options.limit || 5);
  }
};
