
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin } from "lucide-react";

interface BrandOpportunityModuleProps {
    brandName: string;
    missingCount: number; // e.g., "Missing in 12 nearby dispensaries"
    nearbyZip: string;
}

export function BrandOpportunityModule({ brandName, missingCount, nearbyZip }: BrandOpportunityModuleProps) {
    if (missingCount <= 0) return null;

    return (
        <Card className="bg-orange-50/50 border-orange-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-orange-800 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Growth Opportunity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-orange-900 mb-2">
                    <span className="font-semibold">{brandName}</span> is not currently listed in <span className="font-bold">{missingCount}</span> dispensaries near <span className="font-mono text-xs bg-orange-200 px-1 rounded">{nearbyZip}</span> that carry similar categories.
                </p>
                <div className="flex items-center text-xs text-orange-700 mt-2">
                    <MapPin className="w-3 h-3 mr-1" />
                    Verified brands can see exactly which stores are missing their products.
                </div>
            </CardContent>
        </Card>
    );
}
