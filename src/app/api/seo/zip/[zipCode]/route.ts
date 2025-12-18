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

        // Fetch from seo_pages/zip-{zipCode}
        const docRef = db.collection('seo_pages').doc(`zip-${zipCode}`);
        const doc = await docRef.get();

        if (!doc.exists) {
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
