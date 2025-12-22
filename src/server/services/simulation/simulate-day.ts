/**
 * Simulation Engine - Simulate Day
 * 
 * Core Monte Carlo logic: generates synthetic orders for a single day.
 * Uses seeded RNG for deterministic, reproducible results.
 */

import {
    SimProfile,
    SimInputs,
    SimOrder,
    SimLineItem,
    SimOrderTotals,
    SimOrderSignals,
    SimDaySummary,
    SyntheticCustomer,
    SimProduct,
    SimIntervention,
    PriceChangeIntervention,
    PromotionIntervention,
} from '@/types/simulation';
import {
    ELASTICITY_PRIORS,
    SEASONALITY_FACTORS,
} from '@/types/simulation-profiles';
import { SeededRandom } from './population';

// ==========================================
// Types
// ==========================================

export interface SimulateDayConfig {
    date: Date;
    runId: string;
    dayIndex: number;
}

export interface SimulateDayResult {
    orders: SimOrder[];
    summary: Omit<SimDaySummary, 'ledgerRef'>;
}

// ==========================================
// Main Simulation Function
// ==========================================

export function simulateDay(
    inputs: SimInputs,
    customers: SyntheticCustomer[],
    seed: number,
    config: SimulateDayConfig
): SimulateDayResult {
    const rng = new SeededRandom(seed + config.dayIndex);
    const orders: SimOrder[] = [];

    // Calculate baseline orders for this day
    const baseOrders = inputs.historicalStats?.avgOrdersPerDay || 50;
    const seasonality = getSeasonalityFactor(config.date, inputs.scenario.assumptions.seasonalityIntensity);
    const interventionEffect = getInterventionDemandEffect(inputs.scenario.interventions, config.date);

    // Expected orders = base × seasonality × intervention effects
    const expectedOrders = Math.round(baseOrders * seasonality * interventionEffect);

    // Sample actual order count (Poisson-like via normal approximation)
    const variance = Math.sqrt(expectedOrders);
    const actualOrders = Math.max(1, Math.round(expectedOrders + rng.nextRange(-variance, variance)));

    // Generate orders
    for (let i = 0; i < actualOrders; i++) {
        const order = generateOrder(
            inputs,
            customers,
            rng,
            config.runId,
            config.date,
            i
        );
        orders.push(order);
    }

    // Calculate summary
    const summary = calculateDaySummary(orders, config.date);

    return { orders, summary };
}

// ==========================================
// Generate Single Order
// ==========================================

function generateOrder(
    inputs: SimInputs,
    customers: SyntheticCustomer[],
    rng: SeededRandom,
    runId: string,
    date: Date,
    orderIndex: number
): SimOrder {
    // Pick a customer (weighted by visit frequency)
    const customer = pickCustomer(customers, rng);

    // Determine items in basket (1-5 items typical)
    const itemCount = rng.nextInt(1, 5);
    const lineItems: SimLineItem[] = [];
    const why: string[] = [];

    // Get active interventions for this date
    const activePriceChanges = getActivePriceChanges(inputs.scenario.interventions, date);
    const activePromos = getActivePromos(inputs.scenario.interventions, date);

    // Calculate competitor pressure
    const competitorPressure = calculateCompetitorPressure(
        inputs,
        customer,
        inputs.scenario.assumptions.competitorPressureSensitivity
    );

    if (competitorPressure > 0.5) {
        why.push('market_pressure_high');
    } else if (competitorPressure < 0.3) {
        why.push('market_pressure_low');
    }

    // Generate line items
    const promoIdsApplied: string[] = [];

    for (let i = 0; i < itemCount; i++) {
        const product = selectProduct(inputs.products, customer, rng, competitorPressure);
        if (!product) continue;

        // Check for price change
        const priceChange = findApplicablePriceChange(product, activePriceChanges);
        let price = product.price;

        if (priceChange) {
            if (priceChange.mode === 'percent') {
                price = price * (1 + priceChange.value / 100);
            } else {
                price = price + priceChange.value;
            }
            price = Math.max(priceChange.constraints?.minPrice || 0, price);
            why.push('price_change_applied');
        }

        // Check for discount promo
        let discount = 0;
        const promo = findApplicablePromo(product, activePromos);
        if (promo) {
            if (promo.promoType === '%off') {
                discount = price * (promo.value / 100);
            } else if (promo.promoType === '$off') {
                discount = promo.value;
            }
            promoIdsApplied.push(`promo_${promo.promoType}`);
        }

        const qty = rng.nextInt(1, 2);
        const netRevenue = (price - discount) * qty;

        lineItems.push({
            productId: product.id,
            variantId: product.variantId,
            brandId: product.brandId,
            category: product.category,
            qty,
            unitPrice: price,
            discountApplied: discount * qty,
            netLineRevenue: netRevenue,
            cogs: product.cogs ? product.cogs * qty : undefined,
            grossMargin: product.cogs ? netRevenue - (product.cogs * qty) : undefined,
        });
    }

    if (lineItems.length === 0) {
        // Fallback: at least one item
        const product = rng.choice(inputs.products);
        lineItems.push({
            productId: product.id,
            brandId: product.brandId,
            category: product.category,
            qty: 1,
            unitPrice: product.price,
            discountApplied: 0,
            netLineRevenue: product.price,
            cogs: product.cogs,
            grossMargin: product.cogs ? product.price - product.cogs : undefined,
        });
    }

    // Calculate totals
    const totals = calculateOrderTotals(lineItems);

    // Segment-based "why"
    if (customer.segment === 'deal_seeker') {
        why.push('deal_seeker_segment');
    } else if (customer.segment === 'vip') {
        why.push('vip_customer');
    }

    // Build order
    const orderId = generateOrderId(runId, date, orderIndex);
    const orderTime = new Date(date);
    orderTime.setHours(rng.nextInt(9, 21), rng.nextInt(0, 59), rng.nextInt(0, 59));

    return {
        orderId,
        dateTime: orderTime.toISOString(),
        profile: inputs.profile,
        venue: inputs.profile === 'DISPENSARY'
            ? { locationId: 'loc_default' }
            : { partnerRetailerId: 'partner_default' },
        customerRef: {
            syntheticCustomerId: customer.id,
            segment: customer.segment,
            budgetBand: customer.budgetBand,
            priceSensitivity: customer.priceSensitivity,
        },
        lineItems,
        orderTotals: totals,
        signals: {
            promoIdsApplied: promoIdsApplied.length > 0 ? promoIdsApplied : undefined,
            competitorPressure,
            substitutions: [],
        },
        why,
    };
}

