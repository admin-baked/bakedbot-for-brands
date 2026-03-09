import { lancedbStore, searchProducts, searchInsights } from '@/server/services/ezal/lancedb-store';

export type RetrievalIntent =
    | 'answer_question'
    | 'find_entity'
    | 'compare'
    | 'summarize'
    | 'diagnose'
    | 'recommend'
    | 'plan'
    | 'audit';

export type RetrievalDomain =
    | 'catalog'
    | 'knowledge'
    | 'operations'
    | 'analytics'
    | 'customers'
    | 'compliance'
    | 'cultivation'
    | 'marketing'
    | 'all';

export type RetrievalStrategy = 'fts' | 'vector' | 'hybrid' | 'multivector';

export interface RetrieveContextInput {
    query: string;
    intent: RetrievalIntent;
    domain: RetrievalDomain;
    tenant_scope: {
        org_ids: string[];
        role_scope: 'super_user' | 'dispensary' | 'brand' | 'grower';
        visibility: 'tenant_only' | 'cross_tenant_allowed';
    };
    filters?: {
        store_ids?: string[];
        brand_ids?: string[];
        facility_ids?: string[];
        product_types?: string[];
        statuses?: string[];
        source_systems?: string[];
        tags?: string[];
        time_range?: { start?: string; end?: string };
        geography?: string[];
    };
    response_shape?: 'brief' | 'standard' | 'evidence_pack';
    top_k?: number;
}

export interface RetrieveContextOutput {
    strategy_used: RetrievalStrategy;
    reranker_used?: string;
    result_count: number;
    results: Array<{
        id: string;
        entity_type: string;
        title: string;
        snippet: string;
        source: string;
        score?: number;
        why_matched?: string;
        metadata: Record<string, unknown>;
    }>;
}

export interface HydrateRecordsInput {
    ids: string[];
    fields?: string[];
    max_records?: number;
}

export interface HydrateRecordsOutput {
    records: Array<Record<string, unknown>>;
}

const JINA_RERANK_MODEL = process.env.JINA_RERANK_MODEL ?? 'jina-reranker-v2-base-multilingual';

type RerankCandidate = RetrieveContextOutput['results'][number];

function shouldUseJinaRerank(strategy: RetrievalStrategy, resultCount: number): boolean {
    return (
        process.env.RETRIEVAL_RERANK_PROVIDER === 'jina'
        && !!process.env.JINA_API_KEY
        && resultCount > 1
        && strategy !== 'fts'
    );
}

async function rerankWithJina(query: string, results: RerankCandidate[]): Promise<RerankCandidate[]> {
    const apiKey = process.env.JINA_API_KEY;
    if (!apiKey || results.length < 2) {
        return results;
    }

    try {
        const documents = results.map((result) => `${result.title}\n${result.snippet}`);
        const response = await fetch('https://api.jina.ai/v1/rerank', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: JINA_RERANK_MODEL,
                query,
                documents,
                top_n: results.length,
                return_documents: false,
            }),
        });

        if (!response.ok) {
            return results;
        }

        const payload = await response.json() as {
            results?: Array<{ index: number; relevance_score?: number }>;
        };

        if (!payload.results || payload.results.length === 0) {
            return results;
        }

        return payload.results
            .map((item) => {
                const candidate = results[item.index];
                if (!candidate) {
                    return null;
                }
                return {
                    ...candidate,
                    score: item.relevance_score ?? candidate.score,
                };
            })
            .filter((item): item is RerankCandidate => item !== null);
    } catch {
        return results;
    }
}

function selectStrategy(input: RetrieveContextInput): RetrievalStrategy {
    const q = input.query.toLowerCase();
    const hasExactAnchor = /\b(sku|batch|id|promo|code|store|sop|run)\b/.test(q);
    const hasConceptWords = /\b(why|recommend|best|compare|strategy|diagnose|plan|improve)\b/.test(q);
    const hasFilters = !!(input.filters && Object.keys(input.filters).length > 0);

    if (input.domain === 'catalog' && hasConceptWords) {
        return 'multivector';
    }
    if (hasExactAnchor && hasFilters) {
        return 'fts';
    }
    if (hasExactAnchor && hasConceptWords) {
        return 'hybrid';
    }
    if (hasConceptWords) {
        return 'vector';
    }
    return 'hybrid';
}

