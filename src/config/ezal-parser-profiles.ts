// src/config/ezal-parser-profiles.ts
/**
 * Parser Profiles for Competitive Menu Scraping
 * Config-driven extractors for different menu platforms
 */

import { ParserProfile, ProductCategory } from '@/types/ezal-scraper';

// Category mapping from common platform terms to our standard categories
const STANDARD_CATEGORY_MAPPING: Record<string, ProductCategory> = {
    // Flower
    'flower': 'flower',
    'flowers': 'flower',
    'bud': 'flower',
    'buds': 'flower',
    'cannabis': 'flower',
    'indica': 'flower',
    'sativa': 'flower',
    'hybrid': 'flower',

    // Pre-rolls
    'pre-roll': 'pre_roll',
    'pre-rolls': 'pre_roll',
    'preroll': 'pre_roll',
    'prerolls': 'pre_roll',
    'joints': 'pre_roll',
    'blunts': 'pre_roll',

    // Vapes
    'vape': 'vape',
    'vapes': 'vape',
    'vaporizer': 'vape',
    'cartridge': 'vape',
    'cartridges': 'vape',
    'carts': 'vape',
    'pod': 'vape',
    'pods': 'vape',
    'disposable': 'vape',
    'disposables': 'vape',

    // Edibles
    'edible': 'edible',
    'edibles': 'edible',
    'gummy': 'edible',
    'gummies': 'edible',
    'chocolate': 'edible',
    'chocolates': 'edible',
    'beverage': 'edible',
    'beverages': 'edible',
    'drink': 'edible',
    'drinks': 'edible',
    'candy': 'edible',
    'baked-goods': 'edible',

    // Concentrates
    'concentrate': 'concentrate',
    'concentrates': 'concentrate',
    'dab': 'concentrate',
    'dabs': 'concentrate',
    'wax': 'concentrate',
    'shatter': 'concentrate',
    'rosin': 'concentrate',
    'resin': 'concentrate',
    'live-resin': 'concentrate',
    'live-rosin': 'concentrate',
    'hash': 'concentrate',
    'budder': 'concentrate',
    'badder': 'concentrate',
    'sauce': 'concentrate',
    'diamonds': 'concentrate',

    // Topicals
    'topical': 'topical',
    'topicals': 'topical',
    'lotion': 'topical',
    'cream': 'topical',
    'balm': 'topical',
    'salve': 'topical',
    'transdermal': 'topical',
    'patch': 'topical',
    'patches': 'topical',

    // Tinctures
    'tincture': 'tincture',
    'tinctures': 'tincture',
    'oil': 'tincture',
    'oils': 'tincture',
    'sublingual': 'tincture',
    'drops': 'tincture',
    'spray': 'tincture',
    'capsule': 'tincture',
    'capsules': 'tincture',

    // Accessories
    'accessory': 'accessory',
    'accessories': 'accessory',
    'gear': 'accessory',
    'merch': 'accessory',
    'merchandise': 'accessory',
    'pipe': 'accessory',
    'pipes': 'accessory',
    'bong': 'accessory',
    'bongs': 'accessory',
    'grinder': 'accessory',
    'grinders': 'accessory',
    'battery': 'accessory',
    'batteries': 'accessory',
};

// =============================================================================
// PARSER PROFILES
// =============================================================================

