
'use client';

import { Phone, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RetailerSummary } from '@/types/foot-traffic';
import { trackEvent } from '@/lib/analytics';

interface RetailerCardProps {
    retailer: RetailerSummary;
    isPartner: boolean;
    isSponsored?: boolean;
    zipCode: string;
}

export function RetailerCard({ retailer, isPartner, isSponsored, zipCode }: RetailerCardProps) {

    const handleActionClick = (action: 'call' | 'website' | 'pickup') => {
        if (isPartner) {
            trackEvent({
                name: 'partner_click',
                properties: {
                    retailerId: retailer.id,
                    retailerName: retailer.name,
                    zipCode,
                    action
                }
            });
        }
    };

    return (
        <Card
            className={`overflow-hidden hover:shadow-md transition-shadow ${isPartner ? 'border-yellow-400 bg-yellow-50/10 shadow-sm' : ''}`}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold line-clamp-1">{retailer.name}</h3>
                            {isSponsored && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] h-5 px-1.5">
                                    Sponsored
                                </Badge>
                            )}
                            {isPartner && (
                                <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-white text-[10px] h-5 px-1.5">
                                    Partner
                                </Badge>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {retailer.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {retailer.city}, {retailer.state} {retailer.postalCode}
                        </p>
                    </div>
                    {retailer.distance != null && (
                        <Badge variant="outline" className="ml-2 shrink-0">
                            {retailer.distance.toFixed(1)} mi
                        </Badge>
                    )}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex gap-3">
                        {retailer.phone && (
                            <a
                                href={`tel:${retailer.phone}`}
                                className="flex items-center gap-1 hover:text-foreground"
                                onClick={() => handleActionClick('call')}
                            >
                                <Phone className="h-3 w-3" />
                                Call
                            </a>
                        )}
                        {retailer.website && (
                            <a
                                href={retailer.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-foreground"
                                onClick={() => handleActionClick('website')}
                            >
                                <ExternalLink className="h-3 w-3" />
                                Menu
                            </a>
                        )}
                    </div>
                    {isPartner && (
                        <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs bg-black text-white hover:bg-gray-800"
                            onClick={() => handleActionClick('pickup')}
                        >
                            Order Pickup
                        </Button>
                    )}
                </div>

                {/* P4.1 Own this listing */}
                {!isPartner && (
                    <div className="mt-3 pt-3 border-t flex justify-center">
                        <a
                            href={`/for-brands?retailerId=${retailer.id}&name=${encodeURIComponent(retailer.name)}`}
                            className="text-[10px] text-muted-foreground/60 hover:text-indigo-600 hover:underline flex items-center gap-1"
                            onClick={() => {
                                trackEvent({
                                    name: 'claim_listing_click',
                                    properties: {
                                        retailerId: retailer.id,
                                        retailerName: retailer.name,
                                        zipCode
                                    }
                                });
                            }}
                        >
                            Own this business? Manage this listing
                        </a>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}
