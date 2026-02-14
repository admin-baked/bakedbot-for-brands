import { MetadataRoute } from 'next';
import { createServerClient } from '@/firebase/server-client';

const BASE_URL = 'https://bakedbot.ai';

/**
 * Optimized sitemap with proper SEO priority hierarchy:
 * - 1.0: Homepage
 * - 0.9: Conversion/high-value pages
 * - 0.8: Dynamic content (brands, dispensaries)
 * - 0.7: Discovery/product pages
 * - 0.6: Trust/legal pages
 * - 0.5: Resource pages
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const { firestore } = await createServerClient();

    // 1. Homepage (Highest Priority)
    const homepage = [
      {
        url: BASE_URL,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 1.0,
      },
    ];

    // 2. Conversion Pages (High Priority - these drive revenue)
    const conversionPages = [
      '/pricing',
      '/free-audit',
      '/get-started',
      '/claim',
      '/demo',
    ].map((route) => ({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

    // 3. Product/Feature Pages
    const productPages = [
      '/menu',
      '/product-locator',
      '/local',
      '/onboarding/passport',
    ].map((route) => ({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // 4. Trust/Legal Pages
    const trustPages = [
      '/terms',
      '/privacy',
      '/contact',
      '/case-studies',
    ].map((route) => ({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    // 5. Dynamic Brands (Index + Individual)
    let brandRoutes: MetadataRoute.Sitemap = [];
    try {
      // Brands index page
      brandRoutes.push({
        url: `${BASE_URL}/brands`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      });

      const brandsSnapshot = await firestore
        .collection('brands')
        .select('slug', 'updatedAt')
        .limit(1000)
        .get();

      brandRoutes = brandRoutes.concat(
        brandsSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            if (!data.slug) return null;
            return {
              url: `${BASE_URL}/brands/${data.slug}`,
              lastModified:
                typeof data.updatedAt?.toDate === 'function'
                  ? data.updatedAt.toDate()
                  : new Date(),
              changeFrequency: 'daily' as const,
              priority: 0.8,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      );
    } catch (e) {
      console.error('[Sitemap] Failed to fetch brands:', e);
    }

    // 6. Dynamic Dispensaries (Index + Individual)
    let retailerRoutes: MetadataRoute.Sitemap = [];
    try {
      // Dispensaries index page
      retailerRoutes.push({
        url: `${BASE_URL}/dispensaries`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      });

      const retailersSnapshot = await firestore
        .collection('retailers')
        .where('status', '==', 'active')
        .select('slug', 'updatedAt')
        .limit(1000)
        .get();

      retailerRoutes = retailerRoutes.concat(
        retailersSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const slug = data.slug || doc.id;
            if (!slug) return null;
            return {
              url: `${BASE_URL}/dispensaries/${slug}`,
              lastModified:
                typeof data.updatedAt?.toDate === 'function'
                  ? data.updatedAt.toDate()
                  : new Date(),
              changeFrequency: 'daily' as const,
              priority: 0.8,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      );
    } catch (e) {
      console.error('[Sitemap] Failed to fetch retailers:', e);
    }

    // 7. Location Discovery Pages (National Rollout Layer)
    let locationRoutes: MetadataRoute.Sitemap = [];
    try {
      // States
      const statesSnapshot = await firestore.collection('states').limit(100).get();
      if (!statesSnapshot.empty) {
        locationRoutes = locationRoutes.concat(
          statesSnapshot.docs.map((doc) => ({
            url: `${BASE_URL}/states/${doc.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
        );
      }

      // Cities (top 500 by population or presence)
      const citiesSnapshot = await firestore
        .collection('cities')
        .select('slug')
        .limit(500)
        .get();
      if (!citiesSnapshot.empty) {
        locationRoutes = locationRoutes.concat(
          citiesSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              url: `${BASE_URL}/cities/${data.slug || doc.id}`,
              lastModified: new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.7,
            };
          })
        );
      }

      // ZIP pages (Using correct path: foot_traffic/config/zip_pages)
      const zipSnapshot = await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('zip_pages')
        .where('published', '==', true)
        .select() // Only need doc ID
        .limit(2000)
        .get();

      if (!zipSnapshot.empty) {
        locationRoutes = locationRoutes.concat(
          zipSnapshot.docs.map((doc) => {
            const data = doc.data();
            // Use doc.id (e.g. 'zip_60601') or data.slug if available
            // Route convention: /zip/60601
            const zipCode = doc.id.replace('zip_', '');
            return {
              url: `${BASE_URL}/zip/${zipCode}`,
              lastModified: new Date(), // Could use data.publishedAt
              changeFrequency: 'daily' as const,
              priority: 0.7,
            };
          })
        );
      }

      // Mass-Generated Dispensary SEO Pages
      const seoDispSnapshot = await firestore
        .collection('seo_pages_dispensary')
        .where('published', '==', true)
        .select() // Only need doc ID
        .limit(2000)
        .get();

      if (!seoDispSnapshot.empty) {
        locationRoutes = locationRoutes.concat(
          seoDispSnapshot.docs.map((doc) => {
            // URL Structure: /dispensaries/[id] (id = slug_zip)
            return {
              url: `${BASE_URL}/dispensaries/${doc.id}`,
              lastModified: new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            };
          })
        );
      }

    } catch (e) {
      // Collections may not exist yet - that's okay
      console.log('[Sitemap] Location collections retrieval failed:', e);
    }

    // 8. Cannabis Desert Indices
    const legalStates = ['MI', 'CA', 'OK', 'MA', 'IL', 'CO', 'AZ', 'NV', 'OR', 'WA'];
    const desertRoutes = legalStates.map((state) => ({
      url: `${BASE_URL}/deserts/${state.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

    return [
      ...homepage,
      ...conversionPages,
      ...productPages,
      ...trustPages,
      ...brandRoutes,
      ...retailerRoutes,
      ...locationRoutes,
      ...desertRoutes,
    ];
  } catch (error) {
    console.error('[Sitemap] Root failure:', error);
    // Return at least static routes so the build doesn't fail
    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ];
  }
}