export const PARSER_PROFILES: Record<string, Omit<ParserProfile, 'id' | 'createdAt' | 'updatedAt'>> = {
    // -------------------------------------------
    // DUTCHIE (iFrame-based, common platform)
    // -------------------------------------------
    'dutchie_v1': {
        name: 'Dutchie Menu v1',
        version: 1,
        sourceType: 'html',
        selectors: {
            productContainer: '[data-testid="product-card"], .product-card, .menu-product',
            productName: '[data-testid="product-name"], .product-name, .product-title',
            brandName: '[data-testid="brand-name"], .brand-name, .product-brand',
            price: '[data-testid="product-price"], .product-price, .price',
            regularPrice: '.original-price, .regular-price, [data-testid="original-price"]',
            category: '[data-testid="category"], .category-label',
            thc: '[data-testid="thc"], .thc-content, .thc-percentage',
            cbd: '[data-testid="cbd"], .cbd-content',
            inStock: '[data-testid="in-stock"]',
            outOfStockIndicator: '.out-of-stock, [data-testid="out-of-stock"], .sold-out',
            imageUrl: 'img[data-testid="product-image"], .product-image img',
            productUrl: 'a[data-testid="product-link"], .product-link',
            strain: '.strain-name, [data-testid="strain"]',
        },
        pagination: {
            type: 'scroll',
            maxPages: 20,
        },
        categoryMapping: STANDARD_CATEGORY_MAPPING,
        active: true,
    },

    // -------------------------------------------
    // JANE (Common dispensary platform)
    // -------------------------------------------
    'jane_v1': {
        name: 'Jane Menu v1',
        version: 1,
        sourceType: 'html',
        selectors: {
            productContainer: '.product-tile, .product-card, [data-product-id]',
            productName: '.product-tile__name, .product-name, h3.name',
            brandName: '.product-tile__brand, .brand, .product-brand',
            price: '.product-tile__price, .price, .product-price',
            regularPrice: '.product-tile__original-price, .was-price',
            category: '.product-tile__category, .category',
            thc: '.product-tile__thc, .thc',
            cbd: '.product-tile__cbd, .cbd',
            outOfStockIndicator: '.product-tile--out-of-stock, .out-of-stock',
            imageUrl: '.product-tile__image img, .product-image img',
            productUrl: '.product-tile__link, a.product-link',
        },
        pagination: {
            type: 'page_param',
            paramName: 'page',
            pageSize: 24,
            maxPages: 50,
        },
        categoryMapping: STANDARD_CATEGORY_MAPPING,
        active: true,
    },

    // -------------------------------------------
    // WEEDMAPS (Marketplace)
    // -------------------------------------------
    'weedmaps_v1': {
        name: 'Weedmaps Dispensary Menu v1',
        version: 1,
        sourceType: 'html',
        selectors: {
            productContainer: '[data-testid="menu-item"], .menu-item, .product-menu-item',
            productName: '[data-testid="menu-item-name"], .menu-item-title, h3',
            brandName: '[data-testid="menu-item-brand"], .menu-item-brand',
            price: '[data-testid="menu-item-price"], .menu-item-price, .price-value',
            regularPrice: '.original-price, .was-price',
            category: '[data-testid="category-name"]',
            thc: '.thc-content, [data-testid="thc"]',
            outOfStockIndicator: '.sold-out, .out-of-stock',
            imageUrl: '[data-testid="menu-item-image"] img, .menu-item-image img',
            effects: '.effects-list, [data-testid="effects"]',
        },
        pagination: {
            type: 'scroll',
            maxPages: 30,
        },
        categoryMapping: STANDARD_CATEGORY_MAPPING,
        active: true,
    },

    // -------------------------------------------
    // LEAFLY (Marketplace)
    // -------------------------------------------
    'leafly_v1': {
        name: 'Leafly Dispensary Menu v1',
        version: 1,
        sourceType: 'html',
        selectors: {
            productContainer: '[data-testid="product-card"], .product-card',
            productName: '[data-testid="product-title"], .product-title',
            brandName: '[data-testid="product-brand"], .product-brand',
            price: '[data-testid="product-price"], .product-price',
            regularPrice: '.original-price',
            category: '.product-category, [data-testid="category"]',
            thc: '[data-testid="thc-content"], .thc-badge',
            cbd: '[data-testid="cbd-content"], .cbd-badge',
            outOfStockIndicator: '.out-of-stock, [data-testid="sold-out"]',
            imageUrl: '[data-testid="product-image"], .product-image',
            strain: '.strain-type, [data-testid="strain-type"]',
        },
        pagination: {
            type: 'page_param',
            paramName: 'page',
            pageSize: 30,
            maxPages: 20,
        },
        categoryMapping: STANDARD_CATEGORY_MAPPING,
        active: true,
    },

    // -------------------------------------------
    // GENERIC HTML (Fallback for custom sites)
    // -------------------------------------------
    'generic_html_v1': {
        name: 'Generic HTML Menu v1',
        version: 1,
        sourceType: 'html',
        selectors: {
            productContainer: '.product, .item, .menu-item, [class*="product"]',
            productName: '.product-name, .title, h2, h3, [class*="name"]',
            brandName: '.brand, [class*="brand"]',
            price: '.price, [class*="price"], .cost, .amount',
            regularPrice: '.was-price, .original, .msrp',
            category: '.category, [class*="category"], .type',
            thc: '.thc, [class*="thc"]',
            outOfStockIndicator: '.out-of-stock, .sold-out, .unavailable',
            imageUrl: 'img',
        },
        pagination: {
            type: 'none',
        },
        categoryMapping: STANDARD_CATEGORY_MAPPING,
        active: true,
    },

    // -------------------------------------------
    // JSON API (For sites with exposed APIs)
    // -------------------------------------------
    'json_api_v1': {
        name: 'Generic JSON API v1',
        version: 1,
        sourceType: 'json_api',
        jsonPaths: {
            productsArray: 'data.products',
            productName: 'name',
            brandName: 'brand.name',
            price: 'price',
            regularPrice: 'originalPrice',
            category: 'category',
            thc: 'potency.thc',
            cbd: 'potency.cbd',
            inStock: 'inStock',
            imageUrl: 'images[0].url',
        },
        pagination: {
            type: 'offset',
            paramName: 'offset',
            pageSize: 50,
            maxPages: 100,
        },
        categoryMapping: STANDARD_CATEGORY_MAPPING,
        active: true,
    },
};

/**
 * Get a parser profile by ID
 */
export function getParserProfile(profileId: string): ParserProfile | null {
    const profile = PARSER_PROFILES[profileId];
    if (!profile) return null;

    return {
        id: profileId,
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * List all available parser profiles
 */
export function listParserProfiles(): { id: string; name: string; sourceType: string }[] {
    return Object.entries(PARSER_PROFILES).map(([id, profile]) => ({
        id,
        name: profile.name,
        sourceType: profile.sourceType,
    }));
}

/**
 * Map a raw category string to standard ProductCategory
 */
export function mapCategory(rawCategory: string): ProductCategory {
    const normalized = rawCategory.toLowerCase().trim().replace(/\s+/g, '-');
    return STANDARD_CATEGORY_MAPPING[normalized] || 'other';
}
