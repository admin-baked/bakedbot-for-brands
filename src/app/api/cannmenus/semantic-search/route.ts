
// src/app/api/cannmenus/semantic-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { CannmenusEmbeddingDoc } from "@/types/cannmenus";
import { generateEmbedding } from "@/ai/utils/generate-embedding";

// Reuse the same admin helper you used in your other dev routes
import { createServerClient } from "@/firebase/server-client";


import { logger } from '@/lib/logger';
// Simple cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

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

    const { firestore: db } = await createServerClient();

    // 1) Embed the query
    const queryEmbedding = await generateEmbedding(queryText);

    // 2) Load embeddings from Firestore
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
