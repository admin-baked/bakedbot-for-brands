"use client";

import { useState } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type Mode = "brand" | "retailer";

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

async function runApiFetch(endpoint: string, params: Record<string, string>) {
    const url = new URL(endpoint, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "Accept": "application/json",
        },
    });

    const text = await res.text();
    let json: any;
    try {
        json = JSON.parse(text);
    } catch (e) {
        throw new Error(
        `Unexpected non-JSON response (status ${res.status}). Body starts with: ${text
            .slice(0, 150)
            .replace(/\s+/g, " ")}`
        );
    }

    if (!res.ok || json.ok === false) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
    }
    
    return json.data?.data || json.data || [];
}


export default function CannMenusDevConsole() {
  const [mode, setMode] = useState<Mode>("brand");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CannMenusItem[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setProducts([]);
    setSelectedRetailer("");

    try {
      const endpoint = mode === "brand" ? "/api/cannmenus/brands" : "/api/cannmenus/retailers";
      const data = await runApiFetch(endpoint, { search: query.trim() });
      setResults(data);
    } catch (e: any) {
      setError(e.message || "Search failed");
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
      const data = await runApiFetch('/api/cannmenus/products', {
        retailerId: selectedRetailer,
        page: '1',
        limit: '100',
      });
      setProducts(data);
    } catch (e: any) {
      setError(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
            <CardTitle>CannMenus Dev Console</CardTitle>
            <CardDescription>
                Internal testing page for the API proxies defined in <code className="p-1 bg-muted rounded-sm text-xs">apphosting.yaml</code>. Requests are sent to <code className="p-1 bg-muted rounded-sm text-xs">/api/cannmenus/*</code>.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Mode selector */}
            <section className="space-y-2">
                <div className="font-medium">Search mode</div>
                <div className="flex gap-4">
                <Label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Input
                    type="radio"
                    name="mode"
                    checked={mode === "brand"}
                    onChange={() => setMode("brand")}
                    />
                    <span>Brand</span>
                </Label>
                <Label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Input
                    type="radio"
                    name="mode"
                    checked={mode === "retailer"}
                    onChange={() => setMode("retailer")}
                    />
                    <span>Dispensary</span>
                </Label>
                </div>
            </section>

            {/* Search input */}
            <section className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="search-input">Search Query</Label>
                    <Input
                    id="search-input"
                    placeholder={
                        mode === "brand"
                        ? "e.g. 'STIIIZY'"
                        : "e.g. 'Chicago'"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <Button
                onClick={search}
                disabled={loading}
                >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search
                </Button>
            </section>

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/50 p-3 rounded-md">
                <strong>Error:</strong> {error}
                </div>
            )}
        </CardContent>
      </Card>


      {/* Search results */}
      <Card>
        <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>{results.length} item{results.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2 max-h-72 overflow-auto border rounded p-2">
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
                    className={`w-full text-left border rounded px-3 py-2 text-sm transition-colors ${
                    mode === "retailer"
                        ? isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted"
                        : "bg-card"
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
                <div className="text-xs text-muted-foreground p-4 text-center">
                No results yet. Run a search.
                </div>
            )}
            </div>
        </CardContent>
      </Card>
      

      {/* Retailer → Products */}
      {mode === "retailer" && (
        <Card>
            <CardHeader>
                <CardTitle>Load Products</CardTitle>
                <CardDescription>Select a dispensary from the results above, then load its product menu.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    type="button"
                    onClick={loadProducts}
                    disabled={!selectedRetailer || loading}
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load Products for {selectedRetailer || "..."}
                </Button>
            </CardContent>
        </Card>
      )}

      {/* Products */}
      {products.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>Showing {Math.min(products.length, 40)} of {products.length} products.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[32rem] overflow-auto border rounded p-2">
                    {products.slice(0, 40).map((p, idx) => (
                    <div
                        key={p.id ?? idx}
                        className="border rounded px-3 py-2 text-sm bg-card"
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
                    <div className="p-3 text-xs text-muted-foreground">
                        Truncated for display. The API returned all items successfully.
                    </div>
                    )}
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
