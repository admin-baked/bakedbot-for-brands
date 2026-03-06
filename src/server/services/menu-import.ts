import { ai } from '@/ai/genkit';
import { getGenerateOptions } from '@/ai/model-selector';
import { logger } from '@/lib/logger';
import { discovery } from '@/server/services/firecrawl';
import { z } from 'zod';

export const ExtractedProductSchema = z.object({
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

export const ExtractedBrandSchema = z.object({
  name: z.string().optional(),
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

export const ExtractedPromoSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
});

export const MenuExtractionSchema = z.object({
  dispensary: ExtractedBrandSchema.default({}),
  products: z.array(ExtractedProductSchema).default([]),
  promotions: z.array(ExtractedPromoSchema).optional(),
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;
export type ExtractedBrand = z.infer<typeof ExtractedBrandSchema>;
export type ExtractedPromo = z.infer<typeof ExtractedPromoSchema>;
export type MenuExtraction = z.infer<typeof MenuExtractionSchema>;

const MENU_AGE_GATE_ACTIONS = [
  { type: 'wait', milliseconds: 1500 },
  { type: 'click', selector: 'button:contains("I am 21")' },
  { type: 'click', selector: 'button:contains("Enter")' },
  { type: 'click', selector: 'button:contains("Yes")' },
  { type: 'click', selector: 'a[href*="#yes"]' },
  { type: 'click', selector: '[data-age-gate="yes"]' },
  { type: 'wait', milliseconds: 3500 },
  { type: 'scroll', direction: 'down', amount: 1400 },
  { type: 'wait', milliseconds: 1500 },
] as const;

function deriveNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '');
    const root = host.split('.')[0] || 'Dispensary';
    return root
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Dispensary';
  } catch {
    return 'Dispensary';
  }
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

function normalizeEffects(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function hasUsableProducts(data: MenuExtraction): boolean {
  return data.products.some((product) => product.name.trim().length > 0);
}

export function normalizeMenuData(data: unknown, sourceUrl?: string): MenuExtraction {
  const raw = (typeof data === 'object' && data !== null ? data : {}) as Record<string, any>;

  const categoryMap: Record<string, string> = {
    flower: 'Flower',
    flowers: 'Flower',
    bud: 'Flower',
    'pre-roll': 'Pre-roll',
    'pre-rolls': 'Pre-roll',
    preroll: 'Pre-roll',
    prerolls: 'Pre-roll',
    joint: 'Pre-roll',
    joints: 'Pre-roll',
    vape: 'Vapes',
    vapes: 'Vapes',
    cartridge: 'Vapes',
    cartridges: 'Vapes',
    cart: 'Vapes',
    carts: 'Vapes',
    edible: 'Edibles',
    edibles: 'Edibles',
    gummy: 'Edibles',
    gummies: 'Edibles',
    chocolate: 'Edibles',
    concentrate: 'Concentrates',
    concentrates: 'Concentrates',
    extract: 'Concentrates',
    extracts: 'Concentrates',
    wax: 'Concentrates',
    shatter: 'Concentrates',
    rosin: 'Concentrates',
    resin: 'Concentrates',
    dab: 'Concentrates',
    dabs: 'Concentrates',
    topical: 'Topicals',
    topicals: 'Topicals',
    cream: 'Topicals',
    lotion: 'Topicals',
    balm: 'Topicals',
    tincture: 'Tinctures',
    tinctures: 'Tinctures',
    oil: 'Tinctures',
    drops: 'Tinctures',
    accessory: 'Accessories',
    accessories: 'Accessories',
    gear: 'Accessories',
    merchandise: 'Accessories',
    merch: 'Accessories',
  };

  const strainMap: Record<string, string> = {
    sativa: 'Sativa',
    indica: 'Indica',
    hybrid: 'Hybrid',
    cbd: 'CBD',
    'sativa-dominant': 'Sativa-Hybrid',
    'indica-dominant': 'Indica-Hybrid',
    balanced: 'Hybrid',
  };

  const rawProducts = Array.isArray(raw.products) ? raw.products : [];
  const rawDispensary =
    typeof raw.dispensary === 'object' && raw.dispensary !== null ? (raw.dispensary as Record<string, any>) : {};
  const rawPromotions = Array.isArray(raw.promotions) ? raw.promotions : [];

  const normalizedProducts = rawProducts
        .map((product, index) => {
          const categoryLower = String(product?.category || 'flower').toLowerCase();
          const strainLower = String(product?.strainType || '').toLowerCase();

          return {
            ...product,
            name: String(product?.name || '').trim(),
            id: `imported-${index + 1}`,
            category: categoryMap[categoryLower] || 'Flower',
            price: normalizeNumber(product?.price),
            thcPercent: normalizeNumber(product?.thcPercent),
            cbdPercent: normalizeNumber(product?.cbdPercent),
            strainType: strainMap[strainLower] || (strainLower ? String(product?.strainType) : undefined),
            effects: normalizeEffects(product?.effects),
          };
        })
        .filter((product) => product.name.length > 0)
  const dispensary = {
    ...rawDispensary,
    name: String(rawDispensary.name || '').trim() || (sourceUrl ? deriveNameFromUrl(sourceUrl) : 'Dispensary'),
    primaryColor: String(rawDispensary.primaryColor || '').trim() || '#16a34a',
    secondaryColor: String(rawDispensary.secondaryColor || '').trim() || '#064e3b',
  };

  return {
    dispensary,
    products: normalizedProducts,
    promotions: rawPromotions,
  };
}

async function extractMenuFromMarkdown(markdown: string, sourceUrl: string): Promise<MenuExtraction> {
  const prompt = `
You are extracting cannabis dispensary menu data from markdown that was scraped after age-gate handling.

Return a JSON object that matches the schema exactly.
- Extract the dispensary identity and branding fields when visible.
- Extract up to 50 real menu products.
- Normalize category labels to common menu terms like Flower, Pre-roll, Vapes, Edibles, Concentrates, Topicals, Tinctures, or Accessories.
- Keep prices numeric in dollars when possible.
- If a field is missing, omit it or use null where the schema allows null.

Source URL: ${sourceUrl}

Markdown:
${markdown}
`;

  const result = await ai.generate({
    ...getGenerateOptions('lite'),
    prompt,
    output: {
      format: 'json',
      schema: z.object({
        data: MenuExtractionSchema,
      }),
    },
  });

  const output = result.output as { data?: MenuExtraction } | undefined;
  const extracted = output?.data;

  if (!extracted) {
    throw new Error('Age-gated menu extraction returned no structured data.');
  }

  return normalizeMenuData(extracted, sourceUrl);
}

export async function extractMenuDataFromUrl(url: string): Promise<MenuExtraction> {
  let directAttempt: MenuExtraction | null = null;

  try {
    const extractedData = await discovery.extractData(url, MenuExtractionSchema);
    directAttempt = normalizeMenuData(extractedData, url);

    if (hasUsableProducts(directAttempt)) {
      return directAttempt;
    }

    logger.warn('[Menu Import] Direct extraction returned no products', {
      url,
      productCount: directAttempt.products.length,
    });
  } catch (error) {
    logger.warn('[Menu Import] Direct extraction failed, trying age-gate fallback', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const page = await discovery.discoverWithActions(url, [...MENU_AGE_GATE_ACTIONS]);
    const markdown =
      (typeof (page as any)?.markdown === 'string' && (page as any).markdown) ||
      (typeof (page as any)?.data?.markdown === 'string' && (page as any).data.markdown) ||
      '';

    if (markdown.trim().length > 0) {
      const fallbackAttempt = await extractMenuFromMarkdown(markdown, url);
      if (hasUsableProducts(fallbackAttempt)) {
        return fallbackAttempt;
      }
    }

    logger.warn('[Menu Import] Age-gate fallback returned no products', { url });
  } catch (error) {
    logger.warn('[Menu Import] Age-gate fallback failed', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (directAttempt && hasUsableProducts(directAttempt)) {
    return directAttempt;
  }

  throw new Error('Failed to extract menu data');
}
