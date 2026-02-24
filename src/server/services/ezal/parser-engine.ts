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
} from '@/types/ezal-discovery';
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
    sourceType: 'html' | 'json_api' | 'jina',
    profileId: string
): Promise<ParseResult> {
    if (sourceType === 'json_api') {
        return parseJson(content, profileId);
    }
    if (sourceType === 'jina') {
        return parseWithJina(content);
    }
    return parseHtml(content, profileId);
}

// =============================================================================
// JINA LLM EXTRACTION
// =============================================================================

// =============================================================================
// LEAFLY REGEX PARSER (no LLM required)
// =============================================================================

/**
 * Regex-based parser for Leafly dispensary menu pages.
 * Leafly renders product data SSR — format is consistent enough for regex.
 *
 * Leafly markdown structure (per product):
 *   Category ### Name #### by BRAND THC X% CBD Y% Strain ★rating](url)[each $XX.XX](url)
 *
 * Strategy: split on [each $PRICE] anchors; each segment's TAIL holds the product block.
 */
function parseLeafly(markdown: string): ParseResult {
    const startTime = Date.now();
    const products: ParsedProduct[] = [];
    const parseErrors: string[] = [];

    const CATEGORY_MAP: Record<string, ProductCategory> = {
        preroll: 'pre_roll', 'pre-roll': 'pre_roll',
        flower: 'flower', vape: 'vape', cartridge: 'vape',
        edible: 'edible', gummy: 'edible', chocolate: 'edible', beverage: 'edible',
        concentrate: 'concentrate', wax: 'concentrate', shatter: 'concentrate',
        rosin: 'concentrate', resin: 'concentrate', hash: 'concentrate',
        tincture: 'tincture', topical: 'topical', capsule: 'edible', accessory: 'accessory',
    };

    // Split on price anchors — everything between two anchors is one product block.
    // parts[0] = header; parts[i>=1] = "$PRICE](url)\n...next product block..."
    const parts = markdown.split(/\[each\s+\$/);

    for (let i = 1; i < parts.length; i++) {
        try {
            // Price is at the start of this segment
            const priceMatch = parts[i].match(/^([\d.]+)/);
            if (!priceMatch) continue;
            const price = parseFloat(priceMatch[1]);

            // Product info is at the TAIL of the previous segment (last 600 chars)
            const productBlock = parts[i - 1].slice(-600);

            // Category — LAST occurrence in block (closest to price)
            const catRx = /\b(Preroll|Pre-Roll|Flower|Vape|Cartridge|Edible|Gummy|Concentrate|Wax|Shatter|Rosin|Resin|Hash|Tincture|Topical|Capsule|Accessory)\s+###/gi;
            let catMatch: RegExpExecArray | null;
            let lastCat: RegExpExecArray | null = null;
            while ((catMatch = catRx.exec(productBlock)) !== null) lastCat = catMatch;
            if (!lastCat) continue;
            const category: ProductCategory = CATEGORY_MAP[lastCat[1].toLowerCase()] ?? 'other';

            // Narrow to just the final product's portion (after the last category keyword)
            const tail = productBlock.substring(lastCat.index);

            // Name — first ### ... #### in tail
            const nameMatch = tail.match(/###\s+([\s\S]+?)\s*####/);
            const rawName = nameMatch?.[1]?.trim().replace(/\s+/g, ' ') || '';
            if (!rawName || rawName.length < 3) continue;

            // Brand — after "#### by" stopping at THC, CBD%, rating, or link end
            const brandMatch = tail.match(/####\s+by\s+([^\n]+?)(?=\s+(?:THC|CBD)\b|\s*[\d.]+[★*]|\s*\])/i);
            const brand = brandMatch?.[1]?.trim() || '';

            // THC%
            const thcMatch = tail.match(/THC\s+([\d.]+)%/i);
            const thcPct = thcMatch ? parseFloat(thcMatch[1]) : null;

            // CBD%
            const cbdMatch = tail.match(/CBD\s+([\d.]+)%/i);
            const cbdPct = cbdMatch ? parseFloat(cbdMatch[1]) : null;

            // Strain — Leafly explicitly labels it (Sativa/Indica/Hybrid/CBD) before ★ rating
            // Only use this explicit label, NOT a CBD% mention
            let strainType: StrainType = 'unknown';
            const strainLabelMatch = tail.match(/\b(Sativa|Indica|Hybrid|CBD)\b(?=\s+[\d.]+[★*])/i);
            if (strainLabelMatch) {
                const sl = strainLabelMatch[1].toLowerCase();
                if (sl === 'sativa') strainType = 'sativa';
                else if (sl === 'indica') strainType = 'indica';
                else if (sl === 'hybrid') strainType = 'hybrid';
                else if (sl === 'cbd') strainType = 'cbd';
            } else {
                // Fallback: check name for strain keywords
                const lc = rawName.toLowerCase();
                if (/\bsativa\b/.test(lc)) strainType = 'sativa';
                else if (/\bindica\b/.test(lc)) strainType = 'indica';
                else if (/\bhybrid\b/.test(lc)) strainType = 'hybrid';
            }

            // Size in grams from name
            const sizeMatch = rawName.match(/(\d+(?:\.\d+)?)\s*g\b/i);
            const sizeGrams = sizeMatch ? parseFloat(sizeMatch[1]) : undefined;

            const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60);

            // Deduplicate by slug
            if (products.some(p => p.externalProductId === `leafly-${slug}`)) continue;

            products.push({
                externalProductId: `leafly-${slug}`,
                productName: rawName,
                brandName: brand,
                category,
                strainType,
                thcPct,
                cbdPct,
                price,
                regularPrice: null,
                inStock: true,
                metadata: { sizeGrams, description: undefined },
            });
        } catch (e: any) {
            parseErrors.push(`Chunk parse error: ${e.message}`);
        }
    }

    logger.info('[Ezal] parseLeafly complete', {
        products: products.length, parseTimeMs: Date.now() - startTime,
    });

    return {
        success: products.length > 0,
        products,
        parseErrors,
        totalFound: products.length,
        parseTimeMs: Date.now() - startTime,
    };
}

// =============================================================================
// JINA LLM EXTRACTION
// =============================================================================

interface JinaExtractedProduct {
    id?: string;
    name?: string;
    brand?: string;
    category?: string;
    strain?: string;
    thcPct?: number | null;
    cbdPct?: number | null;
    price?: number | null;
    regularPrice?: number | null;
    inStock?: boolean;
    sizeGrams?: number | null;
    description?: string;
}

const VALID_CATEGORIES = new Set(['flower','pre_roll','vape','edible','concentrate','topical','tincture','accessory']);
const VALID_STRAINS    = new Set(['indica','sativa','hybrid','cbd']);

function toCategory(raw: string | undefined): ProductCategory {
    const norm = (raw || '').toLowerCase().replace(/[-\s]/g, '_');
    if (norm === 'pre_roll' || norm === 'preroll') return 'pre_roll';
    if (VALID_CATEGORIES.has(norm)) return norm as ProductCategory;
    return 'other';
}

function toStrain(raw: string | undefined): StrainType {
    const norm = (raw || '').toLowerCase();
    if (VALID_STRAINS.has(norm)) return norm as StrainType;
    return 'unknown';
}

/**
 * Extract cannabis products from Jina Reader markdown using Claude Haiku.
 * Used when sourceType === 'jina'. Does not require a parser profile.
 */
async function parseWithJina(markdown: string): Promise<ParseResult> {
    const startTime = Date.now();

    if (!markdown || markdown.trim().length < 100) {
        return { success: false, products: [], parseErrors: ['Markdown too short'], totalFound: 0, parseTimeMs: 0 };
    }

    // Auto-detect Leafly content — use fast regex parser instead of LLM
    if (markdown.includes('leafly.com') && markdown.includes('#### by ')) {
        logger.info('[Ezal] parseWithJina: detected Leafly format, using regex parser');
        return parseLeafly(markdown);
    }

    const claudeKey = process.env.CLAUDE_API_KEY;
    if (!claudeKey) {
        logger.warn('[Ezal] parseWithJina: CLAUDE_API_KEY not set, skipping LLM extraction');
        return { success: false, products: [], parseErrors: ['CLAUDE_API_KEY not configured'], totalFound: 0, parseTimeMs: 0 };
    }

    // Trim to where product data likely starts (skip nav/header noise)
    const firstPrice = markdown.indexOf('$');
    const contentStart = firstPrice > 0 ? Math.max(0, firstPrice - 500) : 0;
    const contentSlice = markdown.substring(contentStart, contentStart + 8000);

    const prompt = `You are extracting cannabis product listings from a dispensary menu page.

Extract every distinct cannabis product you can find. For each product extract:
- id: short slug (e.g. "blue-dream-35g")
- name: product name
- brand: brand/manufacturer (null if unknown)
- category: one of: flower, pre_roll, vape, edible, concentrate, topical, tincture, accessory, other
- strain: one of: sativa, indica, hybrid, cbd, or null
- thcPct: THC percentage as a number (e.g. 22.5), or null
- cbdPct: CBD percentage as a number, or null
- price: current price in dollars as a number (e.g. 45.00), or null if not shown
- regularPrice: original/regular price if on sale, or null
- inStock: true if available, false if sold out, true if unclear
- sizeGrams: weight in grams if shown (e.g. 3.5 for 1/8oz), or null
- description: brief description or null

Return a JSON object with a single "products" array. If no products are found, return {"products":[]}.
Only return valid JSON, no explanation text.

PAGE CONTENT:
${contentSlice}`;

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
            }),
            signal: AbortSignal.timeout(30000),
        });

        const aiData = await res.json() as { content?: Array<{ type: string; text: string }> };
        const text = aiData.content?.find(b => b.type === 'text')?.text || '';

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { success: false, products: [], parseErrors: ['No JSON in LLM response'], totalFound: 0, parseTimeMs: Date.now() - startTime };
        }

        const parsed = JSON.parse(jsonMatch[0]) as { products?: JinaExtractedProduct[] };
        const rawProducts = parsed.products || [];

        const products: ParsedProduct[] = rawProducts
            .filter(p => p.name && p.name.trim().length > 0)
            .map((p, i): ParsedProduct => ({
                externalProductId: p.id || `jina-${i}-${(p.name || '').toLowerCase().replace(/\s+/g, '-').substring(0, 40)}`,
                brandName: p.brand || '',
                productName: p.name || '',
                category: toCategory(p.category),
                strainType: toStrain(p.strain),
                thcPct: typeof p.thcPct === 'number' ? p.thcPct : null,
                cbdPct: typeof p.cbdPct === 'number' ? p.cbdPct : null,
                price: typeof p.price === 'number' ? p.price : 0,
                regularPrice: typeof p.regularPrice === 'number' ? p.regularPrice : null,
                inStock: p.inStock !== false,
                metadata: {
                    sizeGrams: typeof p.sizeGrams === 'number' ? p.sizeGrams : undefined,
                    description: p.description || undefined,
                },
            }));

        logger.info('[Ezal] parseWithJina succeeded', {
            rawCount: rawProducts.length, validCount: products.length, parseTimeMs: Date.now() - startTime,
        });

        return {
            success: products.length > 0,
            products,
            parseErrors: products.length === 0 ? ['LLM found no products in content'] : [],
            totalFound: products.length,
            parseTimeMs: Date.now() - startTime,
        };
    } catch (err: any) {
        logger.error('[Ezal] parseWithJina LLM call failed', { error: err.message });
        return { success: false, products: [], parseErrors: [err.message], totalFound: 0, parseTimeMs: Date.now() - startTime };
    }
}
