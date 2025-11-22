
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";


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
  
    return { ok: true, status: res.status, data: json.data || json };
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
        setResults(result.data?.items || result.data?.data?.data || result.data?.data || []);
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

      if (json.ok === false) { 
        throw new Error(json.error || json.warning || "Products error");
      }

      const items: Product[] = json.items || json.data?.data || json.data || [];
      setProducts(items);
      setRaw(json); 
    } catch (e: any) {
      setError(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">CannMenus Dev Console</h1>
        <p className="text-muted-foreground">
          Internal testing page for the Next.js API proxies to the live CannMenus API.
        </p>
      </header>
      
      <Card>
          <CardHeader>
              <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSearch} className="space-y-4">
                <div className="space-y-2">
                    <Label>Search Mode</Label>
                    <RadioGroup defaultValue="brand" onValueChange={(v: Mode) => setMode(v)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="brand" id="r-brand" />
                            <Label htmlFor="r-brand">Brand</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dispensary" id="r-dispensary" />
                            <Label htmlFor="r-dispensary">Dispensary</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="flex gap-2">
                    <Input
                        placeholder={
                            mode === "brand"
                            ? "Search brands (e.g. 'STIIIZY')"
                            : "Search dispensaries (e.g. 'Chicago')"
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        />
                    <Button type="submit" disabled={loading} className="min-w-[100px]">
                        {loading ? <Loader2 className="animate-spin" /> : "Search"}
                    </Button>
                </div>
            </form>
          </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-destructive p-4 border border-destructive/50 rounded-md bg-destructive/10">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Search results */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Results ({results.length})</h2>

        <div className="space-y-2 max-h-72 overflow-auto border rounded-md p-2 bg-muted/50">
          {results.map((r) => {
            const label = r.name || r.title || `ID ${r.id}`;
            const isSelected = mode === "dispensary" && r.id === selectedRetailer;
            return (
              <Button
                key={r.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                onClick={() => {
                  if (mode === "dispensary") {
                    setSelectedRetailer(r.id);
                  }
                }}
                className="w-full justify-start h-auto"
              >
                  <div className="flex-1 text-left">
                    <div className="font-medium truncate">{label}</div>
                    <div className="text-xs text-muted-foreground">ID: {r.id}</div>
                  </div>
              </Button>
            );
          })}
          {!results.length && !loading && (
            <div className="text-center text-sm p-8 text-muted-foreground">
              No results yet. Run a search above.
            </div>
          )}
           {loading && !results.length && (
            <div className="text-center text-sm p-8 text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" /> Loading...
            </div>
          )}
        </div>
      </section>

      {mode === "dispensary" && (
        <Card>
            <CardHeader>
                <CardTitle>Load Products</CardTitle>
                <CardDescription>
                    {selectedRetailer 
                        ? `Load products for retailer: ${selectedRetailer}` 
                        : "Select a dispensary from the results above to load its product menu."}
                </CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button onClick={loadProducts} disabled={!selectedRetailer || loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Load Products"}
                </Button>
            </CardFooter>
        </Card>
      )}

      {products.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Products ({products.length})</h2>
          <div className="space-y-2 max-h-[32rem] overflow-auto border rounded-md p-2 bg-muted/50">
            {products.slice(0, 40).map((p, idx) => (
              <div key={p.id ?? idx} className="rounded-md border bg-background px-3 py-2 text-sm">
                <div className="font-medium">{p.name || p.title || "Untitled product"}</div>
                <div className="text-xs text-muted-foreground">{p.brand || p.brand_name || ""}</div>
                {p.price && (<div className="text-xs mt-1 font-semibold">${p.price}</div>)}
              </div>
            ))}
            {products.length > 40 && (
              <div className="text-center text-sm p-4 text-muted-foreground">And {products.length - 40} more...</div>
            )}
          </div>
        </section>
      )}
      
       {raw && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Raw API Response</h2>
          <pre className="w-full min-h-[120px] text-xs bg-muted rounded-md p-3 overflow-auto">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </section>
       )}
    </main>
  );
}
