import type { ChatbotProduct } from '@/types/cannmenus';
import { enrichProductsWithChemotypes, rankByChemotype } from '@/ai/chemotype-ranking';
import { normalizeCategoryName } from '@/lib/utils/product-image';

type CanonicalCategory =
    | 'flower'
    | 'pre-rolls'
    | 'edibles'
    | 'concentrates'
    | 'vapes'
    | 'tinctures'
    | 'topicals'
    | 'beverages'
    | 'capsules'
    | 'accessories';

type DesiredEffect =
    | 'sleep'
    | 'relaxation'
    | 'energy'
    | 'focus'
    | 'creativity'
    | 'pain';

export interface MenuSearchIntent {
    category?: CanonicalCategory;
    desiredEffects: DesiredEffect[];
    strainType?: 'indica' | 'sativa' | 'hybrid';
    maxPrice?: number;
    queryTokens: string[];
}

const STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'any',
    'are',
    'can',
    'could',
    'do',
    'for',
    'good',
    'have',
    'i',
    'me',
    'please',
    'show',
    'something',
    'that',
    'the',
    'what',
    'whats',
    'which',
    'with',
    'you',
    'your',
]);

const CATEGORY_KEYWORDS: Record<CanonicalCategory, string[]> = {
    flower: ['flower', 'bud', 'buds', 'strain', 'strains', 'eighth', 'eighths'],
    'pre-rolls': ['pre-roll', 'pre-rolls', 'preroll', 'prerolls', 'joint', 'joints', 'cone', 'cones'],
    edibles: ['edible', 'edibles', 'gummy', 'gummies', 'chew', 'chews', 'chocolate', 'mints', 'mint'],
    concentrates: ['concentrate', 'concentrates', 'dab', 'dabs', 'wax', 'shatter', 'resin', 'rosin', 'hash'],
    vapes: ['vape', 'vapes', 'cart', 'carts', 'cartridge', 'cartridges', 'pod', 'pods'],
    tinctures: ['tincture', 'tinctures', 'oil', 'oils', 'drops', 'dropper'],
    topicals: ['topical', 'topicals', 'balm', 'balms', 'cream', 'creams', 'lotion', 'salve', 'patch'],
    beverages: ['beverage', 'beverages', 'drink', 'drinks', 'soda', 'tea'],
    capsules: ['capsule', 'capsules', 'pill', 'pills', 'softgel', 'softgels'],
    accessories: ['accessory', 'accessories', 'battery', 'batteries', 'grinder', 'grinders', 'pipe', 'pipes'],
};

const EFFECT_KEYWORDS: Record<DesiredEffect, string[]> = {
    sleep: ['sleep', 'sleepy', 'night', 'nighttime', 'bed', 'bedtime', 'rest', 'restful', 'sedating', 'cbn', 'indica', 'myrcene', 'linalool'],
    relaxation: ['relax', 'relaxed', 'calm', 'chill', 'mellow', 'unwind', 'soothing', 'stress'],
    energy: ['energy', 'energetic', 'uplift', 'uplifting', 'daytime', 'sativa', 'limonene', 'terpinolene'],
    focus: ['focus', 'focused', 'clarity', 'productive', 'pinene'],
    creativity: ['creative', 'creativity', 'inspired', 'inspiration', 'brainstorm'],
    pain: ['pain', 'relief', 'recovery', 'body', 'soothing', 'cbd'],
};

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function dedupeStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

function tokenizeQuery(query: string): string[] {
    return dedupeStrings(
        query
            .toLowerCase()
            .replace(/[^a-z0-9+\s-]/g, ' ')
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    );
}

function detectCategory(query: string): CanonicalCategory | undefined {
    const lower = query.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[CanonicalCategory, string[]]>) {
        if (keywords.some((keyword) => lower.includes(keyword))) {
            return category;
        }
    }

    return undefined;
}

function detectDesiredEffects(query: string): DesiredEffect[] {
    const lower = query.toLowerCase();

    return (Object.entries(EFFECT_KEYWORDS) as Array<[DesiredEffect, string[]]>)
        .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
        .map(([effect]) => effect);
}

