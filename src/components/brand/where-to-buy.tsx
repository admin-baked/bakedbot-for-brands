
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ExternalLink, Activity } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export interface RetailerLite {
    id: string;
    name: string;
    address: string;
    distanceMiles?: number;
    inStockCount?: number;
    orderingUrl?: string;
    isOpen?: boolean;
}

interface WhereToBuyProps {
    retailers: RetailerLite[];
    brandName: string;
    zipCode?: string;
}

export function WhereToBuy({ retailers, brandName, zipCode }: WhereToBuyProps) {
    const handleRetailerClick = (retailerId: string, name: string) => {
        trackEvent({
            name: 'click_out_to_partner',
            properties: {
                brandName,
                retailerId,
                retailerName: name,
                zipCode
            }
        });
    };

    if (retailers.length === 0) {
        return (
            <Card className="bg-muted/30">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>No retailers found carrying {brandName} near {zipCode || "you"}.</p>
                    <Button variant="link" asChild>
                        <Link href="/local">Explore other brands nearby</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {retailers.map((retailer) => (
                <Card key={retailer.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{retailer.name}</h3>
                                    {retailer.isOpen && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] h-5">
                                            Open Now
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {retailer.address}
                                    {retailer.distanceMiles !== undefined && (
                                        <span className="ml-1">• {retailer.distanceMiles.toFixed(1)} mi</span>
                                    )}
                                </div>
                                {retailer.inStockCount !== undefined && retailer.inStockCount > 0 && (
                                    <div className="flex items-center text-xs font-medium text-blue-600 mt-1">
                                        <Activity className="w-3 h-3 mr-1" />
                                        {retailer.inStockCount} {brandName} products in stock
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center">
                                <Button asChild size="sm" className="w-full sm:w-auto" onClick={() => handleRetailerClick(retailer.id, retailer.name)}>
                                    <Link href={retailer.orderingUrl || "#"} target="_blank" rel="noopener noreferrer">
                                        Order Pickup <ExternalLink className="w-3 h-3 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
