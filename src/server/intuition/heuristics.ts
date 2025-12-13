/**
 * Intuition OS - Heuristics Engine
 * 
 * Loop 3: Runtime Retrieval (System 1)
 * 
 * Fast, editable rules that provide instant intuitive responses.
 * These are the "gut feelings" that don't require LLM reasoning.
 */

import {
    Heuristic,
    HeuristicCondition,
    HeuristicAction,
    AgentName,
    CustomerMemoryProfile,
    ProductNode,
} from './schema';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Paths ---

function getHeuristicsCollection(tenantId: string) {
    return `tenants/${tenantId}/heuristics`;
}

// --- In-Memory Cache ---

interface CachedHeuristics {
    heuristics: Heuristic[];
    cachedAt: number;
}

const heuristicsCache: Map<string, CachedHeuristics> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// --- CRUD Operations ---

/**
 * Creates a new heuristic.
 */
export async function createHeuristic(
    tenantId: string,
    heuristic: Omit<Heuristic, 'id' | 'tenantId' | 'stats' | 'createdAt' | 'updatedAt'>
): Promise<Heuristic> {
    const { firestore } = await createServerClient();
    const now = new Date().toISOString();

    const fullHeuristic: Heuristic = {
        ...heuristic,
        id: uuidv4(),
        tenantId,
        stats: {
            appliedCount: 0,
            successCount: 0,
            successRate: 0,
        },
        createdAt: now,
        updatedAt: now,
    };

    await firestore
        .collection(getHeuristicsCollection(tenantId))
        .doc(fullHeuristic.id)
        .set(fullHeuristic);

    // Invalidate cache
    heuristicsCache.delete(tenantId);

    logger.info(`[Heuristics] Created heuristic: ${fullHeuristic.name}`);
    return fullHeuristic;
}

/**
 * Gets all heuristics for a tenant (cached).
 */
