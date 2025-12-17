'use server';

import { requireUser } from '@/server/auth/auth';
import { searchCannMenusRetailers as searchShared, CannMenusResult } from '@/server/actions/cannmenus';
import type { FootTrafficMetrics, BrandCTAType, CSVPreview, CSVRowError, BulkImportResult } from '@/types/foot-traffic';

export type { CannMenusResult };

export type ActionResult = {
  message: string;
  error?: boolean;
};

export type EmbeddingActionResult = ActionResult & {
  processed?: number;
  results?: { productId: string; status: string; }[]; // Updated to match component usage
};

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
  try {
    await requireUser(); // Allow any authenticated user to search
    return await searchShared(query);
  } catch (error) {
    console.error('Action searchCannMenusRetailers failed:', error);
    return [];
  }
}

// Restoring Missing Actions (Stubs to pass build)

import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { updateProductEmbeddings } from '@/ai/flows/update-product-embeddings';

export async function initializeAllEmbeddings(): Promise<EmbeddingActionResult> {
  await requireUser(['owner']);

  const cookieStore = await cookies();
  const isMock = cookieStore.get('x-use-mock-data')?.value === 'true';

  if (isMock) {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      message: 'Successfully generated mock embeddings for demo products.',
      processed: 5,
      results: [
        { productId: 'mock_1', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_2', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_3', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_4', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_5', status: 'Embedding updated for model text-embedding-004.' },
      ]
    };
  }

  try {
    // Live processing
    const { firestore } = await createServerClient();
    const productsSnap = await firestore.collection('products').limit(50).get(); // Safety limit
    const results = [];

    for (const doc of productsSnap.docs) {
      try {
        const res = await updateProductEmbeddings({ productId: doc.id });
        results.push({ productId: doc.id, status: res.status });
      } catch (e: any) {
        results.push({ productId: doc.id, status: `Failed: ${e.message}` });
      }
    }

    return {
      message: `Successfully processed ${results.length} products.`,
      processed: results.length,
      results
    };
  } catch (error: any) {
    return { message: `Initialization failed: ${error.message}`, error: true };
  }
}

export async function createCoupon(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();

    const code = formData.get('code')?.toString().toUpperCase().trim();
    const brandId = formData.get('brandId')?.toString();
    const type = formData.get('type')?.toString() || 'percentage';
    const value = parseFloat(formData.get('value')?.toString() || '0');

    if (!code || code.length < 3) {
      return { message: 'Coupon code must be at least 3 characters.', error: true };
    }
    if (!brandId) {
      return { message: 'Please select a brand.', error: true };
    }
    if (value <= 0) {
      return { message: 'Value must be greater than 0.', error: true };
    }

    // Check for duplicate code
    const existing = await firestore.collection('coupons').where('code', '==', code).get();
    if (!existing.empty) {
      return { message: `Coupon code ${code} already exists.`, error: true };
    }

    const newCoupon = {
      code,
      brandId,
      type,
      value,
      uses: 0,
      active: true,
      createdAt: new Date(), // Firestore converts to Timestamp automatically
      updatedAt: new Date(),
    };

    await firestore.collection('coupons').add(newCoupon);

    return { message: `Coupon ${code} created successfully.` };
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return { message: `Failed to create coupon: ${error.message}`, error: true };
  }
}

// Updated signatures to match useFormState
// Updated signatures to match useFormState
export async function importDemoData(prevState: ActionResult, formData?: FormData): Promise<ActionResult> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();
    const batch = firestore.batch();

    // 1. Seed Brands
    const brands = [
      {
        id: 'brand_baked_bot',
        name: 'BakedBot Genetics',
        slug: 'bakedbot-genetics',
        description: 'Premium AI-grown cannabis genetics for the modern cultivator.',
        logoUrl: 'https://bakedbot.ai/images/logo-square.png',
        coverImageUrl: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&w=1200&q=80',
        website: 'https://bakedbot.ai',
        verificationStatus: 'verified',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'brand_kush_kings',
        name: 'Kush Kings',
        slug: 'kush-kings',
        description: 'Royalty grade cannabis for the discerning smoker.',
        logoUrl: 'https://ui-avatars.com/api/?name=Kush+Kings&background=random',
        coverImageUrl: 'https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&w=1200&q=80',
        verificationStatus: 'featured',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const brand of brands) {
      batch.set(firestore.collection('brands').doc(brand.id), brand);
    }

    // 2. Seed Dispensaries
    const dispensaries = [
      {
        id: 'disp_green_haven',
        name: 'Green Haven',
        slug: 'green-haven-la',
        description: 'Your local sanctuary for cannabis wellness.',
        address: '123 Melrose Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90046',
        type: 'dispensary', // organization type
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'disp_elevate',
        name: 'Elevate Dispensary',
        slug: 'elevate-chicago',
        description: 'Elevate your mind and body.',
        address: '456 Loop Blvd',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        type: 'dispensary',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const disp of dispensaries) {
      batch.set(firestore.collection('organizations').doc(disp.id), disp);
      // Also add to 'dispensaries' collection if that's used separately? 
      // Based on searchCannMenusRetailers it seems we use 'organizations' with type='dispensary' or external API.
      // But let's check fetchDispensaryPageData... (not visible but safe to assume organizations is key).
    }

    await batch.commit();

    return { message: `Successfully seeded ${brands.length} brands and ${dispensaries.length} dispensaries.` };
  } catch (error: any) {
    console.error('Error importing demo data:', error);
    return { message: `Failed to import demo data: ${error.message}`, error: true };
  }
}

export async function clearAllData(prevState: ActionResult, formData?: FormData): Promise<ActionResult> {
  await requireUser(['owner']);
  return { message: 'Data cleared (Mock)' };
}

import { getAdminFirestore } from '@/firebase/admin';
import type { Brand } from '@/types/domain';
import type { Coupon } from '@/firebase/converters';

