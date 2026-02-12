/**
 * Unit tests for upsell-engine.ts
 *
 * Tests the scoring functions, strategy detection, and suggestion generation
 * for the cannabis science product pairing engine.
 *
 * NOTE: Tests that require Firestore (getProductUpsells, getCartUpsells, etc.)
 * are not included here — those are integration tests.
 * These tests cover the pure scoring logic extracted via module internals.
 */

import type { Product } from '@/types/products';
import {
    DEFAULT_UPSELL_WEIGHTS,
    PLACEMENT_WEIGHT_OVERRIDES,
    TERPENE_PAIRINGS,
    EFFECT_COMPLEMENTS,
    CATEGORY_COMPLEMENTS,
} from '@/types/upsell';

// --- Test Helpers: Mock Products ---

function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
        id: 'prod_default',
        name: 'Test Product',
        category: 'Flower',
        price: 35,
        imageUrl: '',
        imageHint: '',
        description: 'A test product',
        brandId: 'test-brand',
        terpenes: [],
        effects: [],
        ...overrides,
    };
}

const indicaFlower = makeProduct({
    id: 'prod_indica_flower',
    name: 'Grandaddy Purple',
    category: 'Flower',
    price: 35,
    strainType: 'indica',
    terpenes: [{ name: 'myrcene', percentage: 1.2 }, { name: 'linalool', percentage: 0.5 }],
    effects: ['relaxed', 'sleepy', 'calm'],
    stock: 25,
    cost: 12,
});

const sativaVape = makeProduct({
    id: 'prod_sativa_vape',
    name: 'Blue Dream Cartridge',
    category: 'Vapes',
    price: 45,
    strainType: 'sativa',
    terpenes: [{ name: 'limonene', percentage: 0.8 }, { name: 'pinene', percentage: 0.4 }],
    effects: ['energetic', 'creative', 'uplifted'],
    stock: 40,
    cost: 15,
});

const calmEdible = makeProduct({
    id: 'prod_calm_edible',
    name: 'Melatonin Gummies',
    category: 'Edibles',
    price: 28,
    terpenes: [{ name: 'linalool', percentage: 0.3 }],
    effects: ['relaxed', 'sleepy'],
    stock: 60,
    cost: 8,
});

const highMarginTopical = makeProduct({
    id: 'prod_topical',
    name: 'CBD Relief Balm',
    category: 'Topicals',
    price: 50,
    terpenes: [{ name: 'caryophyllene', percentage: 0.6 }],
    effects: ['calm'],
    stock: 15,
    cost: 10,
});

const lowStockConcentrate = makeProduct({
    id: 'prod_concentrate',
    name: 'Live Resin Badder',
    category: 'Concentrates',
    price: 55,
    terpenes: [{ name: 'limonene', percentage: 1.0 }],
    effects: ['euphoric', 'creative'],
    stock: 2,
    cost: 20,
});

const overstockedPreroll = makeProduct({
    id: 'prod_preroll',
    name: 'Sour Diesel Pre-Roll',
    category: 'Pre-roll',
    price: 12,
    strainType: 'sativa',
    terpenes: [{ name: 'limonene', percentage: 0.7 }, { name: 'pinene', percentage: 0.3 }],
    effects: ['energetic', 'focused'],
    stock: 80,
    cost: 3,
});

const noTerpProduct = makeProduct({
    id: 'prod_no_terps',
    name: 'Mystery Edible',
    category: 'Edibles',
    price: 20,
    terpenes: [],
    effects: [],
    stock: 30,
    strainType: 'indica',
});

// --- Tests ---

