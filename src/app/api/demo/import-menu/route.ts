'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { discovery } from '@/server/services/firecrawl';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';

/**
 * Menu Import API for Demo Experience
 *
 * Extracts dispensary menu data from a URL using Firecrawl
 * to let potential customers preview their menu in BakedBot's interface
 *
 * SECURITY: Requires authentication to prevent abuse of per-page billed Firecrawl API.
 */

// Zod schema for extracted product data
const ExtractedProductSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  category: z.string(),
  price: z.number().nullable(),
  thcPercent: z.number().nullable().optional(),
  cbdPercent: z.number().nullable().optional(),
  strainType: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  effects: z.array(z.string()).optional(),
  weight: z.string().optional(),
});

// Zod schema for brand/dispensary info
const ExtractedBrandSchema = z.object({
  name: z.string(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  hours: z.string().optional(),
});

// Zod schema for carousel/promo content
const ExtractedPromoSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
});

// Combined extraction schema
const MenuExtractionSchema = z.object({
  dispensary: ExtractedBrandSchema,
  products: z.array(ExtractedProductSchema),
  promotions: z.array(ExtractedPromoSchema).optional(),
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;
export type ExtractedBrand = z.infer<typeof ExtractedBrandSchema>;
export type ExtractedPromo = z.infer<typeof ExtractedPromoSchema>;
export type MenuExtraction = z.infer<typeof MenuExtractionSchema>;

// Request body schema
const RequestSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  extractColors: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication to prevent abuse of per-page billed API
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = RequestSchema.parse(body);

    logger.info('[Menu Import] Starting extraction', { url });

    // Check if Discovery is configured
    if (!discovery.isConfigured()) {
      return NextResponse.json(
        { error: 'Menu import service is not configured' },
        { status: 503 }
      );
    }

    // Extract structured data from the dispensary menu page
    const extractionPromptSchema = z.object({
      dispensary: z.object({
        name: z.string().describe('The dispensary or brand name'),
        tagline: z.string().optional().describe('Tagline or slogan if visible'),
        description: z.string().optional().describe('About/description text'),
        logoUrl: z.string().optional().describe('URL of the logo image'),
        primaryColor: z.string().optional().describe('Primary brand color as hex code (e.g., #FF5500)'),
        secondaryColor: z.string().optional().describe('Secondary brand color as hex code'),
        phone: z.string().optional().describe('Phone number'),
        address: z.string().optional().describe('Street address'),
        city: z.string().optional().describe('City'),
        state: z.string().optional().describe('State abbreviation'),
        hours: z.string().optional().describe('Store hours'),
      }),
      products: z.array(z.object({
        name: z.string().describe('Product name'),
        brand: z.string().optional().describe('Brand name if different from dispensary'),
        category: z.string().describe('Category: Flower, Pre-roll, Vapes, Edibles, Concentrates, Topicals, Tinctures, or Accessories'),
        price: z.number().nullable().describe('Price in dollars, null if not listed'),
        thcPercent: z.number().nullable().optional().describe('THC percentage if listed'),
        cbdPercent: z.number().nullable().optional().describe('CBD percentage if listed'),
        strainType: z.string().optional().describe('Strain type: Sativa, Indica, Hybrid, or CBD'),
        description: z.string().optional().describe('Product description'),
        imageUrl: z.string().optional().describe('Product image URL'),
        effects: z.array(z.string()).optional().describe('Effects like Relaxed, Euphoric, etc.'),
        weight: z.string().optional().describe('Weight/size like 3.5g, 1g, 100mg'),
      })).describe('Array of products from the menu. Extract up to 50 products.'),
      promotions: z.array(z.object({
        title: z.string().describe('Promo title'),
        subtitle: z.string().optional().describe('Promo subtitle or timing'),
        description: z.string().optional().describe('Promo details'),
      })).optional().describe('Current deals or promotions'),
    });

    const extractedData = await discovery.extractData(url, extractionPromptSchema);

    if (!extractedData) {
      return NextResponse.json(
        { error: 'Failed to extract menu data from the provided URL' },
        { status: 422 }
      );
    }

    // Normalize and enhance the extracted data
    const normalizedData = normalizeMenuData(extractedData);

    logger.info('[Menu Import] Extraction complete', {
      url,
      productCount: normalizedData.products.length,
      hasPromos: !!normalizedData.promotions?.length,
    });

    return NextResponse.json({
      success: true,
      data: normalizedData,
      meta: {
        sourceUrl: url,
        extractedAt: new Date().toISOString(),
        productCount: normalizedData.products.length,
      },
    });
  } catch (error) {
    logger.error('[Menu Import] Extraction failed', error instanceof Error ? error : new Error(String(error)));

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import menu. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}

/**
 * Normalize and enhance extracted menu data
 */
function normalizeMenuData(data: any): MenuExtraction {
  // Normalize product categories to our standard set
  const categoryMap: Record<string, string> = {
    'flower': 'Flower',
    'flowers': 'Flower',
    'bud': 'Flower',
    'pre-roll': 'Pre-roll',
    'pre-rolls': 'Pre-roll',
    'preroll': 'Pre-roll',
    'prerolls': 'Pre-roll',
    'joint': 'Pre-roll',
    'joints': 'Pre-roll',
    'vape': 'Vapes',
    'vapes': 'Vapes',
    'cartridge': 'Vapes',
    'cartridges': 'Vapes',
    'cart': 'Vapes',
    'carts': 'Vapes',
    'edible': 'Edibles',
    'edibles': 'Edibles',
    'gummy': 'Edibles',
    'gummies': 'Edibles',
    'chocolate': 'Edibles',
    'concentrate': 'Concentrates',
    'concentrates': 'Concentrates',
    'extract': 'Concentrates',
    'extracts': 'Concentrates',
    'wax': 'Concentrates',
    'shatter': 'Concentrates',
    'rosin': 'Concentrates',
    'resin': 'Concentrates',
    'dab': 'Concentrates',
    'dabs': 'Concentrates',
    'topical': 'Topicals',
    'topicals': 'Topicals',
    'cream': 'Topicals',
    'lotion': 'Topicals',
    'balm': 'Topicals',
    'tincture': 'Tinctures',
    'tinctures': 'Tinctures',
    'oil': 'Tinctures',
    'drops': 'Tinctures',
    'accessory': 'Accessories',
    'accessories': 'Accessories',
    'gear': 'Accessories',
    'merchandise': 'Accessories',
    'merch': 'Accessories',
  };

  // Normalize strain types
  const strainMap: Record<string, string> = {
    'sativa': 'Sativa',
    'indica': 'Indica',
    'hybrid': 'Hybrid',
    'cbd': 'CBD',
    'sativa-dominant': 'Sativa-Hybrid',
    'indica-dominant': 'Indica-Hybrid',
    'balanced': 'Hybrid',
  };

  const normalizedProducts = (data.products || []).map((p: any, index: number) => {
    const categoryLower = (p.category || 'flower').toLowerCase();
    const strainLower = (p.strainType || '').toLowerCase();

    return {
      ...p,
      id: `imported-${index + 1}`,
      category: categoryMap[categoryLower] || 'Flower',
      strainType: strainMap[strainLower] || (strainLower ? p.strainType : undefined),
      price: typeof p.price === 'number' ? p.price : null,
      thcPercent: typeof p.thcPercent === 'number' ? p.thcPercent : null,
      cbdPercent: typeof p.cbdPercent === 'number' ? p.cbdPercent : null,
      effects: Array.isArray(p.effects) ? p.effects : [],
    };
  });

  // Generate default brand colors if not extracted
  const dispensary = data.dispensary || {};
  if (!dispensary.primaryColor) {
    dispensary.primaryColor = '#16a34a'; // Green default
  }
  if (!dispensary.secondaryColor) {
    dispensary.secondaryColor = '#064e3b'; // Dark green default
  }

  return {
    dispensary,
    products: normalizedProducts,
    promotions: data.promotions || [],
  };
}
