/**
 * Intuition OS - Agent Tools
 *
 * Tools that allow agents to interact with the Intuition OS system:
 * - Evaluate heuristics (System 1 fast path)
 * - Calculate confidence scores
 * - Log outcomes for feedback learning
 */

import { z } from 'zod';
import { tool } from 'genkit';
import {
    evaluateHeuristics,
    calculateConfidenceScore,
    recordOutcome,
    type ConfidenceInput
} from '../intuition';
import { logger } from '@/lib/logger';

/**
 * Evaluate all applicable heuristics for the current context
 */
export const intuitionEvaluateHeuristics = tool({
    name: 'intuition_evaluate_heuristics',
    description: 'Evaluate all applicable heuristics for the current context. Returns fast-path recommendations without full LLM reasoning.',
    inputSchema: z.object({
        customerProfile: z.object({
            potencyTolerance: z.enum(['low', 'medium', 'high']).optional(),
            preferredEffects: z.array(z.string()).optional(),
            preferredCategories: z.array(z.string()).optional(),
        }).optional(),
        products: z.array(z.any()).optional(),
        sessionContext: z.any().optional()
    }),
    outputSchema: z.object({
        results: z.array(z.any()),
        filteredProducts: z.array(z.any()),
        heuristicsCoverage: z.number(),
        useFastPath: z.boolean()
    }),
}, async ({ customerProfile, products, sessionContext }) => {
    try {
        // Get tenant from global context
        const context = (global as any).currentAgentContext || {};
        const tenantId = context.brandId || 'default';
        const agentName = context.agentId || 'smokey';

        const result = await evaluateHeuristics(tenantId, agentName as any, {
            customerProfile,
            products,
            sessionContext
        });

        logger.info(`[Intuition] Evaluated ${result.results.length} heuristics for ${agentName}`);

        return {
            results: result.results,
            filteredProducts: result.filteredProducts,
            heuristicsCoverage: result.heuristicsCoverage,
            useFastPath: result.heuristicsCoverage > 0.3 // Use fast path if 30%+ heuristics matched
        };
    } catch (error: any) {
        logger.error('[Intuition] Failed to evaluate heuristics:', error);
        return {
            results: [],
            filteredProducts: products || [],
            heuristicsCoverage: 0,
            useFastPath: false
        };
    }
});

/**
 * Calculate confidence score to determine System 1 vs System 2 routing
 */
export const intuitionGetConfidence = tool({
    name: 'intuition_get_confidence',
    description: 'Calculate confidence score to determine if fast-path (heuristics) or slow-path (full LLM reasoning) should be used.',
    inputSchema: z.object({
        interactionCount: z.number(),
        heuristicsMatched: z.number(),
        totalHeuristics: z.number(),
        isAnomalous: z.boolean().optional()
    }),
    outputSchema: z.object({
        score: z.number(),
        systemMode: z.enum(['fast', 'slow']),
        factors: z.object({
            dataRecency: z.number(),
            dataDensity: z.number(),
            heuristicCoverage: z.number(),
            patternMatch: z.number(),
            anomalyScore: z.number()
        }),
        explanation: z.string()
    }),
}, async ({ interactionCount, heuristicsMatched, totalHeuristics, isAnomalous = false }) => {
    try {
        const input: ConfidenceInput = {
            interactionCount,
            heuristicsMatched,
            totalHeuristics,
            clusterConfidence: null, // Would come from customer memory clustering
            similarCustomerCount: 0,
            isAnomalous,
            lastInteractionDate: new Date() // Assume recent for now
        };

        const result = calculateConfidenceScore(input);

        // Build explanation
        const explanations: string[] = [];
        if (result.factors.dataRecency < 0.5) explanations.push('Data is stale');
        if (result.factors.dataDensity < 0.5) explanations.push('Limited interaction history');
        if (result.factors.heuristicCoverage < 0.3) explanations.push('Few heuristics matched');
        if (result.factors.patternMatch < 0.5) explanations.push('Weak pattern match');
        if (result.factors.anomalyScore < 0.5) explanations.push('Anomalous request');

        const explanation = explanations.length === 0
            ? 'High confidence - all factors strong'
            : `Low confidence due to: ${explanations.join(', ')}`;

        logger.debug(`[Intuition] Confidence: ${result.score.toFixed(2)}, Mode: ${result.systemMode}`);

        return {
            score: result.score,
            systemMode: result.systemMode,
            factors: result.factors,
            explanation
        };
    } catch (error: any) {
        logger.error('[Intuition] Failed to calculate confidence:', error);
        return {
            score: 0.5,
            systemMode: 'slow' as const,
            factors: {
                dataRecency: 0.5,
                dataDensity: 0.5,
                heuristicCoverage: 0.5,
                patternMatch: 0.5,
                anomalyScore: 0.5
            },
            explanation: 'Error calculating confidence - defaulting to slow path'
        };
    }
});

/**
 * Log the outcome of a recommendation for feedback learning
 */
export const intuitionLogOutcome = tool({
    name: 'intuition_log_outcome',
    description: 'Log the outcome of a recommendation for feedback learning. Maps simple outcomes to the system.',
    inputSchema: z.object({
        heuristicId: z.string().optional(),
        action: z.string(),
        outcome: z.enum(['positive', 'negative', 'neutral']),
        recommendedProducts: z.array(z.string()).optional(),
        selectedProduct: z.string().optional(),
        confidenceScore: z.number().optional()
    }),
    outputSchema: z.string(),
}, async ({ heuristicId, action, outcome, recommendedProducts, selectedProduct, confidenceScore }) => {
    try {
        // Get context
        const context = (global as any).currentAgentContext || {};
        const tenantId = context.brandId || 'default';

        // Map simple outcome to OutcomeResult
        const outcomeMap: Record<string, 'converted' | 'rejected' | 'abandoned'> = {
            positive: 'converted',
            negative: 'rejected',
            neutral: 'abandoned'
        };

        await recordOutcome(tenantId, {
            eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sessionId: context.sessionId || 'unknown',
            customerId: context.userId,
            recommendedProducts: recommendedProducts || [],
            selectedProduct,
            outcome: outcomeMap[outcome] || 'abandoned',
            heuristicsApplied: heuristicId ? [heuristicId] : [],
            systemMode: 'slow', // Default to slow path for agent-logged outcomes
            confidenceScore: confidenceScore || 0.5
        });

        logger.info(`[Intuition] Recorded outcome: ${action} -> ${outcome}`);
        return `Outcome recorded: ${action} was ${outcome}`;
    } catch (error: any) {
        logger.error('[Intuition] Failed to record outcome:', error);
        return `Failed to record outcome: ${error.message}`;
    }
});

/**
 * All Intuition OS tools for registration
 */
export const intuitionOsTools = [
    intuitionEvaluateHeuristics,
    intuitionGetConfidence,
    intuitionLogOutcome
];