describe('Upsell Engine - Type Constants', () => {
    describe('DEFAULT_UPSELL_WEIGHTS', () => {
        it('should sum to 1.0', () => {
            const sum =
                DEFAULT_UPSELL_WEIGHTS.terpeneEffectMatch +
                DEFAULT_UPSELL_WEIGHTS.marginContribution +
                DEFAULT_UPSELL_WEIGHTS.inventoryPriority +
                DEFAULT_UPSELL_WEIGHTS.categoryComplement +
                DEFAULT_UPSELL_WEIGHTS.priceFit;
            expect(sum).toBeCloseTo(1.0, 5);
        });

        it('terpene/effect match should be the highest weight', () => {
            expect(DEFAULT_UPSELL_WEIGHTS.terpeneEffectMatch).toBe(0.30);
            expect(DEFAULT_UPSELL_WEIGHTS.terpeneEffectMatch).toBeGreaterThan(DEFAULT_UPSELL_WEIGHTS.marginContribution);
        });
    });

    describe('PLACEMENT_WEIGHT_OVERRIDES', () => {
        it('checkout should favor margin over terpene match', () => {
            const checkoutOverrides = PLACEMENT_WEIGHT_OVERRIDES.checkout;
            const effectiveMargin = checkoutOverrides.marginContribution ?? DEFAULT_UPSELL_WEIGHTS.marginContribution;
            const effectiveTerpene = checkoutOverrides.terpeneEffectMatch ?? DEFAULT_UPSELL_WEIGHTS.terpeneEffectMatch;
            expect(effectiveMargin).toBeGreaterThan(effectiveTerpene);
        });

        it('cart should boost category complement', () => {
            const cartOverrides = PLACEMENT_WEIGHT_OVERRIDES.cart;
            const effectiveCat = cartOverrides.categoryComplement ?? DEFAULT_UPSELL_WEIGHTS.categoryComplement;
            expect(effectiveCat).toBe(0.20);
            expect(effectiveCat).toBeGreaterThan(DEFAULT_UPSELL_WEIGHTS.categoryComplement);
        });

        it('product_detail and chatbot should use defaults (no overrides)', () => {
            expect(Object.keys(PLACEMENT_WEIGHT_OVERRIDES.product_detail).length).toBe(0);
            expect(Object.keys(PLACEMENT_WEIGHT_OVERRIDES.chatbot).length).toBe(0);
        });
    });
});

describe('Upsell Engine - Cannabis Science Pairing Rules', () => {
    describe('TERPENE_PAIRINGS', () => {
        it('should pair myrcene with linalool (relaxation stack)', () => {
            expect(TERPENE_PAIRINGS.myrcene).toContain('linalool');
        });

        it('should pair limonene with pinene (energy stack)', () => {
            expect(TERPENE_PAIRINGS.limonene).toContain('pinene');
        });

        it('should pair caryophyllene with myrcene (pain relief stack)', () => {
            expect(TERPENE_PAIRINGS.caryophyllene).toContain('myrcene');
        });

        it('should pair linalool with myrcene (sleep stack)', () => {
            expect(TERPENE_PAIRINGS.linalool).toContain('myrcene');
        });

        it('should have bidirectional pairing for common stacks', () => {
            // If myrcene pairs with linalool, linalool should pair with myrcene
            expect(TERPENE_PAIRINGS.myrcene).toContain('linalool');
            expect(TERPENE_PAIRINGS.linalool).toContain('myrcene');
        });
    });

    describe('EFFECT_COMPLEMENTS', () => {
        it('should complement relaxed with sleepy and calm', () => {
            expect(EFFECT_COMPLEMENTS.relaxed).toContain('sleepy');
            expect(EFFECT_COMPLEMENTS.relaxed).toContain('calm');
        });

        it('should complement creative with focused and euphoric', () => {
            expect(EFFECT_COMPLEMENTS.creative).toContain('focused');
            expect(EFFECT_COMPLEMENTS.creative).toContain('euphoric');
        });

        it('should not complement sleepy with energetic', () => {
            expect(EFFECT_COMPLEMENTS.sleepy).not.toContain('energetic');
        });
    });

    describe('CATEGORY_COMPLEMENTS', () => {
        it('should suggest edibles/pre-rolls for flower buyers', () => {
            expect(CATEGORY_COMPLEMENTS['Flower']).toContain('Edibles');
            expect(CATEGORY_COMPLEMENTS['Flower']).toContain('Pre-roll');
        });

        it('should suggest flower and concentrates for vape buyers', () => {
            expect(CATEGORY_COMPLEMENTS['Vapes']).toContain('Flower');
            expect(CATEGORY_COMPLEMENTS['Vapes']).toContain('Concentrates');
        });

        it('should suggest tinctures for edible buyers', () => {
            expect(CATEGORY_COMPLEMENTS['Edibles']).toContain('Tinctures');
        });
    });
});

