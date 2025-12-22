
import { DeeboPolicyResult } from '@/types/agent-toolkit';

/**
 * Deebo Policy Gate
 * 
 * The central compliance authority for outgoing content and critical actions.
 * In a full implementation, this calls an LLM with specific "Deebo" persona & rule context.
 */

interface CheckContentOptions {
    channel: string;
    jurisdictions: string[];
    audience?: string;
}

/**
 * Validates content against compliance rules.
 */
export async function checkContent(
    content: string,
    options: CheckContentOptions
): Promise<DeeboPolicyResult> {
    const { channel, jurisdictions } = options;

    // TODO: Connect to Real Deebo LLM Agent
    // For Phase 1, we implement simple heuristic/keyword checks to demonstrate the gate.

    const forbiddenTerms = ['cure', 'heal', 'safe for kids', 'free weed'];
    const violations: string[] = [];

    // 1. Basic Keyword Check
    forbiddenTerms.forEach(term => {
        if (content.toLowerCase().includes(term)) {
            violations.push(`Content contains forbidden term: "${term}"`);
        }
    });

    // 2. Channel-specific checks (Stub)
    if (channel === 'sms' && !content.includes('STOP')) {
        violations.push('SMS content must include opt-out instructions (STOP).');
    }

    if (violations.length > 0) {
        return {
            allowed: false,
            reason: 'Content violated compliance policies.',
            violations,
            redlines: violations, // Simple mapping for now
            rewriteSuggestion: 'Please remove medical claims and ensure opt-out language is present.'
        };
    }

    return {
        allowed: true,
        reason: 'No violations detected.',
    };
}

/**
 * Checks if a side-effect (tool execution) allows to proceed.
 */
export async function checkSideEffect(
    toolName: string,
    inputs: any,
    context: { tenantId: string; }
): Promise<DeeboPolicyResult> {
    // Stub: implement specific logic for markingting.send vs directory.publishPage
    return {
        allowed: true,
        reason: 'Side effect authorized (Stub).'
    };
}
