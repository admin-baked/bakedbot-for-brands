/**
 * Social Media Preview Generator API
 *
 * Generates Open Graph and Twitter Card meta tags for hero banners.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHeroById } from '@/app/actions/heroes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { heroId } = body;

    if (!heroId) {
      return NextResponse.json(
        { success: false, error: 'Hero ID is required' },
        { status: 400 }
      );
    }

    // Get hero data
    const result = await getHeroById(heroId);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: 'Hero not found' },
        { status: 404 }
      );
    }

    const hero = result.data;

    // Generate preview data
    const preview = {
      // Open Graph
      ogTitle: `${hero.brandName} - ${hero.tagline}`,
      ogDescription: hero.description || `Discover ${hero.brandName}'s premium cannabis products.`,
      ogImage: hero.heroImage || hero.brandLogo || '/default-hero-og.png',
      ogType: 'website',
      ogUrl: `https://bakedbot.ai/${hero.brandId || hero.dispensaryId}`,

      // Twitter Card
      twitterCard: 'summary_large_image',
      twitterTitle: `${hero.brandName} - ${hero.tagline}`,
      twitterDescription: hero.description || `Discover ${hero.brandName}'s premium cannabis products.`,
      twitterImage: hero.heroImage || hero.brandLogo || '/default-hero-og.png',

      // Additional meta
      themeColor: hero.primaryColor,
      keywords: [
        hero.brandName,
        'cannabis',
        'dispensary',
        hero.purchaseModel === 'online_only' ? 'online cannabis' : 'local dispensary',
        ...( hero.stats?.certifications || []),
      ].join(', '),

      // Structured Data (JSON-LD)
      structuredData: {
        '@context': 'https://schema.org',
        '@type': hero.purchaseModel === 'online_only' ? 'OnlineStore' : 'Store',
        name: hero.brandName,
        description: hero.description || hero.tagline,
        image: hero.heroImage || hero.brandLogo,
        ...(hero.stats?.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: hero.stats.rating,
            bestRating: 5,
          },
        }),
      },
    };

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error('Error generating social preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML meta tags for hero
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const heroId = searchParams.get('heroId');

    if (!heroId) {
      return new Response('Hero ID is required', { status: 400 });
    }

    const result = await getHeroById(heroId);
    if (!result.success || !result.data) {
      return new Response('Hero not found', { status: 404 });
    }

    const hero = result.data;

    const metaTags = `
<!-- Hero Banner Meta Tags -->
<meta property="og:title" content="${hero.brandName} - ${hero.tagline}" />
<meta property="og:description" content="${hero.description || `Discover ${hero.brandName}'s premium cannabis products.`}" />
<meta property="og:image" content="${hero.heroImage || hero.brandLogo || '/default-hero-og.png'}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://bakedbot.ai/${hero.brandId || hero.dispensaryId}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${hero.brandName} - ${hero.tagline}" />
<meta name="twitter:description" content="${hero.description || `Discover ${hero.brandName}'s premium cannabis products.`}" />
<meta name="twitter:image" content="${hero.heroImage || hero.brandLogo || '/default-hero-og.png'}" />

<meta name="theme-color" content="${hero.primaryColor}" />
<meta name="description" content="${hero.description || hero.tagline}" />

${hero.stats?.rating ? `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${hero.purchaseModel === 'online_only' ? 'OnlineStore' : 'Store'}",
  "name": "${hero.brandName}",
  "description": "${hero.description || hero.tagline}",
  "image": "${hero.heroImage || hero.brandLogo}",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": ${hero.stats.rating},
    "bestRating": 5
  }
}
</script>
` : ''}
`;

    return new Response(metaTags, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating meta tags:', error);
    return new Response('Failed to generate meta tags', { status: 500 });
  }
}
