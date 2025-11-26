// src/lib/brands.ts

export type BrandConfig = {
    brandId: string;
    name: string;
    state: string;
    slug: string;
    description?: string;
    logo?: string;
};

export const BRAND_SLUGS: Record<string, BrandConfig> = {
    'cronja': {
        brandId: '10982',
        name: 'CRONJA',
        state: 'Illinois',
        slug: 'cronja',
        description: 'Premium cannabis products crafted for quality and consistency.',
    },
    // Add more brands as needed
};

export function getBrandBySlug(slug: string): BrandConfig | null {
    return BRAND_SLUGS[slug] || null;
}

export function getAllBrandSlugs(): string[] {
    return Object.keys(BRAND_SLUGS);
}
