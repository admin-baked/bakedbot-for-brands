/**
 * Schema.org JSON-LD Builder — Structured product data for AI agents
 *
 * Generates schema.org compliant Store + Product catalog
 * served at /api/agent/{brandSlug} as application/ld+json.
 *
 * Explicitly EXCLUDES sensitive fields:
 * - cost, wholesalePrice (COGS)
 * - salesCount, salesVelocity, salesLast7Days, salesLast30Days (analytics)
 * - dynamicPricingReason (internal strategy)
 * - sku_id, retailerIds (internal references)
 */

import type { Brand, Product } from '@/types/products';
import type { BundleDeal } from '@/types/bundles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicMenuSettings = any;

interface SchemaPropertyValue {
    '@type': 'PropertyValue';
    name: string;
    value: string;
    unitCode?: string;
}

interface SchemaPostalAddress {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
}

interface SchemaGeoCoordinates {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
}

interface SchemaOffer {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    availability: string;
    priceValidUntil?: string;
}

interface SchemaProduct {
    '@type': 'Product';
    '@id': string;
    name: string;
    description?: string;
    category?: string;
    image?: string;
    brand?: { '@type': 'Brand'; name: string };
    offers: SchemaOffer;
    additionalProperty?: SchemaPropertyValue[];
    weight?: { '@type': 'QuantitativeValue'; value: number; unitCode: string };
}

interface DataCompleteness {
    totalProducts: number;
    withTerpenes: number;
    withCannabinoids: number;
    withEffects: number;
    withImages: number;
    withPricing: number;
    withThcPercent: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AgentApiPayload {
    '@context': 'https://schema.org';
    '@type': 'Store';
    name: string;
    description?: string;
    url: string;
    logo?: string;
    address?: SchemaPostalAddress;
    geo?: SchemaGeoCoordinates;
    openingHours?: string[];
    telephone?: string;
    hasOfferCatalog: {
        '@type': 'OfferCatalog';
        numberOfItems: number;
        itemListElement: SchemaProduct[];
    };
    'bakedbot:loyaltyProgram'?: Record<string, unknown>;
    'bakedbot:activeDeals'?: Record<string, unknown>[];
    'bakedbot:dataCompleteness': DataCompleteness;
    'bakedbot:agentVersion': string;
    'bakedbot:generatedAt': string;
}

const BASE_URL = 'https://bakedbot.ai';

/**
 * Build the full schema.org JSON-LD payload for the agent API
 */
export function buildAgentApiPayload(
    brand: Brand,
    products: Product[],
    bundles: BundleDeal[],
    loyaltySettings: PublicMenuSettings | null,
    brandSlug: string
): AgentApiPayload {
    const payload: AgentApiPayload = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: brand.name,
        url: `${BASE_URL}/${brandSlug}`,
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            numberOfItems: products.length,
            itemListElement: products.map(p => mapProductToSchema(p, brandSlug)),
        },
        'bakedbot:dataCompleteness': calculateDataCompleteness(products),
        'bakedbot:agentVersion': '1.0',
        'bakedbot:generatedAt': new Date().toISOString(),
    };

    // Optional fields — only include when data exists
    if (brand.description) payload.description = brand.description;
    if (brand.logoUrl) payload.logo = brand.logoUrl;

    const address = buildAddress(brand);
    if (address) payload.address = address;

    const geo = buildGeo(brand);
    if (geo) payload.geo = geo;

    const hours = buildOpeningHours(brand);
    if (hours.length > 0) payload.openingHours = hours;

    const phone = brand.phone || brand.location?.phone || brand.contactPhone;
    if (phone) payload.telephone = phone;

    // Loyalty program
    if (loyaltySettings) {
        const loyalty = buildLoyaltyPayload(loyaltySettings);
        if (Object.keys(loyalty).length > 0) {
            payload['bakedbot:loyaltyProgram'] = loyalty;
        }
    }

    // Active deals
    if (bundles.length > 0) {
        payload['bakedbot:activeDeals'] = bundles.map(mapBundleToDeal);
    }

    return payload;
}

// --- Product mapping ---

