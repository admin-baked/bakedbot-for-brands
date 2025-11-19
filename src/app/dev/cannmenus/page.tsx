
"use client";

import React, { useState } from "react";

type Mode = "brand" | "dispensary";

interface ApiResult {
  source?: string;
  query?: any;
  items?: any[];
  [key: string]: any;
}

type CannMenusItem = {
    id: string;
    name?: string;
    title?: string;
    [key: string]: any;
};
  
type Product = {
    id?: string;
    name?: string;
    title?: string;
    brand?: string;
    brand_name?: string;
    price?: number;
    [key: string]: any;
};

async function runApiFetch(
    mode: Mode,
    search: string
  ): Promise<{ ok: boolean; status: number; data?: ApiResult; error?: string }> {
    const basePath =
      mode === "brand" ? "/api/cannmenus/brands" : "/api/cannmenus/retailers";
  
    const url = new URL(basePath, window.location.origin);
    if (search.trim()) url.searchParams.set("search", search.trim());
  
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  
    const text = await res.text();
    let json: any;
  
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return {
        ok: false,
        status: res.status,
        error: `Non-JSON response from /api route (status ${res.status}). Body starts with: ${text
          .slice(0, 120)
          .replace(/\s+/g, " ")}`,
      };
    }
  
    if (!res.ok || json?.ok === false) {
      return {
        ok: false,
        status: res.status,
        error:
          json?.error || `API route error (status ${res.status})`,
        data: json,
      };
    }
  
    return { ok: true, status: res.status, data: json };
  }

export default function CannMenusDevPage() {
  const [mode, setMode] = useState<Mode>("brand");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [raw, setRaw] = useState<ApiResult | null>(null);
  const [results, setResults] = useState<CannMenusItem[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);


  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);
    setRaw(null);
    setResults([]);
    setProducts([]);

    try {
      const result = await runApiFetch(mode, query);
      setStatus(result.status);
      if (!result.ok) {
        setError(result.error ?? "Unknown upstream error");
        if (result.data) setRaw(result.data);
      } else {
        setRaw(result.data ?? null);
        setResults(result.data?.data?.data || result.data?.data || result.data?.items || []);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!selectedRetailer) return;

    setLoading(true);
    setError(null);
    setProducts([]);

    try {
      const url = new URL('/api/cannmenus/products', window.location.origin);
      url.searchParams.set("retailerId", selectedRetailer);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "100");

      const resp = await fetch(url.toString());
      const json = await resp.json();

      if (!json.ok) {
        throw new Error(json.error || "Products error");
      }

      const items: Product[] = json.data?.data || json.data || [];
      setProducts(items);
    } catch (e: any) {
      setError(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">CannMenus Dev Console</h1>
        <p className="text-sm text-muted-foreground">
          Internal testing page for the API proxies.
        </p>
      </header>

      {/* Search mode */}
      <section className="space-y-2">
        <div className="font-medium">Search mode</div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={mode === "brand"}
              onChange={() => setMode("brand")}
            />
            <span>Brand</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={mode === "retailer"}
              onChange={() => setMode("dispensary")}
            />
            <span>Dispensary</span>
          </label>
        </div>
      </section>

      {/* Search input */}
      <form onSubmit={onSearch} className="flex gap-3 items-center">
        <input
          className="border border-gray-300 rounded px-3 py-2 flex-1 text-sm"
          placeholder={
            mode === "brand"
              ? "Search brands (e.g. 'STIIIZY')…"
              : "Search dispensaries (e.g. 'Chicago')…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-600">
          Error: {error}
        </div>
      )}

      {/* Search results */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Results</h2>
          <span className="text-xs text-muted-foreground">
            {results.length} item{results.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-auto border border-gray-200 rounded p-2">
          {results.map((r) => {
            const label = r.name || r.title || `ID ${r.id}`;
            const isSelected = mode === "retailer" && r.id === selectedRetailer;

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (mode === "retailer") {
                    setSelectedRetailer(r.id);
                  }
                }}
                className={`w-full text-left border rounded px-3 py-2 text-sm ${
                  mode === "retailer"
                    ? isSelected
                      ? "bg-black text-white border-black"
                      : "bg-white hover:bg-gray-50"
                    : "bg-white"
                }`}
              >
                <div className="font-medium truncate">{label}</div>
                <div className="text-xs text-muted-foreground">
                  ID: {r.id}
                </div>
              </button>
            );
          })}

          {!results.length && (
            <div className="text-xs text-muted-foreground">
              No results yet. Run a search.
            </div>
          )}
        </div>
      </section>

      {/* Retailer → Products */}
      {mode === "retailer" && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">
              Load products for selected dispensary
            </div>
            {selectedRetailer && (
              <span className="text-xs text-muted-foreground">
                Retailer ID: {selectedRetailer}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={loadProducts}
            className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
            disabled={!selectedRetailer || loading}
          >
            {loading ? "Loading…" : "Load Products"}
          </button>
        </section>
      )}

      {/* Products */}
      {products.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Products</h2>
            <span className="text-xs text-muted-foreground">
              Showing {Math.min(products.length, 40)} of {products.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[32rem] overflow-auto border border-gray-200 rounded p-2">
            {products.slice(0, 40).map((p, idx) => (
              <div
                key={p.id ?? idx}
                className="border rounded px-3 py-2 text-sm bg-white"
              >
                <div className="font-medium">
                  {p.name || p.title || "Untitled product"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.brand || p.brand_name || ""}
                </div>
                {p.price && (
                  <div className="text-xs mt-1">
                    ${p.price}
                  </div>
                )}
              </div>
            ))}
            {products.length > 40 && (
              <div className="text-xs text-muted-foreground">
                Truncated for display. Data looks good though.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
