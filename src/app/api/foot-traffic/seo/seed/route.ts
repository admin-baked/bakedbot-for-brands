import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getRetailersByZipCode, getZipCodeCoordinates, discoverNearbyProducts } from '@/server/services/geo-discovery';
import { LocalSEOPage, ProductSummary, DealSummary } from '@/types/foot-traffic';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { zipCode, featuredDispensaryName } = body;

        if (!zipCode) {
            return NextResponse.json(
                { error: 'zipCode is required' },
                { status: 400 }
            );
        }

        logger.info(`[SEO Seed] Seeding page for ${zipCode} with featured dispensary: ${featuredDispensaryName}`);

        // 1. Get location info
        const coords = await getZipCodeCoordinates(zipCode);
        if (!coords) {
            return NextResponse.json(
                { error: 'Invalid ZIP code' },
                { status: 400 }
            );
        }

        // 2. Fetch retailers
        const retailers = await getRetailersByZipCode(zipCode, 20);

        // 3. Find featured dispensary if provided
        let featuredDispensaryId = undefined;
        if (featuredDispensaryName) {
            const match = retailers.find(r =>
                r.name.toLowerCase().includes(featuredDispensaryName.toLowerCase())
            );
            if (match) {
                featuredDispensaryId = match.id;
            } else {
                logger.warn(`[SEO Seed] Could not find retailer matching "${featuredDispensaryName}" in ${zipCode}`);
            }
        }

        // 4. Discover products (prioritizing featured dispensary could happen here if we passed it to discoverNearbyProducts, but for now we just cache the ID)
        const discoveryResult = await discoverNearbyProducts({
            lat: coords.lat,
            lng: coords.lng,
            radiusMiles: 15,
            limit: 50,
            sortBy: 'score',
        });

        // 5. Generate content structures
        const topStrains: ProductSummary[] = discoveryResult.products.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            brandName: p.brandName,
            category: p.category,
            price: p.price,
            imageUrl: p.imageUrl,
            thcPercent: p.thcPercent,
            retailerCount: p.retailerCount,
        }));

        const topDeals: DealSummary[] = discoveryResult.products
            .filter(p => p.isOnSale)
            .slice(0, 5)
            .map(p => ({
                productId: p.id,
                productName: p.name,
                brandName: p.brandName,
                originalPrice: p.originalPrice || p.price,
                salePrice: p.price,
                discountPercent: p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0,
                retailerName: p.availability[0]?.retailerName || 'Local Dispensary',
            }));

        const categoryBreakdown = ['Flower', 'Edibles', 'Concentrates', 'Pre-Rolls', 'Vape Pens'].map(cat => ({
            category: cat,
            count: discoveryResult.products.filter(p => p.category === cat).length
        }));

        // 6. Config Object
        const seoPageConfig: LocalSEOPage = {
            id: zipCode,
            zipCode,
            city: retailers[0]?.city || 'Unknown City',
            state: retailers[0]?.state || 'Unknown State',
            featuredDispensaryId,
            featuredDispensaryName,
            content: {
                title: `Cannabis Dispensaries Near ${zipCode}`,
                metaDescription: `Find the best cannabis in ${zipCode}.`,
                h1: `Cannabis Near ${zipCode}`,
                introText: `Discover top rated dispensaries in ${zipCode}...`,
                topStrains,
                topDeals,
                nearbyRetailers: retailers.slice(0, 10),
                categoryBreakdown,
            },
            structuredData: {
                localBusiness: {}, // Can fill in later if needed for detailed storage
                products: [],
                breadcrumb: {},
            },
            lastRefreshed: new Date(),
            nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            refreshFrequency: 'daily',
            published: true,
            metrics: {
                pageViews: 0,
                uniqueVisitors: 0,
                bounceRate: 0,
                avgTimeOnPage: 0,
            },
        };

        // 7. Save to Firestore
        const { firestore } = await createServerClient();
        await firestore.collection('foot_traffic').doc('config').collection('seo_pages').doc(zipCode).set(seoPageConfig);

        return NextResponse.json({
            success: true,
            data: seoPageConfig
        });

    } catch (error: any) {
        logger.error('[SEO Seed] Error:', { error: error.message || error });
        return NextResponse.json(
            { error: 'Failed to seed SEO page' },
            { status: 500 }
        );
    }
}
