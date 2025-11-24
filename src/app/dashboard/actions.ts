
'use server';

import type { Playbook } from '@/types/domain';
import { DEMO_BRAND_ID } from '@/lib/config';
import { z } from "zod";

export const PlaybookDraftSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  kind: z.string().optional(),
  status: z.enum(["draft", "active"]).default("draft"),
});

export type PlaybookDraft = z.infer<typeof PlaybookDraftSchema>;

export const SuggestPlaybookInputSchema = z.object({
  goal: z.string().min(4),
  brandId: z.string().optional(),
  context: z.string().optional(),
});

export type SuggestPlaybookInput = z.infer<typeof SuggestPlaybookInputSchema>;


// This function now correctly matches the name used in the page component.
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
