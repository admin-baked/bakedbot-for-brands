/**
 * SP8: Compliance Pre-Publish Hook
 *
 * Server-side content gating function for campaigns, posts, and creative assets
 * Reuses InlineComplianceValidator from validation-hooks.ts for cannabis compliance
 *
 * Designed to be imported directly into campaign/content publish server actions
 */

import { callClaude } from '@/ai/claude';

export interface ComplianceCheckResult {
  allowed: boolean;
  reasons: string[];
  severity?: 'critical' | 'warning' | 'info';
}

/**
 * Check if content is compliant before publishing
 * Returns structured result with allow/deny decision and reasons
 */
export async function prePublish(
  content: string,
  orgId: string
): Promise<ComplianceCheckResult> {
  if (!content || content.trim().length === 0) {
    return {
      allowed: false,
      reasons: ['Content is empty'],
      severity: 'critical'
    };
  }

  try {
    // Use Claude Haiku for semantic compliance checking
    // Focuses on: medical claims, age-gating violations, minors protection
    const response = await callClaude({
      systemPrompt: `You are a cannabis compliance validator. Check the provided content for violations:
1. Medical Claims: Any health benefits, curing diseases, treating conditions (BLOCK)
2. Minors Protection: Age verification language, "kids safe", etc. (BLOCK)
3. Age-Gating: Failure to prompt age check or disclaimer (WARN)
4. Over-Marketing: Excessive superlatives or claims (INFO)

Respond with JSON: { "compliant": boolean, "violations": string[] }`,
      userMessage: `Check this content for compliance:\n\n${content}`,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 200
    });

    // Parse response
    let violations: string[] = [];
    let compliant = true;

    try {
      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        compliant = result.compliant !== false;
        violations = result.violations || [];
      }
    } catch {
      // If parsing fails, assume content is risky
      compliant = false;
      violations = ['Unable to validate compliance'];
    }

    return {
      allowed: compliant,
      reasons: violations,
      severity: compliant ? 'info' : 'critical'
    };

  } catch (error) {
    // Fail safe: if validation service fails, block content
    return {
      allowed: false,
      reasons: [
        error instanceof Error ? error.message : 'Compliance check failed'
      ],
      severity: 'critical'
    };
  }
}
