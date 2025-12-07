'use server';

// src/server/services/ezal/parser-engine.ts
/**
 * Parser Engine
 * Config-driven HTML/JSON parsing for competitive menu data
 * NOW POWERED BY CHEERIO 🥣
 */

import { logger } from '@/lib/logger';
import {
    CompetitiveProduct,
    ParserProfile,
    ProductCategory,
    StrainType,
    PricePoint
} from '@/types/ezal-scraper';
import { getParserProfile, mapCategory } from '@/config/ezal-parser-profiles';
import { load } from 'cheerio'; // Import cheerio

// =============================================================================
// PARSED PRODUCT TYPE
// =============================================================================

export interface ParsedProduct {
    externalProductId: string;
    brandName: string;
    productName: string;
    category: ProductCategory;
    strainType: StrainType;
    thcPct: number | null;
    cbdPct: number | null;
    price: number;
    regularPrice: number | null;
    inStock: boolean;
    metadata: {
        strain?: string;
        sizeGrams?: number;
        imageUrl?: string;
        description?: string;
        effects?: string[];
        productUrl?: string;
    };
}

export interface ParseResult {
    success: boolean;
    products: ParsedProduct[];
    parseErrors: string[];
    totalFound: number;
    parseTimeMs: number;
}

// =============================================================================
// HTML PARSING (with Cheerio)
// =============================================================================

/**
 * Parse HTML content using a parser profile
 */
