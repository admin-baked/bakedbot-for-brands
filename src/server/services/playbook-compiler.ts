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
import { getAdminFirestore } from '@/firebase/admin';
import { PlaybookArtifactMemoryService } from '@/server/services/playbook-artifact-memory';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';
import type {
    CompiledPlaybookSpec,
} from '@/types/playbook-v2';
import type {
    ApprovalPolicy,
    AutonomyLevel,
    Playbook,
    PlaybookTrigger,
} from '@/types/playbook';

const { artifactService } = getPlaybookArtifactRuntime();
const artifactMemory = new PlaybookArtifactMemoryService(artifactService);

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
    status: 'compiled' | 'needs_clarification';
    playbookId?: string;
    version?: number;
    spec?: CompiledPlaybookSpec;
    needsClarification?: string[];
}

// ---------------------------------------------------------------------------
// Playbook Compiler Service
// ---------------------------------------------------------------------------

export class PlaybookCompilerService {
    private get db() {
        return getAdminFirestore();
    }

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
        const scope: Record<string, unknown> = {
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
        const playbookRef = this.db.collection('playbooks').doc();
        const now = new Date();
        const version = 1;

        const spec: CompiledPlaybookSpec = {
            playbookId: playbookRef.id,
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

        const playbook: Playbook = {
            id: playbookRef.id,
            name: this.buildPlaybookName(playbookType),
            displayName: this.buildDisplayName(playbookType),
            description: request.naturalLanguageInput.trim(),
            status: 'compiled',
            active: false,
            agent: this.getDefaultAgent(playbookType),
            category: this.getDefaultCategory(playbookType),
            triggers: this.buildLegacyTriggers(spec),
            steps: [],
            ownerId: request.userId,
            isCustom: true,
            requiresApproval: approvalPolicy.mode !== 'never',
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            createdAt: now,
            updatedAt: now,
            createdBy: request.userId,
            orgId: request.orgId,
            version,
            compiledSpec: spec,
            playbookType,
            autonomyLevel: autonomy,
            approvalPolicy,
            policyBundleId: spec.policyBundleId,
            metadata: {
                source: 'playbook_compiler_v2',
                naturalLanguageInput: request.naturalLanguageInput,
                suggestedType: request.suggestedType,
            },
        } as Playbook;

        await playbookRef.set(playbook);
        await playbookRef.collection('versions').doc(String(version)).set({
            version,
            compiledSpec: spec,
            createdAt: now,
            createdBy: request.userId,
        });

        await artifactMemory.safePersist('persistSpecSnapshot', () => {
            return artifactMemory.persistSpecSnapshot({
                workspaceId: request.orgId,
                playbookId: playbook.id,
                version,
                spec,
            });
        });

        logger.info('[PlaybookCompiler] Compilation complete', {
            playbookId: playbook.id,
            type: spec.playbookType,
            autonomy,
        });

        return {
            status: 'compiled',
            playbookId: playbook.id,
            version,
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

    private buildPlaybookName(type: string): string {
        switch (type) {
            case 'daily_competitive_intelligence':
                return 'daily_competitive_intelligence';
            case 'promo_optimizer':
                return 'promo_optimizer';
            case 'assortment_advisor':
                return 'assortment_advisor';
            default:
                return 'custom_playbook';
        }
    }

    private buildDisplayName(type: string): string {
        switch (type) {
            case 'daily_competitive_intelligence':
                return 'Daily Competitive Intelligence';
            case 'promo_optimizer':
                return 'Promo Optimizer';
            case 'assortment_advisor':
                return 'Assortment Advisor';
            default:
                return 'Custom Playbook';
        }
    }

    private getDefaultAgent(type: string): string {
        switch (type) {
            case 'daily_competitive_intelligence':
                return 'ezal';
            case 'promo_optimizer':
                return 'money_mike';
            case 'assortment_advisor':
                return 'pops';
            default:
                return 'smokey';
        }
    }

    private getDefaultCategory(type: string): Playbook['category'] {
        switch (type) {
            case 'daily_competitive_intelligence':
                return 'intel';
            case 'promo_optimizer':
                return 'marketing';
            case 'assortment_advisor':
                return 'ops';
            default:
                return 'custom';
        }
    }

    private buildLegacyTriggers(spec: CompiledPlaybookSpec): PlaybookTrigger[] {
        if (spec.trigger.type === 'manual') {
            return [{ type: 'manual' }];
        }

        if (spec.trigger.type === 'schedule') {
            return [{
                type: 'schedule',
                cron: this.buildCronExpression(spec.trigger.schedule),
                timezone: spec.trigger.schedule.timezone,
            }];
        }

        if (spec.trigger.type === 'event') {
            return [{
                type: 'event',
                eventName: spec.trigger.eventName,
            }];
        }

        return [{
            type: 'webhook',
            eventName: spec.trigger.webhookName,
        }];
    }

    private buildCronExpression(schedule: {
        frequency: 'daily' | 'weekday' | 'weekly' | 'monthly';
        dayOfWeek?: string;
        timeLocal: string;
    }): string {
        const [hourPart = '08', minutePart = '00'] = schedule.timeLocal.split(':');
        const hour = Number.parseInt(hourPart, 10);
        const minute = Number.parseInt(minutePart, 10);
        const safeHour = Number.isFinite(hour) ? hour : 8;
        const safeMinute = Number.isFinite(minute) ? minute : 0;

        switch (schedule.frequency) {
            case 'weekday':
                return `${safeMinute} ${safeHour} * * 1-5`;
            case 'weekly': {
                const day = this.mapDayOfWeek(schedule.dayOfWeek);
                return `${safeMinute} ${safeHour} * * ${day}`;
            }
            case 'monthly':
                return `${safeMinute} ${safeHour} 1 * *`;
            case 'daily':
            default:
                return `${safeMinute} ${safeHour} * * *`;
        }
    }

    private mapDayOfWeek(dayOfWeek?: string): string {
        const normalized = (dayOfWeek || 'monday').trim().toLowerCase();
        const days: Record<string, string> = {
            sunday: '0',
            monday: '1',
            tuesday: '2',
            wednesday: '3',
            thursday: '4',
            friday: '5',
            saturday: '6',
        };

        return days[normalized] || '1';
    }
}
