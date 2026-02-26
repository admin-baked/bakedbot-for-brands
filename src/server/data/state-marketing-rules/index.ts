/**
 * State Marketing Compliance Rules
 *
 * Structured per-state marketing channel rules for Deebo compliance enforcement.
 * Used by: deebo.ts checkContent(), checkMarketingCompliance(), and agent system prompts.
 *
 * Rule data lives in individual state files (ny.ts, ma.ts, ca.ts, co.ts, il.ts).
 */

// =============================================================================
// TYPES
// =============================================================================

export interface MarketingRule {
  channel: string;
  allowed: boolean | 'conditional';
  condition?: string;              // When conditional: what's required
  audienceMinAge?: number;         // Default 21
  audienceCompositionRequired?: number;  // e.g., 0.85 for MA (85% must be 21+)
  ageGateRequired?: boolean;
  prohibitedContent: string[];
  requiredDisclosures: string[];
  citations: string[];
}

export interface StateMarketingRules {
  stateCode: string;
  stateName: string;
  channels: Record<string, MarketingRule>;
  generalProhibitions: string[];
  loyaltyProgramRules: string;
  websiteRequirements: string;
  lastUpdated: string;  // YYYY-MM-DD
}

// =============================================================================
// STATE REGISTRY
// =============================================================================

let _registry: Record<string, StateMarketingRules> | null = null;

function getRegistry(): Record<string, StateMarketingRules> {
  if (_registry) return _registry;

  // Lazy-load to avoid import cycles
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NY_RULES } = require('./ny');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MA_RULES } = require('./ma');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CA_RULES } = require('./ca');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CO_RULES } = require('./co');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { IL_RULES } = require('./il');

  _registry = {
    NY: NY_RULES,
    MA: MA_RULES,
    CA: CA_RULES,
    CO: CO_RULES,
    IL: IL_RULES,
  };
  return _registry;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Returns state marketing rules for a given state code.
 * Falls back to a permissive default for unknown states.
 */
export function getStateMarketingRules(stateCode: string): StateMarketingRules {
  const registry = getRegistry();
  const rules = registry[stateCode.toUpperCase()];
  if (rules) return rules;

  // Default: permissive (unknown state — LLM handles semantic checks in Deebo)
  return {
    stateCode,
    stateName: stateCode,
    channels: {
      digital: {
        channel: 'digital',
        allowed: true,
        audienceMinAge: 21,
        ageGateRequired: true,
        prohibitedContent: ['health claims', 'appeal to minors', 'false statements'],
        requiredDisclosures: ['Age disclaimer: For adults 21+ only.'],
        citations: [],
      },
      sms: {
        channel: 'sms',
        allowed: 'conditional',
        condition: 'Opt-in required. TCPA compliance mandatory.',
        audienceMinAge: 21,
        prohibitedContent: ['health claims', 'appeal to minors'],
        requiredDisclosures: ['Age disclaimer required.', 'Opt-out instructions: Reply STOP.'],
        citations: ['TCPA'],
      },
      email: {
        channel: 'email',
        allowed: 'conditional',
        condition: 'Opt-in required. CAN-SPAM compliance mandatory.',
        audienceMinAge: 21,
        prohibitedContent: ['health claims', 'appeal to minors'],
        requiredDisclosures: ['Age disclaimer required.', 'Unsubscribe link required.'],
        citations: ['CAN-SPAM'],
      },
    },
    generalProhibitions: [
      'Medical or health claims (cure, treat, prevent, health benefits)',
      'Content appealing to minors (cartoons, candy imagery, youth celebrities)',
      'False or misleading statements',
      'Guaranteed effect claims',
    ],
    loyaltyProgramRules: 'Loyalty programs generally allowed. No health claims in reward descriptions.',
    websiteRequirements: 'Age gate required (21+).',
    lastUpdated: '2026-02-25',
  };
}

/**
 * Checks a marketing channel + content description against state rules.
 * Returns: { compliant, issues, verdict, citations }
 *
 * NOTE: This is a STRUCTURAL check based on channel rules.
 * Deebo.checkContent() performs the full semantic LLM check.
 */