export async function parseHtml(
    html: string,
    profileId: string
): Promise<ParseResult> {
    const startTime = Date.now();
    const profile = getParserProfile(profileId);

    if (!profile || !profile.selectors) {
        return {
            success: false,
            products: [],
            parseErrors: [`Parser profile not found or invalid: ${profileId}`],
            totalFound: 0,
            parseTimeMs: Date.now() - startTime,
        };
    }

    const products: ParsedProduct[] = [];
    const parseErrors: string[] = [];

    try {
        // Load HTML into Cheerio
        const $ = load(html);
        const selectors = profile.selectors;

        // Select all product containers
        const $productBlocks = $(selectors.productContainer);

        logger.info('[Ezal Parser] Found product blocks:', {
            count: $productBlocks.length,
            profileId
        });

        $productBlocks.each((i, el) => {
            try {
                const $el = $(el);
                const product = extractProduct($, $el, selectors, profile.categoryMapping || {}, i);

                if (product && product.productName && product.price > 0) {
                    products.push(product);
                }
            } catch (error) {
                parseErrors.push(`Failed to parse product ${i}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        return {
            success: true,
            products,
            parseErrors,
            totalFound: $productBlocks.length,
            parseTimeMs: Date.now() - startTime,
        };

    } catch (error) {
        logger.error('[Ezal Parser] Parse failed:', {
            profileId,
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            success: false,
            products,
            parseErrors: [error instanceof Error ? error.message : String(error)],
            totalFound: 0,
            parseTimeMs: Date.now() - startTime,
        };
    }
}

/**
 * Extract product data from a Cheerio element
 */
function extractProduct(
    $: any,
    $el: any,
    selectors: ParserProfile['selectors'],
    categoryMapping: Record<string, ProductCategory>,
    index: number
): ParsedProduct | null {
    if (!selectors) return null;

    // Helper to safely get text
    const getText = (selector?: string) => {
        if (!selector) return '';
        // Check if matching self
        if (selector === '&') return $el.text().trim();
        return $el.find(selector).first().text().trim();
    };

    // Helper to safely get attribute
    const getAttr = (selector: string | undefined, attr: string) => {
        if (!selector) return undefined;
        if (selector === '&') return $el.attr(attr);
        return $el.find(selector).first().attr(attr);
    };

    const productName = getText(selectors.productName);
    const brandName = getText(selectors.brandName) || 'Unknown';
    const priceText = getText(selectors.price);
    const regularPriceText = selectors.regularPrice ? getText(selectors.regularPrice) : null;
    const categoryText = selectors.category ? getText(selectors.category) : '';
    const thcText = selectors.thc ? getText(selectors.thc) : '';
    const cbdText = selectors.cbd ? getText(selectors.cbd) : '';
    const imageUrl = selectors.imageUrl ? getAttr(selectors.imageUrl, 'src') : undefined;
    const productUrl = selectors.productUrl ? getAttr(selectors.productUrl, 'href') : undefined;
    const strainText = selectors.strain ? getText(selectors.strain) : '';

    // Check stock status
    let isOutOfStock = false;
    if (selectors.outOfStockIndicator) {
        // Can be a class on the container itself or a child element
        if ($el.is(selectors.outOfStockIndicator) || $el.find(selectors.outOfStockIndicator).length > 0) {
            isOutOfStock = true;
        }
    }

    // Also check for "Sold Out" text keywords if generic parser or specific indicator wasn't found
    const fullText = $el.text().toLowerCase();
    if (!isOutOfStock && (fullText.includes('out of stock') || fullText.includes('sold out'))) {
        isOutOfStock = true;
    }

    // Parse price
    const price = parsePrice(priceText);
    const regularPrice = regularPriceText ? parsePrice(regularPriceText) : null;

    // Basic validity check
    if (!productName || price <= 0) {
        return null;
    }

    // Parse THC/CBD
    const thcPct = parsePercentage(thcText);
    const cbdPct = parsePercentage(cbdText);

    // Determine category
    const category = mapCategory(categoryText || inferCategory(productName));

    // Determine strain type
    const strainType = inferStrainType(strainText || productName);

    // Generate external ID
    // TODO: Ideally use a real ID from the DOM (e.g. data-id), but this generation is okay for v1
    const externalProductId = generateProductId(brandName, productName, index);

    return {
        externalProductId,
        brandName,
        productName,
        category,
        strainType,
        thcPct,
        cbdPct,
        price,
        regularPrice,
        inStock: !isOutOfStock,
        metadata: {
            strain: strainText || undefined,
            imageUrl,
            productUrl,
        },
    };
}

/**
 * Parse price from text
 */
function parsePrice(text: string): number {
    if (!text) return 0;
    // Handles $50.00, 50.00, $50, etc.
    const match = text.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (!match) return 0;
    return parseFloat(match[1].replace(/,/g, ''));
}

/**
 * Parse percentage from text
 */
function parsePercentage(text: string): number | null {
    if (!text) return null;
    const match = text.match(/([\d.]+)\s*%/);
    if (!match) return null;
    return parseFloat(match[1]);
}

/**
 * Infer category from product name
 */
function inferCategory(productName: string): string {
    const lower = productName.toLowerCase();

    if (lower.includes('flower') || lower.includes('3.5g') || lower.includes('eighth') || lower.includes('1/8')) return 'flower';
    if (lower.includes('pre-roll') || lower.includes('preroll') || lower.includes('joint')) return 'pre-roll';
    if (lower.includes('cartridge') || lower.includes('cart') || lower.includes('vape') || lower.includes('pod')) return 'vape';
    if (lower.includes('gummy') || lower.includes('gummies') || lower.includes('edible') || lower.includes('chocolate')) return 'edible';
    if (lower.includes('concentrate') || lower.includes('wax') || lower.includes('shatter') || lower.includes('rosin')) return 'concentrate';
    if (lower.includes('topical') || lower.includes('lotion') || lower.includes('balm')) return 'topical';
    if (lower.includes('tincture') || lower.includes('oil') || lower.includes('drops')) return 'tincture';

    return 'other';
}

/**
 * Infer strain type from text
 */
function inferStrainType(text: string): StrainType {
    const lower = text.toLowerCase();

    if (lower.includes('indica')) return 'indica';
    if (lower.includes('sativa')) return 'sativa';
    if (lower.includes('hybrid')) return 'hybrid';
    if (lower.includes('cbd')) return 'cbd';

    return 'unknown';
}

/**
 * Generate a unique product ID
 */
function generateProductId(brand: string, name: string, index: number): string {
    const slug = `${brand}-${name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50);
    return `${slug}-${index}`;
}

// =============================================================================
// JSON PARSING (Unchanged)
// =============================================================================

/**
 * Parse JSON API response using a parser profile
 */
export async function parseJson(
    jsonString: string,
    profileId: string
): Promise<ParseResult> {
    const startTime = Date.now();
    const profile = getParserProfile(profileId);

    if (!profile || !profile.jsonPaths) {
        return {
            success: false,
            products: [],
            parseErrors: [`Parser profile not found or missing jsonPaths: ${profileId}`],
            totalFound: 0,
            parseTimeMs: Date.now() - startTime,
        };
    }

    const products: ParsedProduct[] = [];
    const parseErrors: string[] = [];

    try {
        const data = JSON.parse(jsonString);
        const paths = profile.jsonPaths;

        // Get products array using path
        const productsArray = getByPath(data, paths.productsArray);

        if (!Array.isArray(productsArray)) {
            return {
                success: false,
                products: [],
                parseErrors: [`Products array not found at path: ${paths.productsArray}`],
                totalFound: 0,
                parseTimeMs: Date.now() - startTime,
            };
        }

        for (let i = 0; i < productsArray.length; i++) {
            try {
                const item = productsArray[i];

                const productName = getByPath(item, paths.productName) || '';
                const brandName = paths.brandName ? getByPath(item, paths.brandName) || 'Unknown' : 'Unknown';
                const price = parseFloat(getByPath(item, paths.price)) || 0;
                const regularPrice = paths.regularPrice ? parseFloat(getByPath(item, paths.regularPrice)) : null;
                const category = paths.category ? mapCategory(getByPath(item, paths.category) || '') : 'other';
                const thcPct = paths.thc ? parseFloat(getByPath(item, paths.thc)) || null : null;
                const cbdPct = paths.cbd ? parseFloat(getByPath(item, paths.cbd)) || null : null;
                const inStock = paths.inStock ? Boolean(getByPath(item, paths.inStock)) : true;
                const imageUrl = paths.imageUrl ? getByPath(item, paths.imageUrl) : undefined;

                if (productName && price > 0) {
                    products.push({
                        externalProductId: `json-${i}-${productName.slice(0, 20).replace(/\W/g, '')}`,
                        brandName,
                        productName,
                        category,
                        strainType: 'unknown',
                        thcPct,
                        cbdPct,
                        price,
                        regularPrice,
                        inStock,
                        metadata: { imageUrl },
                    });
                }
            } catch (error) {
                parseErrors.push(`Failed to parse JSON product ${i}`);
            }
        }

        return {
            success: true,
            products,
            parseErrors,
            totalFound: productsArray.length,
            parseTimeMs: Date.now() - startTime,
        };

    } catch (error) {
        return {
            success: false,
            products: [],
            parseErrors: [error instanceof Error ? error.message : 'JSON parse error'],
            totalFound: 0,
            parseTimeMs: Date.now() - startTime,
        };
    }
}

/**
 * Get value from object using dot-notation path
 */
function getByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) return undefined;

        // Handle array notation like items[0]
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arr = current[arrayMatch[1]];
            return Array.isArray(arr) ? arr[parseInt(arrayMatch[2])] : undefined;
        }

        return current[key];
    }, obj);
}

// =============================================================================
// MAIN PARSE FUNCTION
// =============================================================================

/**
 * Parse content based on source type
 */
export async function parseContent(
    content: string,
    sourceType: 'html' | 'json_api',
    profileId: string
): Promise<ParseResult> {
    if (sourceType === 'json_api') {
        return parseJson(content, profileId);
    }
    return parseHtml(content, profileId);
}
