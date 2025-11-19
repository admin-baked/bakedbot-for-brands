
"use client";

import React, { useState } from "react";

// IMPORTANT: this should be your Cloud Functions base
const CANNMENUS_PROXY_BASE =
  "https://us-central1-studio-567050101-bc6e8.cloudfunctions.net";

type Mode = "brand" | "retailer";

interface ApiResult {
  source?: string;
  query?: any;
  items?: any[];
  [key: string]: any;
}

async function runProxyFetch(
  mode: Mode,
  search: string
): Promise<{ ok: boolean; status: number; data?: ApiResult; error?: string }> {
  const endpoint =
    mode === "brand"
      ? `${CANNMENUS_PROXY_BASE}/brands`
      : `${CANNMENUS_PROXY_BASE}/retailers`;

  const url = new URL(endpoint);
  if (search.trim()) url.searchParams.set("search", search.trim());

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      error: `Upstream non-JSON response (status ${res.status}). Body starts with: ${text.slice(
        0,
        120
      )}`,
    };
  }

  const json = (await res.json()) as ApiResult;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        json && (json as any).error
          ? String((json as any).error)
          : `Upstream error (status ${res.status})`,
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

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);
    setRaw(null);

    try {
      const result = await runProxyFetch(mode, query);
      setStatus(result.status);
      if (!result.ok) {
        setError(result.error ?? "Unknown upstream error");
        if (result.data) setRaw(result.data);
      } else {
        setRaw(result.data ?? null);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const items = raw?.items ?? [];

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">CannMenus Dev Console</h1>
      <p className="text-sm text-gray-600 mb-6">
        Internal testing page for the API proxies defined in{" "}
        <code>apphosting.yaml</code>. Currently calling{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">
          {CANNMENUS_PROXY_BASE}
        </code>
        .
      </p>

      {/* Search mode */}
      <div className="mb-4 flex items-center gap-6">
        <div className="font-medium">Search mode</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="brand"
            checked={mode === "brand"}
            onChange={() => setMode("brand")}
          />
          Brand
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="dispensary"
            checked={mode === "dispensary"}
            onChange={() => setMode("dispensary")}
          />
          Dispensary
        </label>
      </div>

      {/* Search form */}
      <form onSubmit={onSearch} className="flex gap-3 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="e.g. 'STIIIZY'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Status + error */}
      {status !== null && (
        <p className="text-xs text-gray-500 mb-2">
          Upstream status: <code>{status}</code>
        </p>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Results</h2>
        <p className="text-xs text-gray-500 mb-3">
          {items.length} item{items.length === 1 ? "" : "s"}.
        </p>

        <pre className="w-full min-h-[120px] text-xs bg-gray-50 border rounded p-3 overflow-auto">
{JSON.stringify(raw, null, 2) || "No results yet. Run a search."}
        </pre>
      </section>
    </div>
  );
}
