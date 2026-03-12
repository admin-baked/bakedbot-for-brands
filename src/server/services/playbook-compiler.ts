/**
 * Playbook Compiler Service
 *
 * Translates natural-language playbook requests into canonical,
 * deterministic CompiledPlaybookSpec structures.
 *
 * Responsibilities:
 * - Parse natural language using LLM (Gemini/Claude)
 * - Map request to a PlaybookType
 * - Resolve scope (competitors, brands, zip codes)
 * - Set default objectives and policies
 * - Version and persist the resulting spec
 *
 * This is the Playbook Compiler Service from Build Package §1.
 */

import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import type {
    CompiledPlaybookSpec,
} from '@/types/playbook-v2';
import type { PlaybookStatus, AutonomyLevel, ApprovalPolicy } from '@/types/playbook';

// ---------------------------------------------------------------------------
// Compiler Input/Result
// ---------------------------------------------------------------------------

export interface CompileRequest {
    userId: string;
    orgId: string;
    naturalLanguageInput: string;
    suggestedType?: string;
    autonomyLevel?: AutonomyLevel;
}

export interface CompileResult {
    playbookId: string;
    version: number;
    spec: CompiledPlaybookSpec;
    needsClarification?: string[];
}

// ---------------------------------------------------------------------------
// Playbook Compiler Service
// ---------------------------------------------------------------------------

export class PlaybookCompilerService {
    /**
     * Compile a natural language request into a Playbook spec.
     * In a full implementation, this calls an LLM flow (e.g. Genkit).
     * For this tracer bullet, we implement deterministic mapping for key types.
     */
    async compile(request: CompileRequest): Promise<CompileResult> {
        logger.info('[PlaybookCompiler] Compiling request:', {
            userId: request.userId,
            inputLength: request.naturalLanguageInput.length,
        });

        // 1. Detect Playbook Type (Tracer bullet logic)
        const input = request.naturalLanguageInput.toLowerCase();
        let playbookType = 'custom';

        if (input.includes('competitor') || input.includes('intelligence') || input.includes('ci report')) {
            playbookType = 'daily_competitive_intelligence';
        } else if (input.includes('promotion') || input.includes('promo')) {
            playbookType = 'promo_optimizer';
        } else if (input.includes('stock') || input.includes('inventory')) {
            playbookType = 'assortment_advisor';
        }

        // 2. Resolve Scope (Placeholder: In production, this uses EZAL to resolve entities)
        const scope: Record<string, any> = {
            orgId: request.orgId,
            userId: request.userId,
        };

        if (playbookType === 'daily_competitive_intelligence') {
            scope.competitorIds = ['detect_from_org_profile']; // Signals ezal to resolve at runtime
            scope.categories = ['flower', 'vapes', 'gummies'];
            scope.thresholds = { priceChangePct: 10 };
        }

        // 3. Set Default Approval Policy based on Autonomy Level
        const autonomy = request.autonomyLevel || 'managed_autopilot';
        const approvalPolicy: ApprovalPolicy = this.getDefaultApprovalPolicy(autonomy);

        // 4. Assemble the Spec
        const spec: CompiledPlaybookSpec = {
            playbookId: `pb_${randomUUID().slice(0, 8)}`,
            version: 1,
            playbookType,
            trigger: {
                type: 'schedule',
                schedule: {
                    frequency: 'daily',
                    timeLocal: '08:00',
                    timezone: 'America/Chicago'
                },
            },
            scope,
            objectives: this.getDefaultObjectives(playbookType),
            inputs: {
                sourceConnectors: ['bakedbot_internal', 'web_scraper'],
                customerContextRefs: ['org_profile'],
            },
            outputs: {
                deliverables: ['dashboard_report', 'email_summary'],
                destinations: ['dashboard', 'email'],
            },
            approvalPolicy,
            policyBundleId: 'pol_default_brand_voice',
            telemetryProfile: 'standard',
        };

        logger.info('[PlaybookCompiler] Compilation complete', {
            playbookId: spec.playbookId,
            type: spec.playbookType,
            autonomy,
        });

        return {
            playbookId: spec.playbookId,
            version: 1,
            spec,
        };
    }

    private getDefaultApprovalPolicy(autonomy: AutonomyLevel): ApprovalPolicy {
        switch (autonomy) {
            case 'full_auto':
                return { mode: 'never', confidenceThreshold: 0.95 };
            case 'managed_autopilot':
                return { mode: 'escalate_on_low_confidence', confidenceThreshold: 0.85 };
            case 'guided':
                return { mode: 'required_for_first_run_and_policy_warnings', confidenceThreshold: 0.75 };
            case 'assist':
                return { mode: 'always' };
            default:
                return { mode: 'always' };
        }
    }

    private getDefaultObjectives(type: string): string[] {
        switch (type) {
            case 'daily_competitive_intelligence':
                return ['detect_price_changes', 'analyze_market_position', 'identify_new_promos'];
            case 'promo_optimizer':
                return ['evaluate_promo_roi', 'recommend_counter_promos'];
            case 'assortment_advisor':
                return ['detect_out_of_stocks', 'suggest_replacement_skus'];
            default:
                return ['synthesize_insights', 'generate_recommendations'];
        }
    }
}