// ==========================================
// Helper Functions
// ==========================================

function pickCustomer(customers: SyntheticCustomer[], rng: SeededRandom): SyntheticCustomer {
    // Weight by visit frequency
    const options = customers.map(c => ({
        value: c,
        weight: c.visitFrequency,
    }));
    return rng.weightedChoice(options);
}

function selectProduct(
    products: SimProduct[],
    customer: SyntheticCustomer,
    rng: SeededRandom,
    competitorPressure: number
): SimProduct | null {
    // Filter by in-stock
    const available = products.filter(p => p.inStock !== false);
    if (available.length === 0) return null;

    // Weight by category affinity + price sensitivity
    const options = available.map(p => {
        let weight = customer.categoryAffinity[p.category] || 0.1;

        // Adjust for brand affinity
        if (customer.brandAffinity[p.brandId]) {
            weight *= (1 + customer.brandAffinity[p.brandId]);
        }

        // Adjust for price sensitivity
        if (customer.priceSensitivity === 'high' && p.price > 50) {
            weight *= 0.5;
        } else if (customer.priceSensitivity === 'low' && p.price < 30) {
            weight *= 0.8;
        }

        // Competitor pressure affects premium products
        if (competitorPressure > 0.6 && p.price > 40) {
            weight *= 0.7;
        }

        return { value: p, weight: Math.max(0.01, weight) };
    });

    return rng.weightedChoice(options);
}

function calculateOrderTotals(lineItems: SimLineItem[]): SimOrderTotals {
    const grossRevenue = lineItems.reduce((sum, li) => sum + (li.unitPrice * li.qty), 0);
    const discountTotal = lineItems.reduce((sum, li) => sum + li.discountApplied, 0);
    const netRevenue = lineItems.reduce((sum, li) => sum + li.netLineRevenue, 0);

    let grossMargin: number | undefined;
    const itemsWithCogs = lineItems.filter(li => li.grossMargin !== undefined);
    if (itemsWithCogs.length === lineItems.length) {
        grossMargin = lineItems.reduce((sum, li) => sum + (li.grossMargin || 0), 0);
    }

    return {
        grossRevenue,
        discountTotal,
        netRevenue,
        grossMargin,
    };
}

function calculateDaySummary(orders: SimOrder[], date: Date): Omit<SimDaySummary, 'ledgerRef'> {
    const netRevenue = orders.reduce((sum, o) => sum + o.orderTotals.netRevenue, 0);
    const discountTotal = orders.reduce((sum, o) => sum + o.orderTotals.discountTotal, 0);
    const units = orders.reduce((sum, o) => sum + o.lineItems.reduce((s, li) => s + li.qty, 0), 0);

    let grossMargin: number | undefined;
    const ordersWithMargin = orders.filter(o => o.orderTotals.grossMargin !== undefined);
    if (ordersWithMargin.length === orders.length && orders.length > 0) {
        grossMargin = orders.reduce((sum, o) => sum + (o.orderTotals.grossMargin || 0), 0);
    }

    const aov = orders.length > 0 ? netRevenue / orders.length : 0;

    // Simple repeat rate estimate based on segment mix
    const returningOrders = orders.filter(o =>
        o.customerRef.segment === 'returning' ||
        o.customerRef.segment === 'vip'
    );
    const repeatRateEstimate = orders.length > 0 ? returningOrders.length / orders.length : 0;

    return {
        date: date.toISOString().split('T')[0],
        orders: orders.length,
        units,
        netRevenue,
        discountTotal,
        grossMargin,
        aov,
        repeatRateEstimate,
    };
}

