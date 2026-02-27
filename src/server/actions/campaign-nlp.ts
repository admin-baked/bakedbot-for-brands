'use server';

import { requireUser } from '@/server/auth/auth';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';
import type { CampaignGoal, CampaignChannel } from '@/types/campaign';
import type { CustomerSegment } from '@/types/customers';
import type { UserRole } from '@/types/roles';

const ALLOWED_ROLES: UserRole[] = ['dispensary_admin', 'brand_admin', 'super_user'];
const VALID_GOALS = new Set<CampaignGoal>([
    'drive_sales',
    'winback',
    'retention',
    'loyalty',
    'birthday',
    'restock_alert',
    'vip_appreciation',
    'product_launch',
    'event_promo',
    'awareness',
]);
const VALID_CHANNELS = new Set<CampaignChannel>(['email', 'sms']);
const VALID_SEGMENTS = new Set<CustomerSegment>([
    'vip',
    'loyal',
    'frequent',
    'high_value',
    'new',
    'slipping',
    'at_risk',
    'churned',
]);

export interface GeneratedCampaign {
    name: string;
    description: string;
    goal: CampaignGoal;
    channels: CampaignChannel[];
    targetSegments: CustomerSegment[];
    audienceType: 'all' | 'segment';
    emailSubject: string;
    emailBody: string;
    smsBody: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getTrimmedString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeToken(value: unknown): string {
    return getTrimmedString(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeGoal(value: unknown): CampaignGoal | null {
    const normalized = normalizeToken(value);
    return VALID_GOALS.has(normalized as CampaignGoal) ? (normalized as CampaignGoal) : null;
}

function normalizeChannel(value: unknown): CampaignChannel | null {
    const normalized = normalizeToken(value);
    if (normalized === 'text' || normalized === 'text_message' || normalized === 'text_messages') {
        return 'sms';
    }
    return VALID_CHANNELS.has(normalized as CampaignChannel) ? (normalized as CampaignChannel) : null;
}

function normalizeSegment(value: unknown): CustomerSegment | null {
    const normalized = normalizeToken(value);
    const aliases: Record<string, CustomerSegment> = {
        vip: 'vip',
        loyal: 'loyal',
        frequent: 'frequent',
        high_value: 'high_value',
        new: 'new',
        slipping: 'slipping',
        at_risk: 'at_risk',
        churned: 'churned',
    };
    const mapped = aliases[normalized];
    return mapped && VALID_SEGMENTS.has(mapped) ? mapped : null;
}

function sanitizeGeneratedCampaign(value: unknown): GeneratedCampaign | null {
    if (!isRecord(value)) return null;

    const name = getTrimmedString(value.name);
    const goal = normalizeGoal(value.goal);
    const emailBody = getTrimmedString(value.emailBody);
    if (!name || !emailBody || !goal) {
        return null;
    }

    const rawChannels = Array.isArray(value.channels) ? value.channels : [];
    const channels = Array.from(
        new Set(
            rawChannels
                .map((item) => normalizeChannel(item))
                .filter((item): item is CampaignChannel => item !== null),
        ),
    );

    const rawSegments = Array.isArray(value.targetSegments) ? value.targetSegments : [];
    const targetSegments = Array.from(
        new Set(
            rawSegments
                .map((item) => normalizeSegment(item))
                .filter((item): item is CustomerSegment => item !== null),
        ),
    ).slice(0, 3);

    return {
        name,
        description: getTrimmedString(value.description),
        goal,
        channels: channels.length > 0 ? channels : ['email'],
        targetSegments,
        audienceType: targetSegments.length > 0 ? 'segment' : 'all',
        emailSubject: getTrimmedString(value.emailSubject) || name,
        emailBody,
        smsBody: getTrimmedString(value.smsBody).slice(0, 160),
    };
}

export async function generateCampaignFromNL(
    prompt: string,
): Promise<{ success: true; data: GeneratedCampaign } | { success: false; error: string }> {
    try {
        const user = await requireUser(ALLOWED_ROLES);
        const orgId = user.currentOrgId ?? user.orgId ?? user.uid;

        if (!prompt.trim()) {
            return { success: false, error: 'Please describe the campaign you want to create.' };
        }

        const systemPrompt = `You are a cannabis marketing expert helping a dispensary create campaigns.
Given a natural language description of a campaign, extract structured campaign data.

Return ONLY a valid JSON object with these exact fields:
{
  "name": "Campaign name (5 words max)",
  "description": "One sentence describing the campaign goal",
  "goal": one of: "drive_sales" | "winback" | "retention" | "loyalty" | "birthday" | "restock_alert" | "vip_appreciation" | "product_launch" | "event_promo" | "awareness",
  "channels": array of: "email" | "sms" (include both if relevant, default to ["email"]),
  "targetSegments": array of: "vip" | "loyal" | "frequent" | "high_value" | "new" | "slipping" | "at_risk" | "churned" (pick the most relevant 1-3, or empty array for all),
  "audienceType": "all" or "segment" (use "segment" if targetSegments is non-empty),
  "emailSubject": "Email subject line (under 60 chars, personalize with {{firstName}} if appropriate)",
  "emailBody": "Email body text (2-4 sentences, conversational, cannabis-compliant, no medical claims, use {{firstName}} for personalization)",
  "smsBody": "SMS message (under 160 chars, cannabis-compliant, include opt-out hint like 'Reply STOP to unsubscribe')"
}

Cannabis compliance rules:
- No medical claims (no "cures", "treats", "heals", "medicine")
- No targeting minors
- No guaranteed effects
- Keep messaging friendly and compliant with state regulations
- Dispensary name placeholder: {{storeName}}
- Customer name placeholder: {{firstName}}

If the user mentions specific segments (VIP, loyal, new, churned, at-risk), map them to the segment values above.`;

        const raw = await callClaude({
            systemPrompt,
            userMessage: `Create a campaign based on this description: ${prompt}`,
            temperature: 0.3,
            maxTokens: 1000,
        });

        // Parse JSON from response (strip code fences if present)
        let jsonStr = raw.trim();
        const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
            jsonStr = fenceMatch[1].trim();
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            logger.error(`[campaign-nlp] JSON parse failed for org ${orgId}: ${jsonStr.slice(0, 200)}`);
            return { success: false, error: 'Failed to parse AI response. Please try again.' };
        }

        const sanitized = sanitizeGeneratedCampaign(parsed);
        if (!sanitized) {
            return { success: false, error: 'AI response was incomplete. Please rephrase your description.' };
        }

        return { success: true, data: sanitized };
    } catch (err) {
        logger.error(`[campaign-nlp] Error: ${String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'An error occurred' };
    }
}
