
// src/app/api/cannmenus/product-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";

import {
  BrandDoc,
  ProductDoc,
  RetailerDoc,
  CannmenusEmbeddingDoc,
} from "@/types/cannmenus";
import { generateEmbedding } from "@/ai/utils/generate-embedding";
import { createServerClient } from "@/firebase/server-client";

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

// POST /api/cannmenus/product-search
// Body:
// {
//   "query": "strong infused pre-roll in Chicago",
//   "topK": 5,
//   "brandId": "jeeter-demo",   // optional
//   "markets": ["IL"],          // optional
//   "maxRetailersPerProduct": 3 // optional
// }
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
      50 // safety cap
    );
    const brandIdFilter: string | undefined =
      typeof body.brandId === "string" && body.brandId.trim()
        ? body.brandId.trim()
        : undefined;
    const marketsFilter: string[] | undefined = Array.isArray(body.markets)
      ? body.markets.filter((m: unknown) => typeof m === "string" && m.trim())
      : undefined;
    const maxRetailersPerProduct: number = Math.min(
      Math.max(Number(body.maxRetailersPerProduct) || 3, 0),
      10
    );

    const { firestore: db } = await createServerClient();

    // 1) Embed the user query
    const queryEmbedding = await generateEmbedding(queryText);

    // 2) Load embeddings
    const embeddingsSnap = await db.collection("cannmenus_embeddings").get();
    if (embeddingsSnap.empty) {
      return NextResponse.json(
        {
          error:
            "No documents in cannmenus_embeddings. Run the embedding builder first.",
        },
        { status: 400 }
      );
    }

    type Scored = {
      docId: string;
      refId: string; // productId
      type: string;
      score: number;
      brandId?: string;
      retailerIds: string[];
      markets: string[];
      tags: string[];
      textPreview: string;
    };

    const scored: Scored[] = [];

    embeddingsSnap.forEach((doc) => {
      const data = doc.data() as CannmenusEmbeddingDoc;

      if (data.type !== "product") return;

      // Optional filters
      if (brandIdFilter && data.brandId !== brandIdFilter) return;

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

    if (!scored.length) {
      return NextResponse.json(
        {
          ok: true,
          query: queryText,
          topK,
          totalCandidates: 0,
          items: [],
        },
        { status: 200 }
      );
    }

    // 3) Sort and take topK product-level matches
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK);

    const productIds = Array.from(new Set(top.map((s) => s.refId)));

    // 4) Load product docs in one go
    const productCol = db.collection("cannmenus_products");
    const productDocs = await Promise.all(
      productIds.map((pid) => productCol.doc(pid).get())
    );

    const productById = new Map<string, ProductDoc>();
    productDocs.forEach((snap) => {
      if (!snap.exists) return;
      productById.set(snap.id, snap.data() as ProductDoc);
    });

    // 5) Load all brands referenced
    const brandIds = Array.from(
      new Set(
        top
          .map((s) => s.brandId)
          .filter((bId): bId is string => typeof bId === "string")
      )
    );

    const brandById = new Map<string, BrandDoc>();
    if (brandIds.length) {
      const brandCol = db.collection("cannmenus_brands");
      const brandDocs = await Promise.all(
        brandIds.map((bid) => brandCol.doc(bid).get())
      );
      brandDocs.forEach((snap) => {
        if (!snap.exists) return;
        brandById.set(snap.id, snap.data() as BrandDoc);
      });
    }

    // 6) Load all retailers referenced
    const retailerIds = Array.from(
      new Set(top.flatMap((s) => s.retailerIds))
    );

    const retailerById = new Map<string, RetailerDoc>();
    if (retailerIds.length) {
      const retailerCol = db.collection("cannmenus_retailers");
      const retailerDocs = await Promise.all(
        retailerIds.map((rid) => retailerCol.doc(rid).get())
      );
      retailerDocs.forEach((snap) => {
        if (!snap.exists) return;
        retailerById.set(snap.id, snap.data() as RetailerDoc);
      });
    }

    // 7) Build hydrated results
    const items = top
      .map((s) => {
        const product = productById.get(s.refId);
        if (!product) return null;

        const brand = product.brand_id
          ? brandById.get(product.brand_id) ?? null
          : null;

        const retailersFull =
          product.retailerIds
            ?.map((rid: string) => retailerById.get(rid))
            .filter(Boolean as any) ?? [];

        const retailersLimited =
          maxRetailersPerProduct > 0
            ? retailersFull.slice(0, maxRetailersPerProduct)
            : retailersFull;

        return {
          score: s.score,
          productId: s.refId,
          product,
          brand,
          retailers: retailersLimited,
          tags: s.tags,
          markets: s.markets,
          textPreview: s.textPreview,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        ok: true,
        query: queryText,
        topK,
        totalCandidates: scored.length,
        items,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in cannmenus/product-search:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error in cannmenus/product-search",
      },
      { status: 500 }
    );
  }
}