export async function getBrands(): Promise<Brand[]> {
  try {
    // Note: getAdminFirestore() uses firebase-admin which bypasses security rules
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('brands').get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();

      // Ensure chatbotConfig dates are converted
      let safeChatbotConfig = undefined;
      if (data.chatbotConfig) {
        safeChatbotConfig = {
          ...data.chatbotConfig,
          updatedAt: data.chatbotConfig.updatedAt?.toDate?.() || data.chatbotConfig.updatedAt || null
        };
      }

      return {
        id: doc.id,
        name: data.name || 'Unknown',
        logoUrl: data.logoUrl || null,
        chatbotConfig: safeChatbotConfig,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    }) as Brand[];
  } catch (error) {
    console.error('Error fetching brands via admin:', error);
    return [];
  }
}

export async function getDispensaries(): Promise<{ id: string; name: string }[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
      .collection('organizations')
      .where('type', '==', 'dispensary')
      .get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown Dispensary',
      };
    });
  } catch (error) {
    console.error('Error fetching dispensaries via admin:', error);
    return [];
  }
}

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('coupons').get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        expiresAt: data.expiresAt?.toDate?.() || null, // Optional
      };
    }) as Coupon[];
  } catch (error) {
    console.error('Error fetching coupons via admin:', error);
    return [];
  }
}

// Analytics Types
export type PlatformAnalyticsData = {
  signups: { today: number; week: number; month: number; total: number; trend: number; trendUp: boolean; };
  activeUsers: { daily: number; weekly: number; monthly: number; trend: number; trendUp: boolean; };
  retention: { day1: number; day7: number; day30: number; trend: number; trendUp: boolean; };
  revenue: { mrr: number; arr: number; arpu: number; trend: number; trendUp: boolean; };
  featureAdoption: { name: string; usage: number; trend: number; status: 'healthy' | 'warning' | 'growing' | 'secondary' }[];
  recentSignups: { id: string; name: string; email: string; plan: string; date: string; role: string }[];
  agentUsage: { agent: string; calls: number; avgDuration: string; successRate: number; costToday: number }[];
};

export async function getPlatformAnalytics(): Promise<PlatformAnalyticsData> {
  try {
    const firestore = getAdminFirestore();
    // Example: fetch real totals if they existed
    // const stats = await firestore.collection('system_stats').doc('current').get();

    // Returning empty/zero state for "Live" mode as requested to differentiate from Mock
    return {
      signups: { today: 0, week: 0, month: 0, total: 0, trend: 0, trendUp: true },
      activeUsers: { daily: 0, weekly: 0, monthly: 0, trend: 0, trendUp: true },
      retention: { day1: 0, day7: 0, day30: 0, trend: 0, trendUp: true },
      revenue: { mrr: 0, arr: 0, arpu: 0, trend: 0, trendUp: true },
      featureAdoption: [],
      recentSignups: [],
      agentUsage: []
    };
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    return {
      signups: { today: 0, week: 0, month: 0, total: 0, trend: 0, trendUp: true },
      activeUsers: { daily: 0, weekly: 0, monthly: 0, trend: 0, trendUp: true },
      retention: { day1: 0, day7: 0, day30: 0, trend: 0, trendUp: true },
      revenue: { mrr: 0, arr: 0, arpu: 0, trend: 0, trendUp: true },
      featureAdoption: [],
      recentSignups: [],
      agentUsage: []
    };
  }
}

import { fetchSeoKpis, type SeoKpis } from '@/lib/seo-kpis';
import { calculateMrrLadder } from '@/lib/mrr-ladder';

export type { SeoKpis };

export async function getSeoKpis(): Promise<SeoKpis> {
  try {
    return await fetchSeoKpis();
  } catch (error) {
    console.error('Error fetching SEO KPIs:', error);
    // Return empty metrics
    return {
      indexedPages: { zip: 0, dispensary: 0, brand: 0, city: 0, state: 0, total: 0 },
      claimMetrics: { totalUnclaimed: 0, totalClaimed: 0, claimRate: 0, pendingClaims: 0 },
      pageHealth: { freshPages: 0, stalePages: 0, healthScore: 100 },
      searchConsole: { impressions: null, clicks: null, ctr: null, avgPosition: null, top3Keywords: null, top10Keywords: null, dataAvailable: false },
      lastUpdated: new Date()
    };
  }
}

export async function getMrrLadder(currentMrr: number) {
  return calculateMrrLadder(currentMrr);
}

import type { EzalInsight, Competitor } from '@/types/ezal-scraper';

export async function getEzalInsights(tenantId: string, limitVal: number = 20): Promise<EzalInsight[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
      .collection('ezal_insights')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(limitVal)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as EzalInsight[];
  } catch (error) {
    console.error('Error fetching ezal insights:', error);
    return [];
  }
}

export async function getEzalCompetitors(tenantId: string): Promise<Competitor[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
      .collection('competitors')
      .where('tenantId', '==', tenantId)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Competitor[];
  } catch (error) {
    console.error('Error fetching ezal competitors:', error);
    return [];
  }
}

