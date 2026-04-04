
// src/app/api/cannmenus/semantic-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { CannmenusEmbeddingDoc } from "@/types/cannmenus";
import { generateEmbedding } from "@/ai/utils/generate-embedding";

// Reuse the same admin helper you used in your other dev routes
import { createServerClient } from "@/firebase/server-client";

import { logger } from '@/lib/logger';
import { getCached, setCached, CachePrefix, CacheTTL } from '@/lib/cache';
import { isVectorAvailable, vectorSearch } from '@/lib/vector';
import { cosineSimilarity } from '@/lib/math/cosine-similarity';

// Force dynamic rendering - prevents build-time evaluation of Genkit imports
export const dynamic = 'force-dynamic';

// POST /api/cannmenus/semantic-search
// Body: { query: string, topK?: number, brandId?: string, markets?: string[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'query' in request body." },
        { status: 400 }
      );
    }

    const queryText: string = body.query.trim();
    const topK: number = Math.min(
      Math.max(Number(body.topK) || 8, 1),
      50 // Hard cap so we don't go wild
    );
    const brandIdFilter: string | undefined =
      typeof body.brandId === "string" && body.brandId.trim()
        ? body.brandId.trim()
        : undefined;
    const marketsFilter: string[] | undefined = Array.isArray(body.markets)
      ? body.markets.filter((m: unknown) => typeof m === "string" && m.trim())
      : undefined;

    // Build cache key from query + filters
    const cacheKey = `${queryText.substring(0, 60).replace(/[^a-zA-Z0-9]/g, '_')}:${topK}:${brandIdFilter || ''}:${(marketsFilter || []).join(',')}`;

    // Check Redis cache first
    const cachedResult = await getCached<{ items: unknown[]; totalCandidates: number }>(CachePrefix.SEMANTIC_SEARCH, cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        ok: true,
        query: queryText,
        topK,
        totalCandidates: cachedResult.totalCandidates,
        items: cachedResult.items,
        cached: true,
      }, { status: 200 });
    }

    // 1) Embed the query
    const queryEmbedding = await generateEmbedding(queryText);

    // 2a) Try Upstash Vector first (sub-millisecond native similarity search)
    if (isVectorAvailable()) {
      try {
        // Build metadata filter for Upstash Vector
        // Build metadata filter — sanitize brandId to prevent filter injection
        const filterParts: string[] = [];
        if (brandIdFilter && /^[a-zA-Z0-9_-]+$/.test(brandIdFilter)) {
          filterParts.push(`brandId = '${brandIdFilter}'`);
        }
        const filter = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

        const vectorResults = await vectorSearch({
          namespace: 'cannmenus',
          vector: queryEmbedding,
          topK,
          includeMetadata: true,
          filter,
        });

        if (vectorResults.length > 0) {
          const items = vectorResults.map(r => ({
            docId: r.id,
            refId: (r.metadata?.refId as string) ?? r.id,
            type: (r.metadata?.type as string) ?? 'unknown',
            score: r.score,
            brandId: r.metadata?.brandId as string | undefined,
            retailerIds: (r.metadata?.retailerIds as string[]) ?? [],
            markets: (r.metadata?.markets as string[]) ?? [],
            tags: (r.metadata?.tags as string[]) ?? [],
            textPreview: ((r.content ?? r.metadata?._content ?? '') as string).slice(0, 280),
          }));

          // Apply markets filter client-side (Upstash CONTAINS may not match arrays)
          const filtered = marketsFilter?.length
            ? items.filter(item => item.markets.some(m => marketsFilter.includes(m)))
            : items;

          setCached(CachePrefix.SEMANTIC_SEARCH, cacheKey, { items: filtered, totalCandidates: filtered.length }, CacheTTL.SEMANTIC_SEARCH).catch(() => {});

          return NextResponse.json({
            ok: true,
            query: queryText,
            topK,
            totalCandidates: filtered.length,
            items: filtered,
            engine: 'upstash-vector',
          }, { status: 200 });
        }
        // Empty — namespace not populated yet, fall through to Firestore
      } catch (vectorErr) {
        logger.warn('[semantic-search] Upstash Vector failed, falling back to Firestore', {
          error: vectorErr instanceof Error ? vectorErr.message : String(vectorErr),
        });
      }
    }

    // 2b) Fallback: Load ALL embeddings from Firestore (original approach)
    const { firestore: db } = await createServerClient();
    const snap = await db.collection("cannmenus_embeddings").get();
    if (snap.empty) {
      return NextResponse.json(
        {
          error:
            "No documents found in cannmenus_embeddings. Run the embedding builder first.",
        },
        { status: 400 }
      );
    }

    const scored: {
      docId: string;
      refId: string;
      type: string;
      score: number;
      brandId?: string;
      retailerIds?: string[];
      markets?: string[];
      tags?: string[];
      textPreview?: string;
    }[] = [];

    snap.forEach((doc: any) => {
      const data = doc.data() as CannmenusEmbeddingDoc;

      // Optional filters
      if (brandIdFilter && data.brandId !== brandIdFilter) {
        return;
      }
      if (marketsFilter && marketsFilter.length) {
        const markets = data.markets ?? [];
        const intersects = markets.some((m) => marketsFilter.includes(m));
        if (!intersects) return;
      }

      const emb = data.embedding;
      if (!Array.isArray(emb) || !emb.length) return;

      const score = cosineSimilarity(queryEmbedding, emb);

      scored.push({
        docId: doc.id,
        refId: data.refId,
        type: data.type,
        score,
        brandId: data.brandId,
        retailerIds: data.retailerIds ?? [],
        markets: data.markets ?? [],
        tags: data.tags ?? [],
        textPreview: data.text.slice(0, 280),
      });
    });

    // 3) Sort by similarity and take topK
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK);

    // Cache the results (5 min TTL)
    setCached(CachePrefix.SEMANTIC_SEARCH, cacheKey, { items: top, totalCandidates: scored.length }, CacheTTL.SEMANTIC_SEARCH).catch(() => {});

    return NextResponse.json(
      {
        ok: true,
        query: queryText,
        topK,
        totalCandidates: scored.length,
        items: top,
      },
      { status: 200 }
    );
  } catch (err: any) {
    logger.error("Error in semantic-search:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error in semantic search",
      },
      { status: 500 }
    );
  }
}