/**
 * Retrieval-plane facade for agents.
 * This intentionally exposes one retrieval contract and one hydration contract,
 * while keeping search strategy selection server-side.
 */
export async function retrieveContext(input: RetrieveContextInput): Promise<RetrieveContextOutput> {
    const strategy = selectStrategy(input);
    const tenantId = input.tenant_scope.org_ids[0];
    if (!tenantId) {
        return { strategy_used: strategy, result_count: 0, results: [] };
    }

    const limit = Math.max(1, Math.min(input.top_k ?? 12, 30));

    if (input.domain === 'analytics' || input.domain === 'operations') {
        const insights = await searchInsights(tenantId, input.query, { limit });
        const rawResults: RetrieveContextOutput['results'] = insights.map((insight) => ({
            id: insight.id,
            entity_type: 'insight',
            title: `${insight.type} · ${insight.brandName}`,
            snippet: insight.summary,
            source: `lancedb:${tenantId}:insights`,
            score: insight.score,
            why_matched: `Matched ${input.domain} context for ${input.intent}`,
            metadata: {
                severity: insight.severity,
                competitorId: insight.competitorId,
                createdAt: insight.createdAt,
                deltaPercentage: insight.deltaPercentage,
            },
        }));

        const results = shouldUseJinaRerank(strategy, rawResults.length)
            ? await rerankWithJina(input.query, rawResults)
            : rawResults;

        return {
            strategy_used: strategy,
            reranker_used: shouldUseJinaRerank(strategy, rawResults.length) ? JINA_RERANK_MODEL : strategy === 'hybrid' ? 'rrf' : undefined,
            result_count: results.length,
            results,
        };
    }

    const products = await searchProducts(tenantId, input.query, {
        category: input.filters?.product_types?.[0],
        inStockOnly: input.filters?.statuses?.includes('in_stock'),
        limit,
    });

    const rawResults: RetrieveContextOutput['results'] = products.map((product) => ({
        id: product.id,
        entity_type: 'product',
        title: `${product.brandName} ${product.productName}`,
        snippet: `${product.category} · $${product.priceCurrent.toFixed(2)} · ${product.inStock ? 'In stock' : 'Out of stock'}`,
        source: `lancedb:${tenantId}:competitive_products`,
        score: product.score,
        why_matched: `Matched ${input.domain} context for ${input.intent}`,
        metadata: {
            competitorId: product.competitorId,
            category: product.category,
            inStock: product.inStock,
        },
    }));

    const results = shouldUseJinaRerank(strategy, rawResults.length)
        ? await rerankWithJina(input.query, rawResults)
        : rawResults;

    return {
        strategy_used: strategy,
        reranker_used: shouldUseJinaRerank(strategy, rawResults.length) ? JINA_RERANK_MODEL : strategy === 'hybrid' ? 'rrf' : undefined,
        result_count: results.length,
        results,
    };
}

export async function hydrateRecords(input: HydrateRecordsInput, tenantId: string): Promise<HydrateRecordsOutput> {
    const ids = Array.from(new Set(input.ids)).slice(0, input.max_records ?? 50);
    if (ids.length === 0) {
        return { records: [] };
    }

    const records = await lancedbStore.getProductsByIds(tenantId, ids);

    if (!input.fields || input.fields.length === 0) {
        return { records };
    }

    const allowed = new Set(input.fields);
    return {
        records: records.map((record) => {
            const filtered: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(record)) {
                if (allowed.has(key)) {
                    filtered[key] = value;
                }
            }
            return filtered;
        }),
    };
}
