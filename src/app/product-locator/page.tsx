// src/app/product-locator/page.tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MapPin, DollarSign } from "lucide-react";
import Image from "next/image";
import Link from 'next/link';

// Mock types for the search results
interface Offer {
  dispensary_id: string;
  dispensary_name: string;
  price: number;
  sale_price?: number | null;
  distance_km?: number | null;
}

interface SkuResult {
  sku_id: string;
  name: string;
  category: string;
  offers: Offer[];
}

interface SearchResult {
    brand_id: string;
    skus: SkuResult[];
}

// Mock API call function
async function searchAvailability(query: string): Promise<SearchResult> {
    // In a real app, this would hit our semantic search endpoint, e.g., /api/cannmenus/semantic-search
    // For now, we return a hard-coded response matching the expected structure.
    console.log(`Searching for: ${query}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return a rich, hard-coded stub response
    return {
        brand_id: "default",
        skus: [
          {
            sku_id: "demo-40t-gg4",
            name: "40 Tons Gorilla Glue #4",
            category: "Flower",
            offers: [
              { dispensary_id: "bayside-cannabis", dispensary_name: "Bayside Cannabis", price: 45.00, distance_km: 5.2 },
              { dispensary_id: "alta-dispensary", dispensary_name: "Alta Dispensary", price: 47.50, distance_km: 8.1 },
            ],
          },
          {
            sku_id: "demo-40t-runtz-vape",
            name: "40 Tons Runtz Vape Cart",
            category: "Vapes",
            offers: [
              { dispensary_id: "bayside-cannabis", dispensary_name: "Bayside Cannabis", price: 50.00, sale_price: 45.00, distance_km: 5.2 },
            ],
          },
        ],
    };
}


export default function ProductLocatorPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isSearching, startSearchTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    startSearchTransition(async () => {
      const searchResults = await searchAvailability(query);
      setResults(searchResults);
    });
  };
  
  const allOffers: (SkuResult & { offer: Offer, productImageUrl: string })[] = 
    results?.skus.flatMap(sku => 
      sku.offers.map(offer => ({
        ...sku,
        offer,
        // In a real app, you'd fetch the product image URL based on sku_id
        productImageUrl: sku.sku_id.includes('gg4') 
            ? 'https://images.unsplash.com/photo-1600753231295-90b5d5b87a5a?auto=format&fit=crop&w=400&q=80' 
            : 'https://images.unsplash.com/photo-1606753232098-2ba37249a32e?auto=format&fit=crop&w=400&q=80'
      }))
    ) ?? [];


  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-teko tracking-wider uppercase">
          Product Locator
        </h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Find your favorite products at a dispensary near you.
        </p>
      </div>

      <div className="mt-8 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search for a product, like 'Gorilla Glue'..."
                    className="pl-10 h-11"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                 <Button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 h-9" disabled={isSearching}>
                    {isSearching ? <Loader2 className="animate-spin" /> : "Search"}
                </Button>
            </div>
        </form>
      </div>

      <div className="mt-12">
        {isSearching && (
             <div className="space-y-4">
                <div className="h-24 w-full animate-pulse bg-muted rounded-lg"></div>
                <div className="h-24 w-full animate-pulse bg-muted rounded-lg" style={{ animationDelay: '0.1s' }}></div>
                <div className="h-24 w-full animate-pulse bg-muted rounded-lg" style={{ animationDelay: '0.2s' }}></div>
            </div>
        )}
        {!isSearching && results && (
            <div className="space-y-4">
                {allOffers.length === 0 ? (
                    <Card className="text-center py-16">
                        <CardHeader>
                            <CardTitle>No Results Found</CardTitle>
                            <CardDescription>Try searching for a different product.</CardDescription>
                        </CardHeader>
                    </Card>
                ) : allOffers.map((item) => (
                    <Card key={`${item.sku_id}-${item.offer.dispensary_id}`} className="flex items-center p-4">
                        <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-md overflow-hidden border mr-4">
                            <Image src={item.productImageUrl} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                            </div>
                             <div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{item.offer.dispensary_name}</span>
                                </div>
                                {item.offer.distance_km && <p className="text-xs pl-5">{item.offer.distance_km.toFixed(1)} km away</p>}
                            </div>
                            <div className="flex items-center gap-4 justify-end">
                                <div className="text-right">
                                    {item.offer.sale_price ? (
                                        <>
                                            <p className="font-bold text-lg text-primary">${item.offer.sale_price.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground line-through">${item.offer.price.toFixed(2)}</p>
                                        </>
                                    ) : (
                                         <p className="font-bold text-lg">${item.offer.price.toFixed(2)}</p>
                                    )}
                                </div>
                                <Button asChild>
                                    {/* In a real app, this would link to the specific dispensary menu */}
                                    <Link href="/menu/default">Shop</Link>
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </main>
  );
}