export function checkMarketingCompliance(
  stateCode: string,
  channel: string,
  contentDescription: string
): { compliant: boolean; issues: string[]; verdict: string; citations: string[] } {
  const rules = getStateMarketingRules(stateCode);
  const channelRule = rules.channels[channel.toLowerCase()] || rules.channels['digital'];
  const issues: string[] = [];
  const citations: string[] = [];

  if (!channelRule) {
    return {
      compliant: false,
      issues: [`Channel "${channel}" not defined in ${stateCode} rules.`],
      verdict: 'NON-COMPLIANT — channel not defined in state rules',
      citations: [],
    };
  }

  // Check if channel is blocked
  if (channelRule.allowed === false) {
    issues.push(`Channel "${channel}" is NOT ALLOWED in ${stateCode}.`);
    if (channelRule.condition) issues.push(`Condition: ${channelRule.condition}`);
    citations.push(...channelRule.citations);
  }

  // Check for prohibited content patterns in description
  const descLower = contentDescription.toLowerCase();
  for (const prohibited of channelRule.prohibitedContent) {
    const terms = prohibited.toLowerCase().split(/[,/]+/).map(t => t.trim());
    if (terms.some(t => t.length > 3 && descLower.includes(t))) {
      issues.push(`Content may contain prohibited element: "${prohibited}"`);
      citations.push(...channelRule.citations);
    }
  }

  // Check general prohibitions
  for (const prohibition of rules.generalProhibitions) {
    const terms = prohibition.toLowerCase().split(/[,(]+/)[0].trim().split(/\s+/);
    const keyTerms = terms.filter(t => t.length > 4);
    if (keyTerms.some(t => descLower.includes(t))) {
      issues.push(`May violate general prohibition: "${prohibition}"`);
    }
  }

  const compliant = issues.length === 0;

  let verdict: string;
  if (channelRule.allowed === true && compliant) {
    verdict = 'COMPLIANT';
  } else if (channelRule.allowed === 'conditional') {
    verdict = compliant
      ? `CONDITIONAL — ensure: ${channelRule.condition}`
      : `NON-COMPLIANT — ${issues[0]}`;
  } else {
    verdict = `NON-COMPLIANT — ${issues[0] || 'channel not allowed'}`;
  }

  return {
    compliant: compliant && channelRule.allowed !== false,
    issues,
    verdict,
    citations: [...new Set(citations)],
  };
}

/**
 * Builds a formatted system prompt block for Deebo (or any agent).
 * Describes channel rules, prohibited content, and loyalty rules for a state.
 */
export function buildStateComplianceBlock(stateCode: string): string {
  const rules = getStateMarketingRules(stateCode);

  const channelRows = Object.values(rules.channels)
    .map(r => {
      const status =
        r.allowed === true ? '✅ ALLOWED' :
        r.allowed === false ? '❌ BLOCKED' :
        `⚠️ CONDITIONAL`;
      const cond = r.condition ? ` — ${r.condition}` : '';
      return `| ${r.channel.toUpperCase()} | ${status}${cond} |`;
    })
    .join('\n');

  return `
=== STATE MARKETING COMPLIANCE (${rules.stateName.toUpperCase()}) ===
When any agent proposes a marketing campaign or channel, you MUST:
1. Identify the channel (paid_social, sms, email, ooh, organic_social, digital, website)
2. Check it against ${rules.stateName} rules below
3. Return per-channel verdict: COMPLIANT | CONDITIONAL | NON-COMPLIANT
4. Cite the specific rule violated if non-compliant

CHANNEL RULES — ${rules.stateName.toUpperCase()}:
| Channel | Status |
|---------|--------|
${channelRows}

PROHIBITED CONTENT (ALL CHANNELS):
${rules.generalProhibitions.map(p => `• ${p}`).join('\n')}

LOYALTY PROGRAM RULES:
${rules.loyaltyProgramRules}

WEBSITE REQUIREMENTS:
${rules.websiteRequirements}

Last updated: ${rules.lastUpdated} (verify against current ${rules.stateName} regulations)
==============================================`.trim();
}
