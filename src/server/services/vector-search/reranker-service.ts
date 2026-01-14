/**
 * Reranker Service - Vertex AI Ranking API Integration
 * 
 * Reranks vector search results using Vertex AI's semantic ranking model.
 * Dramatically improves retrieval quality by using cross-encoder scoring.
 * 
 * @see https://cloud.google.com/generative-ai-app-builder/docs/ranking-api
 */

import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERTEX_PROJECT = process.env.VERTEX_AI_PROJECT || process.env.GCLOUD_PROJECT || '';
const VERTEX_LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';
const RANKING_API_ENDPOINT = `https://discoveryengine.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/rankingConfigs/default_ranking_config:rank`;

// Feature flag for gradual rollout
const ENABLE_RERANKER = process.env.ENABLE_RERANKER === 'true';

// ============================================================================
// TYPES
// ============================================================================

export interface RerankerDocument {
    id: string;
    content: string;
    score?: number; // Original vector similarity score
}

export interface RankedDocument {
    id: string;
    content: string;
    originalScore: number;
    rerankedScore: number;
    rank: number;
}

export interface RerankerOptions {
    query: string;
    documents: RerankerDocument[];
    topK?: number; // Default: 5
    model?: string; // Default: 'semantic-ranker-512@latest'
}

interface VertexRankingRequest {
    query: string;
    records: { id: string; content: string }[];
    topN?: number;
    model?: string;
}

interface VertexRankingResponse {
    records: {
        id: string;
        score: number;
    }[];
}

// ============================================================================
// RERANKER SERVICE
// ============================================================================

class RerankerService {
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    /**
     * Check if reranker is available and enabled
     */
    isAvailable(): boolean {
        return ENABLE_RERANKER && !!VERTEX_PROJECT;
    }

    /**
     * Rerank documents using Vertex AI Ranking API
     */
    async rerank(options: RerankerOptions): Promise<RankedDocument[]> {
        const { query, documents, topK = 5 } = options;

        // If reranker is disabled or unavailable, return original order
        if (!this.isAvailable()) {
            logger.info('[Reranker] Disabled or not configured, returning original order');
            return documents.slice(0, topK).map((doc, i) => ({
                id: doc.id,
                content: doc.content,
                originalScore: doc.score || 0,
                rerankedScore: doc.score || 0,
                rank: i + 1
            }));
        }

        if (documents.length === 0) {
            return [];
        }

        // If we have fewer documents than topK, no need to rerank
        if (documents.length <= topK) {
            return documents.map((doc, i) => ({
                id: doc.id,
                content: doc.content,
                originalScore: doc.score || 0,
                rerankedScore: doc.score || 0,
                rank: i + 1
            }));
        }

        try {
            const token = await this.getAccessToken();
            
            const request: VertexRankingRequest = {
                query,
                records: documents.map(d => ({
                    id: d.id,
                    content: d.content
                })),
                topN: topK
            };

            logger.info('[Reranker] Calling Vertex AI Ranking API', {
                documentCount: documents.length,
                topK
            });

            const response = await fetch(RANKING_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Vertex AI Ranking API error: ${response.status} - ${errorText}`);
            }

            const data: VertexRankingResponse = await response.json();

            // Map response back to full documents
            const docMap = new Map(documents.map(d => [d.id, d]));
            
            const ranked: RankedDocument[] = data.records.map((r, i) => {
                const originalDoc = docMap.get(r.id)!;
                return {
                    id: r.id,
                    content: originalDoc.content,
                    originalScore: originalDoc.score || 0,
                    rerankedScore: r.score,
                    rank: i + 1
                };
            });

            logger.info('[Reranker] Successfully reranked documents', {
                inputCount: documents.length,
                outputCount: ranked.length
            });

            return ranked;

        } catch (error) {
            logger.error('[Reranker] Failed to rerank, falling back to original order', { error });
            
            // Graceful degradation: return original order
            return documents.slice(0, topK).map((doc, i) => ({
                id: doc.id,
                content: doc.content,
                originalScore: doc.score || 0,
                rerankedScore: doc.score || 0,
                rank: i + 1
            }));
        }
    }

    /**
     * Get Google Cloud access token (auto-refreshes)
     */
    private async getAccessToken(): Promise<string> {
        // Check if we have a valid cached token
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            // Use Application Default Credentials
            const { GoogleAuth } = await import('google-auth-library');
            const auth = new GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            
            this.accessToken = tokenResponse.token || '';
            // Refresh 5 minutes before expiry
            this.tokenExpiry = Date.now() + (55 * 60 * 1000);
            
            return this.accessToken;
        } catch (error) {
            logger.error('[Reranker] Failed to get access token', { error });
            throw error;
        }
    }
}

// ============================================================================
// SIMPLE FALLBACK RERANKER (No external API)
// ============================================================================

/**
 * Simple keyword-based reranker for when Vertex AI is unavailable.
 * Uses TF-IDF-like scoring boost for exact query term matches.
 */
export function simpleRerank(
    query: string,
    documents: RerankerDocument[],
    topK: number = 5
): RankedDocument[] {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const scored = documents.map(doc => {
        const content = doc.content.toLowerCase();
        let matchBoost = 0;
        
        for (const term of queryTerms) {
            if (content.includes(term)) {
                matchBoost += 0.1;
            }
        }
        
        // Boost exact phrase match
        if (content.includes(query.toLowerCase())) {
            matchBoost += 0.3;
        }
        
        return {
            ...doc,
            adjustedScore: (doc.score || 0) + matchBoost
        };
    });
    
    // Sort by adjusted score
    scored.sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    return scored.slice(0, topK).map((doc, i) => ({
        id: doc.id,
        content: doc.content,
        originalScore: doc.score || 0,
        rerankedScore: doc.adjustedScore,
        rank: i + 1
    }));
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const rerankerService = new RerankerService();