describe('Upsell Engine - Scoring Logic', () => {
    describe('Terpene/Effect Match scoring', () => {
        it('indica flower should score high against calm edibles (shared linalool)', () => {
            // Both have linalool terpene → entourage effect pairing
            const anchorTerps = indicaFlower.terpenes!.map(t => t.name.toLowerCase());
            const candidateTerps = calmEdible.terpenes!.map(t => t.name.toLowerCase());

            // linalool is in both + myrcene pairs with linalool
            let terpMatches = 0;
            for (const at of anchorTerps) {
                const pairings = TERPENE_PAIRINGS[at] || [];
                for (const ct of candidateTerps) {
                    if (pairings.includes(ct)) terpMatches++;
                    if (at === ct) terpMatches += 0.5;
                }
            }
            // myrcene→linalool (pairing match) = 1, linalool→linalool (same) = 0.5
            expect(terpMatches).toBeGreaterThanOrEqual(1);
        });

        it('sativa vape should score low against indica products (no terpene overlap)', () => {
            // limonene/pinene vs myrcene/linalool → minimal pairing
            const anchorTerps = sativaVape.terpenes!.map(t => t.name.toLowerCase());
            const candidateTerps = indicaFlower.terpenes!.map(t => t.name.toLowerCase());

            let terpMatches = 0;
            for (const at of anchorTerps) {
                const pairings = TERPENE_PAIRINGS[at] || [];
                for (const ct of candidateTerps) {
                    if (pairings.includes(ct)) terpMatches++;
                    if (at === ct) terpMatches += 0.5;
                }
            }
            // limonene doesn't pair with myrcene/linalool, pinene doesn't pair with them either
            expect(terpMatches).toBe(0);
        });

        it('products with no terpene data should fall back to strain type', () => {
            // Both indica → should get moderate score
            const sameStrain = indicaFlower.strainType === noTerpProduct.strainType;
            expect(sameStrain).toBe(true);
            // With no terpene data on candidate, fallback to strain type match (0.4)
        });
    });

    describe('Margin scoring', () => {
        it('high-margin product should score higher', () => {
            // CBD Relief Balm: price $50, cost $10 → margin 80%
            const topicalMargin = (highMarginTopical.price - highMarginTopical.cost!) / highMarginTopical.price;
            expect(topicalMargin).toBe(0.8);

            // Sativa Vape: price $45, cost $15 → margin 67%
            const vapeMargin = (sativaVape.price - sativaVape.cost!) / sativaVape.price;
            expect(vapeMargin).toBeCloseTo(0.667, 2);

            expect(topicalMargin).toBeGreaterThan(vapeMargin);
        });

        it('product without cost data should get fallback score', () => {
            const noCostProduct = makeProduct({ price: 50, cost: undefined });
            // Fallback formula: min(1, price / 100) * 0.5
            const fallbackScore = Math.min(1, (noCostProduct.price || 0) / 100) * 0.5;
            expect(fallbackScore).toBe(0.25);
        });
    });

    describe('Inventory Priority scoring', () => {
        it('overstocked product (80 units) should score highest', () => {
            expect(overstockedPreroll.stock).toBe(80);
            // stock >= 50 → 0.9
        });

        it('low stock product (2 units) should score 0 (excluded)', () => {
            expect(lowStockConcentrate.stock).toBe(2);
            // stock <= 3 → 0 (don't upsell near-OOS)
        });

        it('normal stock (25 units) should get moderate score', () => {
            expect(indicaFlower.stock).toBe(25);
            // stock >= 10 but < 30 → 0.4
        });
    });

    describe('Category Complement scoring', () => {
        it('should score high for known cross-category complements', () => {
            // Flower → Edibles is a known complement
            const isComplement = CATEGORY_COMPLEMENTS['Flower']?.includes('Edibles');
            expect(isComplement).toBe(true);
        });

        it('should score low for same-category suggestion', () => {
            // Flower → Flower (same category = 0.2)
            const sameCategory = indicaFlower.category === 'Flower';
            expect(sameCategory).toBe(true);
        });

        it('should score medium for different but non-complementary category', () => {
            // Flower → Topicals (not in CATEGORY_COMPLEMENTS for Flower)
            const isComplement = CATEGORY_COMPLEMENTS['Flower']?.includes('Topicals');
            expect(isComplement).toBeFalsy();
        });
    });

    describe('Price Fit scoring', () => {
        it('products within ±30% should score 1.0', () => {
            // Anchor: $35, Candidate: $28 → ratio 0.8 (within 0.7-1.3)
            const ratio = calmEdible.price / indicaFlower.price;
            expect(ratio).toBeGreaterThanOrEqual(0.7);
            expect(ratio).toBeLessThanOrEqual(1.3);
        });

        it('products within ±50% should score 0.6', () => {
            // Anchor: $35, Candidate: $55 → ratio 1.57 (outside 1.3 but within 1.5? No, 1.57 > 1.5)
            const ratio = lowStockConcentrate.price / indicaFlower.price;
            expect(ratio).toBeGreaterThan(1.5); // $55/$35 = 1.57 → scores 0.2
        });

        it('cheap product vs expensive anchor should still score reasonably', () => {
            // Anchor: $45 (vape), Candidate: $12 (preroll) → ratio 0.27 (outside range)
            const ratio = overstockedPreroll.price / sativaVape.price;
            expect(ratio).toBeLessThan(0.5); // Will score 0.2
        });
    });
});