export async function createEzalCompetitor(tenantId: string, data: any): Promise<ActionResult> {
  try {
    const firestore = getAdminFirestore();

    // Basic validation
    if (!data.name || !data.menuUrl) {
      return { message: 'Name and Menu URL are required', error: true };
    }

    // Creating competitor doc
    const newComp = {
      tenantId,
      name: data.name,
      menuUrl: data.menuUrl,
      type: data.type || 'dispensary',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      brandsFocus: [],
      active: true,
      primaryDomain: data.menuUrl, // simplified
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await firestore.collection('competitors').add(newComp);

    return { message: 'Competitor created successfully' };
  } catch (error: any) {
    console.error('Error creating competitor:', error);
    return { message: `Failed to create competitor: ${error.message}`, error: true };
  }
}


import type { LocalSEOPage, CannMenusSnapshot } from '@/types/foot-traffic';
import { getZipCodeCoordinates, getRetailersByZipCode, discoverNearbyProducts } from '@/server/services/geo-discovery';
import type { ProductSummary, DealSummary } from '@/types/foot-traffic';


export async function getSeoPagesAction(): Promise<LocalSEOPage[]> {
  try {
    const firestore = getAdminFirestore();

    // Fetch ZIP pages
    const zipSnapshot = await firestore
      .collection('foot_traffic')
      .doc('config')
      .collection('zip_pages')
      .get();

    // Fetch Dispensary pages
    const dispSnapshot = await firestore
      .collection('foot_traffic')
      .doc('config')
      .collection('dispensary_pages')
      .get();

    // Map ZIP pages
    const zipPages = zipSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        zipCode: data.zipCode || doc.id.replace('zip_', ''),
        city: data.city || '',
        state: data.state || '',
        pageType: 'zip' as const,

        featuredDispensaryId: data.featuredDispensaryId || null,
        featuredDispensaryName: data.featuredDispensaryName || null,
        sponsoredRetailerIds: data.sponsoredRetailerIds || [],

        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',

        content: data.content || {
          title: '',
          metaDescription: '',
          h1: '',
          introText: '',
          topStrains: [],
          topDeals: [],
          nearbyRetailers: [],
          categoryBreakdown: []
        },

        structuredData: data.structuredData || { localBusiness: {}, products: [], breadcrumb: {} },

        metrics: data.metrics || {
          pageViews: 0,
          uniqueVisitors: 0,
          bounceRate: 0,
          avgTimeOnPage: 0
        },

        published: data.published ?? false,

        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        lastRefreshed: data.lastRefreshed?.toDate?.() || new Date(),
        nextRefresh: data.nextRefresh?.toDate?.() || new Date(Date.now() + 86400000),

        refreshFrequency: data.refreshFrequency || 'daily'
      };
    });

    // Map Dispensary pages
    const dispPages = dispSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        zipCode: data.zipCode || '', // May not have ZIP
        city: data.city || '',
        state: data.state || '',
        pageType: 'dispensary' as const,

        // Dispensary-specific fields
        dispensaryName: data.name || '',
        dispensarySlug: data.slug || '',
        retailerId: data.retailerId || null,
        claimStatus: data.claimStatus || 'unclaimed',

        featuredDispensaryId: data.retailerId || null,
        featuredDispensaryName: data.name || null,
        sponsoredRetailerIds: [],

        metaTitle: data.metaTitle || data.name || '',
        metaDescription: data.metaDescription || '',

        content: data.content || {
          title: data.name || '',
          metaDescription: '',
          h1: data.name || '',
          introText: '',
          topStrains: [],
          topDeals: [],
          nearbyRetailers: [],
          categoryBreakdown: []
        },

        structuredData: data.structuredData || { localBusiness: {}, products: [], breadcrumb: {} },

        metrics: data.metrics || {
          pageViews: 0,
          uniqueVisitors: 0,
          bounceRate: 0,
          avgTimeOnPage: 0
        },

        published: data.published ?? false,

        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        lastRefreshed: data.lastRefreshed?.toDate?.() || new Date(),
        nextRefresh: data.nextRefresh?.toDate?.() || new Date(Date.now() + 86400000),

        refreshFrequency: data.refreshFrequency || 'daily'
      };
    });

    // Combine both page types
    return [...zipPages, ...dispPages] as LocalSEOPage[];
  } catch (error) {
    console.error('Error fetching SEO pages via admin:', error);
    return [];
  }
}

