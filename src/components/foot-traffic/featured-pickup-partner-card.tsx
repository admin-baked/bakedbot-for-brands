
'use client';

import { Store, Navigation, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trackEvent } from '@/lib/analytics';
import { RetailerSummary } from '@/types/foot-traffic';

interface FeaturedPickupPartnerCardProps {
    partnerId: string;
    zipCode: string;
    city: string;
    state: string;
    retailer?: RetailerSummary; // Pass retailer data if available
}

export function FeaturedPickupPartnerCard({
    partnerId,
    zipCode,
    city,
    retailer
}: FeaturedPickupPartnerCardProps) {
    if (!partnerId || !retailer) return null;

    const handlePickupClick = () => {
        trackEvent({
            name: 'local_pickup_click',
            properties: {
                zip: zipCode,
                partnerId: partnerId,
                placement: 'right_rail'
            }
        });

        // Construct UTM-tagged URL
        const utmParams = new URLSearchParams({
            utm_source: 'local_page',
            utm_medium: 'featured_partner',
            utm_campaign: `zip_${zipCode}`
        });

        // Assuming retailer.website exists or we have a specific partner link logic
        const targetUrl = retailer.website
            ? `${retailer.website}?${utmParams.toString()}`
            : '#'; // Fallback

        window.open(targetUrl, '_blank');
    };

    return (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                        Featured Partner
                    </span>
                    <Store className="h-4 w-4 text-amber-600" />
                </div>

                <div>
                    <h3 className="font-bold text-lg text-amber-950 leading-tight">
                        Order Pickup at {retailer.name}
                    </h3>
                    <p className="text-sm text-amber-800/80 mt-1">
                        Skip the line. Reserve your order now in {city}.
                    </p>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                    <Button
                        variant="default"
                        className="col-span-2 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={handlePickupClick}
                    >
                        Start Order <ArrowRight className="ml-1 kit-h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
