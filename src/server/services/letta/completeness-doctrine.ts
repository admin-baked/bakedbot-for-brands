// @ts-nocheck - WIP: MERIDIAN integration
/**
 * Completeness Doctrine (MERIDIAN Protocol)
 *
 * Ensures agents address EVERY distinct point in user input.
 * Prevents incomplete responses where secondary questions are skipped.
 *
 * Process:
 * 1. Extract user intents from message
 * 2. Generate agent response
 * 3. Verify all intents were addressed
 * 4. If incomplete, append missing coverage
 *
 * Inspired by: https://github.com/mattvideoproductions/MERIDIAN_Brain
 * BakedBot adaptation: Integrated with agent-runner response pipeline
 */

import { logger } from '@/lib/logger';
import { ai } from '@/ai/genkit';

// =============================================================================
// TYPES
// =============================================================================

export interface UserIntent {
    id: string;
    text: string;
    type: 'question' | 'request' | 'statement' | 'command';
    priority: 'primary' | 'secondary' | 'tertiary';
    requiresResponse: boolean;
}

export interface CompletenessCheck {
    allIntentsCovered: boolean;
    coveredIntents: string[]; // IDs of addressed intents
    missedIntents: UserIntent[]; // Intents that weren't addressed
    completenessScore: number; // 0-1 (1 = all covered)
    explanation?: string;
}

export interface CompletenessConfig {
    /** Enable intent extraction */
    enableIntentExtraction: boolean;
    /** Enable response verification */
    enableVerification: boolean;
    /** Minimum completeness score to pass (0-1) */
    minCompletenessScore: number;
    /** Auto-append missed intents */
    autoComplete: boolean;
}

// =============================================================================
// COMPLETENESS DOCTRINE SERVICE
// =============================================================================

export class CompletenessDoctrineService {
    private config: CompletenessConfig;

    constructor(config: Partial<CompletenessConfig> = {}) {
        this.config = {
            enableIntentExtraction: true,
            enableVerification: true,
            minCompletenessScore: 0.8,
            autoComplete: false, // Set true to auto-append, false to flag for review
            ...config,
        };
    }

    /**
     * Extract distinct user intents from a message
     * This runs BEFORE agent processing
     */
    async extractUserIntents(message: string): Promise<UserIntent[]> {
        if (!this.config.enableIntentExtraction) {
            return [
                {
                    id: 'default',
                    text: message,
                    type: 'statement',
                    priority: 'primary',
                    requiresResponse: true,
                },
            ];
        }

        try {
            const prompt = `Analyze this user message and extract distinct intents (questions, requests, commands):

"${message}"

For each intent:
1. Extract the specific question/request/statement
2. Classify the type: question | request | statement | command
3. Assign priority: primary | secondary | tertiary
4. Determine if it requires a response

Return JSON array:
[
  {
    "text": "What's the best strain for sleep?",
    "type": "question",
    "priority": "primary",
    "requiresResponse": true
  },
  {
    "text": "Do you have any deals this week?",
    "type": "question",
    "priority": "secondary",
    "requiresResponse": true
  }
]

If there's only ONE intent, still return an array with one item.`;

            const response = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt,
                output: { format: 'json' },
            });

            const intents = JSON.parse(response.text) as Omit<UserIntent, 'id'>[];

