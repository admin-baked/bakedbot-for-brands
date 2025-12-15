
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LocalProduct } from '@/types/foot-traffic';

interface LocalProductCardProps {
    product: LocalProduct;
}

export function LocalProductCard({ product }: LocalProductCardProps) {
    // Helper to check if value is valid (non-zero/non-null)
    const isValid = (val?: number | null) => val !== undefined && val !== null && val > 0;

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-square relative bg-muted">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No Image
                    </div>
                )}
                {product.isOnSale && (
                    <Badge className="absolute top-2 right-2 bg-red-500">
                        Sale
                    </Badge>
                )}
            </div>
            <CardContent className="p-4">
                <Badge variant="secondary" className="mb-2 text-xs">
                    {product.category}
                </Badge>
                <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                    {product.brandName}
                </p>

                {/* Potency Row - Hide if no data */}
                {isValid(product.thcPercent) && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{product.thcPercent}% THC</span>
                    </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold">
                                {product.size ? `$${product.price.toFixed(2)}` : `From $${product.price.toFixed(2)}`}
                            </span>
                            {product.originalPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                    ${product.originalPrice.toFixed(2)}
                                </span>
                            )}
                        </div>
                        {!!product.size && product.size !== '0' && product.size !== '0g' && (
                            <span className="text-xs text-muted-foreground font-medium">
                                {product.size}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {product.retailerCount} stores
                    </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    <MapPin className="inline h-3 w-3 mr-1" />
                    {product.nearestDistance.toFixed(1)} mi away
                </p>
            </CardContent>
        </Card>
    );
}
