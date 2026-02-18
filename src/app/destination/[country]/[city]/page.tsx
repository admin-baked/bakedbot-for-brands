/**
 * International Market Destination Page
 * Route: /destination/[country]/[city]
 * Example: /destination/thailand/koh-samui
 *
 * ISR Configuration:
 * - revalidate: 14400 (4-hour cache)
 * - dynamicParams: true (generate all cities on-demand)
 * - dynamic: 'force-dynamic' (no build-time pre-rendering)
 */

import { notFound } from 'next/navigation';
import { getInternationalMarket } from '@/lib/config/international-markets';
import { getInternationalPageData } from '@/server/services/growth/international-discovery';
import { logger } from '@/lib/logger';
import DestinationClient from './client';

export const revalidate = 14400; // 4-hour ISR cache
export const dynamicParams = true; // On-demand generation for any city
export const dynamic = 'force-dynamic'; // No build-time pre-render

interface Params {
    country: string;
    city: string;
}

export default async function DestinationPage({
    params,
}: {
    params: Promise<Params>;
}) {
    const { country, city } = await params;

    // 1. Validate market config
    const market = getInternationalMarket(country, city);
    if (!market) {
        logger.warn('[Destination] Market not found', { country, city });
        notFound();
    }

    // 2. Fetch pre-scraped page data from Firestore
    const pageData = await getInternationalPageData(market.id);

    // 3. Handle no data (coming soon)
    if (!pageData || !pageData.dispensaries?.length) {
        logger.info('[Destination] No data available', { marketId: market.id });
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
                <div className="max-w-3xl mx-auto text-center py-20">
                    <h1 className="text-4xl font-bold text-slate-800 mb-4">
                        Cannabis in {market.cityName}
                    </h1>
                    <p className="text-lg text-slate-600 mb-8">
                        We're discovering local dispensaries for you. Check back soon!
                    </p>
                    <p className="text-sm text-slate-500">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        );
    }

    // 4. Render destination page with client component
    return (
        <DestinationClient
            market={market}
            pageData={pageData}
        />
    );
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
    const { country, city } = await params;
    const market = getInternationalMarket(country, city);

    if (!market) {
        return {
            title: 'Not Found',
            description: 'This destination could not be found.',
        };
    }

    const pageData = await getInternationalPageData(market.id);

    return {
        title: pageData?.metadata?.title || `Cannabis in ${market.cityName} | BakedBot`,
        description:
            pageData?.metadata?.description ||
            `Explore cannabis dispensaries and products in ${market.cityName}, ${market.countryName}`,
        keywords: pageData?.metadata?.keywords || [
            `cannabis ${market.city}`,
            `dispensary ${market.cityName}`,
            `${market.cityName} weed`,
        ],
        openGraph: {
            title: pageData?.metadata?.title,
            description: pageData?.metadata?.description,
            url: `https://bakedbot.ai/destination/${country}/${city}`,
            type: 'website',
        },
        alternates: {
            canonical: `https://bakedbot.ai/destination/${country}/${city}`,
            languages: {
                'en-TH': `https://bakedbot.ai/en-TH/destination/${country}/${city}`,
            },
        },
    };
}
