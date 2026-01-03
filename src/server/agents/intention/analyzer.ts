
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
    You are the Intention Engine for BakedBot AI.
    Your specific job is to DETECT AMBIGUITY in the user's request.
    
    User Query: "${userQuery}"
    Context: "${context || 'No prior context'}"
    
    Rules:
    1. If the query is vague (e.g., "Fix it", "Optimize revenue", "Check competitors"), you MUST flag it as ambiguous (isAmbiguous: true).
    2. If the query is specific (e.g., "Sync Dutchie menu prices", "Email martez@bakedbot.ai about the Q3 report"), you should form a 'commit' (isAmbiguous: false).
    3. If ambiguous, provide 'possibleIntents' and a single 'clarificationQuestion' to resolve the ambiguity.
    4. If clear, provide the 'goal', 'assumptions', 'constraints', and a high-level 'plan'.
    
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
