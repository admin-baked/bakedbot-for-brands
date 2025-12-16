
import Link from 'next/link';
import { MapPin, ChevronRight, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Retailer } from '@/types/domain';

interface WhereToBuyProps {
    retailers: Retailer[];
    brandName: string;
}

export function WhereToBuy({ retailers, brandName }: WhereToBuyProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Where to Buy</h2>
                <Badge variant="outline" className="text-sm">
                    {retailers.length} Locations Nearby
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium text-muted-foreground">
                        Verified Retailers Carrying {brandName}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {retailers.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {retailers.slice(0, 4).map((retailer) => (
                                <div
                                    key={retailer.id}
                                    className="flex items-start justify-between rounded-lg border p-4 bg-card hover:bg-muted/50 transition-colors"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-primary" />
                                            <h3 className="font-semibold">{retailer.name}</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {retailer.address}, {retailer.city}
                                        </p>
                                        <Badge variant="secondary" className="text-xs">
                                            In Stock
                                        </Badge>
                                    </div>
                                    <Button size="sm" variant="ghost" asChild>
                                        <Link href={`/dispensary/${retailer.id}`}>
                                            Visit <ChevronRight className="ml-1 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p>No verified retailers found nearby.</p>
                            <Button variant="link" asChild>
                                <Link href="/local">Search other locations</Link>
                            </Button>
                        </div>
                    )}

                    {retailers.length > 4 && (
                        <div className="text-center pt-4">
                            <Button variant="outline" asChild>
                                <Link href={`/find?q=${encodeURIComponent(brandName)}`}>
                                    View All Retailers
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
