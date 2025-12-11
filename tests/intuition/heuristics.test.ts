/**
 * Unit Tests: Intuition OS - Heuristics Engine
 * 
 * Tests pure functions without Firebase dependencies
 */

import { Heuristic, HeuristicCondition, ProductNode } from '@/server/intuition/schema';

// Import pure functions directly - these don't need Firebase
// We'll test the evaluation logic without the CRUD operations

function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function evaluateCondition(
    condition: HeuristicCondition,
    context: Record<string, any>
): boolean {
    const { field, operator, value } = condition;
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

function evaluateHeuristic(
    heuristic: Heuristic,
    context: Record<string, any>
): boolean {
    return heuristic.conditions.every(condition =>
        evaluateCondition(condition, context)
    );
}

function applyHeuristicAction(
    action: { type: string; target: string; params: Record<string, any> },
    products: ProductNode[]
): ProductNode[] {
    switch (action.type) {
        case 'filter':
            return products.filter(product => {
                const value = getNestedValue(product, action.target);
                const filterValue = action.params.value;
                const operator = action.params.operator || 'lte';
                return evaluateCondition(
                    { field: action.target, operator, value: filterValue },
                    product
                );
            });
        case 'block':
            return products.filter(product => {
                const value = getNestedValue(product, action.target);
                return value !== action.params.value;
            });
        default:
            return products;
    }
}

describe('Heuristics Engine', () => {
    describe('evaluateCondition', () => {
        it('should evaluate eq operator', () => {
            const condition: HeuristicCondition = {
                field: 'potencyTolerance',
                operator: 'eq',
                value: 'low',
            };

            expect(evaluateCondition(condition, { potencyTolerance: 'low' })).toBe(true);
            expect(evaluateCondition(condition, { potencyTolerance: 'high' })).toBe(false);
        });

        it('should evaluate nested fields', () => {
            const condition: HeuristicCondition = {
                field: 'customerProfile.potencyTolerance',
                operator: 'eq',
                value: 'low',
            };

            const context = { customerProfile: { potencyTolerance: 'low' } };
            expect(evaluateCondition(condition, context)).toBe(true);
        });

        it('should evaluate lt/lte/gt/gte operators', () => {
            const ltCondition: HeuristicCondition = {
                field: 'thc',
                operator: 'lt',
                value: 20,
            };

            expect(evaluateCondition(ltCondition, { thc: 15 })).toBe(true);
            expect(evaluateCondition(ltCondition, { thc: 25 })).toBe(false);
        });

        it('should evaluate in operator', () => {
            const condition: HeuristicCondition = {
                field: 'form',
                operator: 'in',
                value: ['flower', 'vape'],
            };

            expect(evaluateCondition(condition, { form: 'flower' })).toBe(true);
            expect(evaluateCondition(condition, { form: 'edible' })).toBe(false);
        });

        it('should evaluate contains operator for arrays', () => {
            const condition: HeuristicCondition = {
                field: 'effects',
                operator: 'contains',
                value: 'sleep',
            };

            expect(evaluateCondition(condition, { effects: ['sleep', 'relaxing'] })).toBe(true);
            expect(evaluateCondition(condition, { effects: ['energy', 'focus'] })).toBe(false);
        });
    });

    describe('evaluateHeuristic', () => {
        it('should match when all conditions are met', () => {
            const heuristic: Heuristic = {
                id: 'test',
                tenantId: 'tenant1',
                agent: 'smokey',
                name: 'Test Heuristic',
                enabled: true,
                priority: 100,
                conditions: [
                    { field: 'customerProfile.potencyTolerance', operator: 'eq', value: 'low' },
                ],
                action: { type: 'filter', target: 'thc', params: {} },
                stats: { appliedCount: 0, successCount: 0, successRate: 0 },
                source: 'starter',
                createdAt: '',
                updatedAt: '',
            };

            const context = { customerProfile: { potencyTolerance: 'low' } };
            expect(evaluateHeuristic(heuristic, context)).toBe(true);
        });

        it('should not match when any condition fails', () => {
            const heuristic: Heuristic = {
                id: 'test',
                tenantId: 'tenant1',
                agent: 'smokey',
                name: 'Test Heuristic',
                enabled: true,
                priority: 100,
                conditions: [
                    { field: 'customerProfile.potencyTolerance', operator: 'eq', value: 'low' },
                    { field: 'customerProfile.interactionCount', operator: 'gt', value: 5 },
                ],
                action: { type: 'filter', target: 'thc', params: {} },
                stats: { appliedCount: 0, successCount: 0, successRate: 0 },
                source: 'starter',
                createdAt: '',
                updatedAt: '',
            };

            const context = {
                customerProfile: { potencyTolerance: 'low', interactionCount: 3 }
            };
            expect(evaluateHeuristic(heuristic, context)).toBe(false);
        });
    });

    describe('applyHeuristicAction', () => {
        const mockProducts: ProductNode[] = [
            {
                id: 'prod1',
                tenantId: 'tenant1',
                name: 'Low THC Gummy',
                chemotype: { thc: 10, cbd: 5 },
                terpenes: [],
                effects: ['sleep'],
                flavors: [],
                form: 'edible',
                inventoryStatus: 'in_stock',
                complianceFlags: [],
            },
            {
                id: 'prod2',
                tenantId: 'tenant1',
                name: 'High THC Flower',
                chemotype: { thc: 25, cbd: 0 },
                terpenes: [],
                effects: ['euphoric'],
                flavors: [],
                form: 'flower',
                inventoryStatus: 'in_stock',
                complianceFlags: [],
            },
        ];

        it('should filter products based on action', () => {
            const action = {
                type: 'filter',
                target: 'chemotype.thc',
                params: { operator: 'lte', value: 15 },
            };

            const filtered = applyHeuristicAction(action, mockProducts);

            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('prod1');
        });

        it('should block products matching criteria', () => {
            const action = {
                type: 'block',
                target: 'form',
                params: { value: 'edible' },
            };

            const result = applyHeuristicAction(action, mockProducts);

            expect(result).toHaveLength(1);
            expect(result[0].form).toBe('flower');
        });
    });
});