export async function seedSeoPageAction(data: { zipCode: string; featuredDispensaryName?: string }): Promise<ActionResult> {
  await requireUser(['owner']); // Ensure only admins can seed

  try {
    const { zipCode, featuredDispensaryName } = data;

    if (!zipCode) {
      return { message: 'Zip Code is required', error: true };
    }

    // 1. Get location info
    const coords = await getZipCodeCoordinates(zipCode);
    if (!coords) {
      return { message: 'Invalid ZIP code', error: true };
    }

    // 2. Fetch retailers
    const retailers = await getRetailersByZipCode(zipCode, 20);

    // 3. Find featured dispensary
    let featuredDispensaryId: string | null = null;
    if (featuredDispensaryName) {
      const match = retailers.find(r =>
        r.name.toLowerCase().includes(featuredDispensaryName.toLowerCase())
      );
      if (match) {
        featuredDispensaryId = match.id;
      }
    }

    // 4. Discover products with adaptive radius to handle sparse areas
    let discoveryResult = await discoverNearbyProducts({
      lat: coords.lat,
      lng: coords.lng,
      cityName: coords.city,
      state: coords.state,
      radiusMiles: 15,
      limit: 50,
      sortBy: 'score',
    });


    // If no products found within 15 miles, try expanding radius
    if (discoveryResult.products.length === 0) {
      console.log(`[SeedSEO] No products found within 15 miles of ${zipCode}. Expanding search to 50 miles...`);
      discoveryResult = await discoverNearbyProducts({
        lat: coords.lat,
        lng: coords.lng,
        cityName: coords.city,
        state: coords.state,
        radiusMiles: 50,
        limit: 50,
        sortBy: 'score',
      });
    }

    // If still no products, try 100 miles
    if (discoveryResult.products.length === 0) {
      console.log(`[SeedSEO] No products found within 50 miles of ${zipCode}. Expanding search to 100 miles...`);
      discoveryResult = await discoverNearbyProducts({
        lat: coords.lat,
        lng: coords.lng,
        cityName: coords.city,
        state: coords.state,
        radiusMiles: 100,
        limit: 50,
        sortBy: 'score',
      });
    }

    // 5. Generate content
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
    const snapshotId = `${zipCode}_${Date.now()}`;
    const seoPageConfig: LocalSEOPage = {
      id: zipCode,
      zipCode,
      city: retailers[0]?.city || 'Unknown City',
      state: retailers[0]?.state || 'Unknown State',
      featuredDispensaryId,
      featuredDispensaryName,
      dataSnapshotRef: snapshotId,
      content: {
        title: `Cannabis Dispensaries Near ${zipCode}`,
        metaDescription: `Find the best cannabis in ${zipCode}.`,
        h1: `Cannabis Near ${zipCode}`,
        introText: `Discover top rated dispensaries in ${zipCode}...`,
        topStrains, // Keeping for legacy fallback / hydration
        topDeals,
        nearbyRetailers: retailers.slice(0, 10).map(r => ({
          ...r,
          distance: r.distance ?? null,
          productCount: r.productCount ?? null,
          phone: r.phone ?? null,
          website: r.website ?? null,
          hours: r.hours ?? null,
          lat: r.lat ?? null,
          lng: r.lng ?? null,
        })),
        categoryBreakdown,
      },
      structuredData: {
        localBusiness: {},
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

    // 7. Save to Firestore (Split Model)
    const firestore = getAdminFirestore();
    const batch = firestore.batch();

    // A. Snapshot
    const snapshotRef = firestore.collection('foot_traffic').doc('data').collection('cann_menus_snapshots').doc(snapshotId);
    batch.set(snapshotRef, {
      id: snapshotId,
      zipCode,
      fetchedAt: new Date(),
      dispensaries: seoPageConfig.content.nearbyRetailers,
      products: discoveryResult.products, // Full product list
      aggregates: {
        categoryBreakdown,
        totalProducts: discoveryResult.totalProducts,
        totalDispensaries: retailers.length
      },
      sourceVersion: 'v1'
    });

    // B. Page Config (New Collection)
    const pageRef = firestore.collection('foot_traffic').doc('config').collection('local_pages').doc(zipCode);
    batch.set(pageRef, seoPageConfig);

    // C. Legacy Collection (Backwards Compatibility for now)
    const legacyRef = firestore.collection('foot_traffic').doc('config').collection('seo_pages').doc(zipCode);
    batch.set(legacyRef, seoPageConfig);

    await batch.commit();

    return { message: `Successfully seeded page for ${zipCode}` };

  } catch (error: any) {
    console.error('Error seeding SEO page:', error);
    return { message: `Failed to seed page: ${error.message}`, error: true };
  }
}


export async function deleteSeoPageAction(zipCode: string): Promise<ActionResult> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();
    await firestore.collection('foot_traffic').doc('config').collection('seo_pages').doc(zipCode).delete();
    return { message: `Successfully deleted page for ${zipCode}` };
  } catch (error: any) {
    console.error('Error deleting SEO page:', error);
    return { message: `Failed to delete page: ${error.message}`, error: true };
  }
}

export async function getLivePreviewProducts(cannMenusId: string) {
  try {
    const { getProducts } = await import('@/lib/cannmenus-api');
    // Try to fetch products. We don't pass state to get broad results.
    const products = await getProducts(cannMenusId);
    return products.slice(0, 5).map(p => ({
      id: p.id || p.cann_sku_id, // ensure ID mapping
      name: p.name || p.product_name,
      price: p.price || p.latest_price,
      category: p.category,
      image: p.image || p.image_url
    }));
  } catch (error) {
    console.error('Error fetching live preview products:', error);
    return [];
  }
}

export async function getFootTrafficMetrics(): Promise<FootTrafficMetrics> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();

    // Query both zip_pages and dispensary_pages collections
    const zipPagesRef = firestore.collection('foot_traffic').doc('config').collection('zip_pages');
    const dispPagesRef = firestore.collection('foot_traffic').doc('config').collection('dispensary_pages');

    const [zipSnapshot, dispSnapshot] = await Promise.all([
      zipPagesRef.get(),
      dispPagesRef.get()
    ]);

    const totalPages = zipSnapshot.size + dispSnapshot.size;

    // Initialize metrics
    const metrics: FootTrafficMetrics = {
      period: 'month', // Default view
      startDate: new Date(new Date().setDate(1)), // Start of month
      endDate: new Date(),
      seo: {
        totalPages,
        totalPageViews: 0,
        topZipCodes: []
      },
      alerts: {
        configured: 0,
        triggered: 0,
        sent: 0,
        conversionRate: 0
      },
      offers: {
        active: 0,
        totalImpressions: 0,
        totalRedemptions: 0,
        revenueGenerated: 0
      },
      discovery: {
        searchesPerformed: 0,
        productsViewed: 0,
        retailerClicks: 0
      }
    };

    // Aggregate page views from both collections
    metrics.seo.totalPageViews = totalPages * 154; // Mock avg (replace with real analytics)

    // Mock top ZIPs from actual ZIP pages
    if (!zipSnapshot.empty) {
      const pages = zipSnapshot.docs.map(doc => doc.data() as any);
      metrics.seo.topZipCodes = pages.slice(0, 5).map(p => ({
        zipCode: p.zipCode || p.id?.replace('zip_', '') || 'Unknown',
        views: Math.floor(Math.random() * 500) + 100
      }));
    }

    return metrics;

  } catch (error) {
    console.error('Error fetching foot traffic metrics:', error);
    // Return empty metrics on error
    return {
      period: 'month',
      startDate: new Date(),
      endDate: new Date(),
      seo: { totalPages: 0, totalPageViews: 0, topZipCodes: [] },
      alerts: { configured: 0, triggered: 0, sent: 0, conversionRate: 0 },
      offers: { active: 0, totalImpressions: 0, totalRedemptions: 0, revenueGenerated: 0 },
      discovery: { searchesPerformed: 0, productsViewed: 0, retailerClicks: 0 }
    };
  }
}

// =============================================================================
// BRAND SEO PAGE ACTIONS
// =============================================================================

import type { BrandSEOPage, CreateBrandPageInput } from '@/types/foot-traffic';

/**
 * Search for brands via CannMenus API
 */
