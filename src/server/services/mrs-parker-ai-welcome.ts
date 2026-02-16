/**
 * Mrs. Parker AI-Powered Welcome Email Service
 *
 * Replaces static templates with Claude-generated personalized welcome emails.
 * Uses full context: Letta memory, behavioral signals, brand personality, current deals.
 */

'use server';

import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';
import { archivalTagsService, CATEGORY_TAGS, AGENT_TAGS } from '@/server/services/letta';
import { getAdminFirestore } from '@/firebase/admin';
import type {
    WelcomeEmailContext,
    WelcomeEmailTemplate,
    WeeklyNurtureContext,
    UserSegment,
} from '@/types/welcome-system';

/**
 * Generate AI-powered welcome email using Mrs. Parker's voice
 */
export async function generateWelcomeEmail(
    context: WelcomeEmailContext
): Promise<WelcomeEmailTemplate> {
    try {
        logger.info('[MrsParker:AI] Generating personalized welcome email', {
            email: context.email,
            segment: context.segment,
            signupContext: context.signupContext,
        });

        // 1. Gather all context for personalization
        const enrichedContext = await enrichContextForGeneration(context);

        // 2. Build personalization prompt for Claude
        const prompt = buildWelcomeEmailPrompt(enrichedContext);

        // 3. Generate content with Claude
        const generated = await callClaude({
            systemPrompt: MRS_PARKER_SYSTEM_PROMPT,
            userMessage: prompt,
            model: 'claude-sonnet-4-5-20250929', // Sonnet for cost efficiency
            temperature: 0.8, // Higher creativity for warm, personal tone
            autoRouteModel: false, // Don't auto-route to Opus (we want Sonnet)
        });

        // 4. Parse generated content into subject + body
        const { subject, htmlBody, textBody } = parseGeneratedEmail(generated);

        // 5. Apply brand styling
        const styledHtml = applyBrandStyling(htmlBody, enrichedContext);

        logger.info('[MrsParker:AI] Welcome email generated successfully', {
            email: context.email,
            subject,
        });

        return {
            subject,
            htmlBody: styledHtml,
            textBody,
            fromName: 'Mrs. Parker',
            fromEmail: 'hello@bakedbot.ai',
            replyTo: enrichedContext.brandEmail || 'hello@bakedbot.ai',
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[MrsParker:AI] Failed to generate welcome email', {
            email: context.email,
            error: err.message,
        });

        // Fallback to basic template if AI generation fails
        return generateFallbackWelcomeEmail(context);
    }
}

/**
 * Enrich context with additional data for personalization
 */
