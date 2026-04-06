'use server';

import { z } from '@/ai/z3';
import { ai } from '@/ai/genkit';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import type {
    GenerateInboxLaunchPlanInput,
    InboxLaunchAudience,
    InboxLaunchPlan,
    InboxLaunchType,
} from '@/types/inbox-launch';

const LaunchPlanInputSchema = z.object({
    tenantId: z.string().min(1),
    brandId: z.string().min(1),
    createdBy: z.string().min(1),
    prompt: z.string().min(1),
    launchType: z.enum(['new_drop', 'seasonal_promo', 'restock_push', 'event_tie_in']),
    audience: z.enum(['all_customers', 'vip_loyalty', 'new_shoppers', 'repeat_buyers', 'budtenders']),
    brandName: z.string().optional(),
});

const LaunchPlanSchema = z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    launchWindow: z.string().min(1),
    offer: z.string().min(1),
    heroMessage: z.string().min(1),
    recommendedChannels: z.array(z.string().min(1)).min(3).max(6),
    timeline: z.array(z.string().min(1)).min(3).max(5),
    complianceNotes: z.array(z.string().min(1)).min(2).max(5),
    assetPrompts: z.object({
        carousel: z.string().min(1),
        bundle: z.string().min(1),
        image: z.string().min(1),
        video: z.string().min(1),
        campaign: z.string().min(1),
    }),
});

const LAUNCH_TYPE_LABELS: Record<InboxLaunchType, string> = {
    new_drop: 'New Drop',
    seasonal_promo: 'Seasonal Promo',
    restock_push: 'Restock Push',
    event_tie_in: 'Event Tie-In',
};

const AUDIENCE_LABELS: Record<InboxLaunchAudience, string> = {
    all_customers: 'All Customers',
    vip_loyalty: 'VIP / Loyalty',
    new_shoppers: 'New Shoppers',
    repeat_buyers: 'Repeat Buyers',
    budtenders: 'Budtenders',
};

const buildInboxLaunchPlanPrompt = ai.definePrompt({
    name: 'buildInboxLaunchPlanPrompt',
    input: {
        schema: z.object({
            prompt: z.string(),
            launchTypeLabel: z.string(),
            audienceLabel: z.string(),
            brandName: z.string().optional(),
        }),
    },
    output: { schema: LaunchPlanSchema },
    model: 'googleai/gemini-3-pro-preview',
    prompt: `You are Leo, an operations-minded launch coordinator for compliant cannabis marketing.

Build one coordinated launch brief that can drive downstream creative tools.

User brief:
{{{prompt}}}

Launch type:
{{{launchTypeLabel}}}

Audience:
{{{audienceLabel}}}

{{#if brandName}}
Brand:
{{{brandName}}}
{{/if}}

Requirements:
- Keep the plan grounded in the user's brief. If details are missing, stay generic instead of inventing specifics.
- Stay compliant for legal cannabis marketing. Avoid medical claims, dosage guidance, or underage cues.
- Write a concise launch title, a summary, a launch window, one offer/CTA, and one hero message.
- Recommend 3-6 channels such as email, SMS, Instagram, in-store, or menu placement.
- Provide a 3-5 step launch timeline.
- Provide 2-5 compliance notes tailored to the plan.
- Provide five downstream asset prompts for:
  1. carousel builder
  2. bundle builder
  3. image generator
  4. video generator
  5. campaign planner
- Each asset prompt must be ready to paste into that tool and should stay aligned to the same launch story.
- Do not mention unsupported data, pricing, or inventory specifics unless the user gave them explicitly.
`,
});

async function requireInboxLaunchUser() {
    const user = await getServerSessionUser();
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}

export async function generateInboxLaunchPlan(input: GenerateInboxLaunchPlanInput): Promise<{
    success: boolean;
    plan?: InboxLaunchPlan;
    error?: string;
}> {
    try {
        await requireInboxLaunchUser();
        const parsed = LaunchPlanInputSchema.parse(input);
        const { output } = await buildInboxLaunchPlanPrompt({
            prompt: parsed.prompt,
            launchTypeLabel: LAUNCH_TYPE_LABELS[parsed.launchType],
            audienceLabel: AUDIENCE_LABELS[parsed.audience],
            brandName: parsed.brandName,
        });

        if (!output) {
            throw new Error('Launch plan generation returned no structured output.');
        }

        return {
            success: true,
            plan: {
                title: output.title,
                summary: output.summary,
                launchTypeLabel: LAUNCH_TYPE_LABELS[parsed.launchType],
                audienceLabel: AUDIENCE_LABELS[parsed.audience],
                launchWindow: output.launchWindow,
                offer: output.offer,
                heroMessage: output.heroMessage,
                recommendedChannels: output.recommendedChannels,
                timeline: output.timeline,
                complianceNotes: output.complianceNotes,
                assetPrompts: output.assetPrompts,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate launch plan';
        logger.error('[InboxLaunch] generateInboxLaunchPlan failed', { error: message });
        return { success: false, error: message };
    }
}
