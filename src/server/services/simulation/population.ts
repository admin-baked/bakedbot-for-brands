/**
 * Simulation Engine - Population Generator
 * 
 * Generates synthetic customers for a simulation run.
 * All IDs are deterministic based on seed for reproducibility.
 */

import {
    SyntheticCustomer,
    CustomerSegment,
    BudgetBand,
    PriceSensitivity,
    SimInputs,
} from '@/types/simulation';
import {
    SEGMENT_PRIORS,
    BUDGET_BAND_PRIORS,
} from '@/types/simulation-profiles';

// ==========================================
// Seeded Random Number Generator
// ==========================================

export class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    /** Returns number between 0 and 1 */
    next(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    /** Returns number between min and max (exclusive) */
    nextRange(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /** Returns integer between min and max (inclusive) */
    nextInt(min: number, max: number): number {
        return Math.floor(this.nextRange(min, max + 1));
    }

    /** Pick from array of weighted options */
    weightedChoice<T>(options: Array<{ value: T; weight: number }>): T {
        const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
        let r = this.next() * totalWeight;

        for (const option of options) {
            r -= option.weight;
            if (r <= 0) {
                return option.value;
            }
        }

        return options[options.length - 1].value;
    }

    /** Pick random item from array */
    choice<T>(items: T[]): T {
        return items[this.nextInt(0, items.length - 1)];
    }

    /** Generate deterministic ID */
    generateId(prefix: string, index: number): string {
        const hash = ((this.seed + index) * 2654435761) >>> 0;
        return `${prefix}_${hash.toString(16).padStart(8, '0')}`;
    }
}

// ==========================================
// Generate Synthetic Customers
// ==========================================

export interface PopulationConfig {
    size: number;
    segmentMix?: Record<CustomerSegment, number>;
    budgetMix?: Record<BudgetBand, number>;
}

export function generatePopulation(
    inputs: SimInputs,
    seed: number,
    config: PopulationConfig
): SyntheticCustomer[] {
    const rng = new SeededRandom(seed);
    const customers: SyntheticCustomer[] = [];

    // Get category distribution from products
    const categoryWeights = getCategoryWeights(inputs.products);

    // Get brand distribution from products
    const brandWeights = getBrandWeights(inputs.products);

    // Use provided mix or defaults
    const segmentMix = config.segmentMix ||
        (inputs.historicalStats?.segmentMix as Record<CustomerSegment, number>) ||
        SEGMENT_PRIORS;

    const budgetMix = config.budgetMix || BUDGET_BAND_PRIORS;

    for (let i = 0; i < config.size; i++) {
        const customer = generateCustomer(
            rng,
            i,
            segmentMix,
            budgetMix,
            categoryWeights,
            brandWeights
        );
        customers.push(customer);
    }

    return customers;
}

function generateCustomer(
    rng: SeededRandom,
    index: number,
    segmentMix: Record<CustomerSegment, number>,
    budgetMix: Record<BudgetBand, number>,
    categoryWeights: Record<string, number>,
    brandWeights: Record<string, number>
): SyntheticCustomer {
    // Pick segment
    const segmentOptions = Object.entries(segmentMix).map(([value, weight]) => ({
        value: value as CustomerSegment,
        weight,
    }));
    const segment = rng.weightedChoice(segmentOptions);

    // Pick budget band
    const budgetOptions = Object.entries(budgetMix).map(([value, weight]) => ({
        value: value as BudgetBand,
        weight,
    }));
    const budgetBand = rng.weightedChoice(budgetOptions);

    // Derive price sensitivity from segment
    const priceSensitivity = derivePriceSensitivity(segment, rng);

    // Generate category affinities (some variation)
    const categoryAffinity: Record<string, number> = {};
    for (const category of Object.keys(categoryWeights)) {
        // Base weight plus random variation
        const base = categoryWeights[category];
        const variation = rng.nextRange(0.5, 1.5);
        categoryAffinity[category] = base * variation;
    }
    // Normalize
    const categoryTotal = Object.values(categoryAffinity).reduce((a, b) => a + b, 0);
    for (const cat of Object.keys(categoryAffinity)) {
        categoryAffinity[cat] /= categoryTotal;
    }

    // Generate brand affinities (more variation)
    const brandAffinity: Record<string, number> = {};
    for (const brandId of Object.keys(brandWeights)) {
        const base = brandWeights[brandId];
        const variation = rng.nextRange(0.3, 2.0);
        brandAffinity[brandId] = base * variation;
    }
    // Normalize
    const brandTotal = Object.values(brandAffinity).reduce((a, b) => a + b, 0);
    for (const brand of Object.keys(brandAffinity)) {
        brandAffinity[brand] /= brandTotal;
    }

    // Visit frequency based on segment
    const visitFrequency = deriveVisitFrequency(segment, rng);

    return {
        id: rng.generateId('cust', index),
        segment,
        budgetBand,
        priceSensitivity,
        categoryAffinity,
        brandAffinity,
        visitFrequency,
    };
}

function derivePriceSensitivity(segment: CustomerSegment, rng: SeededRandom): PriceSensitivity {
    // Map segment to price sensitivity tendencies
    const tendencies: Record<CustomerSegment, Record<PriceSensitivity, number>> = {
        new: { low: 0.3, mid: 0.5, high: 0.2 },
        returning: { low: 0.25, mid: 0.5, high: 0.25 },
        vip: { low: 0.6, mid: 0.3, high: 0.1 },
        deal_seeker: { low: 0.05, mid: 0.25, high: 0.7 },
        connoisseur: { low: 0.7, mid: 0.25, high: 0.05 },
    };

    const options = Object.entries(tendencies[segment]).map(([value, weight]) => ({
        value: value as PriceSensitivity,
        weight,
    }));

    return rng.weightedChoice(options);
}

function deriveVisitFrequency(segment: CustomerSegment, rng: SeededRandom): number {
    // Base visits per month by segment
    const bases: Record<CustomerSegment, number> = {
        new: 1,
        returning: 2.5,
        vip: 4,
        deal_seeker: 3,
        connoisseur: 2,
    };

    const base = bases[segment];
    const variation = rng.nextRange(0.7, 1.3);

    return base * variation;
}

function getCategoryWeights(products: { category: string }[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const p of products) {
        counts[p.category] = (counts[p.category] || 0) + 1;
    }

    const total = products.length;
    const weights: Record<string, number> = {};

    for (const cat of Object.keys(counts)) {
        weights[cat] = counts[cat] / total;
    }

    return weights;
}

function getBrandWeights(products: { brandId: string }[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const p of products) {
        if (p.brandId) {
            counts[p.brandId] = (counts[p.brandId] || 0) + 1;
        }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const weights: Record<string, number> = {};

    for (const brand of Object.keys(counts)) {
        weights[brand] = counts[brand] / total;
    }

    return weights;
}

// ==========================================
// Segment Statistics
// ==========================================

export function getPopulationStats(customers: SyntheticCustomer[]): {
    segmentCounts: Record<CustomerSegment, number>;
    budgetCounts: Record<BudgetBand, number>;
    avgVisitFrequency: number;
} {
    const segmentCounts: Record<CustomerSegment, number> = {
        new: 0,
        returning: 0,
        vip: 0,
        deal_seeker: 0,
        connoisseur: 0,
    };

    const budgetCounts: Record<BudgetBand, number> = {
        low: 0,
        mid: 0,
        high: 0,
    };

    let totalFrequency = 0;

    for (const c of customers) {
        segmentCounts[c.segment]++;
        budgetCounts[c.budgetBand]++;
        totalFrequency += c.visitFrequency;
    }

    return {
        segmentCounts,
        budgetCounts,
        avgVisitFrequency: customers.length > 0 ? totalFrequency / customers.length : 0,
    };
}
