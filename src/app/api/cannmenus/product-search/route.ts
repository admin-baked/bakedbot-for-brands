
// src/app/api/cannmenus/product-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';

// Note: Using GET for simplicity in dev console, but should be POST for production search
export async function GET(req: NextRequest) {
  const base = process.env.CANNMENUS_API_BASE;
  const apiKey = process.env.CANNMENUS_API_KEY;
  const fortyTonsBrandId = process.env.CANNMENUS_40TONS_BRAND_ID;
  const baysideRetailerId = process.env.NEXT_PUBLIC_BAYSIDE_RETAILER_ID;

  if (!base || !apiKey || !fortyTonsBrandId || !baysideRetailerId) {
    return NextResponse.json(
      { error: "CannMenus env vars for demo are missing" },
      { status: 500 }
    );
  }

  const searchParams = req.nextUrl.searchParams;

  // Allow retailer to be overridden, but default to Bayside for the demo
  const retailers =
    searchParams.get("retailers") ?? String(baysideRetailerId);

  const url = new URL("/v2/products", base);
  url.searchParams.set("retailers", retailers);
  url.searchParams.set("brands", fortyTonsBrandId);

  // Forward other optional params
  const limit = searchParams.get("limit");
  const page = searchParams.get("page");
  if (limit) url.searchParams.set("limit", limit);
  if (page) url.searchParams.set("page", page);

  // Build cache key from query params
  const cacheKey = `${retailers}:${fortyTonsBrandId}:${limit || 'default'}:${page || '1'}`;

  // Cache external API calls (5 min TTL) - reduces latency and external API costs
  const result = await withCache(
    CachePrefix.PRODUCTS,
    `cannmenus:${cacheKey}`,
    async () => {
      const resp = await fetch(url.toString(), {
        headers: {
          "Accept": "application/json",
          "User-Agent": "BakedBot/1.0",
          "X-Token": apiKey.trim().replace(/^['"']|['"']$/g, ""),
        },
      });

      const data = await resp.json();

      return {
        source: "next-api:cannmenus:product-search (live)",
        status: resp.status,
        data: data.data || data,
      };
    },
    CacheTTL.PRODUCTS
  );

  return NextResponse.json(result, { status: result.status });
}

