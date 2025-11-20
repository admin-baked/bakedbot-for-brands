
// src/app/api/dev/build-cannmenus-embeddings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import {
  ProductDoc,
  BrandDoc,
  RetailerDoc,
  CannmenusEmbeddingDoc,
} from "@/types/cannmenus";

// Reuse your existing embedding util
import { generateEmbedding } from "@/ai/utils/generate-embedding";

// ---- Firebase Admin bootstrap (server-side only) ----

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY env var is not set (needed for admin in build-cannmenus-embeddings)."
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString(
      "utf8"
    )
  );

  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return existing;
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount as any),
  });

  return adminApp!;
}

function getDb() {
  const app = getAdminApp();
  return getFirestore(app);
}

// ---- Helper: build the text we embed for a product ----

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
      if (r.address?.city) addrParts.push(r.address.city);
      if (r.address?.state) addrParts.push(r.address.state);
      return `${r.name}${addrParts.length ? ` (${addrParts.join(", ")})` : ""}`;
    });

    parts.push(
      `Available at retailers: ${retailerSummaries.join("; ")}`
    );
  }

  return parts.join("\n");
}

// ---- Route implementation ----

// POST /api/dev/build-cannmenus-embeddings
export async function POST(_req: NextRequest) {
  try {
    const db = getDb();

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
    brandsSnap.forEach((doc) => {
      brandById.set(doc.id, doc.data() as BrandDoc);
    });

    // Preload retailers into a map
    const retailersSnap = await db.collection("cannmenus_retailers").get();
    const retailerById = new Map<string, RetailerDoc>();
    retailersSnap.forEach((doc) => {
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
        console.error("Embedding error for product", productId, err);
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
    console.error("Error building CannMenus embeddings:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error building CannMenus embeddings",
      },
      { status: 500 }
    );
  }
}
