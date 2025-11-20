
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Brand = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  categories?: string[];
  website?: string;
  socials?: {
    instagram?: string;
  };
  markets?: string[];
};

type Product = {
  id: string;
  brandId: string;
  brandSlug?: string;
  name: string;
  category: string;
  strainType?: string;
  thcPercent?: number;
  cbdPercent?: number;
  size?: string;
  imageUrl?: string;
  tags?: string[];
  retailerIds?: string[];
};

type Retailer = {
  id: string;
  name: string;
  slug?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  geo?: { lat: number; lng: number };
  phone?: string;
  website?: string;
  carriesBrands?: string[];
};

interface PageProps {
  params: { brandId: string };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return (await res.json()) as T;
}

export default function BrandMenuPage({ params }: PageProps) {
  const { brandId } = params;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) Find the brand by slug / id / name
        const brandRes = await fetchJson<{
          items?: Brand[];
          warning?: string;
          query?: unknown;
        }>(`/api/cannmenus/brands?search=${encodeURIComponent(brandId)}`);

        const candidates = brandRes.items ?? [];
        const normalized = brandId.toLowerCase();

        const found =
          candidates.find(
            (b) =>
              b.id === brandId ||
              b.slug === brandId ||
              b.name?.toLowerCase() === normalized
          ) ?? candidates[0];

        if (!found) {
          throw new Error("Brand not found in stub data.");
        }

        if (cancelled) return;
        setBrand(found);

        // 2) Load products for this brand
        const productsRes = await fetchJson<{
          items?: Product[];
          warning?: string;
          query?: unknown;
        }>(
          `/api/cannmenus/products?brandId=${encodeURIComponent(found.id)}`
        );

        if (cancelled) return;
        setProducts(productsRes.items ?? []);

        // 3) Load retailers that carry this brand
        const retailersRes = await fetchJson<{
          items?: Retailer[];
          warning?: string;
          query?: unknown;
        }>(
          `/api/cannmenus/retailers?brandId=${encodeURIComponent(found.id)}`
        );

        if (cancelled) return;
        setRetailers(retailersRes.items ?? []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unknown error loading brand menu.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return ["All", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === "All") return products;
    return products.filter((p) => p.category === categoryFilter);
  }, [products, categoryFilter]);

  if (loading && !brand) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-6 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Brand Menu</h1>
        <p className="text-red-600 text-sm mb-2">
          {error ?? "Brand not found."}
        </p>
        <p className="text-sm text-gray-600">
          Make sure you used a known stub brand like{" "}
          <code>/menu/jeeter-demo</code> or <code>/menu/stiiizy-demo</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-10">
      {/* Hero */}
      <section className="rounded-2xl overflow-hidden border bg-background shadow-sm">
        {brand.heroImageUrl && (
          <div
            className="h-56 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${brand.heroImageUrl})` }}
          />
        )}
        <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          {brand.logoUrl && (
            <div className="flex-shrink-0">
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-20 w-20 rounded-xl object-cover border bg-white"
              />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold">{brand.name}</h1>
            {brand.description && (
              <p className="text-sm text-gray-700 max-w-xl">
                {brand.description}
              </p>
            )}
            {brand.markets && brand.markets.length > 0 && (
              <p className="text-xs text-gray-500">
                Available in:{" "}
                <span className="font-medium">
                  {brand.markets.join(" • ")}
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full border border-green-600 text-green-700 font-medium hover:bg-green-50"
                >
                  Visit website
                </a>
              )}
              {brand.socials?.instagram && (
                <a
                  href={brand.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xl font-semibold">Products</h2>
            <p className="text-xs text-gray-500">
              {products.length} product{products.length === 1 ? "" : "s"} in
              this demo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full border ${
                  categoryFilter === cat
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-sm text-gray-500">
            No products match this filter in the stub data.
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="border rounded-xl overflow-hidden bg-white flex flex-col shadow-sm"
              >
                {p.imageUrl && (
                  <div className="h-40 w-full bg-gray-100">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="text-xs uppercase text-gray-500">
                    {p.category}
                  </div>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                    {p.strainType && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100">
                        {p.strainType}
                      </span>
                    )}
                    {p.size && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100">
                        {p.size}
                      </span>
                    )}
                    {typeof p.thcPercent === "number" && (
                      <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        THC {p.thcPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Where to buy */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Where to buy</h2>
        {retailers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No retailers found in the stub carrying this brand yet.
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {retailers.map((r) => (
              <div
                key={r.id}
                className="border rounded-xl p-4 bg-white shadow-sm space-y-1"
              >
                <div className="font-semibold text-sm">{r.name}</div>
                {r.address && (
                  <div className="text-xs text-gray-600">
                    {r.address.street}
                    <br />
                    {r.address.city}, {r.address.state} {r.address.postalCode}
                  </div>
                )}
                {r.phone && (
                  <div className="text-xs text-gray-600 mt-1">
                    Phone: {r.phone}
                  </div>
                )}
                {r.website && (
                  <a
                    href={r.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex mt-2 text-xs text-green-700 hover:underline"
                  >
                    View menu
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
