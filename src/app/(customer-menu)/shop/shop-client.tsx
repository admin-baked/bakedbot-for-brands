'use client';

/**
 * Shop Page Client Component
 * Marketplace with search, filters, and Smokey AI Budtender
 */

import { useState, useCallback, useEffect, useTransition } from 'react';
import { Search, MapPin, Loader2, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShopFilters, type ShopFilters as ShopFiltersType } from '@/components/shop/filters';
import { ProductCard } from '@/components/shop/product-card';
import type { RankedProduct, SmokeyFindResponse, BakedBotContext } from '@/types/smokey-actions';

// Dynamic import for Chatbot to avoid SSR issues
const Chatbot = dynamic(() => import('@/components/chatbot'), { ssr: false });

interface ShopClientProps {
    initialLocation?: { lat: number; lng: number; city?: string; state?: string };
}

export default function ShopClient({ initialLocation }: ShopClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<ShopFiltersType>({});
    const [results, setResults] = useState<RankedProduct[]>([]);
    const [fallbacks, setFallbacks] = useState<RankedProduct[]>([]);
    const [isSearching, startSearch] = useTransition();
    const [location, setLocation] = useState(initialLocation);
    const [showChatbot, setShowChatbot] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Set Smokey context for /shop page
    const smokeyContext: BakedBotContext = {
        pageType: 'shop',
        userGeo: location,
        jurisdiction: location ? { state: location.state || 'Unknown' } : undefined,
    };

    // Listen for open-smokey-chat events
    useEffect(() => {
        const handleOpenChat = () => setShowChatbot(true);
        window.addEventListener('open-smokey-chat', handleOpenChat);
        return () => window.removeEventListener('open-smokey-chat', handleOpenChat);
    }, []);

    // Get user location
    useEffect(() => {
        if (!location && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    });
                },
                (err) => console.log('Location not available:', err.message)
            );
        }
    }, [location]);

    const handleSearch = useCallback(async (query?: string) => {
        const queryText = query || searchQuery;
        if (!queryText.trim()) return;

        startSearch(async () => {
            try {
                const response = await fetch('/api/smokey/find', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        queryText,
                        context: smokeyContext,
                        filters,
                    }),
                });

                const data: SmokeyFindResponse = await response.json();

                if (data.success) {
                    setResults(data.results);
                    setFallbacks(data.fallbacks);
                    setHasSearched(true);
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
        });
    }, [searchQuery, filters, smokeyContext]);

    const handleProductClick = (product: RankedProduct) => {
        // Open dispensary website or deep link
        // For now, we'll use Google Maps directions as fallback
        window.open(
            `https://www.google.com/maps/search/${encodeURIComponent(product.dispensaryName)}`,
            '_blank'
        );
    };

    const suggestedQueries = [
        'Highest rated flower within 5 minutes',
        'Relaxing edibles under $30',
        'Best vapes for sleep',
        'Energizing sativa pre-rolls',
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Search Section */}
            <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-16 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-black mb-4">
                        Find Cannabis Near You
                    </h1>
                    <p className="text-lg text-green-100 mb-8">
                        Search by product, effect, or ask Smokey in natural language
                    </p>

                    {/* Search Bar */}
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                        className="flex gap-2 max-w-xl mx-auto"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Try: Highest rated flower within 5 minutes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-12 bg-white text-slate-900 border-0"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 bg-amber-500 hover:bg-amber-600"
                            disabled={isSearching}
                        >
                            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                        </Button>
                    </form>

                    {/* Location indicator */}
                    {location && (
                        <div className="mt-4 inline-flex items-center gap-1 text-green-200 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>
                                {location.city || 'Your location'}{location.state ? `, ${location.state}` : ''}
                            </span>
                        </div>
                    )}

                    {/* Suggested queries */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {suggestedQueries.map((query) => (
                            <Badge
                                key={query}
                                variant="outline"
                                className="cursor-pointer bg-white/10 border-white/20 text-white hover:bg-white/20"
                                onClick={() => {
                                    setSearchQuery(query);
                                    handleSearch(query);
                                }}
                            >
                                {query}
                            </Badge>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Filters */}
                <div className="mb-6">
                    <ShopFilters filters={filters} onFiltersChange={setFilters} />
                </div>

                {/* Results */}
                {hasSearched ? (
                    <>
                        {results.length > 0 ? (
                            <>
                                <h2 className="text-xl font-bold mb-4">
                                    Top Results
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                    {results.map((product) => (
                                        <ProductCard
                                            key={`${product.productId}-${product.dispId}`}
                                            product={product}
                                            onShopClick={handleProductClick}
                                        />
                                    ))}
                                </div>

                                {fallbacks.length > 0 && (
                                    <>
                                        <h3 className="text-lg font-semibold text-slate-600 mb-4">
                                            You Might Also Like
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {fallbacks.map((product) => (
                                                <ProductCard
                                                    key={`${product.productId}-${product.dispId}`}
                                                    product={product}
                                                    onShopClick={handleProductClick}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-xl text-slate-600 mb-4">
                                    No products found matching your search
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowChatbot(true)}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Ask Smokey for Help
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty state - show Smokey prompt */
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center text-5xl">
                            🌿
                        </div>
                        <h2 className="text-2xl font-bold mb-2">
                            What are you looking for today?
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Search above or chat with Smokey for personalized recommendations
                        </p>
                        <Button
                            size="lg"
                            onClick={() => setShowChatbot(true)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Sparkles className="w-5 h-5 mr-2" />
                            Chat with Smokey
                        </Button>
                    </div>
                )}
            </main>

            {/* Smokey AI Budtender Widget */}
            {showChatbot && (
                <Chatbot
                    initialOpen={true}
                    positionStrategy="fixed"
                    className="z-50"
                />
            )}

            {/* Floating Smokey button when chatbot is hidden */}
            {!showChatbot && (
                <button
                    onClick={() => setShowChatbot(true)}
                    className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center hover:bg-green-700 transition-all hover:scale-110 z-40"
                    aria-label="Chat with Smokey"
                >
                    <Sparkles className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