function detectStrainType(query: string): MenuSearchIntent['strainType'] {
    const lower = query.toLowerCase();
    if (/\bindica\b/.test(lower)) return 'indica';
    if (/\bsativa\b/.test(lower)) return 'sativa';
    if (/\bhybrid\b/.test(lower)) return 'hybrid';
    return undefined;
}

function detectMaxPrice(query: string): number | undefined {
    const priceMatch = query.toLowerCase().match(/(?:under|below|less than|max)\s*\$?(\d+(?:\.\d+)?)/);
    if (!priceMatch) return undefined;

    const price = Number(priceMatch[1]);
    return Number.isFinite(price) ? price : undefined;
}

function normalizeCategoryToken(rawCategory: unknown): string {
    return normalizeCategoryName(normalizeText(rawCategory)).toLowerCase();
}

function getProductSearchText(product: any): string {
    return [
        product.name,
        product.product_name,
        product.brandName,
        product.brand_name,
        product.brandId,
        product.brand_id,
        product.category,
        product.category_name,
        product.description,
        product.strainType,
        product.strain_type,
        Array.isArray(product.effects) ? product.effects.join(' ') : '',
        Array.isArray(product.terpenes) ? product.terpenes.join(' ') : '',
    ]
        .map(normalizeText)
        .join(' ')
        .toLowerCase();
}

function getProductPrice(product: any): number {
    const value = Number(product.price ?? product.latest_price ?? product.current_price ?? 0);
    return Number.isFinite(value) ? value : 0;
}

function getProductStock(product: any): number | null {
    const rawStock = product.stock ?? product.quantity_available ?? product.qty;
    if (typeof rawStock === 'number' && Number.isFinite(rawStock)) return rawStock;
    if (product.in_stock === false || product.inStock === false) return 0;
    return null;
}

function isInStock(product: any): boolean {
    const stock = getProductStock(product);
    return stock === null || stock > 0;
}

function matchesCategory(product: any, category: CanonicalCategory): boolean {
    const normalized = normalizeCategoryToken(product.category ?? product.category_name);
    switch (category) {
        case 'pre-rolls':
            return normalized === 'pre-rolls';
        case 'edibles':
            return normalized === 'edibles';
        case 'concentrates':
            return normalized === 'concentrates';
        case 'vapes':
            return normalized === 'vapes';
        case 'tinctures':
            return normalized === 'tinctures';
        case 'topicals':
            return normalized === 'topicals';
        case 'beverages':
            return normalized === 'beverages';
        case 'capsules':
            return normalized === 'capsules';
        case 'accessories':
            return normalized === 'accessories';
        default:
            return normalized === 'flower';
    }
}

function getProductId(product: any): string {
    return String(product.id || product.sku_id || product.cann_sku_id || product.externalId || product.name);
}

function toChatbotProduct(product: any): ChatbotProduct {
    return {
        id: getProductId(product),
        name: product.name || product.product_name || 'Unknown Product',
        category: normalizeCategoryName(product.category ?? product.category_name),
        price: getProductPrice(product),
        imageUrl: normalizeText(product.imageUrl || product.image_url || product.primary_image),
        thcPercent: product.thcPercent ?? product.thc ?? product.percentage_thc ?? null,
        cbdPercent: product.cbdPercent ?? product.cbd ?? product.percentage_cbd ?? null,
        description: normalizeText(product.description) || normalizeText(product.name) || normalizeText(product.product_name),
        url: normalizeText(product.url || product.menu_url),
    };
}

function scoreProduct(product: any, intent: MenuSearchIntent): number {
    const haystack = getProductSearchText(product);
    if (!haystack) return Number.NEGATIVE_INFINITY;
    if (!isInStock(product)) return Number.NEGATIVE_INFINITY;

    const price = getProductPrice(product);
    if (intent.maxPrice !== undefined && price > intent.maxPrice) {
        return Number.NEGATIVE_INFINITY;
    }

    let score = 0;

    if (intent.category) {
        if (!matchesCategory(product, intent.category)) {
            return Number.NEGATIVE_INFINITY;
        }
        score += 6;
    }

    if (intent.strainType) {
        if (haystack.includes(intent.strainType)) {
            score += 4;
        } else {
            score -= 1;
        }
    }

    for (const effect of intent.desiredEffects) {
        const matchedEffect = EFFECT_KEYWORDS[effect].some((keyword) => haystack.includes(keyword));
        if (matchedEffect) {
            score += 5;
        }
    }

    for (const token of intent.queryTokens) {
        if (haystack.includes(token)) {
            score += 1.25;
        }
    }

    if (typeof product.on_sale === 'boolean' ? product.on_sale : product.sale_price != null) {
        score += 0.5;
    }

    return score;
}

