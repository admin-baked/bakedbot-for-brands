
"use client";

import { useState } from "react";

export default function CannMenusDevConsole() {
  const [mode, setMode] = useState<"brand" | "retailer">("brand");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    setResults([]);
    setProducts([]);

    const endpoint =
      mode === "brand"
        ? "/api/cannmenus/brands"
        : "/api/cannmenus/retailers";

    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set("search", query);

    const r = await fetch(url.toString());
    const j = await r.json();

    const list = j.data?.data || j.data || [];
    setResults(list);
    setLoading(false);
  };

  const fetchProducts = async () => {
    if (!selectedRetailer) return;

    setLoading(true);
    setProducts([]);

    const url = new URL("/api/cannmenus/products", window.location.origin);
    url.searchParams.set("retailerId", selectedRetailer);
    url.searchParams.set("page", "1");
    url.searchParams.set("limit", "100");

    const r = await fetch(url.toString());
    const j = await r.json();

    const items = j.data?.data || j.data || [];
    setProducts(items);

    setLoading(false);
  };

  return (
    <div className="p-10 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">CannMenus Dev Console</h1>

      {/* Mode */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === "brand"}
            onChange={() => setMode("brand")}
          />
          Brand Search
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === "retailer"}
            onChange={() => setMode("retailer")}
          />
          Dispensary Search
        </label>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          className="border p-2 flex-1"
          placeholder="Search term…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={search}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Search
        </button>
      </div>

      {/* Results */}
      <div>
        <h2 className="font-semibold mb-2">Results</h2>
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.id}
              className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                if (mode === "retailer") {
                  setSelectedRetailer(r.id);
                }
              }}
            >
              <div className="font-medium">{r.name || r.title}</div>
              <div className="text-sm opacity-70">ID: {r.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Retailer select */}
      {mode === "retailer" && (
        <div>
          <h2 className="font-semibold mb-2">Retailer Selected</h2>

          <select
            className="border p-2"
            value={selectedRetailer}
            onChange={(e) => setSelectedRetailer(e.target.value)}
          >
            <option value="">Choose a retailer…</option>
            {results.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.title}
              </option>
            ))}
          </select>

          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-black text-white rounded ml-3"
            disabled={!selectedRetailer}
          >
            Load Products
          </button>
        </div>
      )}

      {/* Products */}
      {products.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Products</h2>

          <div className="space-y-3">
            {products.slice(0, 40).map((p) => (
              <div key={p.id} className="border rounded p-3">
                <div className="font-medium">{p.name || p.title}</div>
                <div className="text-sm opacity-70">
                  {p.brand || p.brand_name}
                </div>
                {p.price && <div>${p.price}</div>}
              </div>
            ))}
            {products.length > 40 && (
              <div className="text-sm opacity-60">
                Showing only first 40…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