function mapProductToSchema(product: Product, brandSlug: string): SchemaProduct {
    const schema: SchemaProduct = {
        '@type': 'Product',
        '@id': `${BASE_URL}/${brandSlug}/products/${product.id}`,
        name: product.name,
        offers: {
            '@type': 'Offer',
            price: (product.price ?? 0).toFixed(2),
            priceCurrency: 'USD',
            availability: product.stock != null && product.stock <= 0
                ? 'https://schema.org/OutOfStock'
                : 'https://schema.org/InStock',
        },
    };

    // Optional fields
    if (product.description) schema.description = product.description;
    if (product.category) schema.category = product.category;
    if (product.imageUrl) schema.image = product.imageUrl;

    if (product.brandName) {
        schema.brand = { '@type': 'Brand', name: product.brandName };
    }

    if (product.weight != null) {
        schema.weight = {
            '@type': 'QuantitativeValue',
            value: product.weight,
            unitCode: product.weightUnit === 'oz' ? 'ONZ' : 'GRM',
        };
    }

    // Dynamic pricing badge
    if (product.originalPrice != null && product.dynamicPricingApplied) {
        schema.offers.priceValidUntil = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0]; // Valid for 24h
    }

    // Additional properties (only when data exists)
    const props: SchemaPropertyValue[] = [];

    if (product.thcPercent != null) {
        props.push({ '@type': 'PropertyValue', name: 'THC', value: product.thcPercent.toString(), unitCode: 'P1' });
    }

    if (product.cbdPercent != null) {
        props.push({ '@type': 'PropertyValue', name: 'CBD', value: product.cbdPercent.toString(), unitCode: 'P1' });
    }

    if (product.terpenes?.length) {
        for (const terp of product.terpenes) {
            props.push({
                '@type': 'PropertyValue',
                name: `terpene_${terp.name.toLowerCase().replace(/\s+/g, '_')}`,
                value: terp.percent.toString(),
                unitCode: 'P1',
            });
        }
    }

    if (product.cannabinoids?.length) {
        for (const cann of product.cannabinoids) {
            props.push({
                '@type': 'PropertyValue',
                name: `cannabinoid_${cann.name.toLowerCase().replace(/\s+/g, '_')}`,
                value: cann.percent.toString(),
                unitCode: 'P1',
            });
        }
    }

    if (product.effects?.length) {
        props.push({
            '@type': 'PropertyValue',
            name: 'effects',
            value: product.effects.join(', '),
        });
    }

    if (product.strainType) {
        props.push({
            '@type': 'PropertyValue',
            name: 'strainType',
            value: product.strainType,
        });
    }

    if (product.featured) {
        props.push({
            '@type': 'PropertyValue',
            name: 'featured',
            value: 'true',
        });
    }

    if (product.dynamicPricingBadge) {
        props.push({
            '@type': 'PropertyValue',
            name: 'pricingBadge',
            value: product.dynamicPricingBadge,
        });
    }

    if (product.servings != null) {
        props.push({
            '@type': 'PropertyValue',
            name: 'servings',
            value: product.servings.toString(),
        });
    }

    if (product.mgPerServing != null) {
        props.push({
            '@type': 'PropertyValue',
            name: 'mgPerServing',
            value: product.mgPerServing.toString(),
            unitCode: 'MGM',
        });
    }

    if (props.length > 0) {
        schema.additionalProperty = props;
    }

    return schema;
}

// --- Address/Geo ---

function buildAddress(brand: Brand): SchemaPostalAddress | undefined {
    if (brand.location) {
        return {
            '@type': 'PostalAddress',
            streetAddress: brand.location.address,
            addressLocality: brand.location.city,
            addressRegion: brand.location.state,
            postalCode: brand.location.zip,
            addressCountry: 'US',
        };
    }

    if (brand.address || brand.city) {
        return {
            '@type': 'PostalAddress',
            streetAddress: brand.address,
            addressLocality: brand.city,
            addressRegion: brand.state,
            postalCode: brand.zip,
            addressCountry: 'US',
        };
    }

    return undefined;
}