async function enrichContextForGeneration(
    context: WelcomeEmailContext
): Promise<WelcomeEmailContext & {
    brandName?: string;
    brandEmail?: string;
    brandPersonality?: string;
    currentDeals?: any[];
    lettaMemory?: any[];
    stateContext?: string;
}> {
    const db = getAdminFirestore();
    const enriched = { ...context } as any;

    // Fetch brand information
    if (context.brandId || context.orgId) {
        const orgId = context.orgId || context.brandId;
        try {
            const orgDoc = await db.collection('organizations').doc(orgId!).get();
            if (orgDoc.exists) {
                const orgData = orgDoc.data();
                enriched.brandName = orgData?.name || 'BakedBot';
                enriched.brandEmail = orgData?.contactEmail || 'hello@bakedbot.ai';
                enriched.brandPersonality = orgData?.personality || 'warm, professional, helpful';
            }
        } catch (error) {
            logger.warn('[MrsParker:AI] Failed to fetch brand data', {
                orgId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    } else {
        enriched.brandName = 'BakedBot';
        enriched.brandPersonality = 'warm, Southern hospitality, supportive';
    }

    // Query Letta for prior interactions
    if (context.email) {
        try {
            const agentId = `mrs_parker_${context.brandId || context.orgId || 'default'}`;
            const memories = await archivalTagsService.searchByTags(
                agentId,
                [CATEGORY_TAGS.CUSTOMER],
                {
                    query: context.email,
                    limit: 5,
                }
            );

            enriched.lettaMemory = memories.map((m: string) => ({
                content: m,
                timestamp: Date.now(),
            }));

            enriched.priorVisits = memories.length;
        } catch (error) {
            logger.warn('[MrsParker:AI] Failed to query Letta memory', {
                email: context.email,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // Add state-specific context
    if (context.state) {
        enriched.stateContext = getStateSpecificContext(context.state);
    }

    // Fetch current deals/promotions
    if (context.brandId || context.orgId) {
        try {
            // TODO: Import and call syncPOSDiscounts when available
            // For now, placeholder
            enriched.currentDeals = [];
        } catch (error) {
            logger.warn('[MrsParker:AI] Failed to fetch current deals', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return enriched;
}

/**
 * Mrs. Parker's system prompt - her personality and voice
 */
const MRS_PARKER_SYSTEM_PROMPT = `
You are Mrs. Parker, the warm and caring Customer Happiness Manager at BakedBot.

# Your Personality
- **Voice**: Warm Southern hospitality meets modern cannabis culture
- **Tone**: Nurturing, supportive, genuine - like a favorite aunt who always has your back
- **Style**: Conversational, personal, never corporate or salesy
- **Language**: Inclusive, welcoming, uses "honey", "dear", "sugar" naturally (but not excessively)
- **Energy**: Positive and uplifting without being over-the-top

# Your Role
You welcome new customers/users to the BakedBot family with personalized emails that make them feel valued and excited to be part of the community. You're not selling - you're building relationships.

# Guidelines
- **Be specific**: Reference their context (state, signup source, interests) naturally
- **Be authentic**: No generic corporate speak. Write like you're talking to a friend.
- **Be helpful**: Focus on what they'll gain, not what we offer
- **Be concise**: Respect their time. 2-3 short paragraphs max for body content.
- **Be action-oriented**: One clear next step, never overwhelming

# Email Structure
Always generate in this format:

SUBJECT: [Create engaging subject line - max 60 chars, use emoji sparingly]

HTML_BODY:
[Opening greeting - warm and personal]

[Body paragraph 1 - welcome and context]

[Body paragraph 2 - value proposition specific to their situation]

[Optional: Special offer/incentive if provided]

[Closing - warm and supportive]

Mrs. Parker 💜
Customer Happiness Manager
BakedBot Family

TEXT_BODY:
[Plain text version - same content without HTML formatting]

# Formatting Requirements - CRITICAL
- Use DOUBLE LINE BREAKS (blank lines) between ALL paragraphs
- Each paragraph should be 2-4 sentences maximum
- DO NOT write one long block of text
- Break up content into distinct, scannable sections
- Think: greeting paragraph, then body paragraph, then offer paragraph, then closing
- Each section should be visually separated with blank lines

# Important
- Never mention "AI" or "automation" - you're a real person
- Never use corporate jargon like "leverage", "synergy", "ecosystem"
- Never overwhelm with too many links or CTAs
- Always make it feel like you personally wrote it just for them
- READABILITY IS KEY - short paragraphs with clear spacing
`.trim();

/**
 * Build prompt for welcome email generation
 */
function buildWelcomeEmailPrompt(context: WelcomeEmailContext & any): string {
    const {
        firstName,
        segment,
        signupContext,
        source,
        state,
        brandName,
        currentDeals,
        welcomeOffer,
        priorVisits,
        stateContext,
        deviceType,
        timeOfDay,
    } = context;

    const displayName = firstName || 'friend';
    const isReturningVisitor = (priorVisits || 0) > 0;

    let prompt = `
Generate a personalized welcome email for ${displayName} who just signed up.

# Context
- **Name**: ${displayName}
- **Segment**: ${segment}
- **Signup Type**: ${signupContext}
- **Source**: ${source}
- **Brand**: ${brandName || 'BakedBot'}
${state ? `- **State**: ${state} ${stateContext ? `(${stateContext})` : ''}` : ''}
${deviceType ? `- **Device**: ${deviceType}` : ''}
${timeOfDay ? `- **Time of Day**: ${timeOfDay}` : ''}
${isReturningVisitor ? `- **Prior Visits**: ${priorVisits} (returning visitor!)` : ''}

# What to Include
`.trim();

    // Segment-specific guidance
    if (segment === 'customer') {
        prompt += `\n- Welcome them to the ${brandName || 'our'} cannabis community`;
        prompt += `\n- Mention exclusive deals and new product drops`;
        prompt += `\n- Emphasize quality and community`;
        if (welcomeOffer) {
            prompt += `\n- Highlight their welcome offer: ${welcomeOffer.value}${welcomeOffer.code ? ` (code: ${welcomeOffer.code})` : ''}`;
        }
    } else if (segment === 'super_user') {
        prompt += `\n- Welcome them to the BakedBot team`;
        prompt += `\n- Express excitement about growing the company together`;
        prompt += `\n- Mention resources for getting started (knowledge base, team Slack, etc.)`;
        prompt += `\n- Keep it energizing and focused on the mission ($100k MRR by Jan 2027)`;
    } else if (segment === 'dispensary_owner') {
        prompt += `\n- Welcome them to the BakedBot platform for dispensary operators`;
        prompt += `\n- Highlight how BakedBot will help them grow revenue and reduce manual work`;
        prompt += `\n- Mention key features: inventory intelligence, compliance automation, customer retention`;
        prompt += `\n- Invite them to book an onboarding call or start with quick setup`;
    } else if (segment === 'brand_marketer') {
        prompt += `\n- Welcome them to the BakedBot platform for cannabis brands`;
        prompt += `\n- Emphasize creative automation and competitive intelligence`;
        prompt += `\n- Mention key agents: Craig (marketing), Ezal (competitive intel), Deebo (compliance)`;
        prompt += `\n- Invite them to explore Vibe Studio or Cannabis Marketing AI Academy`;
    } else {
        prompt += `\n- Welcome them warmly without being too specific`;
        prompt += `\n- Focus on the value BakedBot provides`;
        prompt += `\n- Encourage them to explore and reach out with questions`;
    }

    if (currentDeals && currentDeals.length > 0) {
        prompt += `\n\n# Current Promotions (mention naturally if relevant)\n`;
        currentDeals.slice(0, 2).forEach((deal: any) => {
            prompt += `- ${deal.name}: ${deal.description}\n`;
        });
    }

    if (isReturningVisitor) {
        prompt += `\n\n**IMPORTANT**: This is a returning visitor. Acknowledge they've been here before and say "welcome back" instead of treating them as brand new.`;
    }

    prompt += `\n\n# Tone
- ${timeOfDay === 'morning' ? 'Energetic and fresh' : timeOfDay === 'evening' ? 'Warm and relaxing' : 'Friendly and upbeat'}
- Conversational and personal
- Not salesy - focus on relationships

Generate the welcome email now.`;

    return prompt;
}

/**
 * Parse generated email into structured format
 */
function parseGeneratedEmail(generated: string): {
    subject: string;
    htmlBody: string;
    textBody: string;
} {
    // Extract subject (line starting with "SUBJECT:")
    const subjectMatch = generated.match(/SUBJECT:\s*(.+)/i);
    const subject = subjectMatch?.[1]?.trim() || 'Welcome! 🌿';

    // Extract HTML body (between "HTML_BODY:" and "TEXT_BODY:")
    const htmlMatch = generated.match(/HTML_BODY:\s*([\s\S]+?)(?=TEXT_BODY:|$)/i);
    const rawHtmlBody = htmlMatch?.[1]?.trim() || generated;

    // Extract text body (after "TEXT_BODY:")
    const textMatch = generated.match(/TEXT_BODY:\s*([\s\S]+)/i);
    const textBody = textMatch?.[1]?.trim() || rawHtmlBody.replace(/<[^>]+>/g, '');

    // Format HTML body with proper paragraph spacing
    const htmlBody = formatHtmlBody(rawHtmlBody);

    return {
        subject: subject.replace(/^["']|["']$/g, ''), // Remove quotes if present
        htmlBody,
        textBody,
    };
}

/**
 * Format HTML body with proper paragraph tags and spacing
 */
function formatHtmlBody(rawHtml: string): string {
    // If already has HTML tags, just ensure proper styling
    if (rawHtml.includes('<p>') || rawHtml.includes('<div>')) {
        // Add inline styles to existing <p> tags if they don't have them
        return rawHtml.replace(
            /<p>/gi,
            '<p style="font-size: 16px; line-height: 1.8; margin-bottom: 20px; color: #333;">'
        );
    }

    // Otherwise, convert plain text paragraphs to HTML
    const paragraphs = rawHtml
        .split(/\n\n+/) // Split on double line breaks
        .map(p => p.trim())
        .filter(p => p.length > 0);

    return paragraphs
        .map(paragraph => {
            // Check if it's a signature line (starts with name or title)
            if (
                paragraph.startsWith('Mrs. Parker') ||
                paragraph.startsWith('With love') ||
                paragraph.includes('💜') ||
                paragraph.includes('Customer Happiness')
            ) {
                return `<p style="font-size: 16px; line-height: 1.8; margin-top: 30px; margin-bottom: 10px; color: #667eea; font-style: italic;">${paragraph}</p>`;
            }

            // Check if it's a greeting (Hey/Hi + name)
            if (paragraph.match(/^(Hey|Hi|Hello|Welcome)\s+\w+[!,]/)) {
                return `<p style="font-size: 18px; line-height: 1.8; margin-bottom: 20px; color: #333; font-weight: 500;">${paragraph}</p>`;
            }

            // Regular paragraph
            return `<p style="font-size: 16px; line-height: 1.8; margin-bottom: 20px; color: #333;">${paragraph}</p>`;
        })
        .join('\n');
}

/**
 * Apply brand styling to HTML email
 */
function applyBrandStyling(htmlBody: string, context: any): string {
    const brandName = context.brandName || 'BakedBot';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${brandName}</title>
</head>
<body style="font-family: 'Georgia', serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
            Welcome! 🌿
        </h1>
    </div>

    <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${htmlBody}

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
            You're receiving this because you signed up for ${brandName}.<br>
            <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | <a href="#" style="color: #667eea; text-decoration: none;">Update Preferences</a>
        </p>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Get state-specific context for personalization
 */
function getStateSpecificContext(state: string): string {
    const stateContexts: Record<string, string> = {
        'NY': 'adult-use recreational cannabis legal since 2021, OCM regulated',
        'IL': 'adult-use legal, social equity program, highly regulated',
        'CA': 'Prop 64, mature recreational market, diverse options',
        'CO': 'pioneer state, established market, wide selection',
        'MI': 'adult-use legal, growing market, competitive pricing',
        'MA': 'adult-use legal, medical program, quality-focused',
        'NJ': 'newly legal adult-use, expanding rapidly',
        'AZ': 'adult-use legal since 2020, medical program established',
        'NV': 'adult-use legal, tourism-friendly, 24/7 dispensaries',
        'OR': 'mature recreational market, craft cannabis culture',
    };

    return stateContexts[state] || 'legal cannabis access';
}

/**
 * Fallback to basic template if AI generation fails
 */
function generateFallbackWelcomeEmail(context: WelcomeEmailContext): WelcomeEmailTemplate {
    const displayName = context.firstName || 'Friend';
    const brandName = 'BakedBot';

    return {
        subject: `Welcome to ${brandName}, ${displayName}! 🌿`,
        htmlBody: `
            <p style="font-size: 18px; margin-bottom: 20px;">Hey ${displayName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
                Welcome to ${brandName}! We're so glad you're here.
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
                You're now part of a community that values quality, transparency, and great experiences.
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
                If you need anything at all, just reach out. We're here to help!
            </p>
            <p style="font-size: 16px; margin-bottom: 10px;">With love and good vibes,</p>
            <p style="font-size: 18px; font-style: italic; color: #667eea; margin: 0;">
                Mrs. Parker 💜<br>
                <span style="font-size: 14px; color: #666;">Customer Happiness Manager, ${brandName}</span>
            </p>
        `,
        textBody: `
Hey ${displayName},

Welcome to ${brandName}! We're so glad you're here.

You're now part of a community that values quality, transparency, and great experiences.

If you need anything at all, just reach out. We're here to help!

With love and good vibes,
Mrs. Parker 💜
Customer Happiness Manager, ${brandName}
        `.trim(),
        fromName: 'Mrs. Parker',
        fromEmail: 'hello@bakedbot.ai',
    };
}

/**
 * Generate weekly nurture email
 */
export async function generateWeeklyNurtureEmail(
    context: WeeklyNurtureContext
): Promise<WelcomeEmailTemplate> {
    // TODO: Implement weekly nurture email generation
    // Similar to welcome but focused on ongoing value based on segment
    throw new Error('Not implemented yet');
}
