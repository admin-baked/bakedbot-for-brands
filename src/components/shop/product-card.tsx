'use client';

/**
 * Shop Product Card Component
 * Displays product with dispensary info, rating, price, and checkout routing
 */

import { Star, Clock, MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoogleAttribution } from '@/components/places/google-attribution';
import type { RankedProduct } from '@/types/smokey-actions';

interface ProductCardProps {
    product: RankedProduct;
    onShopClick?: (product: RankedProduct) => void;
}

export function ProductCard({ product, onShopClick }: ProductCardProps) {
    const handleShopClick = () => {
        // Track checkout routed event
        fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'checkoutRouted',
                payload: {
                    productId: product.productId,
                    dispId: product.dispId,
                    dispensaryName: product.dispensaryName,
                },
            }),
        }).catch(console.error);

        onShopClick?.(product);
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Product Image */}
            <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-50">
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt={product.productName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                        🌿
                    </div>
                )}

                {/* Category badge */}
                <Badge className="absolute top-2 left-2 capitalize">
                    {product.category}
                </Badge>

                {/* Reasons chips */}
                {product.reasons.length > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                        {product.reasons.slice(0, 2).map((reason, i) => (
                            <Badge key={i} variant="secondary" className="bg-white/90 text-xs">
                                {reason}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <CardContent className="p-4">
                {/* Product Info */}
                <div className="mb-3">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.productName}</h3>
                    {product.brandName && (
                        <p className="text-sm text-muted-foreground">{product.brandName}</p>
                    )}
                </div>

                {/* Price */}
                <div className="text-2xl font-bold text-green-600 mb-3">
                    ${product.price.toFixed(2)}
                </div>

                {/* Dispensary Info */}
                <div className="border-t pt-3 space-y-2">
                    <p className="font-medium text-sm line-clamp-1">{product.dispensaryName}</p>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {/* Open status */}
                        {typeof product.isOpen === 'boolean' && (
                            <Badge
                                variant={product.isOpen ? 'default' : 'secondary'}
                                className={product.isOpen ? 'bg-green-500' : ''}
                            >
                                <Clock className="w-3 h-3 mr-1" />
                                {product.isOpen ? 'Open' : 'Closed'}
                            </Badge>
                        )}

                        {/* Distance */}
                        {product.distanceMinutes && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {product.distanceMinutes} min
                            </span>
                        )}

                        {/* Google Rating */}
                        {product.googleRating && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {product.googleRating.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Shop CTA */}
                <Button
                    className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    onClick={handleShopClick}
                >
                    Shop at {product.dispensaryName.split(' ')[0]}
                    <ExternalLink className="w-4 h-4 ml-2" />
                </Button>

                {/* Google Attribution */}
                {product.googleRating && (
                    <div className="mt-2">
                        <GoogleAttribution variant="inline" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default ProductCard;
