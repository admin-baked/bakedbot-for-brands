
'use server';

/**
 * @fileOverview An AI flow to interpret a user's natural language command
 * and suggest a structured PlaybookDraft object.
 *
 * - suggestPlaybook - A function that takes a user command and returns a PlaybookDraft.
 * - SuggestPlaybookInputSchema - The input type for the suggestPlaybook function.
 * - PlaybookDraftSchema - The Zod schema for the PlaybookDraft type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { PlaybookTriggerType, PlaybookDraft } from '@/types/domain';

// Zod schema for the output, aligning with the PlaybookDraft type
export const PlaybookDraftSchema = z.object({
  id: z.string().describe('A unique, URL-safe slug for the playbook, based on its name.'),
  name: z.string().describe('A short, descriptive name for the playbook (e.g., "Competitor Price Watch").'),
  description: z.string().describe('A one-sentence summary of what this playbook does.'),
  type: z.enum(['signal', 'automation']).describe('The trigger type for the playbook. Use "signal" for event-driven workflows (e.g., cart abandoned) and "automation" for scheduled tasks (e.g., daily report).'),
  agents: z.array(z.string()).describe('A list of AI agent names (like "Ezal", "Craig", "Pops") required to execute this playbook.'),
  signals: z.array(z.string()).describe('A list of event names or signals that trigger this playbook (e.g., "competitor.price.changed", "cart.abandoned"). Leave empty for time-based automations.'),
  targets: z.array(z.string()).describe('The primary nouns or entities the playbook operates on (e.g., "competitors", "new subscribers", "1g vapes").'),
  constraints: z.array(z.string()).describe('Key constraints or conditions mentioned (e.g., "in Chicago", "undercut price").'),
});

const SuggestPlaybookInputSchema = z.object({
  command: z.string().describe('The user\'s natural language command.'),
});
export type SuggestPlaybookInput = z.infer<typeof SuggestPlaybookInputSchema>;

// The AI prompt to guide the LLM in its analysis
const suggestPlaybookPrompt = ai.definePrompt({
  name: 'suggestPlaybookPrompt',
  input: { schema: SuggestPlaybookInputSchema },
  output: { schema: PlaybookDraftSchema },
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
    inputSchema: SuggestPlaybookInputSchema,
    outputSchema: PlaybookDraftSchema,
  },
  async (input) => {
    const { output } = await suggestPlaybookPrompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a playbook suggestion.');
    }
    return output;
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
