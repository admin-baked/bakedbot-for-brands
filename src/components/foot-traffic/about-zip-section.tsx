
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, TrendingUp, Store } from 'lucide-react';

interface AboutZipSectionProps {
    zipCode: string;
    city: string;
    state: string;
    productCount: number;
    retailerCount: number;
    lowestPrice: number;
    topCategories: { name: string; count: number }[];
}

export function AboutZipSection({
    zipCode,
    city,
    state,
    productCount,
    retailerCount,
    lowestPrice,
    topCategories
}: AboutZipSectionProps) {
    // Dynamic text generation
    const categoryText = topCategories.length > 0
        ? `Top categories include ${topCategories.slice(0, 3).map(c => c.name.toLowerCase()).join(', ')}.`
        : '';

    const priceText = lowestPrice > 0
        ? `Prices start as low as $${lowestPrice.toFixed(2)}.`
        : '';

    return (
        <Card className="bg-slate-50 border-slate-200">
            <CardHeader>
                <CardTitle className="text-xl">About Cannabis in {zipCode}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700">
                <p>
                    Looking for cannabis near <strong>{zipCode}</strong>? {city} residents have access to over {retailerCount} local dispensaries
                    and delivery services offering a wide range of legal products.
                    BakedBot has indexed {productCount}+ active products available for pickup or delivery right now.
                </p>

                <div className="grid gap-4 sm:grid-cols-3 pt-2">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <Store className="h-5 w-5 text-emerald-600 mt-0.5" />
                        <div>
                            <span className="block font-semibold text-slate-900">{retailerCount} Dispensaries</span>
                            <span className="text-xs text-slate-500">Compare menus in {city}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <span className="block font-semibold text-slate-900">{productCount}+ Products</span>
                            <span className="text-xs text-slate-500">{categoryText}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
                        <div>
                            <span className="block font-semibold text-slate-900">Local & Legal</span>
                            <span className="text-xs text-slate-500">Verified retailers in {state}</span>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-slate-600 italic border-l-2 border-slate-300 pl-3">
                    <strong>Market Insight:</strong> {priceText} Compare prices on BakedBot to find the best deals on flower, edibles, and vapes in the {city} area.
                </p>
            </CardContent>
        </Card>
    );
}
