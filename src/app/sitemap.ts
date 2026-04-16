import { MetadataRoute } from 'next';
import { createServerClient } from '@/firebase/server-client';
import { articles } from '@/content/help/_index';
import { fetchAllStrainSlugs } from '@/lib/strain-data';
import { getAllTerpeneSlugs } from '@/lib/terpene-data';

const BASE_URL = 'https://bakedbot.ai';

// This route aggregates large Firestore collections and should be generated on demand.
export const dynamic = 'force-dynamic';

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
      '/ai-retention-audit',
      '/get-started',
      '/claim',
      '/demo',
      '/about',
      '/book',
    ].map((route) => ({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

    // 2c. Bottom-funnel operator acquisition pages (exact-match B2B intent)
    const operatorLandingPages = [
      '/dispensary-crm',
      '/dispensary-software',
      '/dispensary-marketing-automation',
      '/dispensary-retention',
      '/dispensary-loyalty-software',
      '/cannabis-customer-data-platform',
      '/integrations/dutchie',
      '/integrations/treez',
      '/integrations/alleaves',
      '/integrations/cannmenus',
      '/agency',
      '/social-equity',
    ].map((route) => ({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    }));

    // 2b. Cannabis Data Hub (High Priority - SEO moat / organic authority)
    const dataHubPages = [
      '/explore',
      '/strains',
      '/terpenes',
      '/lab-results',
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

    // 5. Help Center (SEO-optimized public documentation)
    const helpRoutes: MetadataRoute.Sitemap = [
      {
        url: `${BASE_URL}/help`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
      ...Object.values(articles)
        .filter((article) => article.roles.length === 0) // public only
        .map((article) => ({
          url: `${BASE_URL}/help/${article.category}/${article.slug}`,
          lastModified: new Date(article.lastUpdated),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        })),
    ];

    // 6. LLM.txt Routes (Agent Web Discovery)
    const llmRoutes: MetadataRoute.Sitemap = [
      {
        url: `${BASE_URL}/llm.txt`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      },
    ];

    // 6. Dynamic Brands (Index + Individual)
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

      // Generate llm.txt routes from same snapshot (no extra query)
      for (const doc of brandsSnapshot.docs) {
        const data = doc.data();
        if (data.slug) {
          llmRoutes.push({
            url: `${BASE_URL}/${data.slug}/llm.txt`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.6,
          });
        }
      }
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

    // 8. Blog Posts (High Priority Content)
    let blogRoutes: MetadataRoute.Sitemap = [];
    try {
      // 8a. Platform blog (bakedbot.ai/blog)
      blogRoutes.push({
        url: `${BASE_URL}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      });
      blogRoutes.push({
        url: `${BASE_URL}/blog/rss.xml`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.5,
      });

      // Platform blog posts
      const platformPostsSnapshot = await firestore
        .collection('tenants')
        .doc('org_bakedbot_platform')
        .collection('blog_posts')
        .where('status', '==', 'published')
        .select('seo', 'updatedAt', 'publishedAt')
        .limit(200)
        .get();

      if (!platformPostsSnapshot.empty) {
        blogRoutes = blogRoutes.concat(
          platformPostsSnapshot.docs.map((postDoc) => {
            const postData = postDoc.data();
            return {
              url: `${BASE_URL}/blog/${postData.seo?.slug || postDoc.id}`,
              lastModified:
                typeof postData.updatedAt?.toDate === 'function'
                  ? postData.updatedAt.toDate()
                  : new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            };
          })
        );
      }

      // 8b. Per-brand blog posts
      const brandsForBlogSnapshot = await firestore
        .collection('brands')
        .select('slug')
        .limit(500)
        .get();

      for (const brandDoc of brandsForBlogSnapshot.docs) {
        const brandData = brandDoc.data();
        const brandSlug = brandData.slug || brandDoc.id;

        // Blog index page
        blogRoutes.push({
          url: `${BASE_URL}/${brandSlug}/blog`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        });

        // RSS feed
        blogRoutes.push({
          url: `${BASE_URL}/${brandSlug}/blog/rss.xml`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.5,
        });

        // Individual blog posts for this brand
        const postsSnapshot = await firestore
          .collection('tenants')
          .doc(brandDoc.id)
          .collection('blog_posts')
          .where('status', '==', 'published')
          .select('seo', 'updatedAt', 'publishedAt')
          .limit(100)
          .get();

        if (!postsSnapshot.empty) {
          blogRoutes = blogRoutes.concat(
            postsSnapshot.docs.map((postDoc) => {
              const postData = postDoc.data();
              return {
                url: `${BASE_URL}/${brandSlug}/blog/${postData.seo?.slug || postDoc.id}`,
                lastModified:
                  typeof postData.updatedAt?.toDate === 'function'
                    ? postData.updatedAt.toDate()
                    : new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
              };
            })
          );
        }
      }
    } catch (e) {
      console.error('[Sitemap] Failed to fetch blog posts:', e);
    }

    // 9. Cannabis Desert Indices
    const legalStates = ['MI', 'CA', 'OK', 'MA', 'IL', 'CO', 'AZ', 'NV', 'OR', 'WA'];
    const desertRoutes = legalStates.map((state) => ({
      url: `${BASE_URL}/deserts/${state.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

    // 10. Cannabis Strain Encyclopedia (Supabase — up to 5K pages)
    let strainRoutes: MetadataRoute.Sitemap = [];
    try {
      strainRoutes.push({
        url: `${BASE_URL}/strains`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      });

      const strainSlugs = await fetchAllStrainSlugs();
      strainRoutes = strainRoutes.concat(
        strainSlugs.map((s) => ({
          url: `${BASE_URL}/strains/${s.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        }))
      );
    } catch (e) {
      console.error('[Sitemap] Failed to fetch strains:', e);
    }

    // 11. Terpene Encyclopedia (static — 15 pages)
    const terpeneRoutes: MetadataRoute.Sitemap = [
      {
        url: `${BASE_URL}/terpenes`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      },
      ...getAllTerpeneSlugs().map((slug) => ({
        url: `${BASE_URL}/terpenes/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ];

    // 12. Lab Results Directory (Firestore)
    let labResultRoutes: MetadataRoute.Sitemap = [];
    try {
      labResultRoutes.push({
        url: `${BASE_URL}/lab-results`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      });

      const labSnap = await firestore
        .collection('lab_results_public')
        .select()
        .limit(2000)
        .get();

      if (!labSnap.empty) {
        labResultRoutes = labResultRoutes.concat(
          labSnap.docs.map((doc) => ({
            url: `${BASE_URL}/lab-results/${doc.id}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
          }))
        );
      }
    } catch (e) {
      console.error('[Sitemap] Failed to fetch lab results:', e);
    }

    return [
      ...homepage,
      ...conversionPages,
      ...operatorLandingPages,
      ...dataHubPages,
      ...productPages,
      ...trustPages,
      ...helpRoutes,
      ...llmRoutes,
      ...brandRoutes,
      ...retailerRoutes,
      ...locationRoutes,
      ...blogRoutes,
      ...desertRoutes,
      ...strainRoutes,
      ...terpeneRoutes,
      ...labResultRoutes,
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
