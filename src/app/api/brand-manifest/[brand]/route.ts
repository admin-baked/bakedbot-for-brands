/**
 * GET /api/brand-manifest/[brand]
 * Dynamic PWA manifest per brand — used for "Add to Home Screen" on rewards pages.
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchBrandPageData } from '@/lib/brand-data';

export const runtime = 'nodejs';
export const revalidate = 3600; // cache manifest for 1 hour

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  const { brand: brandSlug } = await params;

  let brandName = brandSlug;
  let primaryColor = '#16a34a';
  let logoUrl = '/icon-192.png';

  try {
    const { brand } = await fetchBrandPageData(brandSlug);
    if (brand) {
      brandName = brand.name;
      primaryColor = (brand as any).primaryColor || primaryColor;
      logoUrl = brand.logoUrl || logoUrl;
    }
  } catch {
    // serve generic manifest if brand not found
  }

  const manifest = {
    name: `${brandName} Rewards`,
    short_name: `${brandName}`,
    description: `${brandName} loyalty rewards — earn points, redeem deals.`,
    start_url: `/${brandSlug}/rewards`,
    scope: `/${brandSlug}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: primaryColor,
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: logoUrl, sizes: 'any', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
