
'use server';

import { suggestPlaybook as suggestPlaybookFlow } from "@/ai/flows/suggest-playbook";
import type { Playbook, PlaybookDraft as PlaybookDraftType } from "@/types/domain";
import { requireUser } from "@/server/auth/auth";
import { z } from "zod";


// --- Zod Schemas and Types ---

// The Zod schema is now internal to this module. It is NOT exported.
const PlaybookDraftSchema = z.object({
  id: z.string().describe('A unique, URL-safe slug for the playbook, based on its name.'),
  name: z.string().describe('A short, descriptive name for the playbook (e.g., "Competitor Price Watch").'),
  description: z.string().describe('A one-sentence summary of what this playbook does.'),
  type: z.enum(['signal', 'automation']).describe('The trigger type for the playbook. Use "signal" for event-driven workflows (e.g., cart abandoned) and "automation" for scheduled tasks (e.g., daily report).'),
  agents: z.array(z.string()).describe('A list of AI agent names (like "Ezal", "Craig", "Pops") required to execute this playbook.'),
  signals: z.array(z.string()).describe('A list of event names or signals that trigger this playbook (e.g., "cart.abandoned"). Leave empty for time-based automations.'),
  targets: z.array(z.string()).describe('The primary nouns or entities the playbook operates on (e.g., "competitors", "new subscribers", "1g vapes").'),
  constraints: z.array(z.string()).describe('Key constraints or conditions mentioned (e.g., "in Chicago", "undercut price").'),
});

// The derived TypeScript type IS exported. This is allowed.
export type PlaybookDraft = z.infer<typeof PlaybookDraftSchema>;

const SuggestPlaybookInputSchema = z.object({
  command: z.string().describe('The user\'s natural language command.'),
});
export type SuggestPlaybookInput = z.infer<typeof SuggestPlaybookInputSchema>;


// --- Server Actions ---

export type SuggestionFormState = {
    message: string;
    error: boolean;
    suggestion?: PlaybookDraft;
};

/**
 * A Server Action that takes form data, calls the AI flow to suggest a playbook,
 * and returns the result to be used by the form state.
 */
export async function createPlaybookSuggestion(
    prevState: SuggestionFormState,
    formData: FormData
): Promise<SuggestionFormState> {
    const command = formData.get('command') as string;

    if (!command || command.trim().length < 10) {
        return {
            message: 'Please provide a more detailed command for the AI.',
            error: true,
        };
    }

    try {
        const validatedInput = SuggestPlaybookInputSchema.parse({ command });
        const suggestion = await suggestPlaybookFlow(validatedInput);
        const validatedSuggestion = PlaybookDraftSchema.parse(suggestion);
        
        return {
            message: 'Suggestion generated successfully!',
            error: false,
            suggestion: validatedSuggestion,
        };
    } catch (e: any) {
        return {
            message: `AI generation failed: ${e.message}`,
            error: true,
        };
    }
}


const DEMO_BRAND_ID = 'demo-brand';

export async function getPlaybooksForDashboard(): Promise<Playbook[]> {
  // PHASE 2A: stub implementation that can be swapped for Firestore later.
  // Shape matches the Playbook type and the UI you already built.

  const demoPlaybooks: Playbook[] = [
    {
      id: 'abandon-browse-cart-saver',
      brandId: DEMO_BRAND_ID,
      name: 'abandon-browse-cart-saver',
      description: 'Recover abandoned carts via email/SMS and on-site prompts.',
      kind: 'signal',
      tags: ['retention', 'recovery', 'sms', 'email', 'on-site'],
      enabled: true,
    },
    {
      id: 'competitor-price-drop-watch',
      brandId: DEMO_BRAND_ID,
      name: 'competitor-price-drop-watch',
      description: 'Monitor competitor price drops and suggest experiments.',
      kind: 'signal',
      tags: ['competitive', 'pricing', 'experiments'],
      enabled: true,
    },
    {
      id: 'new-subscriber-welcome-series',
      brandId: DEMO_BRAND_ID,
      name: 'new-subscriber-welcome-series',
      description: 'Onboard new subscribers with a 5-part welcome flow.',
      kind: 'automation',
      tags: ['email', 'onboarding', 'engagement'],
      enabled: false,
    },
    {
      id: 'win-back-lapsed-customers',
      brandId: DEMO_BRAND_ID,
      name: 'win-back-lapsed-customers',
      description: 'Re-engage customers who have not ordered in 60+ days.',
      kind: 'signal',
      tags: ['retention', 'sms', 'discounts'],
      enabled: true,
    },
  ];

  return demoPlaybooks;
}