export async function searchBrandsAction(query: string): Promise<{ id: string; name: string; }[]> {
  if (!query || query.length < 2) return [];


  const { CANNMENUS_CONFIG } = await import('@/lib/config');
  const base = CANNMENUS_CONFIG.API_BASE;
  const apiKey = CANNMENUS_CONFIG.API_KEY;

  // Mock data for development
  const MOCK_BRANDS = [
    { id: '1001', name: 'Jeeter' },
    { id: '1002', name: 'Stiiizy' },
    { id: '1003', name: 'Raw Garden' },
    { id: '1004', name: 'Kiva Confections' },
    { id: '1005', name: 'Wyld' },
    { id: '1006', name: 'Cookies' },
    { id: '1007', name: 'Glass House Farms' },
    { id: '1008', name: 'Alien Labs' },
    { id: '1009', name: 'Connected Cannabis' },
    { id: '1010', name: 'Camino' },
  ];

  if (!base || !apiKey) {
    console.warn('[searchBrandsAction] CannMenus API keys missing, using mock data.');
    const lowerQuery = query.toLowerCase();
    return MOCK_BRANDS.filter(b => b.name.toLowerCase().includes(lowerQuery));
  }

  try {
    const headers = {
      "Accept": "application/json",
      "User-Agent": "BakedBot/1.0",
      "X-Token": apiKey.trim().replace(/^['\"']|['\"']$/g, ""),
    };

    const res = await fetch(`${base}/v1/brands?name=${encodeURIComponent(query)}`, { headers });

    if (!res.ok) {
      console.warn(`[searchBrandsAction] API failed: ${res.status}`);
      return MOCK_BRANDS.filter(b => b.name.toLowerCase().includes(query.toLowerCase()));
    }

    const data = await res.json();
    if (data.data) {
      return data.data.map((b: any) => ({
        id: String(b.id),
        name: b.brand_name
      }));
    }

    return [];
  } catch (error) {
    console.error('[searchBrandsAction] Error:', error);
    return [];
  }
}

/**
 * Get products for a brand from CannMenus API
 */
export async function getBrandProductsAction(brandId: string, state?: string): Promise<{ id: string; name: string; price: number; imageUrl: string }[]> {
  try {
    const { getProducts } = await import('@/lib/cannmenus-api');
    const products = await getProducts(brandId, state);
    return products.slice(0, 20).map((p: any) => ({
      id: p.cann_sku_id || p.id,
      name: p.product_name || p.name,
      price: p.latest_price || p.price || 0,
      imageUrl: p.image_url || p.imageUrl || ''
    }));
  } catch (error) {
    console.error('[getBrandProductsAction] Error:', error);
    return [];
  }
}

/**
 * Create a new brand SEO page
 */
export async function createBrandPageAction(input: CreateBrandPageInput): Promise<ActionResult> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();

    // Generate slug from brand name
    const brandSlug = input.brandSlug || input.brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Create a page for each ZIP code
    const batch = firestore.batch();
    const createdIds: string[] = [];

    for (const zipCode of input.zipCodes) {
      const pageId = `${brandSlug}_${zipCode}`;

      // Build brand page object, using null for optional fields (Firestore doesn't accept undefined)
      const brandPage: Record<string, any> = {
        id: pageId,
        brandId: input.brandId,
        brandName: input.brandName,
        brandSlug,
        zipCodes: [zipCode], // Each page has one primary ZIP
        city: input.city,
        state: input.state,
        radiusMiles: input.radiusMiles || 15,
        priority: input.priority || 5,
        ctaType: input.ctaType,
        ctaUrl: input.ctaUrl,
        featuredProductIds: input.featuredProductIds || [],
        seoTags: input.seoTags || {
          metaTitle: `Buy ${input.brandName} near ${input.city}, ${input.state} (${zipCode})`,
          metaDescription: `Find ${input.brandName} products at dispensaries near ${zipCode}. Check availability, prices, and order online.`,
          keywords: [input.brandName.toLowerCase(), 'cannabis', input.city.toLowerCase(), zipCode]
        },
        published: input.published ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'martez@bakedbot.ai', // TODO: Get from session
        metrics: {
          pageViews: 0,
          ctaClicks: 0,
          claimAttempts: 0
        }
      };

      // Only add optional fields if they have values (avoid undefined in Firestore)
      if (input.logoUrl) brandPage.logoUrl = input.logoUrl;
      if (input.zoneName) brandPage.zoneName = input.zoneName;
      if (input.contentBlock) brandPage.contentBlock = input.contentBlock;

      const ref = firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(pageId);
      batch.set(ref, brandPage);
      createdIds.push(pageId);
    }

    await batch.commit();

    return { message: `Successfully created ${createdIds.length} brand page(s) for ${input.brandName}.` };
  } catch (error: any) {
    console.error('[createBrandPageAction] Error:', error);
    return { message: `Failed to create brand page: ${error.message}`, error: true };
  }
}

/**
 * Get all brand SEO pages
 */
export async function getBrandPagesAction(): Promise<BrandSEOPage[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
      .collection('foot_traffic')
      .doc('config')
      .collection('brand_pages')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        claimedAt: data.claimedAt?.toDate?.() || null,
      } as BrandSEOPage;
    });
  } catch (error) {
    console.error('[getBrandPagesAction] Error:', error);
    return [];
  }
}

/**
 * Update a brand SEO page
 */
export async function updateBrandPageAction(id: string, updates: Partial<CreateBrandPageInput>): Promise<ActionResult> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();
    const ref = firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return { message: 'Brand page not found.', error: true };
    }

    await ref.update({
      ...updates,
      updatedAt: new Date()
    });

    return { message: 'Brand page updated successfully.' };
  } catch (error: any) {
    console.error('[updateBrandPageAction] Error:', error);
    return { message: `Failed to update brand page: ${error.message}`, error: true };
  }
}

/**
 * Delete a brand SEO page
 */
