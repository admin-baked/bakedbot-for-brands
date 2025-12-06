'use server';

// src/server/services/ezal/parser-engine.ts
/**
 * Parser Engine
 * Config-driven HTML/JSON parsing for competitive menu data
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
// HTML PARSING
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
        // Use regex-based parsing since we're in Node.js without DOM
        // In production, consider using cheerio or jsdom for better parsing

        const selectors = profile.selectors;

        // Find product containers using simplified pattern matching
        const productMatches = findProductBlocks(html, selectors.productContainer);

        logger.info('[Ezal Parser] Found product blocks:', {
            count: productMatches.length,
            profileId
        });

        for (let i = 0; i < productMatches.length; i++) {
            try {
                const block = productMatches[i];
                const product = extractProduct(block, selectors, profile.categoryMapping || {}, i);

                if (product && product.productName && product.price > 0) {
                    products.push(product);
                }
            } catch (error) {
                parseErrors.push(`Failed to parse product ${i}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return {
            success: true,
            products,
            parseErrors,
            totalFound: productMatches.length,
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
 * Find product blocks using simplified pattern matching
 * This is a basic implementation - in production, use cheerio or JSDOM
 */
function findProductBlocks(html: string, containerSelector: string): string[] {
    const blocks: string[] = [];

    // Try to extract common product container patterns
    // This is simplified - real implementation would use proper HTML parsing

    // Convert selector to patterns
    const patterns = containerSelector.split(',').map(s => s.trim());

    for (const pattern of patterns) {
        // Handle class selectors
        if (pattern.startsWith('.')) {
            const className = pattern.slice(1).split(/[.\s\[]/)[0];
            const regex = new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\w+>`, 'gi');

            let match;
            while ((match = regex.exec(html)) !== null) {
                blocks.push(match[0]);
                if (blocks.length >= 500) break; // Safety limit
            }
        }

        // Handle data attribute selectors
        if (pattern.includes('[data-')) {
            const attrMatch = pattern.match(/\[([^\]=]+)(?:="([^"]*)")?\]/);
            if (attrMatch) {
                const attrName = attrMatch[1];
                const attrValue = attrMatch[2];

                let regex;
                if (attrValue) {
                    regex = new RegExp(`<[^>]+${attrName}="${attrValue}"[^>]*>([\\s\\S]*?)<\\/\\w+>`, 'gi');
                } else {
                    regex = new RegExp(`<[^>]+${attrName}[^>]*>([\\s\\S]*?)<\\/\\w+>`, 'gi');
                }

                let match;
                while ((match = regex.exec(html)) !== null) {
                    blocks.push(match[0]);
                    if (blocks.length >= 500) break;
                }
            }
        }

        if (blocks.length >= 500) break;
    }

    return blocks;
}

/**
 * Extract product data from a block
 */
function extractProduct(
    block: string,
    selectors: ParserProfile['selectors'],
    categoryMapping: Record<string, ProductCategory>,
    index: number
): ParsedProduct | null {
    if (!selectors) return null;

    const productName = extractText(block, selectors.productName);
    const brandName = extractText(block, selectors.brandName) || 'Unknown';
    const priceText = extractText(block, selectors.price);
    const regularPriceText = selectors.regularPrice ? extractText(block, selectors.regularPrice) : null;
    const categoryText = selectors.category ? extractText(block, selectors.category) : '';
    const thcText = selectors.thc ? extractText(block, selectors.thc) : '';
    const cbdText = selectors.cbd ? extractText(block, selectors.cbd) : '';
    const imageUrl = selectors.imageUrl ? extractAttribute(block, selectors.imageUrl, 'src') : undefined;
    const productUrl = selectors.productUrl ? extractAttribute(block, selectors.productUrl, 'href') : undefined;
    const strainText = selectors.strain ? extractText(block, selectors.strain) : '';

    // Check stock status
    const outOfStockIndicator = selectors.outOfStockIndicator || '';
    const isOutOfStock = outOfStockIndicator && block.toLowerCase().includes('out-of-stock') ||
        block.toLowerCase().includes('sold-out') ||
        block.toLowerCase().includes('unavailable');

    // Parse price
    const price = parsePrice(priceText);
    const regularPrice = regularPriceText ? parsePrice(regularPriceText) : null;

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
 * Extract text from HTML using selector pattern
 */
function extractText(html: string, selector?: string): string {
    if (!selector) return '';

    // Try class selector
    if (selector.startsWith('.')) {
        const className = selector.slice(1).split(/[.\s\[]/)[0];
        const regex = new RegExp(`class="[^"]*\\b${className}\\b[^"]*"[^>]*>([^<]+)<`, 'i');
        const match = html.match(regex);
        return match ? match[1].trim() : '';
    }

    // Try data attribute selector
    if (selector.includes('[data-')) {
        const attrMatch = selector.match(/\[([^\]=]+)(?:="([^"]*)")?\]/);
        if (attrMatch) {
            const attrName = attrMatch[1];
            const regex = new RegExp(`${attrName}[^>]*>([^<]+)<`, 'i');
            const match = html.match(regex);
            return match ? match[1].trim() : '';
        }
    }

    return '';
}

/**
 * Extract attribute from HTML
 */
function extractAttribute(html: string, selector: string, attr: string): string | undefined {
    const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : undefined;
}

/**
 * Parse price from text
 */
function parsePrice(text: string): number {
    if (!text) return 0;
    const match = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
    if (!match) return 0;
    return parseFloat(match[1].replace(',', ''));
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
// JSON PARSING
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
