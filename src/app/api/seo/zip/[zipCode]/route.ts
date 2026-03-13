// src/app/api/seo/zip/[zipCode]/route.ts
// API endpoint to serve Zip SEO page data from Firestore

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ zipCode: string }> }
) {
    try {
        const { zipCode } = await params;

        if (!zipCode) {
            return NextResponse.json({ error: 'Missing zip code' }, { status: 400 });
        }

        const { firestore: db } = await createServerClient();
        const configRef = db.collection('foot_traffic').doc('config');

        const [configDoc, legacyConfigDoc, topLevelDashDoc, topLevelUnderscoreDoc, topLevelPlainDoc] = await Promise.all([
            configRef.collection('zip_pages').doc(zipCode).get(),
            configRef.collection('seo_pages').doc(zipCode).get(),
            db.collection('seo_pages').doc(`zip-${zipCode}`).get(),
            db.collection('seo_pages').doc(`zip_${zipCode}`).get(),
            db.collection('seo_pages').doc(zipCode).get(),
        ]);

        if (configDoc.exists) {
            const data = configDoc.data();
            const nearbyRetailers = Array.isArray(data?.content?.nearbyRetailers)
                ? data.content.nearbyRetailers
                : [];

            return NextResponse.json({
                zip: data?.zipCode || zipCode,
                city: data?.city || 'Unknown',
                state: data?.state || 'IL',
                dispensaries: nearbyRetailers.map((retailer: any) => ({
                    id: retailer.id || retailer.slug || retailer.name || zipCode,
                    name: retailer.name || 'Unknown dispensary',
                    address: retailer.address || '',
                    rating: retailer.rating || undefined,
                })),
                nearbyZips: data?.nearbyZipCodes || data?.nearbyZips || [],
                citySlug: data?.citySlug || `${String(data?.city || 'local').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-cannabis-guide`,
            });
        }

        const doc = [legacyConfigDoc, topLevelDashDoc, topLevelUnderscoreDoc, topLevelPlainDoc]
            .find((candidate) => candidate.exists) || null;

        if (!doc || !doc.exists) {
            // Return fallback data for uncached zips
            return NextResponse.json({
                zip: zipCode,
                city: 'Unknown',
                state: 'IL',
                dispensaries: [],
                nearbyZips: [],
                citySlug: 'chicago-cannabis-guide'
            });
        }

        const data = doc.data();
        return NextResponse.json({
            zip: data?.zip || zipCode,
            city: data?.city || 'Unknown',
            state: data?.state || 'IL',
            dispensaries: data?.dispensaries || [],
            nearbyZips: data?.nearbyZipCodes || [],
            citySlug: data?.citySlug || 'chicago-cannabis-guide'
        });
    } catch (error) {
        console.error('Error fetching zip page data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