export async function getHeuristics(
    tenantId: string,
    agent?: AgentName
): Promise<Heuristic[]> {
    // Check cache
    const cached = heuristicsCache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        const heuristics = agent
            ? cached.heuristics.filter(h => h.agent === agent)
            : cached.heuristics;
        return heuristics;
    }

    // Fetch from Firestore
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection(getHeuristicsCollection(tenantId))
            .where('enabled', '==', true)
            .orderBy('priority', 'desc')
            .get();

        const heuristics = snapshot.docs.map(doc => doc.data() as Heuristic);

        // Update cache
        heuristicsCache.set(tenantId, {
            heuristics,
            cachedAt: Date.now(),
        });

        return agent ? heuristics.filter(h => h.agent === agent) : heuristics;
    } catch (error) {
        logger.error('[Heuristics] Failed to fetch',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

/**
 * Updates heuristic stats after application.
 */
export async function updateHeuristicStats(
    tenantId: string,
    heuristicId: string,
    wasSuccessful: boolean
): Promise<void> {
    try {
        const { firestore } = await createServerClient();
        const docRef = firestore
            .collection(getHeuristicsCollection(tenantId))
            .doc(heuristicId);

        const doc = await docRef.get();
        if (!doc.exists) return;

        const heuristic = doc.data() as Heuristic;
        const newAppliedCount = heuristic.stats.appliedCount + 1;
        const newSuccessCount = heuristic.stats.successCount + (wasSuccessful ? 1 : 0);

        await docRef.update({
            'stats.appliedCount': newAppliedCount,
            'stats.successCount': newSuccessCount,
            'stats.successRate': newSuccessCount / newAppliedCount,
            'stats.lastEvaluatedAt': new Date().toISOString(),
        });

        // Invalidate cache
        heuristicsCache.delete(tenantId);
    } catch (error) {
        logger.error('[Heuristics] Failed to update stats',
            error instanceof Error ? error : new Error(String(error)));
    }
}

// --- Condition Evaluation ---

/**
 * Evaluates a heuristic condition against context.
 */
export function evaluateCondition(
    condition: HeuristicCondition,
    context: Record<string, any>
): boolean {
    const { field, operator, value } = condition;

    // Get nested field value (e.g., "customerProfile.potencyTolerance")
    const fieldValue = getNestedValue(context, field);

    switch (operator) {
        case 'eq':
            return fieldValue === value;
        case 'neq':
            return fieldValue !== value;
        case 'lt':
            return typeof fieldValue === 'number' && fieldValue < value;
        case 'lte':
            return typeof fieldValue === 'number' && fieldValue <= value;
        case 'gt':
            return typeof fieldValue === 'number' && fieldValue > value;
        case 'gte':
            return typeof fieldValue === 'number' && fieldValue >= value;
        case 'in':
            return Array.isArray(value) && value.includes(fieldValue);
        case 'nin':
            return Array.isArray(value) && !value.includes(fieldValue);
        case 'contains':
            return Array.isArray(fieldValue) && fieldValue.includes(value);
        default:
            return false;
    }
}

function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Evaluates all conditions of a heuristic (AND logic).
 */
export function evaluateHeuristic(
    heuristic: Heuristic,
    context: Record<string, any>
): boolean {
    return heuristic.conditions.every(condition =>
        evaluateCondition(condition, context)
    );
}

// --- Action Execution ---

export interface HeuristicResult {
    heuristicId: string;
    heuristicName: string;
    action: HeuristicAction;
    applied: boolean;
}

/**
 * Applies a heuristic action to a list of products.
 */
export function applyHeuristicAction(
    action: HeuristicAction,
    products: ProductNode[]
): ProductNode[] {
    switch (action.type) {
        case 'filter':
            return products.filter(product => {
                // Filter keeps items that MATCH the criteria? Or removes them?
                // Spec says "removes candidates failing criteria".
                // So if we have filter (thc < 15), we KEEP items where thc < 15.
                const value = getNestedValue(product, action.target);
                const filterValue = action.params.value;
                const operator = action.params.operator || 'eq';

                return evaluateCondition(
                    { field: action.target, operator, value: filterValue },
                    product
                );
            });

        case 'boost':
            return products.map(product => {
                const value = getNestedValue(product, action.target);
                const targetValue = action.params.value;
                const multiplier = action.params.multiplier || 1.1;

                if (value === targetValue) {
                    return { ...product, _score: (product as any)._score ? (product as any)._score * multiplier : multiplier } as any;
                }
                return product;
            });

        case 'bury':
            return products.map(product => {
                const value = getNestedValue(product, action.target);
                const targetValue = action.params.value;
                const multiplier = action.params.multiplier || 0.5;

                if (value === targetValue) {
                    return { ...product, _score: (product as any)._score ? (product as any)._score * multiplier : multiplier } as any;
                }
                return product;
            });

        case 'block':
            // Remove items that match this criteria
            return products.filter(product => {
                const value = getNestedValue(product, action.target);
                const filterValue = action.params.value;
                // Block if MATCHES. So keep if NOT MATCHES.
                return value !== filterValue;
            });

        case 'message_prepend':
        case 'message_append':
            // These don't affect product lists, but are valid actions.
            // handled higher up or just passed through.
            return products;

        default:
            return products;
    }
}

// --- Main Evaluation Function ---

/**
 * Evaluates all heuristics for an agent and returns applicable actions.
 */
export async function evaluateHeuristics(
    tenantId: string,
    agent: AgentName,
    context: {
        customerProfile?: Partial<CustomerMemoryProfile>;
        products?: ProductNode[];
        sessionContext?: Record<string, any>;
    }
): Promise<{
    results: HeuristicResult[];
    filteredProducts: ProductNode[];
    heuristicsCoverage: number;
}> {
    const heuristics = await getHeuristics(tenantId, agent);
    const results: HeuristicResult[] = [];
    let products = context.products || [];
    let appliedCount = 0;

    // Build evaluation context
    const evalContext = {
        customerProfile: context.customerProfile || {},
        session: context.sessionContext || {},
    };

    // Evaluate each heuristic in priority order
    for (const heuristic of heuristics) {
        const matches = evaluateHeuristic(heuristic, evalContext);

        if (matches) {
            appliedCount++;

            // Apply action to products if applicable
            if (context.products && ['filter', 'boost', 'block', 'tag'].includes(heuristic.action.type)) {
                products = applyHeuristicAction(heuristic.action, products);
            }

            results.push({
                heuristicId: heuristic.id,
                heuristicName: heuristic.name,
                action: heuristic.action,
                applied: true,
            });

            logger.debug(`[Heuristics] Applied: ${heuristic.name}`);
        }
    }

    // Calculate coverage (what % of heuristics matched)
    const heuristicsCoverage = heuristics.length > 0
        ? appliedCount / heuristics.length
        : 0;

    return {
        results,
        filteredProducts: products,
        heuristicsCoverage,
    };
}

// --- Heuristic Templates ---

export const HEURISTIC_TEMPLATES = {
    // Smokey templates
    new_user_low_thc: {
        agent: 'smokey' as AgentName,
        name: 'Cap THC for new users',
        description: 'Limit THC potency recommendations for users with low tolerance',
        enabled: true,
        priority: 100,
        conditions: [
            { field: 'customerProfile.potencyTolerance', operator: 'eq' as const, value: 'low' },
        ],
        action: {
            type: 'filter' as const,
            target: 'chemotype.thc',
            params: { operator: 'lte', value: 15 },
        },
        source: 'starter' as const,
    },

    prefer_in_stock: {
        agent: 'smokey' as AgentName,
        name: 'Prefer in-stock products',
        description: 'Boost products that are in stock over low inventory',
        enabled: true,
        priority: 50,
        conditions: [],
        action: {
            type: 'boost' as const,
            target: 'inventoryStatus',
            params: { value: 'in_stock' },
        },
        source: 'starter' as const,
    },

    avoid_high_potency_edibles: {
        agent: 'smokey' as AgentName,
        name: 'Caution on high-potency edibles',
        description: 'Add warning for high-THC edibles',
        enabled: true,
        priority: 90,
        conditions: [
            { field: 'customerProfile.potencyTolerance', operator: 'in' as const, value: ['low', 'medium'] },
        ],
        action: {
            type: 'filter' as const,
            target: 'form',
            params: { operator: 'neq', value: 'edible' },
        },
        source: 'starter' as const,
    },
};
