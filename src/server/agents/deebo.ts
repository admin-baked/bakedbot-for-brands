import { z } from 'zod';
import { ai } from '@/ai/genkit';
import waRetailRules from './rules/wa-retail.json';

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
    // In a real app, this would load from Firestore or dynamic path
    // For MVP, we map rigid paths or return mock
    if (jurisdiction === 'WA' && channel === 'retail') {
      return waRetailRules as unknown as RulePack;
    }

    // Mock fallback for other jurisdictions
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
      // Prompt for Genkit (Semantic Check)
      // Use Gemini 2.5 Pro for compliance checking (fast and accurate)
      const prompt = `
            You are Deebo, the "Shield" and Chief Compliance Officer for jurisdiction: ${jurisdiction}.
            Channel: ${channel}.

            MISSION: 100% Risk Mitigation.

            Analyze the following content for compliance violations:
            "${content}"

            Rules to enforce:
            1. No medical claims (cure, treat, prevent, health benefits).
            2. No appeal to minors (cartoons, candy-like imagery).
            3. No false or misleading statements.

            Return JSON: { "status": "pass" | "fail" | "warning", "violations": [], "suggestions": [] }
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
      console.error("Deebo Genkit Error:", error);
      return {
        status: 'fail',
        violations: ['Compliance check failed due to system error.'],
        suggestions: ['Retry later.']
      };
    }
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
