// src/components/embeds/shop-near-me-widget.tsx
'use client';

/**
 * Shop Near Me Widget
 * Embeddable component for influencers and brand pages
 * Shows nearest retailer with product availability
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, ShoppingCart, ExternalLink } from 'lucide-react';

interface ShopNearMeWidgetProps {
    productId: string;
    productName?: string;
    productImage?: string;
    affiliateId?: string;
    brandName?: string;
    theme?: 'light' | 'dark';
    compact?: boolean;
}

interface CheckoutOption {
    retailerId: string;
    retailerName: string;
    address: string;
    city: string;
    state: string;
    distance: number;
    price: number;
    inStock: boolean;
    checkoutUrl: string;
}

export default function ShopNearMeWidget({
    productId,
    productName,
    productImage,
    affiliateId,
    brandName,
    theme = 'light',
    compact = false,
}: ShopNearMeWidgetProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [bestOption, setBestOption] = useState<CheckoutOption | null>(null);
    const [alternatives, setAlternatives] = useState<CheckoutOption[]>([]);
    const [showAlternatives, setShowAlternatives] = useState(false);

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                () => {
                    // Fallback: try IP-based location
                    fetchIPLocation();
                },
                { timeout: 5000 }
            );
        } else {
            fetchIPLocation();
        }
    }, []);

    const fetchIPLocation = async () => {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            if (data.latitude && data.longitude) {
                setLocation({ lat: data.latitude, lng: data.longitude });
            } else {
                setError('Unable to determine your location');
                setLoading(false);
            }
        } catch {
            setError('Unable to determine your location');
            setLoading(false);
        }
    };

    // Fetch checkout options when location is available
    useEffect(() => {
        if (location) {
            fetchCheckoutOptions();
        }
    }, [location]);

    const fetchCheckoutOptions = async () => {
        if (!location) return;

        try {
            const params = new URLSearchParams({
                product: productId,
                lat: String(location.lat),
                lng: String(location.lng),
                source: 'widget',
            });
            if (affiliateId) params.set('affiliate', affiliateId);

            const response = await fetch(`/api/foot-traffic/checkout?${params}`);
            const data = await response.json();

            if (data.success && data.data) {
                setBestOption(data.data.bestOption);
                setAlternatives(data.data.alternatives || []);
            } else {
                setError('No stores found nearby');
            }
        } catch {
            setError('Failed to find nearby stores');
        } finally {
            setLoading(false);
        }
    };

    const handleShopClick = (option: CheckoutOption) => {
        // Track the click
        fetch('/api/foot-traffic/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId,
                retailerId: option.retailerId,
                affiliateId,
                source: 'widget',
            }),
        }).catch(() => { }); // Fire and forget

        // Open checkout URL
        window.open(option.checkoutUrl, '_blank');
    };

    const isDark = theme === 'dark';

    if (compact) {
        return (
            <Button
                onClick={() => bestOption && handleShopClick(bestOption)}
                disabled={loading || !bestOption}
                className={`gap-2 ${isDark ? 'bg-white text-black hover:bg-gray-100' : ''}`}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <MapPin className="h-4 w-4" />
                )}
                {loading ? 'Finding stores...' : bestOption ? `Shop at ${bestOption.retailerName}` : 'No stores nearby'}
            </Button>
        );
    }

    return (
        <Card className={`w-full max-w-sm ${isDark ? 'bg-gray-900 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
                {/* Product Info */}
                {(productImage || productName) && (
                    <div className="flex items-center gap-3 mb-4">
                        {productImage && (
                            <div className="relative w-16 h-16 flex-shrink-0">
                                <Image
                                    src={productImage}
                                    alt={productName || 'Product'}
                                    fill
                                    className="rounded-lg object-cover"
                                />
                            </div>
                        )}
                        <div>
                            {productName && (
                                <h3 className="font-semibold line-clamp-1">{productName}</h3>
                            )}
                            {brandName && (
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                    {brandName}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Finding stores near you...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Best Option */}
                {bestOption && !loading && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-green-500" />
                                <span className="font-medium">{bestOption.retailerName}</span>
                            </div>
                            <Badge variant="secondary">{bestOption.distance.toFixed(1)} mi</Badge>
                        </div>

                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
                            {bestOption.address}, {bestOption.city}, {bestOption.state}
                        </p>

                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">${bestOption.price.toFixed(2)}</span>
                            {bestOption.inStock && (
                                <Badge className="bg-green-100 text-green-700">In Stock</Badge>
                            )}
                        </div>

                        <Button
                            onClick={() => handleShopClick(bestOption)}
                            className="w-full gap-2"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Shop Now
                            <ExternalLink className="h-3 w-3" />
                        </Button>

                        {/* Alternatives Toggle */}
                        {alternatives.length > 0 && (
                            <button
                                onClick={() => setShowAlternatives(!showAlternatives)}
                                className={`text-sm underline ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}
                            >
                                {showAlternatives ? 'Hide' : 'Show'} {alternatives.length} more stores
                            </button>
                        )}

                        {/* Alternatives List */}
                        {showAlternatives && (
                            <div className="space-y-2 pt-2 border-t">
                                {alternatives.map((alt) => (
                                    <div
                                        key={alt.retailerId}
                                        className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
                                        onClick={() => handleShopClick(alt)}
                                    >
                                        <div>
                                            <p className="font-medium">{alt.retailerName}</p>
                                            <p className={isDark ? 'text-gray-500' : 'text-muted-foreground'}>
                                                {alt.distance.toFixed(1)} mi • ${alt.price.toFixed(2)}
                                            </p>
                                        </div>
                                        <ExternalLink className="h-4 w-4" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Powered by */}
                <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-500' : 'text-muted-foreground'}`}>
                    Powered by BakedBot
                </p>
            </CardContent>
        </Card>
    );
}
