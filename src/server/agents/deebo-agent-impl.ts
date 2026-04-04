
import { AgentImplementation } from './harness';
import { DeeboMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { deebo } from './deebo';
import { getStateMarketingRules } from '@/server/data/state-marketing-rules';
import {
    buildSquadRoster
} from './agent-definitions';
import { createHandoff } from '@/types/handoff-artifacts';
import type { ComplianceDecisionArtifact } from '@/types/handoff-artifacts';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';

const STATE_QUERY_MATCHERS: Array<{ stateCode: string; pattern: RegExp }> = [
    { stateCode: 'NY', pattern: /\bny-compliance\b|\bny compliance\b|\bnew york\b|\bny\b/i },
    { stateCode: 'CA', pattern: /\bcalifornia\b|\bca\b/i },
    { stateCode: 'IL', pattern: /\billinois\b|\bil\b/i },
    { stateCode: 'MA', pattern: /\bmassachusetts\b|\bma\b/i },
    { stateCode: 'CO', pattern: /\bcolorado\b|\bco\b/i },
];

const CHANNEL_QUERY_MATCHERS: Array<{ channel: string; pattern: RegExp }> = [
    { channel: 'paid_social', pattern: /\bpaid social\b|\bpaid[_ -]?social\b|\bpaid ads?\b/i },
    { channel: 'organic_social', pattern: /\borganic social\b|\borganic[_ -]?social\b|\bsocial post\b/i },
    { channel: 'website', pattern: /\bwebsite\b|\bsite\b|\blanding page\b/i },
    { channel: 'loyalty', pattern: /\bloyalty\b|\brewards?\b/i },
    { channel: 'email', pattern: /\bemail\b|\bnewsletter\b/i },
    { channel: 'sms', pattern: /\bsms\b|\btext\b|\btext message\b/i },
    { channel: 'ooh', pattern: /\booh\b|\bout[- ]of[- ]home\b|\bbillboard\b/i },
    { channel: 'digital', pattern: /\bdigital\b|\bonline\b|\bweb ad\b/i },
];

function detectStateCode(query: string): string | null {
    for (const matcher of STATE_QUERY_MATCHERS) {
        if (matcher.pattern.test(query)) {
            return matcher.stateCode;
        }
    }

    return null;
}

function detectChannel(query: string): string | null {
    for (const matcher of CHANNEL_QUERY_MATCHERS) {
        if (matcher.pattern.test(query)) {
            return matcher.channel;
        }
    }

    return null;
}

function isComplianceKnowledgeQuery(query: string): boolean {
    return /\bcompliance\b|\brules?\b|\ballowed\b|\bprohibited\b|\bcan we\b|\bmay we\b|\brequirements?\b|\bny-compliance\b|\baudit\b|\breview\b|\bcheck\b|\bdraft\b|\bcopy\b|\bmessage\b|\bcontent\b/i.test(query);
}

function shouldRunComplianceAudit(query: string): boolean {
    const asksForReview = /\baudit\b|\breview\b|\bcheck\b|\bapprove\b|\bis this\b|\bdoes this\b/i.test(query);
    const includesDraftContent = /["'`]/.test(query)
        || query.includes('\n')
        || /:\s/.test(query)
        || /\bcopy\b|\bmessage\b|\bcontent\b|\bdraft\b|\bcaption\b|\bheadline\b/i.test(query);

    return asksForReview && includesDraftContent;
}

function formatComplianceSummary(stateCode: string, channel?: string | null): string {
    const rules = getStateMarketingRules(stateCode);

    if (channel) {
        const channelRule = rules.channels[channel] ?? rules.channels.digital;
        const status = channelRule.allowed === true
            ? 'COMPLIANT'
            : channelRule.allowed === false
                ? 'NON-COMPLIANT'
                : `CONDITIONAL - ${channelRule.condition ?? 'requirements apply'}`;

        const requiredDisclosures = channelRule.requiredDisclosures.map(item => `- ${item}`).join('\n');
        const prohibitedContent = channelRule.prohibitedContent.map(item => `- ${item}`).join('\n');
        const citations = channelRule.citations.length > 0
            ? channelRule.citations.join(', ')
            : 'State cannabis advertising regulations';

        return [
            `### ${rules.stateName} ${channelRule.channel.toUpperCase()} Compliance`,
            `Verdict: ${status}`,
            '',
            'Required disclosures:',
            requiredDisclosures,
            '',
            'Prohibited content:',
            prohibitedContent,
            '',
            `Citations: ${citations}`,
            '',
            'Ask me to audit a specific draft if you want a line-by-line review.',
        ].join('\n');
    }

    const channelSummary = Object.values(rules.channels)
        .map(rule => {
            const status = rule.allowed === true
                ? 'allowed'
                : rule.allowed === false
                    ? 'blocked'
                    : `conditional - ${rule.condition ?? 'requirements apply'}`;
            return `- ${rule.channel.toUpperCase()}: ${status}`;
        })
        .join('\n');
    const generalProhibitions = rules.generalProhibitions.slice(0, 5).map(item => `- ${item}`).join('\n');

    return [
        `### ${rules.stateName} Compliance Snapshot`,
        'Channel status:',
        channelSummary,
        '',
        'Always prohibited:',
        generalProhibitions,
        '',
        `Website requirement: ${rules.websiteRequirements}`,
        '',
        'Tell me the channel to get rule-specific disclosures and citations.',
    ].join('\n');
}

export async function maybeAnswerComplianceGuidance(query: string): Promise<string | null> {
    const stateCode = detectStateCode(query);
    if (!stateCode || !isComplianceKnowledgeQuery(query)) {
        return null;
    }

    const channel = detectChannel(query);

    if (channel && shouldRunComplianceAudit(query)) {
        const audit = await deebo.checkMarketingCompliance(stateCode, channel, query);
        const violations = audit.violations.length > 0
            ? audit.violations.map(item => `- ${item}`).join('\n')
            : '- No explicit violations detected in the provided description.';
        const suggestions = audit.suggestions.length > 0
            ? audit.suggestions.map(item => `- ${item}`).join('\n')
            : '- Keep required age-gating and disclosures in place.';
        const citations = audit.citations.length > 0
            ? audit.citations.join(', ')
            : 'State cannabis advertising regulations';

        return [
            `### ${stateCode} ${channel.toUpperCase()} Audit`,
            `Verdict: ${audit.verdict}`,
            '',
            'Findings:',
            violations,
            '',
            'Next steps:',
            suggestions,
            '',
            `Citations: ${citations}`,
        ].join('\n');
    }

    return formatComplianceSummary(stateCode, channel);
}

// --- Tool Definitions ---

export interface DeeboTools {
    // Check if content is compliant with local laws
    checkCompliance(content: string, jurisdiction: string, channel: string): Promise<{ status: 'pass' | 'fail' | 'warning'; violations: string[]; suggestions: string[] }>;
    // Verify age of a customer
    verifyAge(dob: string, jurisdiction: string): Promise<{ allowed: boolean; reason?: string }>;
}

// --- Deebo Agent Implementation ---

export const deeboAgent: AgentImplementation<DeeboMemory, DeeboTools> = {
    agentName: 'deebo',

    async initialize(brandMemory, agentMemory) {
        logger.info('[Deebo] Initializing. Loading compliance rule packs...');

        // Build dynamic context from agent-definitions (source of truth)
        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
        const squadRoster = buildSquadRoster('deebo');
        const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

        agentMemory.system_instructions = `
            You are Deebo, the Compliance Enforcer for ${brandMemory.brand_profile.name}.
            Your job is to keep the brand out of legal trouble and enforce advertising regulations.

            CORE PRINCIPLES:
            1. **No Mercy**: If it breaks the law, kill it.
            2. **Protect the License**: Compliance > Profit.
            3. **Clear Rules**: Don't guess. Check the code.

            === AGENT SQUAD (For Collaboration) ===
            ${squadRoster}

            === INTEGRATION STATUS ===
            ${integrationStatus}

            === GROUNDING RULES (CRITICAL) ===
            You MUST follow these rules to avoid hallucination:

            1. **Use checkCompliance tool for REAL compliance checks.**
               - DO NOT make up violation types or legal codes.
               - If uncertain about a rule, say "I need to verify this regulation."

            2. **Be jurisdiction-specific.**
               - Cannabis laws vary by state. Always ask for or confirm jurisdiction.
               - Don't claim to know rules for jurisdictions you haven't loaded.

            3. **NEVER approve content without actually checking it.**
               - Always run the compliance check tool, don't just say "looks fine."

            4. **When collaborating with other agents, use the AGENT SQUAD list.**
               - Craig = Marketing (for content reviews). Glenda = CMO (brand messaging).

            5. **When uncertain, err on the side of caution.**
               - "I recommend holding this content for legal review."

            KEY COMPLIANCE RULES (Cannabis Marketing):
            - No medical claims without FDA approval
            - No appeal to minors (imagery, language, cartoon characters)
            - No false statements about effects
            - Age-gating required on all digital content
            - Jurisdiction-specific disclosure requirements

            Tone: Stern, authoritative, no-nonsense. "That's a violation."

            OUTPUT RULES:
            - Use standard markdown headers (###) for sections.
            - Always cite the specific regulation being violated.
            - Provide clear remediation steps.
        `;

        // === HIVE MIND INIT ===
        try {
            const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
            const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
            await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'brand');
            logger.info(`[Deebo:HiveMind] Connected to shared compliance blocks.`);
        } catch (e) {
            logger.warn(`[Deebo:HiveMind] Failed to connect: ${e}`);
        }

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        // Deebo is reactive mainly, but could check for 'pending_review' items
        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: DeeboTools, stimulus?: string) {
         // === SCENARIO A: User Request (The "Planner" Flow) ===
        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;
            const stateCode = detectStateCode(userQuery);
            const channel = detectChannel(userQuery);

            const complianceGuidance = await maybeAnswerComplianceGuidance(userQuery);
            if (complianceGuidance) {
                logger.info('[Deebo] Served grounded compliance guidance without planner', {
                    stateCode,
                    channel,
                });

                // Emit typed ComplianceDecisionArtifact for downstream agents
                try {
                    const { sendHandoff } = await import('../intuition/handoff');
                    const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
                    const artifact = createHandoff<ComplianceDecisionArtifact>({
                        kind: 'compliance_decision',
                        fromAgent: 'deebo',
                        toAgent: 'broadcast',
                        orgId,
                        confidence: 0.95,
                        payload: {
                            contentHash: userQuery.slice(0, 64),
                            status: complianceGuidance.includes('violation') ? 'fail' : 'pass',
                            violations: [],
                            jurisdictions: stateCode ? [stateCode] : [],
                        },
                    });
                    await sendHandoff(orgId, artifact);
                } catch (handoffErr) {
                    logger.warn('[Deebo] Failed to emit compliance handoff:', handoffErr as Record<string, unknown>);
                }

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'compliance_guidance',
                        result: complianceGuidance,
                        metadata: {
                            stateCode,
                            channel,
                            source: 'state_marketing_rules',
                        }
                    }
                };
            }
            
            // 1. Tool Definitions
            const toolsDef = [
                {
                    name: "checkCompliance",
                    description: "Audit text or content for legal violations.",
                    schema: z.object({
                        content: z.string(),
                        jurisdiction: z.string().describe("State code e.g. WA, CA"),
                        channel: z.string().describe("e.g. sms, email, website")
                    })
                },
                {
                    name: "verifyAge",
                    description: "Check if a customer is old enough.",
                    schema: z.object({
                        dob: z.string().describe("YYYY-MM-DD"),
                        jurisdiction: z.string()
                    })
                },
                {
                    name: "lettaSaveFact",
                    description: "Save a compliance violation or legal precedent to memory.",
                    schema: z.object({
                        fact: z.string(),
                        category: z.string().optional()
                    })
                }
            ];

            try {
                const { runMultiStepTask } = await import('./harness');
                
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: tools,
                    model: 'claude-sonnet-4-6', // Use Claude for strict compliance logic
                    maxIterations: 3
                });

                return {
                     updatedMemory: agentMemory,
                     logEntry: {
                         action: 'task_completed',
                         result: result.finalResult,
                         metadata: { steps: result.steps }
                     }
                };

            } catch (e: any) {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Planning failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }
    
        return {
            updatedMemory: agentMemory,
            logEntry: {
                 action: 'no_action',
                 result: "Nothing to report.",
                 metadata: {}
            }
        };
    }
};
