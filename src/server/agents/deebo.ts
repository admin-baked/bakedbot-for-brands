import { z } from 'zod';
import { ai } from '@/ai/genkit';


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

    try {
      // Prompt for Genkit
      const prompt = `
        You are an expert Cannabis Compliance Officer for jurisdiction: ${jurisdiction}.
        Channel: ${channel}.
        
        Analyze the following content for compliance violations:
        "${content}"
        
        Rules to enforce:
        1. No medical claims (cure, treat, prevent, health benefits).
        2. No appeal to minors (cartoons, candy-like references).
        3. No guarantees of satisfaction or effects.
        4. State-specific constraint: If jurisdiction is 'IL', disallow showing consumption.
        
        Return a JSON object matching this schema:
        {
          "status": "pass" | "fail" | "warning",
          "violations": ["string"],
          "suggestions": ["string"]
        }
        
        Output JSON only.
      `;

      const result = await ai.generate({
        prompt: prompt,
        output: { schema: ComplianceResultSchema } // Use Genkit's strict schema enforcement if available, or just parse
      });

      // Genkit output returns strongly typed object if schema is provided in defineFlow/generate? 
      // check:types will reveal if ai.generate supports 'output' prop natively in this version 
      // or if we need to parse result.text().
      // Based on available docs/snippets, we often get result.output() or result.data.

      // Let's assume result.output is the typed response if we passed schema, 
      // OR we just parse the text if not. 
      // For safety in this "quick refactor", let's assume we might need to parse JSON from text 
      // if not using a specific 'defineFlow'. 

      if (result.output) {
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
      // Fallback to strict fail on error
      return {
        status: 'fail',
        violations: ['Compliance check failed due to system error.'],
        suggestions: ['Retry later.']
      };
    }
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



