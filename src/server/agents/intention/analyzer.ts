
import { ai } from '@/ai/genkit'; // Validated import path
import { z } from 'zod';
import { IntentAnalysisSchema, IntentAnalysis } from './schema';

/**
 * Analyzes the user's query to determine if it is ambiguous or if a clear intent can be formed.
 * This is the "Pre-Flight Check" before the main agent takes over.
 */
export async function analyzeIntent(
    userQuery: string, 
    context?: string
): Promise<IntentAnalysis> {
    
    // We use a fast, reasoning-capable model (Gemini Flash or Pro) via Genkit
    // Note: In a real implementation, we might select a specific model alias here.
    
    // Construct the prompt for the intention analysis
    const prompt = `
    You are the Intention Engine for BakedBot AI, an "Agentic Commerce OS" for the cannabis industry.
    Your specific job is to DETECT AMBIGUITY and form SEMANTIC COMMITS for user requests.
    
    User Query: "${userQuery}"
    Context: "${context || 'No prior context'}"
    
    Domain Knowledge & Decisions:
    - We are a CANNABIS commerce platform. NEVER ask "Are you looking for cannabis?".
    - "Dispensaries" ALWAYS refers to cannabis dispensaries. Do not ask for clarification vs pharmacies.
    - Queries for "products", "flower", "edibles", "concentrates" are always cannabis-related.
    - LOCATION HANDLING:
        - If the user provides a city (e.g., "Chicago"), assume they want city-wide results.
        - If the user says "near me" but no location context is provided, FLAG as ambiguous and ask for a ZIP code or City specifically.
        - DO NOT split hairs between "in Chicago" and "near me in Chicago". If Chicago is mentioned, use Chicago.
    
    Rules:
    1. BE DECISIVE. If the intent is clearly cannabis-related, proceed to form a commit.
    2. If the query is vague (e.g., "Fix it", "Optimize revenue"), or lacks a required location for a "near me" search, flag it as ambiguous.
    3. If providing a clarification question for location, use exactly: "Could you please provide your ZIP code or city so I can find options near you?"
    4. Provide a high-level 'plan' and list any 'assumptions' you are making.
    
    Output JSON fully matching the schema.
    `;

    try {
        const result = await ai.generate({
            prompt: prompt,
            output: {
                schema: IntentAnalysisSchema
            }
        });

        if (!result.output) {
            throw new Error('No output generated from Intention Engine');
        }

        return result.output;
    } catch (error) {
        console.error('[IntentionAnalyzer] Failed to analyze intent:', error);
        // Fallback: Assume ambiguous if AI fails, to be safe (safeguard)
        return {
            isAmbiguous: true,
            clarification: {
                ambiguityDetected: true,
                confidenceScore: 0,
                possibleIntents: ['Failed to analyze intent'],
                clarificationQuestion: "I'm having trouble understanding. Could you please rephrase that?"
            }
        };
    }
}
