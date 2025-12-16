
import { NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dev/seed-test-pages
 * 
 * Creates seed pages for testing in ZIPs 48201 (Detroit) and 60605 (Chicago)
 */
export async function POST() {
    try {
        const { firestore } = await createServerClient();
        const configRef = firestore.collection('foot_traffic').doc('config');

        const now = new Date();

        // ============ ZIP Pages ============
        const zipPages = [
            {
                id: 'zip_48201',
                data: {
                    zipCode: '48201',
                    city: 'Detroit',
                    state: 'MI',
                    dispensaryCount: 5,
                    brandCount: 12,
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'zip_60605',
                data: {
                    zipCode: '60605',
                    city: 'Chicago',
                    state: 'IL',
                    dispensaryCount: 8,
                    brandCount: 20,
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ Dispensary Pages ============
        const dispensaryPages = [
            // Detroit
            {
                id: 'house-of-dank-detroit',
                data: {
                    name: 'House of Dank',
                    slug: 'house-of-dank-detroit',
                    city: 'Detroit',
                    state: 'MI',
                    zipCode: '48201',
                    address: '2048 E 8 Mile Rd',
                    lat: 42.4492,
                    lng: -83.0871,
                    weeklyClicks: 120, // High traffic - should trigger claim opportunity
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'greenhouse-detroit',
                data: {
                    name: 'Greenhouse of Walled Lake',
                    slug: 'greenhouse-detroit',
                    city: 'Detroit',
                    state: 'MI',
                    zipCode: '48201',
                    address: '103 E Walled Lake Dr',
                    lat: 42.5376,
                    lng: -83.4811,
                    weeklyClicks: 45,
                    createdAt: now,
                    updatedAt: now
                }
            },
            // Chicago
            {
                id: 'sunnyside-chicago',
                data: {
                    name: 'Sunnyside Cannabis',
                    slug: 'sunnyside-chicago',
                    city: 'Chicago',
                    state: 'IL',
                    zipCode: '60605',
                    address: '436 N Clark St',
                    lat: 41.8907,
                    lng: -87.6312,
                    weeklyClicks: 200, // Very high traffic
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'dispensary-33-chicago',
                data: {
                    name: 'Dispensary 33',
                    slug: 'dispensary-33-chicago',
                    city: 'Chicago',
                    state: 'IL',
                    zipCode: '60605',
                    address: '5001 N Clark St',
                    lat: 41.9732,
                    lng: -87.6684,
                    weeklyClicks: 85,
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ Brand Pages ============
        const brandPages = [
            // Multi-state brands
            {
                id: 'cookies',
                data: {
                    name: 'Cookies',
                    slug: 'cookies',
                    cities: ['Detroit, MI', 'Chicago, IL', 'Los Angeles, CA', 'Denver, CO'],
                    retailerCount: 150,
                    weeklyClicks: 500, // Very popular
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'stiiizy',
                data: {
                    name: 'STIIIZY',
                    slug: 'stiiizy',
                    cities: ['Detroit, MI', 'Chicago, IL', 'San Francisco, CA'],
                    retailerCount: 80,
                    weeklyClicks: 350,
                    createdAt: now,
                    updatedAt: now
                }
            },
            // Regional brands
            {
                id: 'pleasantrees',
                data: {
                    name: 'Pleasantrees',
                    slug: 'pleasantrees',
                    cities: ['Detroit, MI', 'Ann Arbor, MI'],
                    retailerCount: 25,
                    weeklyClicks: 75,
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'cresco-labs',
                data: {
                    name: 'Cresco Labs',
                    slug: 'cresco-labs',
                    cities: ['Chicago, IL', 'Springfield, IL'],
                    retailerCount: 40,
                    weeklyClicks: 120,
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ City Pages ============
        const cityPages = [
            {
                id: 'detroit-mi',
                data: {
                    name: 'Detroit',
                    state: 'MI',
                    slug: 'detroit-mi',
                    dispensaryCount: 45,
                    topBrands: ['Cookies', 'STIIIZY', 'Pleasantrees'],
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'chicago-il',
                data: {
                    name: 'Chicago',
                    state: 'IL',
                    slug: 'chicago-il',
                    dispensaryCount: 55,
                    topBrands: ['Cookies', 'STIIIZY', 'Cresco Labs'],
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ State Pages ============
        const statePages = [
            {
                id: 'michigan',
                data: {
                    name: 'Michigan',
                    abbreviation: 'MI',
                    slug: 'michigan',
                    dispensaryCount: 500,
                    cityCount: 45,
                    legalStatus: 'recreational',
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'illinois',
                data: {
                    name: 'Illinois',
                    abbreviation: 'IL',
                    slug: 'illinois',
                    dispensaryCount: 200,
                    cityCount: 30,
                    legalStatus: 'recreational',
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // Write all pages
        const batch = firestore.batch();

        for (const page of zipPages) {
            batch.set(configRef.collection('zip_pages').doc(page.id), page.data);
        }
        for (const page of dispensaryPages) {
            batch.set(configRef.collection('dispensary_pages').doc(page.id), page.data);
        }
        for (const page of brandPages) {
            batch.set(configRef.collection('brand_pages').doc(page.id), page.data);
        }
        for (const page of cityPages) {
            batch.set(configRef.collection('city_pages').doc(page.id), page.data);
        }
        for (const page of statePages) {
            batch.set(configRef.collection('state_pages').doc(page.id), page.data);
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            created: {
                zipPages: zipPages.length,
                dispensaryPages: dispensaryPages.length,
                brandPages: brandPages.length,
                cityPages: cityPages.length,
                statePages: statePages.length
            }
        });
    } catch (e: any) {
        console.error('Error seeding pages:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