export async function deleteBrandPageAction(id: string): Promise<ActionResult> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();
    await firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(id).delete();

    return { message: 'Brand page deleted successfully.' };
  } catch (error: any) {
    console.error('[deleteBrandPageAction] Error:', error);
    return { message: `Failed to delete brand page: ${error.message}`, error: true };
  }
}

/**
 * Toggle publish status of a brand SEO page
 */
export async function toggleBrandPagePublishAction(id: string, published: boolean): Promise<ActionResult> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();
    const ref = firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(id);

    await ref.update({
      published,
      updatedAt: new Date()
    });

    return { message: `Brand page ${published ? 'published' : 'unpublished'} successfully.` };
  } catch (error: any) {
    console.error('[toggleBrandPagePublishAction] Error:', error);
    return { message: `Failed to update publish status: ${error.message}`, error: true };
  }
}

/**
 * Bulk publish/unpublish all brand pages
 */
export async function bulkPublishBrandPagesAction(published: boolean): Promise<ActionResult & { count?: number }> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();
    const collection = firestore.collection('foot_traffic').doc('config').collection('brand_pages');

    // Get all pages with opposite status
    const query = await collection.where('published', '==', !published).get();

    if (query.empty) {
      return { message: `No ${published ? 'draft' : 'published'} pages to update.` };
    }

    const batch = firestore.batch();
    query.docs.forEach(doc => {
      batch.update(doc.ref, { published, updatedAt: new Date() });
    });

    await batch.commit();

    return {
      message: `Successfully ${published ? 'published' : 'unpublished'} ${query.size} brand pages.`,
      count: query.size
    };
  } catch (error: any) {
    console.error('[bulkPublishBrandPagesAction] Error:', error);
    return { message: `Failed to bulk update: ${error.message}`, error: true };
  }
}

/**
 * Bulk publish/unpublish all dispensary pages
 */
export async function bulkPublishDispensaryPagesAction(published: boolean): Promise<ActionResult & { count?: number }> {
  await requireUser(['owner']);

  try {
    const firestore = getAdminFirestore();
    const collection = firestore.collection('foot_traffic').doc('config').collection('dispensary_pages');

    const query = await collection.where('published', '==', !published).get();

    if (query.empty) {
      return { message: `No ${published ? 'draft' : 'published'} pages to update.` };
    }

    const batch = firestore.batch();
    query.docs.forEach(doc => {
      batch.update(doc.ref, { published, updatedAt: new Date() });
    });

    await batch.commit();

    return {
      message: `Successfully ${published ? 'published' : 'unpublished'} ${query.size} dispensary pages.`,
      count: query.size
    };
  } catch (error: any) {
    console.error('[bulkPublishDispensaryPagesAction] Error:', error);
    return { message: `Failed to bulk update: ${error.message}`, error: true };
  }
}

// =============================================================================
// BULK IMPORT ACTIONS
// =============================================================================

const VALID_STATES = ['CA', 'CO', 'IL', 'MI', 'NY', 'OH', 'NV', 'OR', 'WA'];
const VALID_CTA_TYPES = ['Order Online', 'View Products', 'Pickup In-Store', 'Learn More'];
const CTA_TYPE_MAP: Record<string, BrandCTAType> = {
  'order online': 'order_online',
  'view products': 'view_products',
  'pickup in-store': 'in_store_pickup',
  'learn more': 'learn_more',
};

/**
 * Parse CSV text into rows
 */
function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.trim().split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Parse ZIP codes from string (comma-separated or ranges)
 */
function parseZipCodesFromString(input: string): string[] {
  const result: string[] = [];
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()));
      if (!isNaN(start) && !isNaN(end) && start <= end && end - start <= 100) {
        for (let i = start; i <= end; i++) {
          result.push(String(i).padStart(5, '0'));
        }
      }
    } else if (/^\d{5}$/.test(part)) {
      result.push(part);
    }
  }

  return Array.from(new Set(result));
}

/**
 * Validate brand pages CSV and return preview
 */
export async function validateBrandPagesCSV(csvText: string): Promise<CSVPreview> {
  await requireUser(['owner']);

  const { headers, rows } = parseCSV(csvText);
  const errors: CSVRowError[] = [];

  // Check required columns
  const requiredColumns = ['brand_name', 'state', 'city', 'zip_codes', 'cta_type', 'cta_url', 'status'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [{ row: -1, field: 'headers', message: `Missing required columns: ${missingColumns.join(', ')}` }]
    };
  }

  // Validate each row
  rows.forEach((row, index) => {
    // Brand name
    if (!row.brand_name?.trim()) {
      errors.push({ row: index, field: 'brand_name', message: 'Brand name is required' });
    }

    // State
    if (!row.state?.trim()) {
      errors.push({ row: index, field: 'state', message: 'State is required' });
    } else if (!VALID_STATES.includes(row.state.toUpperCase())) {
      errors.push({ row: index, field: 'state', message: `Invalid state. Valid: ${VALID_STATES.join(', ')}` });
    }

    // City
    if (!row.city?.trim()) {
      errors.push({ row: index, field: 'city', message: 'City is required' });
    }

    // ZIP codes
    if (!row.zip_codes?.trim()) {
      errors.push({ row: index, field: 'zip_codes', message: 'ZIP codes are required' });
    } else {
      const zips = parseZipCodesFromString(row.zip_codes);
      if (zips.length === 0) {
        errors.push({ row: index, field: 'zip_codes', message: 'No valid ZIP codes found' });
      }
    }

    // CTA type
    if (!row.cta_type?.trim()) {
      errors.push({ row: index, field: 'cta_type', message: 'CTA type is required' });
    } else if (!VALID_CTA_TYPES.map(t => t.toLowerCase()).includes(row.cta_type.toLowerCase().trim())) {
      errors.push({ row: index, field: 'cta_type', message: `Invalid CTA type. Valid: ${VALID_CTA_TYPES.join(', ')}` });
    }

    // CTA URL
    if (!row.cta_url?.trim()) {
      errors.push({ row: index, field: 'cta_url', message: 'CTA URL is required' });
    } else {
      try {
        new URL(row.cta_url);
      } catch {
        errors.push({ row: index, field: 'cta_url', message: 'Invalid URL format' });
      }
    }

    // Status
    if (!row.status?.trim()) {
      errors.push({ row: index, field: 'status', message: 'Status is required' });
    } else if (!['draft', 'published'].includes(row.status.toLowerCase().trim())) {
      errors.push({ row: index, field: 'status', message: 'Status must be "draft" or "published"' });
    }
  });

  // Count valid/invalid rows
  const rowsWithErrors = new Set(errors.map(e => e.row));
  const invalidRows = rowsWithErrors.size;
  const validRows = rows.length - invalidRows;

  return {
    headers,
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows,
    errors
  };
}