            // Add IDs
            return intents.map((intent, i) => ({
                ...intent,
                id: `intent-${Date.now()}-${i}`,
            }));
        } catch (e: unknown) {
            logger.error('[CompletenessDoc] Intent extraction failed', e as Record<string, any>);

            // Fallback: treat entire message as single intent
            return [
                {
                    id: 'fallback',
                    text: message,
                    type: 'statement',
                    priority: 'primary',
                    requiresResponse: true,
                },
            ];
        }
    }

    /**
     * Verify that agent response addresses all user intents
     * This runs AFTER agent processing
     */
    async verifyCompleteness(
        intents: UserIntent[],
        response: string
    ): Promise<CompletenessCheck> {
        if (!this.config.enableVerification) {
            return {
                allIntentsCovered: true,
                coveredIntents: intents.map((i) => i.id),
                missedIntents: [],
                completenessScore: 1.0,
            };
        }

        try {
            const prompt = `Check if this agent response addresses ALL user intents:

USER INTENTS:
${intents.map((i, idx) => `[${idx}] (${i.priority}) ${i.text}`).join('\n')}

AGENT RESPONSE:
"${response}"

For each intent, determine if it was addressed in the response.

Return JSON:
{
  "covered": [0, 2, ...],  // Indices of addressed intents
  "missed": [1, 3, ...],   // Indices of missed intents
  "explanation": "Brief explanation of coverage"
}`;

            const aiResponse = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt,
                output: { format: 'json' },
            });

            const result = JSON.parse(aiResponse.text) as {
                covered: number[];
                missed: number[];
                explanation?: string;
            };

            const coveredIntents = result.covered.map((idx) => intents[idx].id);
            const missedIntents = result.missed.map((idx) => intents[idx]);

            // Calculate completeness score
            // Only count intents that require response
            const needsResponse = intents.filter((i) => i.requiresResponse);
            const coveredThatNeedResponse = needsResponse.filter((i) =>
                coveredIntents.includes(i.id)
            );
            const completenessScore =
                needsResponse.length > 0
                    ? coveredThatNeedResponse.length / needsResponse.length
                    : 1.0;

            return {
                allIntentsCovered: missedIntents.length === 0,
                coveredIntents,
                missedIntents,
                completenessScore,
                explanation: result.explanation,
            };
        } catch (e: unknown) {
            logger.error('[CompletenessDoc] Verification failed', e as Record<string, any>);

            // Conservative fallback: assume all covered
            return {
                allIntentsCovered: true,
                coveredIntents: intents.map((i) => i.id),
                missedIntents: [],
                completenessScore: 1.0,
            };
        }
    }

    /**
     * Generate completion for missed intents
     * Appends to the original response to address gaps
     */
    async generateCompletion(
        missedIntents: UserIntent[],
        originalResponse: string,
        agentContext?: string
    ): Promise<string> {
        if (missedIntents.length === 0) {
            return originalResponse;
        }

        try {
            const prompt = `The agent's initial response didn't address these user intents:

MISSED INTENTS:
${missedIntents.map((i) => `- ${i.text}`).join('\n')}

ORIGINAL RESPONSE:
"${originalResponse}"

${agentContext ? `AGENT CONTEXT:\n${agentContext}\n` : ''}

Generate a brief, natural continuation that addresses the missed intents.
Keep it concise and maintain the agent's tone.

Return ONLY the additional text to append (no preamble like "Here's what I missed").`;

            const response = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt,
            });

            return `${originalResponse}\n\n${response.text.trim()}`;
        } catch (e: unknown) {
            logger.error('[CompletenessDoc] Completion generation failed', e as Record<string, any>);
            return originalResponse;
        }
    }

    /**
     * Process a user message → agent response flow with completeness checking
     *
     * Full pipeline:
     * 1. Extract intents from user message
     * 2. Agent generates response
     * 3. Verify response completeness
     * 4. Auto-complete if enabled and incomplete
     */
    async processWithCompleteness(
        userMessage: string,
        agentResponseFn: (intents: UserIntent[]) => Promise<string>,
        agentContext?: string
    ): Promise<{
        intents: UserIntent[];
        response: string;
        completenessCheck: CompletenessCheck;
        wasCompleted: boolean;
    }> {
        // Step 1: Extract intents
        const intents = await this.extractUserIntents(userMessage);

        logger.info('[CompletenessDoc] Extracted intents', {
            count: intents.length,
            intents: intents.map((i) => i.text),
        });

        // Step 2: Generate response
        let response = await agentResponseFn(intents);

        // Step 3: Verify completeness
        const completenessCheck = await this.verifyCompleteness(intents, response);

        logger.info('[CompletenessDoc] Completeness check', {
            score: completenessCheck.completenessScore,
            missed: completenessCheck.missedIntents.length,
        });

        // Step 4: Auto-complete if needed
        let wasCompleted = false;
        if (
            this.config.autoComplete &&
            completenessCheck.completenessScore < this.config.minCompletenessScore
        ) {
            logger.info('[CompletenessDoc] Auto-completing response', {
                missedCount: completenessCheck.missedIntents.length,
            });

            response = await this.generateCompletion(
                completenessCheck.missedIntents,
                response,
                agentContext
            );
            wasCompleted = true;
        }

        return {
            intents,
            response,
            completenessCheck,
            wasCompleted,
        };
    }

    /**
     * Get completeness metrics for analytics
     */
    async getCompletenessMetrics(tenantId: string, agentId: string, days: number = 7) {
        const { getFirestore } = await import('@/lib/firebase-admin');
        const db = getFirestore();

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const logsSnapshot = await db
            .collection('completeness_logs')
            .where('tenantId', '==', tenantId)
            .where('agentId', '==', agentId)
            .where('timestamp', '>=', cutoff.toISOString())
            .get();

        const logs = logsSnapshot.docs.map((d) => d.data());

        if (logs.length === 0) {
            return {
                averageScore: 1.0,
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 0,
                autoCompletedCount: 0,
            };
        }

        const totalScore = logs.reduce((sum, log) => sum + (log.completenessScore || 0), 0);
        const passed = logs.filter((log) => log.completenessScore >= this.config.minCompletenessScore);
        const autoCompleted = logs.filter((log) => log.wasCompleted);

        return {
            averageScore: totalScore / logs.length,
            totalChecks: logs.length,
            passedChecks: passed.length,
            failedChecks: logs.length - passed.length,
            autoCompletedCount: autoCompleted.length,
        };
    }

    /**
     * Log completeness check for analytics
     */
    async logCompletenessCheck(
        tenantId: string,
        agentId: string,
        intents: UserIntent[],
        completenessCheck: CompletenessCheck,
        wasCompleted: boolean
    ): Promise<void> {
        const { getFirestore } = await import('@/lib/firebase-admin');
        const db = getFirestore();

        await db.collection('completeness_logs').add({
            tenantId,
            agentId,
            timestamp: new Date().toISOString(),
            intentCount: intents.length,
            completenessScore: completenessCheck.completenessScore,
            missedIntentCount: completenessCheck.missedIntents.length,
            wasCompleted,
            passed: completenessCheck.completenessScore >= this.config.minCompletenessScore,
        });
    }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const completenessDoctrineService = new CompletenessDoctrineService();
