/**
 * Media Budget Service
 *
 * Delegates budget enforcement to the AI Studio credit system.
 * Media generation consumes plan credits — no raw USD budget tracking.
 *
 * Credit costs per action (economy tier, 1.0x multiplier):
 *   image_generate:  12 credits
 *   video_short:     75 credits (≤5s)
 *   video_full:     150 credits (>5s)
 *   creative_batch:  25 credits
 *
 * Margin analysis (worst-case Optimize top-up @ $0.02/credit):
 *   Image (FLUX Schnell): 12 × $0.02 = $0.24 vs $0.003 cost = 99% margin
 *   Image (FLUX Pro):     12 × $0.02 = $0.24 vs $0.05 cost  = 79% margin
 *   Video short (Wan):    75 × $0.02 = $1.50 vs $0.40 cost  = 73% margin
 *   Video short (Kling):  75 × $0.02 = $1.50 vs $0.28 cost  = 81% margin
 *   Video full (Wan):    150 × $0.02 = $3.00 vs $0.80 cost  = 73% margin
 */

import {
    BudgetCheckResult,
    MediaGenerationEvent,
} from '@/types/media-generation';
import { logger } from '@/lib/logger';
import { checkAIStudioActionAllowed } from '@/server/services/ai-studio-billing-service';
import type { AIStudioActionType } from '@/types/ai-studio';

/**
 * Check if tenant has enough credits for media generation.
 * Delegates to AI Studio credit system — no USD budget tracking.
 */
export async function checkMediaBudget(
    tenantId: string,
    estimatedCostUsd: number,
    actionType: AIStudioActionType = 'image_generate'
): Promise<BudgetCheckResult> {
    try {
        const creditCheck = await checkAIStudioActionAllowed({
            orgId: tenantId,
            actionType,
            automationTriggered: false,
            sourceSurface: 'media',
        });

        return {
            allowed: creditCheck.allowed,
            currentSpendUsd: 0, // deprecated — credits are the budget now
            blockReasons: creditCheck.allowed ? [] : [creditCheck.reason || creditCheck.errorCode || 'Insufficient credits'],
            warnings: [],
        };
    } catch (err) {
        logger.error('[MediaBudget] Credit check failed, allowing (fail-open)', { tenantId, err });
        return {
            allowed: true,
            currentSpendUsd: 0,
            blockReasons: [],
            warnings: [],
        };
    }
}

/**
 * Legacy cost alert hook — now a no-op.
 * Credit threshold alerts (50%/80%/100%/exhausted) are handled
 * automatically by chargeAIStudioCredits() in ai-studio-billing-service.ts.
 */
export async function checkCostAlerts(
    _tenantId: string,
    _generation: MediaGenerationEvent
): Promise<void> {
    // No-op: AI Studio billing service handles threshold alerts via triggerThresholdAlerts()
}