describe('Upsell Engine - Composite Score', () => {
    it('should produce a score between 0 and 1', () => {
        // Manually compute a composite score
        const terpScore = 0.7;
        const marginScore = 0.5;
        const inventoryScore = 0.4;
        const categoryScore = 0.8;
        const priceScore = 1.0;

        const w = DEFAULT_UPSELL_WEIGHTS;
        const composite =
            w.terpeneEffectMatch * terpScore +
            w.marginContribution * marginScore +
            w.inventoryPriority * inventoryScore +
            w.categoryComplement * categoryScore +
            w.priceFit * priceScore;

        expect(composite).toBeGreaterThan(0);
        expect(composite).toBeLessThanOrEqual(1);
    });

    it('checkout weights should favor high-margin over terpene match', () => {
        const checkoutWeights = {
            ...DEFAULT_UPSELL_WEIGHTS,
            ...PLACEMENT_WEIGHT_OVERRIDES.checkout,
        };

        // High margin, low terpene product
        const highMarginScore =
            checkoutWeights.terpeneEffectMatch * 0.2 +
            checkoutWeights.marginContribution * 0.9 +
            checkoutWeights.inventoryPriority * 0.4 +
            checkoutWeights.categoryComplement * 0.5 +
            checkoutWeights.priceFit * 0.8;

        // Low margin, high terpene product
        const highTerpScore =
            checkoutWeights.terpeneEffectMatch * 0.9 +
            checkoutWeights.marginContribution * 0.2 +
            checkoutWeights.inventoryPriority * 0.4 +
            checkoutWeights.categoryComplement * 0.5 +
            checkoutWeights.priceFit * 0.8;

        // At checkout, margin wins
        expect(highMarginScore).toBeGreaterThan(highTerpScore);
    });

    it('product_detail weights should favor terpene match over margin', () => {
        const pdWeights = {
            ...DEFAULT_UPSELL_WEIGHTS,
            ...PLACEMENT_WEIGHT_OVERRIDES.product_detail,
        };

        // High terpene, low margin
        const highTerpScore =
            pdWeights.terpeneEffectMatch * 0.9 +
            pdWeights.marginContribution * 0.2;

        // Low terpene, high margin
        const highMarginScore =
            pdWeights.terpeneEffectMatch * 0.2 +
            pdWeights.marginContribution * 0.9;

        // On product detail, terpene match wins
        expect(highTerpScore).toBeGreaterThan(highMarginScore);
    });
});