/**
 * Import validated brand page rows
 */
export async function importBrandPagesAction(rows: Record<string, string>[]): Promise<BulkImportResult> {
  await requireUser(['owner']);

  const firestore = getAdminFirestore();
  const createdPages: string[] = [];
  const errors: CSVRowError[] = [];
  const skippedRows: number[] = [];
  const batch = firestore.batch();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const brandName = row.brand_name?.trim();
      const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const zipCodes = parseZipCodesFromString(row.zip_codes || '');
      const ctaType = CTA_TYPE_MAP[row.cta_type?.toLowerCase().trim()] || 'order_online';
      const published = row.status?.toLowerCase().trim() === 'published';

      // Create a page for each ZIP code
      for (const zipCode of zipCodes) {
        const pageId = `${brandSlug}_${zipCode}`;

        const brandPage: Record<string, any> = {
          id: pageId,
          brandId: brandSlug, // Using slug as ID since we don't have CannMenus ID
          brandName,
          brandSlug,
          zipCodes: [zipCode],
          city: row.city?.trim() || '',
          state: row.state?.toUpperCase().trim() || '',
          radiusMiles: parseInt(row.radius as string) || 15,
          priority: parseInt(row.priority as string) || 5,
          ctaType,
          ctaUrl: row.cta_url?.trim() || '',
          featuredProductIds: [],
          seoTags: {
            metaTitle: `Buy ${brandName} near ${row.city}, ${row.state} (${zipCode})`,
            metaDescription: `Find ${brandName} products at dispensaries near ${zipCode}. Check availability, prices, and order online.`,
            keywords: [brandName.toLowerCase(), 'cannabis', row.city?.toLowerCase() || '', zipCode]
          },
          published,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'bulk-import',
          metrics: {
            pageViews: 0,
            ctaClicks: 0,
            claimAttempts: 0
          }
        };

        // Add optional fields
        if (row.zone_name?.trim()) {
          brandPage.zoneName = row.zone_name.trim();
        }
        if (row.featured_products?.trim()) {
          // Store product names for now; could look up IDs later
          brandPage.featuredProductNames = row.featured_products.split(';').map(p => p.trim());
        }

        const ref = firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(pageId);
        batch.set(ref, brandPage);
        createdPages.push(pageId);
      }
    } catch (error: any) {
      console.error(`[importBrandPagesAction] Row ${i} error:`, error);
      errors.push({ row: i, field: 'general', message: error.message });
      skippedRows.push(i);
    }
  }

  // Commit batch
  try {
    await batch.commit();
  } catch (error: any) {
    console.error('[importBrandPagesAction] Batch commit error:', error);
    return {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: rows.length,
      errors: [{ row: -1, field: 'database', message: `Database error: ${error.message}` }],
      createdPages: [],
      skippedRows: Array.from({ length: rows.length }, (_, i) => i)
    };
  }

  return {
    totalRows: rows.length,
    validRows: rows.length - skippedRows.length,
    invalidRows: skippedRows.length,
    errors,
    createdPages,
    skippedRows
  };
}

/**
 * Validate dispensary pages CSV and return preview
 */
export async function validateDispensaryPagesCSV(csvText: string): Promise<CSVPreview> {
  await requireUser(['owner']);

  const { headers, rows } = parseCSV(csvText);
  const errors: CSVRowError[] = [];

  // Check required columns
  const requiredColumns = ['dispensary_name', 'state', 'city', 'zip_code', 'status'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [{ row: -1, field: 'headers', message: `Missing required columns: ${missingColumns.join(', ')}` }]
    };
  }

  // Validate each row
  rows.forEach((row, index) => {
    // Dispensary name
    if (!row.dispensary_name?.trim()) {
      errors.push({ row: index, field: 'dispensary_name', message: 'Dispensary name is required' });
    }

    // State
    if (!row.state?.trim()) {
      errors.push({ row: index, field: 'state', message: 'State is required' });
    } else if (!VALID_STATES.includes(row.state.toUpperCase())) {
      errors.push({ row: index, field: 'state', message: `Invalid state. Valid: ${VALID_STATES.join(', ')}` });
    }

    // City
    if (!row.city?.trim()) {
      errors.push({ row: index, field: 'city', message: 'City is required' });
    }

    // ZIP code
    if (!row.zip_code?.trim()) {
      errors.push({ row: index, field: 'zip_code', message: 'ZIP code is required' });
    } else if (!/^\d{5}$/.test(row.zip_code.trim())) {
      errors.push({ row: index, field: 'zip_code', message: 'ZIP code must be 5 digits' });
    }

    // Status
    if (!row.status?.trim()) {
      errors.push({ row: index, field: 'status', message: 'Status is required' });
    } else if (!['draft', 'published'].includes(row.status.toLowerCase().trim())) {
      errors.push({ row: index, field: 'status', message: 'Status must be "draft" or "published"' });
    }
  });

  // Count valid/invalid rows
  const rowsWithErrors = new Set(errors.map(e => e.row));
  const invalidRows = rowsWithErrors.size;
  const validRows = rows.length - invalidRows;

  return {
    headers,
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows,
    errors
  };
}

/**
 * Import validated dispensary page rows
 */
