
'use server';

/**
 * @fileOverview An AI flow to interpret a user's natural language command
 * and suggest a structured PlaybookDraft object.
 *
 * This file should only export the main function `suggestPlaybook`.
 * Schemas and types are defined in the calling Server Action module
 * to comply with 'use server' module constraints.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { PlaybookDraft, SuggestPlaybookInput, PlaybookDraftSchema, SuggestPlaybookInputSchema } from '@/app/dashboard/actions';


// The AI prompt to guide the LLM in its analysis.
// It now infers its input/output schema from the imported Zod schemas.
const suggestPlaybookPrompt = ai.definePrompt({
  name: 'suggestPlaybookPrompt',
  input: { schema: z.any().describe('User command') }, // Keep it flexible, schema is checked by flow
  output: { schema: z.any().describe('PlaybookDraft object') }, // Schema is checked by flow
  prompt: `You are a helpful AI systems analyst for BakedBot, an Agentic Commerce OS for cannabis.
Your task is to receive a natural language command from an operator and translate it into a structured 'PlaybookDraft' object.

Analyze the user's command to determine the core components of the requested workflow.

User Command: {{{command}}}

Based on this command, populate all fields of the PlaybookDraft object.
- name: Give it a clear, concise name.
- description: Summarize its purpose in one sentence.
- id: Create a URL-safe slug from the name.
- type: Classify it as 'signal' (reacts to an event) or 'automation' (runs on a schedule).
- agents: Identify which AI agents (e.g., Ezal for competitor monitoring, Craig for marketing, Pops for analytics) would be involved.
- signals: List the specific system events that would trigger this playbook.
- targets: Extract the key nouns or subjects of the action (e.g., "1g vapes", "competitors").
- constraints: Extract any conditions or filters (e.g., "in Chicago", "price drops").
`,
});


const suggestPlaybookFlow = ai.defineFlow(
  {
    name: 'suggestPlaybookFlow',
    inputSchema: z.any(), // Schemas are validated in the calling action
    outputSchema: z.any(),
  },
  async (input: SuggestPlaybookInput) => {
    const { output } = await suggestPlaybookPrompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a playbook suggestion.');
    }
    return output as PlaybookDraft;
  }
);

/**
 * Server Action wrapper for the suggestPlaybookFlow.
 * @param input - The user's command.
 * @returns A promise that resolves to the suggested PlaybookDraft.
 */
export async function suggestPlaybook(input: SuggestPlaybookInput): Promise<PlaybookDraft> {
  return suggestPlaybookFlow(input);
}
