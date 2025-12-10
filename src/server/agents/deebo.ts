import { z } from 'zod';

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

/**
 * Deebo SDK
 * 
 * Provides synchronous-like access to compliance constraints.
 * In a real implementation, this might load rule packs from Firestore 
 * and run regex/LLM checks locally.
 */
export const deebo = {
  /**
   * Check content against compliance rules for a specific jurisdiction and channel.
   */
  async checkContent(
    jurisdiction: string,
    channel: string,
    content: string
  ): Promise<ComplianceResult> {

    // TODO: Load actual rule pack from `brands/{brandId}/agents/deebo/rule_packs`
    // For Phase 1, we use a simple heuristic stub.

    const violations: string[] = [];

    // Example global rule stub
    if (content.toLowerCase().includes('guaranteed')) {
      violations.push('Cannot use the word "guaranteed" in any claim.');
    }

    if (content.toLowerCase().includes('cure')) {
      violations.push('Cannot imply "cure" for medical conditions.');
    }

    if (violations.length > 0) {
      return {
        status: 'fail',
        violations,
        suggestions: ['Remove specific medical claims.', 'Add disclaimer.'],
      };
    }

    return {
      status: 'pass',
      violations: [],
      suggestions: [],
    };
  },

  /**
   * Fetch the active rule pack for inspection.
   */
  async getRulePack(jurisdiction: string, channel: string): Promise<RulePack | null> {
    // Stub
    return {
      jurisdiction,
      channel,
      version: 1,
      rules: [],
      status: 'passing',
    };
  }
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