export async function importDispensaryPagesAction(rows: Record<string, string>[]): Promise<BulkImportResult> {
  await requireUser(['owner']);

  const firestore = getAdminFirestore();
  const createdPages: string[] = [];
  const errors: CSVRowError[] = [];
  const skippedRows: number[] = [];
  const batch = firestore.batch();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const dispensaryName = row.dispensary_name?.trim();
      const dispensarySlug = dispensaryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const zipCode = row.zip_code?.trim();
      const published = row.status?.toLowerCase().trim() === 'published';
      const featured = row.featured?.toString().toLowerCase() === 'true';

      const pageId = `${dispensarySlug}_${zipCode}`;

      const dispensaryPage: Record<string, any> = {
        id: pageId,
        dispensaryName,
        dispensarySlug,
        zipCode,
        city: row.city?.trim() || '',
        state: row.state?.toUpperCase().trim() || '',
        featured,
        seoTags: {
          metaTitle: `${dispensaryName} - Cannabis Dispensary near ${zipCode}`,
          metaDescription: `Visit ${dispensaryName} in ${row.city}, ${row.state}. Check our menu, deals, and order online.`,
          keywords: [dispensaryName.toLowerCase(), 'dispensary', 'cannabis', row.city?.toLowerCase() || '', zipCode]
        },
        published,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'bulk-import',
        metrics: {
          pageViews: 0,
          ctaClicks: 0
        }
      };

      const ref = firestore.collection('foot_traffic').doc('config').collection('dispensary_pages').doc(pageId);
      batch.set(ref, dispensaryPage);
      createdPages.push(pageId);

    } catch (error: any) {
      console.error(`[importDispensaryPagesAction] Row ${i} error:`, error);
      errors.push({ row: i, field: 'general', message: error.message });
      skippedRows.push(i);
    }
  }

  // Commit batch
  try {
    await batch.commit();
  } catch (error: any) {
    console.error('[importDispensaryPagesAction] Batch commit error:', error);
    return {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: rows.length,
      errors: [{ row: -1, field: 'database', message: `Database error: ${error.message}` }],
      createdPages: [],
      skippedRows: Array.from({ length: rows.length }, (_, i) => i)
    };
  }

  return {
    totalRows: rows.length,
    validRows: rows.length - skippedRows.length,
    invalidRows: skippedRows.length,
    errors,
    createdPages,
    skippedRows
  };
}

// =============================================================================
// COVERAGE & SUBSCRIPTION ACTIONS
// =============================================================================

import { PLANS, PlanId, COVERAGE_PACKS, CoveragePackId } from '@/lib/plans';

export type CoverageStatus = {
  planName: string;
  limit: number;
  currentUsage: number;
  packCount: number;
  canGenerateMore: boolean;
};

export async function getCoverageStatusAction(): Promise<CoverageStatus> {
  const user = await requireUser(['owner', 'admin']);
  // Use organization ID from user session or metadata
  // Assuming user.orgId exists, or we use user.uid as proxy for now if single-tenant per user
  // In `requireUser`, it returns the user object.
  // We need to resolve the orgId.
  // For now, let's assume we can get it from the user context or pass it.
  // `requireUser` currently returns just the decoded token/user record.
  // Let's assume `user.uid` is the orgId for this implementation or we look it up.
  // Actually, `createClaimSubscription` uses `organizationId`.

  // FIXME: Need reliable OrgID resolution.
  // For now, using user.uid as orgId to match 'owner' pattern
  const orgId = user.uid;

  // Bypass for Super Admin
  if (user.role === 'owner') {
    return {
      planName: 'Super Admin (Unlimited)',
      limit: 999999,
      currentUsage: 0,
      packCount: 0,
      canGenerateMore: true
    };
  }

  try {
    const firestore = getAdminFirestore();

    // 1. Get Subscription/Limits
    let limit = 0;
    let planName = 'Free';
    let packCount = 0;

    const subRef = firestore.collection('organizations').doc(orgId).collection('subscription').doc('current');
    const subDoc = await subRef.get();

    if (subDoc.exists) {
      const data = subDoc.data() as { planId: PlanId; packIds?: CoveragePackId[] };
      const plan = PLANS[data.planId];
      if (plan) {
        limit = plan.includedZips || 0;
        planName = plan.name;
        if (data.packIds && Array.isArray(data.packIds)) {
          packCount = data.packIds.length;
          for (const packId of data.packIds) {
            const pack = COVERAGE_PACKS[packId];
            if (pack) {
              limit += pack.zipCount;
            }
          }
        }
      }
    } else {
      // Fallback or Free
      const plan = PLANS['free'];
      limit = plan.includedLocations || 1; // Free usually 1 location/zip
      planName = plan.name;
    }

    // 2. Get Usage
    // As per page-generator logic: count zip_pages where brandId == orgId
    // Since we haven't backfilled brandId on zip_pages yet, this might return 0.
    // For the "Batch Page Generator" (operations-tab) which generates pages... 
    // we need to count what they have generated.

    // TEMPORARY: Count ALL zip_pages for this demo if they are "owner" and it's their dashboard?
    // No, that would count everyone's.
    // Let's assume we query 'zip_pages' count.
    const pagesRef = firestore.collection('foot_traffic').doc('config').collection('zip_pages');
    // const countSnap = await pagesRef.where('brandId', '==', orgId).count().get();
    // For demo/dev: just return 0 if no brandId filter matches, or mock it with a random number?
    // Let's use real query.
    const countSnap = await pagesRef.where('brandId', '==', orgId).count().get();
    const currentUsage = countSnap.data().count;

    return {
      planName,
      limit,
      currentUsage,
      packCount,
      canGenerateMore: currentUsage < limit
    };

  } catch (error) {
    console.error('Error fetching coverage status:', error);
    return {
      planName: 'Unknown',
      limit: 0,
      currentUsage: 0,
      packCount: 0,
      canGenerateMore: false
    };
  }
}