function buildGeo(brand: Brand): SchemaGeoCoordinates | undefined {
    const lat = brand.location?.lat ?? brand.coordinates?.lat;
    const lng = brand.location?.lng ?? brand.coordinates?.lng;

    if (lat != null && lng != null) {
        return { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
    }

    return undefined;
}

// --- Hours ---

function buildOpeningHours(brand: Brand): string[] {
    if (!brand.hours || Object.keys(brand.hours).length === 0) return [];

    const dayAbbreviations: Record<string, string> = {
        'monday': 'Mo', 'tuesday': 'Tu', 'wednesday': 'We',
        'thursday': 'Th', 'friday': 'Fr', 'saturday': 'Sa', 'sunday': 'Su',
        'mon': 'Mo', 'tue': 'Tu', 'wed': 'We',
        'thu': 'Th', 'fri': 'Fr', 'sat': 'Sa', 'sun': 'Su',
    };

    const hours: string[] = [];
    for (const [day, time] of Object.entries(brand.hours)) {
        const abbr = dayAbbreviations[day.toLowerCase()] || day;
        // schema.org format: "Mo 09:00-17:00"
        hours.push(`${abbr} ${time}`);
    }

    return hours;
}

// --- Loyalty ---

function buildLoyaltyPayload(settings: PublicMenuSettings): Record<string, unknown> {
    const loyalty: Record<string, unknown> = {};

    if (settings.pointsPerDollar) {
        loyalty.pointsPerDollar = settings.pointsPerDollar;
    }

    if (settings.tiers?.length) {
        loyalty.tiers = settings.tiers.map((t: { name: string; pointsRequired: number; multiplier: number }) => ({
            name: t.name,
            pointsRequired: t.pointsRequired,
            multiplier: t.multiplier,
        }));
    }

    if (settings.redemptionTiers?.length) {
        loyalty.redemptionOptions = settings.redemptionTiers.map((t: { points: number; value: number }) => ({
            pointsCost: t.points,
            dollarValue: t.value,
        }));
    }

    if (settings.discountPrograms?.length) {
        const active = settings.discountPrograms.filter((p: { enabled: boolean }) => p.enabled);
        if (active.length > 0) {
            loyalty.discountPrograms = active.map((p: { name: string; description: string }) => ({
                name: p.name,
                description: p.description,
            }));
        }
    }

    return loyalty;
}

// --- Bundle/Deal mapping ---

function mapBundleToDeal(bundle: BundleDeal): Record<string, unknown> {
    const deal: Record<string, unknown> = {
        '@type': 'Offer',
        name: bundle.name,
        description: bundle.description,
        'bakedbot:bundleType': bundle.type,
    };

    if (bundle.bundlePrice != null) {
        deal.price = bundle.bundlePrice.toFixed(2);
        deal.priceCurrency = 'USD';
    }

    if (bundle.savingsPercent != null) {
        deal['bakedbot:savingsPercent'] = Math.round(bundle.savingsPercent);
    }

    if (bundle.savingsAmount != null) {
        deal['bakedbot:savingsAmount'] = bundle.savingsAmount.toFixed(2);
    }

    if (bundle.products?.length) {
        deal['bakedbot:bundleProducts'] = bundle.products.map(p => ({
            name: p.name,
            category: p.category,
        }));
    }

    if (bundle.badgeText) {
        deal['bakedbot:badge'] = bundle.badgeText;
    }

    return deal;
}

// --- Data completeness ---

function calculateDataCompleteness(products: Product[]): DataCompleteness {
    const total = products.length;
    if (total === 0) {
        return {
            totalProducts: 0,
            withTerpenes: 0,
            withCannabinoids: 0,
            withEffects: 0,
            withImages: 0,
            withPricing: 0,
            withThcPercent: 0,
        };
    }

    return {
        totalProducts: total,
        withTerpenes: products.filter(p => p.terpenes && p.terpenes.length > 0).length,
        withCannabinoids: products.filter(p => p.cannabinoids && p.cannabinoids.length > 0).length,
        withEffects: products.filter(p => p.effects && p.effects.length > 0).length,
        withImages: products.filter(p => p.imageUrl && !p.imageUrl.includes('placeholder')).length,
        withPricing: products.filter(p => p.price != null && p.price > 0).length,
        withThcPercent: products.filter(p => p.thcPercent != null).length,
    };
}