function getSeasonalityFactor(date: Date, intensity: number): number {
    const dow = date.getDay();
    const month = date.getMonth();
    const mmdd = `${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    let factor = 1;

    // Day of week
    const dowFactor = SEASONALITY_FACTORS.dayOfWeek[dow];
    factor *= 1 + (dowFactor - 1) * intensity;

    // Month
    const monthFactor = SEASONALITY_FACTORS.month[month];
    factor *= 1 + (monthFactor - 1) * intensity;

    // Holidays
    const holidayFactor = SEASONALITY_FACTORS.holidays[mmdd];
    if (holidayFactor) {
        factor *= 1 + (holidayFactor - 1) * intensity;
    }

    return factor;
}

function getInterventionDemandEffect(interventions: SimIntervention[], date: Date): number {
    let effect = 1;
    const dateStr = date.toISOString().split('T')[0];

    for (const intervention of interventions) {
        if (!isInterventionActive(intervention, dateStr)) continue;

        if (intervention.type === 'Promotion') {
            // Promos typically boost demand
            effect *= 1.1;
        } else if (intervention.type === 'PriceChange') {
            const pc = intervention as PriceChangeIntervention;
            if (pc.value < 0) {
                // Price drops boost demand
                effect *= 1 + Math.abs(pc.value) / 100 * 0.5;
            } else {
                // Price increases reduce demand
                effect *= 1 - pc.value / 100 * 0.3;
            }
        }
    }

    return effect;
}

function isInterventionActive(intervention: { startDate?: string; endDate?: string }, dateStr: string): boolean {
    if (intervention.startDate && dateStr < intervention.startDate) return false;
    if (intervention.endDate && dateStr > intervention.endDate) return false;
    return true;
}

function getActivePriceChanges(interventions: SimIntervention[], date: Date): PriceChangeIntervention[] {
    const dateStr = date.toISOString().split('T')[0];
    return interventions
        .filter(i => i.type === 'PriceChange' && isInterventionActive(i, dateStr))
        .map(i => i as PriceChangeIntervention);
}

function getActivePromos(interventions: SimIntervention[], date: Date): PromotionIntervention[] {
    const dateStr = date.toISOString().split('T')[0];
    return interventions
        .filter(i => i.type === 'Promotion' && isInterventionActive(i, dateStr))
        .map(i => i as PromotionIntervention);
}

function findApplicablePriceChange(
    product: SimProduct,
    priceChanges: PriceChangeIntervention[]
): PriceChangeIntervention | null {
    for (const pc of priceChanges) {
        if (pc.scope.kind === 'category' && pc.scope.category === product.category) {
            return pc;
        }
        if (pc.scope.kind === 'brand' && pc.scope.brandId === product.brandId) {
            return pc;
        }
        if (pc.scope.kind === 'sku' && pc.scope.skuId === product.id) {
            return pc;
        }
    }
    return null;
}

function findApplicablePromo(
    product: SimProduct,
    promos: PromotionIntervention[]
): PromotionIntervention | null {
    for (const promo of promos) {
        if (!promo.eligibility) continue;

        if (promo.eligibility.categories?.includes(product.category)) {
            return promo;
        }
        if (promo.eligibility.brands?.includes(product.brandId)) {
            return promo;
        }
        if (promo.eligibility.skus?.includes(product.id)) {
            return promo;
        }
    }
    return null;
}

function calculateCompetitorPressure(
    inputs: SimInputs,
    customer: SyntheticCustomer,
    sensitivity: number
): number {
    if (!inputs.competitorSnapshots?.length) {
        return 0.3; // Default neutral
    }

    // Simple model: higher competitor presence = higher pressure
    const avgCompetitorCategories = inputs.competitorSnapshots.reduce(
        (sum, snap) => sum + Object.keys(snap.categoryMedians).length,
        0
    ) / inputs.competitorSnapshots.length;

    const basePressure = Math.min(1, avgCompetitorCategories / 10);

    // Adjust for customer price sensitivity
    const sensitivityMultiplier = customer.priceSensitivity === 'high' ? 1.3 :
        customer.priceSensitivity === 'low' ? 0.7 : 1.0;

    return Math.min(1, basePressure * sensitivityMultiplier * sensitivity);
}

function generateOrderId(runId: string, date: Date, orderIndex: number): string {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const hash = ((orderIndex * 2654435761) >>> 0).toString(16).slice(0, 4);
    return `ord_${dateStr}_${hash}`;
}