export function parseMenuSearchIntent(query: string): MenuSearchIntent {
    return {
        category: detectCategory(query),
        desiredEffects: detectDesiredEffects(query),
        strainType: detectStrainType(query),
        maxPrice: detectMaxPrice(query),
        queryTokens: tokenizeQuery(query),
    };
}

function rankByChemotypeFallback(products: any[], query: string, limit: number): any[] {
    const rankedProducts = rankByChemotype(enrichProductsWithChemotypes(products.map(toChatbotProduct)), query)
        .slice(0, limit);
    const productsById = new Map(
        products.map((product) => [getProductId(product), product])
    );

    return rankedProducts
        .map((product) => productsById.get(product.id))
        .filter((product): product is any => Boolean(product));
}

export function searchMenuProducts(
    query: string,
    products: any[],
    options?: { limit?: number }
): any[] {
    const limit = Math.max(1, Math.min(options?.limit ?? 15, 25));
    const intent = parseMenuSearchIntent(query);

    const scored = products
        .map((product) => ({
            product,
            score: scoreProduct(product, intent),
            price: getProductPrice(product),
            name: normalizeText(product.name || product.product_name).toLowerCase(),
        }))
        .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.price !== b.price) return a.price - b.price;
            return a.name.localeCompare(b.name);
        });

    if (scored.length > 0) {
        return scored.slice(0, limit).map((entry) => entry.product);
    }

    const requestedCategory = intent.category;

    if (requestedCategory) {
        const categoryMatches = products
            .filter((product) => matchesCategory(product, requestedCategory) && isInStock(product))
            .sort((a, b) => getProductPrice(a) - getProductPrice(b));

        if (categoryMatches.length > 0) {
            return categoryMatches.slice(0, limit);
        }
    }

    if (intent.desiredEffects.length > 0) {
        const chemotypeMatches = rankByChemotypeFallback(products.filter(isInStock), query, limit);
        if (chemotypeMatches.length > 0) {
            return chemotypeMatches;
        }
    }

    return [];
}

export function isAgeRequirementQuestion(query: string): boolean {
    const lower = query.toLowerCase();
    return /(18\+|21\+|18 plus|21 plus|21 or 18|18 or 21|how old|age requirement|age limit)/.test(lower);
}

export function getAgeRequirementAnswer(state?: string): string {
    const normalizedState = normalizeText(state).toLowerCase();

    if (normalizedState === 'new york' || normalizedState === 'ny') {
        return '21+ only. New York requires a valid ID.';
    }

    return '21+ only. Please bring a valid government-issued ID when you shop.';
}

export function buildMenuSearchFallbackMessage(query: string, results: any[]): string {
    const intent = parseMenuSearchIntent(query);

    if (intent.category === 'edibles') {
        return results.length === 1
            ? 'I found one edible on the menu that looks like a fit.'
            : 'I found a few edibles on the menu that look like a fit.';
    }

    if (intent.desiredEffects.includes('sleep') || intent.desiredEffects.includes('relaxation')) {
        return results.length === 1
            ? 'I found one option customers often browse for a more relaxing, nighttime vibe.'
            : 'I found a few options customers often browse for a more relaxing, nighttime vibe.';
    }

    if (intent.strainType === 'sativa' || intent.desiredEffects.includes('energy') || intent.desiredEffects.includes('focus')) {
        return results.length === 1
            ? 'I found one brighter daytime option that looks like a fit.'
            : 'I found a few brighter daytime options that look like a fit.';
    }

    return results.length === 1
        ? 'I found one option on the menu that looks like a fit.'
        : 'I found a few options on the menu that look like a fit.';
}