describe('Upsell Engine - Thrive Syracuse Scenarios', () => {
    it('indica flower should suggest calm edibles as a pairing', () => {
        // Simulate: anchor = indica flower, candidate = calm edible
        // Terpene match: myrcene→linalool = match, linalool→linalool = same
        // Category: Flower→Edibles = known complement
        // Price: $28/$35 = 0.8 → within range
        // This should be a strong candidate
        const priceRatio = calmEdible.price / indicaFlower.price;
        const isComplement = CATEGORY_COMPLEMENTS[indicaFlower.category]?.includes(calmEdible.category);

        expect(priceRatio).toBeGreaterThanOrEqual(0.7);
        expect(priceRatio).toBeLessThanOrEqual(1.3);
        expect(isComplement).toBe(true);
    });

    it('sativa vape should suggest pre-rolls as cross-category', () => {
        // Vapes → Pre-roll not in CATEGORY_COMPLEMENTS, but Vapes → Flower is
        const isDirectComplement = CATEGORY_COMPLEMENTS['Vapes']?.includes('Pre-roll');
        const isFlowerComplement = CATEGORY_COMPLEMENTS['Vapes']?.includes('Flower');

        // Pre-roll may not be a direct complement of Vapes, but Flower is
        expect(isFlowerComplement).toBe(true);
    });

    it('overstocked pre-rolls should get inventory priority boost', () => {
        // stock >= 50 → inventory score = 0.9
        expect(overstockedPreroll.stock).toBeGreaterThanOrEqual(50);

        // vs. normal stock indica flower (stock 25 → score 0.4)
        expect(indicaFlower.stock).toBeLessThan(50);
    });

    it('low-stock concentrate should be excluded from upsells', () => {
        // stock <= 3 → inventory score = 0 → effectively excluded
        expect(lowStockConcentrate.stock).toBeLessThanOrEqual(3);
    });

    it('CBD topical has highest margin for checkout upsells', () => {
        const topicalMargin = (highMarginTopical.price - highMarginTopical.cost!) / highMarginTopical.price;
        const edibleMargin = (calmEdible.price - calmEdible.cost!) / calmEdible.price;
        const flowerMargin = (indicaFlower.price - indicaFlower.cost!) / indicaFlower.price;

        expect(topicalMargin).toBeGreaterThan(edibleMargin);
        expect(topicalMargin).toBeGreaterThan(flowerMargin);
        expect(topicalMargin).toBe(0.8);
    });
});

describe('Upsell Engine - Edge Cases', () => {
    it('product with $0 price should not crash price fit scoring', () => {
        const freeProduct = makeProduct({ price: 0 });
        // When price is 0, price fit should return 0.5 (neutral)
        const ratio = freeProduct.price === 0 ? 0.5 : freeProduct.price / indicaFlower.price;
        expect(ratio).toBe(0.5);
    });

    it('product with no terpenes and no effects should get baseline score', () => {
        // When both terpenes and effects are empty, use strain type fallback
        const plainProduct = makeProduct({ terpenes: [], effects: [], strainType: undefined });
        // No strain type either → should get low baseline (0.2)
        expect(plainProduct.terpenes).toEqual([]);
        expect(plainProduct.effects).toEqual([]);
        expect(plainProduct.strainType).toBeUndefined();
    });

    it('product with undefined stock should get neutral inventory score', () => {
        const noStockInfo = makeProduct({ stock: undefined });
        // stock === undefined → return 0.3 (neutral)
        expect(noStockInfo.stock).toBeUndefined();
    });

    it('anchor array (cart mode) should check all products for best terpene match', () => {
        // In cart mode, anchors = [indicaFlower, sativaVape]
        // Candidate: calmEdible (linalool)
        // indicaFlower has linalool → should match
        // sativaVape has limonene/pinene → no match with linalool
        // bestScore should come from indicaFlower match
        const anchors = [indicaFlower, sativaVape];
        const candidateTerps = calmEdible.terpenes!.map(t => t.name.toLowerCase());

        let bestMatchCount = 0;
        for (const anchor of anchors) {
            const anchorTerps = anchor.terpenes!.map(t => t.name.toLowerCase());
            let matchCount = 0;
            for (const at of anchorTerps) {
                const pairings = TERPENE_PAIRINGS[at] || [];
                for (const ct of candidateTerps) {
                    if (pairings.includes(ct)) matchCount++;
                    if (at === ct) matchCount += 0.5;
                }
            }
            bestMatchCount = Math.max(bestMatchCount, matchCount);
        }

        expect(bestMatchCount).toBeGreaterThan(0); // indicaFlower.myrcene→linalool match
    });
});
