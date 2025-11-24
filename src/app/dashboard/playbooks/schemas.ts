import { z } from "zod";

// This Zod schema now matches the more detailed PlaybookDraft type.
export const PlaybookDraftSchema = z.object({
  id: z.string().describe('A unique, URL-safe slug for the playbook, based on its name.'),
  name: z.string().describe('A short, descriptive name for the playbook (e.g., "Competitor Price Watch").'),
  description: z.string().describe('A one-sentence summary of what this playbook does.'),
  type: z.enum(['signal', 'automation']).describe('The trigger type for the playbook. Use "signal" for event-driven workflows (e.g., cart abandoned) and "automation" for scheduled tasks (e.g., daily report).'),
  agents: z.array(z.string()).describe('A list of AI agent names (like "Ezal", "Craig", "Pops") required to execute this playbook.'),
  signals: z.array(z.string()).describe('A list of event names or signals that trigger this playbook (e.g., "cart.abandoned"). Leave empty for time-based automations.'),
  targets: z.array(z.string()).describe('The primary nouns or entities the playbook operates on (e.g., "competitors", "new subscribers", "1g vapes").'),
  constraints: z.array(z.string()).describe('Key constraints or conditions mentioned (e.g., "in Chicago", "undercut price").'),
});

export type PlaybookDraft = z.infer<typeof PlaybookDraftSchema>;

export const SuggestPlaybookInputSchema = z.object({
  goal: z.string().min(4),
  brandId: z.string().optional(),
  context: z.string().optional(),
});

export type SuggestPlaybookInput = z.infer<typeof SuggestPlaybookInputSchema>;
