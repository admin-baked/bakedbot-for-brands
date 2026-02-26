import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';
import waRetailRules from './rules/wa-retail.json';
import nyRetailRules from './rules/ny-retail.json';
import caRetailRules from './rules/ca-retail.json';
import ilRetailRules from './rules/il-retail.json';
import {
  getStateMarketingRules,
  buildStateComplianceBlock,
  checkMarketingCompliance as structuralMarketingCheck,
} from '@/server/data/state-marketing-rules';

export const ComplianceResultSchema = z.object({
  status: z.enum(['pass', 'fail', 'warning']),
  violations: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;

export const RulePackSchema = z.object({
  jurisdiction: z.string(),
  channel: z.string(),
  version: z.number(),
  rules: z.array(z.any()), // flexible for now
  status: z.enum(['passing', 'failing', 'deprecated']),
});

export type RulePack = z.infer<typeof RulePackSchema>;

// --- Phase 4: Rule Engine ---
export class RulePackService {
  static async getRulePack(jurisdiction: string, channel: string): Promise<RulePack | null> {
    const key = `${jurisdiction}:${channel}`;
    const packs: Record<string, unknown> = {
      'WA:retail': waRetailRules,
      'NY:retail': nyRetailRules,
      'CA:retail': caRetailRules,
      'IL:retail': ilRetailRules,
    };

    if (key in packs) {
      return packs[key] as unknown as RulePack;
    }

    // Advertising rules apply across all channels — fall back to retail pack for this jurisdiction
    const retailKey = `${jurisdiction}:retail`;
    if (retailKey in packs) {
      return packs[retailKey] as unknown as RulePack;
    }

    // Unmapped jurisdiction — LLM handles semantic checks
    return {
      jurisdiction,
      channel,
      version: 1,
      status: 'passing',
      rules: []
    };
  }
}

/**
 * Deebo SDK
 * 
 * Provides synchronous-like access to compliance constraints.
 */
export const deebo = {

  /**
   * Fetch the active rule pack for inspection.
   */
  async getRulePack(jurisdiction: string, channel: string): Promise<RulePack | null> {
    return RulePackService.getRulePack(jurisdiction, channel);
  },

  /**
   * Check content against compliance rules for a specific jurisdiction and channel.
   * Uses Regex rules first (fast), then LLM (slow).
   */
  async checkContent(
    jurisdiction: string,
    channel: string,
    content: string
  ): Promise<ComplianceResult> {

    const violations: string[] = [];
    const rulePack = await this.getRulePack(jurisdiction, channel);

    // 1. Fast Regex Checks
    if (rulePack && rulePack.rules) {
      for (const rule of rulePack.rules) {
        if (rule.type === 'regex' && rule.pattern) {
          const re = new RegExp(rule.pattern, 'i');
          if (re.test(content)) {
            violations.push(`Violation: ${rule.description}`);
          }
        }
      }
    }

    // If Regex failed, return immediately to save LLM tokens
    if (violations.length > 0) {
      return {
        status: 'fail',
        violations,
        suggestions: ['Remove medical claims or prohibited words.']
      };
    }

    try {
      // Load state-specific marketing rules for this jurisdiction
      const stateRules = getStateMarketingRules(jurisdiction);
      const channelRule = stateRules.channels[channel.toLowerCase()] ?? stateRules.channels['digital'];

      const channelStatus =
        channelRule?.allowed === true ? 'ALLOWED' :
        channelRule?.allowed === false ? 'BLOCKED — this channel is not permitted in this state' :
        `CONDITIONAL — ${channelRule?.condition ?? 'requirements apply'}`;

      const audienceNote = channelRule?.audienceCompositionRequired
        ? `\n• AUDIENCE: ${Math.round(channelRule.audienceCompositionRequired * 100)}%+ of audience MUST be 21+.`
        : '';

      const channelProhibited = (channelRule?.prohibitedContent ?? [])
        .map(p => `• Prohibited in ${channel}: ${p}`).join('\n');
      const generalProhibited = stateRules.generalProhibitions.slice(0, 6)
        .map(p => `• ${p}`).join('\n');
      const requiredDisclosures = (channelRule?.requiredDisclosures ?? [])
        .map(d => `• Required: ${d}`).join('\n');

      // Prompt for Genkit (Semantic Check)
      // Use Gemini 2.5 Pro for compliance checking (fast and accurate)
      const prompt = `
You are Deebo, the "Shield" and Chief Compliance Officer for ${stateRules.stateName} (${jurisdiction}).
Channel: ${channel.toUpperCase()} — Status: ${channelStatus}${audienceNote}

MISSION: 100% Risk Mitigation. Zero tolerance for compliance violations.

=== ${stateRules.stateName.toUpperCase()} CHANNEL RULES ===
${channelProhibited || '• (No channel-specific prohibitions listed — apply general rules below)'}

=== GENERAL PROHIBITIONS ===
${generalProhibited}

=== REQUIRED DISCLOSURES ===
${requiredDisclosures || '• Age disclaimer for adults 21+ only.'}

Analyze the following content for compliance violations:
"${content}"

Return JSON: { "status": "pass" | "fail" | "warning", "violations": [], "suggestions": [] }
Citations: ${channelRule?.citations?.slice(0, 2).join(', ') || 'State cannabis advertising regulations'}
`;

      const result = await ai.generate({
        prompt: prompt,
        model: 'googleai/gemini-2.5-pro', // Use Gemini for compliance checking
        output: { schema: ComplianceResultSchema }
      });

      if (result && result.output) {
        return result.output as ComplianceResult;
      }

      // Fallback parsing if output isn't automatically structured
      const text = result.text;
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonStr = text.slice(jsonStart, jsonEnd);
      return JSON.parse(jsonStr) as ComplianceResult;

    } catch (error) {
      logger.error('[Deebo] Genkit Error:', { error: error instanceof Error ? error.message : String(error) });
      return {
        status: 'fail',
        violations: ['Compliance check failed due to system error.'],
        suggestions: ['Retry later.']
      };
    }
  },

  /**
   * Check marketing channel compliance for a state.
   * Runs structural check first (fast, no LLM), then semantic check (Gemini).
   * Used by agents via check_marketing_compliance tool.
   */
  async checkMarketingCompliance(
    stateCode: string,
    channel: string,
    contentDescription: string
  ): Promise<ComplianceResult & { verdict: string; citations: string[] }> {
    // 1. Fast structural check based on state rules (no LLM)
    const structural = structuralMarketingCheck(stateCode, channel, contentDescription);
    if (!structural.compliant && structural.issues.length > 0) {
      return {
        status: 'fail',
        violations: structural.issues,
        suggestions: structural.citations.length > 0
          ? [`See: ${structural.citations.slice(0, 2).join(', ')}`]
          : ['Review state marketing rules and revise content.'],
        verdict: structural.verdict,
        citations: structural.citations,
      };
    }

    // 2. Semantic LLM check for nuanced violations
    const result = await this.checkContent(stateCode, channel, contentDescription);
    const stateRules = getStateMarketingRules(stateCode);
    const channelCitations = stateRules.channels[channel.toLowerCase()]?.citations ?? [];
    return {
      ...result,
      verdict: result.status === 'pass'
        ? `COMPLIANT — ${stateRules.stateName} ${channel} rules`
        : `NON-COMPLIANT — ${result.violations[0] ?? 'semantic violation detected'}`,
      citations: channelCitations,
    };
  },
};

// --- Legacy / Specific Compliance Checks (imported by other modules) ---

export async function deeboCheckMessage(params: { orgId: string, channel: string, stateCode: string, content: string }) {
  // Stub implementation
  const result = await deebo.checkContent(params.stateCode, params.channel, params.content);
  return {
    ok: result.status === 'pass',
    reason: result.violations.join(', ')
  };
}

export function deeboCheckAge(dob: Date | string, jurisdiction: string) {
  // Stub: 21+ check
  const birthDate = new Date(dob);
  const ageDifMs = Date.now() - birthDate.getTime();
  const ageDate = new Date(ageDifMs);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);

  if (age < 21) {
    return { allowed: false, reason: "Must be 21+", minAge: 21 };
  }
  return { allowed: true, minAge: 21 };
}

export function deeboCheckStateAllowed(state: string) {
  // Stub
  const blocked = ['ID', 'NE', 'KS']; // Example
  if (blocked.includes(state)) {
    return { allowed: false, reason: "Shipping not allowed to this state." };
  }
  return { allowed: true };
}

export function deeboCheckCheckout(cart: any) {
  // Stub
  return { allowed: true, violations: [], warnings: [], errors: [] };
}

// =============================================================================
// STATE COMPLIANCE HELPERS (for agent system prompt injection)
// =============================================================================

/**
 * Returns a formatted compliance block for injection into agent system prompts.
 * Callers resolve stateCode from the org profile before calling.
 *
 * Usage in agents:
 *   const block = getStateComplianceBlock(profile?.state ?? '');
 *   if (block) systemInstructions += '\n\n' + block;
 */
export function getStateComplianceBlock(stateCode: string): string {
  if (!stateCode) return '';
  return buildStateComplianceBlock(stateCode);
}

// Re-export state rule utilities so agents can import from one place
export { getStateMarketingRules, buildStateComplianceBlock } from '@/server/data/state-marketing-rules';

// =============================================================================
// check_marketing_compliance TOOL DEFINITION (for agent runMultiStepTask)
// =============================================================================

/**
 * Tool definition for check_marketing_compliance.
 * Wire into agent toolsDef to let the agent call Deebo's compliance check
 * for a specific state + channel combination.
 *
 * Usage in agent:
 *   import { checkMarketingComplianceTool, makeCheckMarketingComplianceImpl } from '@/server/agents/deebo';
 *   const toolsDef = [...existingTools, checkMarketingComplianceTool];
 *   const tools = { ...existingImpl, ...makeCheckMarketingComplianceImpl(stateCode) };
 */
export const checkMarketingComplianceTool = {
  name: 'check_marketing_compliance',
  description:
    'Check whether a proposed marketing campaign or message is compliant with the dispensary\'s state cannabis advertising regulations. Provide the channel (sms, email, paid_social, organic_social, ooh, digital, website, loyalty) and a description of the content. Returns verdict: COMPLIANT | CONDITIONAL | NON-COMPLIANT with specific rule citations.',
  inputSchema: z.object({
    stateCode: z.string().describe('Two-letter US state code (NY, CA, CO, MA, IL, etc.)'),
    channel: z
      .enum(['sms', 'email', 'paid_social', 'organic_social', 'ooh', 'digital', 'website', 'loyalty'])
      .describe('Marketing channel for the campaign'),
    contentDescription: z
      .string()
      .describe(
        'Description of the campaign content and key messages (not the full copy text). ' +
        'Include the type of offer, tone, imagery references, and any claim types used.'
      ),
  }),
};

/**
 * Creates the implementation for check_marketing_compliance tool.
 * Pass stateCode from the org's state field (e.g., from org profile).
 */
export function makeCheckMarketingComplianceImpl(defaultStateCode: string) {
  return {
    async check_marketing_compliance(input: {
      stateCode?: string;
      channel: string;
      contentDescription: string;
    }) {
      const state = input.stateCode || defaultStateCode || 'NY';
      return deebo.checkMarketingCompliance(state, input.channel, input.contentDescription);
    },
  };
}
