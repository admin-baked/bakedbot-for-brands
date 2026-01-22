// src/app/api/dev/build-cannmenus-embeddings/route.ts
/**
 * DEV ONLY: Build CannMenus embeddings endpoint
 *
 * SECURITY: Blocked in production and requires Super User authentication.
 */
import { NextRequest, NextResponse } from "next/server";

import {
  ProductDoc,
  BrandDoc,
  RetailerDoc,
  CannmenusEmbeddingDoc,
} from "@/types/cannmenus";
import { generateEmbedding } from "@/ai/utils/generate-embedding";
import { requireUser } from "@/server/auth/auth";
import { createServerClient } from "@/firebase/server-client";
import { logger } from "@/lib/logger";

// Helper to build the text we embed for a product
function buildProductText(
  product: ProductDoc,
  brand: BrandDoc | null,
  retailers: RetailerDoc[]
): string {
  const parts: string[] = [];

  parts.push(`Product name: ${product.name}`);
  parts.push(`Category: ${product.category}`);

  if (product.strainType) {
    parts.push(`Strain type: ${product.strainType}`);
  }
  if (product.thcPercent != null) {
    parts.push(`THC: ${product.thcPercent}%`);
  }
  if (product.cbdPercent != null) {
    parts.push(`CBD: ${product.cbdPercent}%`);
  }
  if (product.size) {
    parts.push(`Size: ${product.size}`);
  }

  if (brand) {
    parts.push(`Brand: ${brand.name}`);
    if (brand.description) {
      parts.push(`Brand description: ${brand.description}`);
    }
    if (brand.markets?.length) {
      parts.push(`Brand markets: ${brand.markets.join(", ")}`);
    }
  }

  if (product.tags?.length) {
    parts.push(`Tags: ${product.tags.join(", ")}`);
  }

  if (retailers.length) {
    const retailerSummaries = retailers.map((r) => {
      const addrParts: string[] = [];
      if (r.city) addrParts.push(r.city);
      if (r.state) addrParts.push(r.state);
      return `${r.name}${addrParts.length ? ` (${addrParts.join(", ")})` : ""}`;
    });

    parts.push(
      `Available at retailers: ${retailerSummaries.join("; ")}`
    );
  }

  return parts.join("\n");
}

// Route implementation
export async function POST(_req: NextRequest) {
  // SECURITY: Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dev route disabled in production' },
      { status: 403 }
    );
  }

  try {
    // SECURITY: Require Super User authentication
    await requireUser(['super_user']);

    const { firestore: db } = await createServerClient();

    const productsSnap = await db.collection("cannmenus_products").get();
    if (productsSnap.empty) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No documents found in cannmenus_products. Seed products first.",
        },
        { status: 400 }
      );
    }

    // Preload brands into a map
    const brandsSnap = await db.collection("cannmenus_brands").get();
    const brandById = new Map<string, BrandDoc>();
    brandsSnap.forEach((doc: any) => {
      brandById.set(doc.id, doc.data() as BrandDoc);
    });

    // Preload retailers into a map
    const retailersSnap = await db.collection("cannmenus_retailers").get();
    const retailerById = new Map<string, RetailerDoc>();
    retailersSnap.forEach((doc: any) => {
      retailerById.set(doc.id, doc.data() as RetailerDoc);
    });

    const now = new Date();
    const embeddingCol = db.collection("cannmenus_embeddings");

    const results: { productId: string; status: "ok" | "skipped" | "error"; reason?: string }[] =
      [];

    // We'll process in small batches to avoid huge writes
    const batchSize = 20;
    let batch = db.batch();
    let batchCount = 0;

    for (const productDoc of productsSnap.docs) {
      const product = productDoc.data() as ProductDoc;
      const productId = productDoc.id;

      const brand =
        product.brand_id && brandById.has(product.brand_id)
          ? brandById.get(product.brand_id)!
          : null;

      const retailers =
        product.retailerIds?.map((rid: string) => retailerById.get(rid)).filter(Boolean as any) ??
        [];

      const text = buildProductText(product, brand, retailers as RetailerDoc[]);

      // Generate embedding via your existing util
      let embedding: number[];
      try {
        embedding = await generateEmbedding(text);
      } catch (err: any) {
        logger.error("[P0-INT-SENTRY] Embedding error for product", {
          productId,
          error: err?.message,
          stack: err?.stack,
        });
        results.push({
          productId,
          status: "error",
          reason: err?.message ?? "Embedding error",
        });
        continue;
      }

      const docId = `product:${productId}`;
      const embeddingDoc: CannmenusEmbeddingDoc = {
        id: docId,
        type: "product",
        refId: productId,
        brandId: product.brand_id,
        retailerIds: product.retailerIds ?? [],
        text,
        embedding,
        tags: product.tags ?? [],
        markets: brand?.markets ?? [],
        createdAt: now,
        updatedAt: now,
      };

      const ref = embeddingCol.doc(docId);
      batch.set(ref, embeddingDoc, { merge: true });
      batchCount += 1;

      results.push({ productId, status: "ok" });

      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    const summary = {
      ok: true,
      totalProducts: productsSnap.size,
      results,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (err: any) {
    logger.error("[P0-INT-SENTRY] Error building CannMenus embeddings", {
      error: err?.message,
      stack: err?.stack,
    });
    const status = err.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error building CannMenus embeddings",
      },
      { status }
    );
  }
}
