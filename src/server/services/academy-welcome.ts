/**
 * Academy Welcome Email Service
 *
 * Handles automated email nurture sequence for Academy leads.
 * 3-email sequence: Welcome → Case Study → Demo Booking
 */

'use server';

import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { getAdminFirestore } from '@/firebase/admin';

export interface AcademyWelcomeContext {
  leadId: string;
  email: string;
  firstName?: string;
  company?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Send Email 1: Welcome (Immediate)
 *
 * Confirms email capture, highlights value, links to resource library
 */
export async function sendAcademyWelcomeEmail(
  context: AcademyWelcomeContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const { email, firstName, leadId, company } = context;
    const displayName = firstName || 'Friend';

    logger.info('[Academy:Welcome] Sending welcome email', {
      leadId,
      email,
      firstName,
    });

    // Save to Letta for personalization
    try {
      await saveAcademyLeadToLetta(context);
    } catch (lettaError) {
      logger.warn('[Academy:Welcome] Failed to save to Letta (non-fatal)', {
        leadId,
        error: lettaError instanceof Error ? lettaError.message : String(lettaError),
      });
    }

    const subject = `Welcome to the Cannabis Marketing AI Academy, ${displayName}! 🌱`;
    const htmlContent = generateWelcomeEmailHtml({ displayName, company });
    const textContent = generateWelcomeEmailText({ displayName, company });

    await sendGenericEmail({
      to: email,
      subject,
      textBody: textContent,
      htmlBody: htmlContent,
      fromName: 'Cannabis Marketing AI Academy',
      fromEmail: 'academy@bakedbot.ai',
    });

    // Schedule follow-up emails (Day 3 and Day 7)
    await scheduleFollowUpEmails(context);

    logger.info('[Academy:Welcome] Welcome email sent successfully', {
      leadId,
      email,
    });

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('[Academy:Welcome] Failed to send welcome email', {
      leadId: context.leadId,
      email: context.email,
      error: err.message,
    });

    return {
      success: false,
      error: err.message || 'Failed to send welcome email',
    };
  }
}

/**
 * Send Email 2: Value Delivery (Day 3)
 *
 * Case study showing results, social proof, soft CTA to demo
 */
export async function sendAcademyValueEmail(
  context: AcademyWelcomeContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const { email, firstName, leadId } = context;
    const displayName = firstName || 'there';

    logger.info('[Academy:ValueEmail] Sending value email', {
      leadId,
      email,
    });

    const subject = `How Thrive Syracuse Increased Sales 40% with AI`;
    const htmlContent = generateValueEmailHtml({ displayName });
    const textContent = generateValueEmailText({ displayName });

    await sendGenericEmail({
      to: email,
      subject,
      textBody: textContent,
      htmlBody: htmlContent,
      fromName: 'Cannabis Marketing AI Academy',
      fromEmail: 'academy@bakedbot.ai',
    });

    logger.info('[Academy:ValueEmail] Value email sent successfully', {
      leadId,
      email,
    });

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('[Academy:ValueEmail] Failed to send value email', {
      leadId: context.leadId,
      email: context.email,
      error: err.message,
    });

    return {
      success: false,
      error: err.message || 'Failed to send value email',
    };
  }
}

/**
 * Send Email 3: Limited Offer (Day 7)
 *
 * Demo booking CTA with special pricing, urgency, testimonials
 */
export async function sendAcademyDemoEmail(
  context: AcademyWelcomeContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const { email, firstName, leadId } = context;
    const displayName = firstName || 'there';

    logger.info('[Academy:DemoEmail] Sending demo email', {
      leadId,
      email,
    });

    const subject = `Your Exclusive Academy Member Offer (Expires Soon) 🎁`;
    const htmlContent = generateDemoEmailHtml({ displayName });
    const textContent = generateDemoEmailText({ displayName });

    await sendGenericEmail({
      to: email,
      subject,
      textBody: textContent,
      htmlBody: htmlContent,
      fromName: 'Cannabis Marketing AI Academy',
      fromEmail: 'academy@bakedbot.ai',
    });

    logger.info('[Academy:DemoEmail] Demo email sent successfully', {
      leadId,
      email,
    });

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('[Academy:DemoEmail] Failed to send demo email', {
      leadId: context.leadId,
      email: context.email,
      error: err.message,
    });

    return {
      success: false,
      error: err.message || 'Failed to send demo email',
    };
  }
}

/**
 * Schedule follow-up emails in Firestore
 * Uses a scheduled_emails collection that a cron job will process
 */
async function scheduleFollowUpEmails(context: AcademyWelcomeContext): Promise<void> {
  try {
    const db = getAdminFirestore();
    const now = Date.now();

    // Schedule Email 2: Day 3 (72 hours)
    await db.collection('scheduled_emails').add({
      type: 'academy_value',
      leadId: context.leadId,
      email: context.email,
      firstName: context.firstName,
      company: context.company,
      scheduledFor: new Date(now + 72 * 60 * 60 * 1000), // 3 days
      status: 'pending',
      createdAt: new Date(),
    });

    // Schedule Email 3: Day 7 (168 hours)
    await db.collection('scheduled_emails').add({
      type: 'academy_demo',
      leadId: context.leadId,
      email: context.email,
      firstName: context.firstName,
      company: context.company,
      scheduledFor: new Date(now + 168 * 60 * 60 * 1000), // 7 days
      status: 'pending',
      createdAt: new Date(),
    });

    logger.info('[Academy:Schedule] Follow-up emails scheduled', {
      leadId: context.leadId,
      email: context.email,
    });
  } catch (error) {
    logger.error('[Academy:Schedule] Failed to schedule follow-up emails', {
      leadId: context.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Non-fatal: don't throw
  }
}

/**
 * Save Academy lead to Letta for personalization
 */
async function saveAcademyLeadToLetta(context: AcademyWelcomeContext): Promise<void> {
  try {
    const { archivalTagsService, CATEGORY_TAGS, AGENT_TAGS } = await import(
      '@/server/services/letta'
    );

    const displayName = context.firstName || context.email;
    const captureDate = new Date().toLocaleDateString();

    const memoryContent = `
New Academy lead captured:
- Name: ${displayName}
- Email: ${context.email}
- Company: ${context.company || 'Not provided'}
- Source: ${context.utmSource || 'Direct'}
- Medium: ${context.utmMedium || 'Organic'}
- Campaign: ${context.utmCampaign || 'N/A'}
- Captured: ${captureDate}
- Lead ID: ${context.leadId}

This lead signed up for the Cannabis Marketing AI Academy, showing strong interest in AI-powered cannabis marketing education. They opted in to receive educational content, resources, and updates about BakedBot. High-intent lead for product demo and conversion.
    `.trim();

    const tags = [
      CATEGORY_TAGS.CUSTOMER, // category:customer
      AGENT_TAGS.MRS_PARKER, // agent:mrs_parker
      'source:academy', // source:academy
      'priority:high', // High priority - educational lead
      'intent:high', // High intent - opted in for education
    ];

    // Mrs. Parker manages Academy leads
    const agentId = 'mrs_parker_academy';

    await archivalTagsService.insertWithTags(agentId, {
      content: memoryContent,
      tags,
      agentId,
      tenantId: 'academy',
    });

    logger.info('[Academy:Letta] Lead saved to memory successfully', {
      leadId: context.leadId,
      agentId,
      tags: tags.join(', '),
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('[Academy:Letta] Failed to save lead to memory', {
      leadId: context.leadId,
      error: err.message,
    });
    // Non-fatal: don't throw
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email 1: Welcome HTML
 */
function generateWelcomeEmailHtml(context: {
  displayName: string;
  company?: string;
}): string {
  const { displayName, company } = context;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to the Cannabis Marketing AI Academy</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
            Welcome to the Academy! 🌱
        </h1>
    </div>

    <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 18px; margin-bottom: 20px;">
            Hey ${displayName},
        </p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            You just unlocked unlimited access to the <strong>Cannabis Marketing AI Academy</strong> — your complete guide to mastering AI-powered cannabis marketing.
        </p>

        ${
          company
            ? `<p style="font-size: 16px; margin-bottom: 20px;">We're excited to help ${company} crush it with AI! 🚀</p>`
            : ''
        }

        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="font-size: 16px; margin: 0;">
                <strong>🎓 What you get now:</strong><br><br>
                ✅ All 12 episodes (7+ hours of content)<br>
                ✅ Full resource library (15+ templates & guides)<br>
                ✅ Downloadable checklists and worksheets<br>
                ✅ Weekly tips from the BakedBot agents<br>
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://bakedbot.ai/academy" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                Start Learning Now →
            </a>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>📚 Recommended first episode:</strong><br>
            <a href="https://bakedbot.ai/academy?episode=ep1-intro" style="color: #10b981; text-decoration: none; font-weight: 600;">
                What Is AI Marketing for Cannabis
            </a><br>
            <span style="color: #666; font-size: 14px;">12 min • Learn why AI is the competitive moat every dispensary needs</span>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
            <strong>Next up:</strong> In 3 days, I'll send you a real case study showing how Thrive Syracuse increased sales 40% using BakedBot.
        </p>

        <p style="font-size: 16px; margin-bottom: 10px;">
            See you in class! 🎓
        </p>

        <p style="font-size: 16px; font-weight: 600; color: #10b981; margin: 0;">
            The BakedBot Team
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
            You're receiving this because you signed up for the Cannabis Marketing AI Academy.<br>
            <a href="#" style="color: #10b981; text-decoration: none;">Unsubscribe</a>
        </p>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Email 1: Welcome Text
 */
function generateWelcomeEmailText(context: {
  displayName: string;
  company?: string;
}): string {
  const { displayName, company } = context;

  return `
Hey ${displayName},

You just unlocked unlimited access to the Cannabis Marketing AI Academy — your complete guide to mastering AI-powered cannabis marketing.

${company ? `We're excited to help ${company} crush it with AI! 🚀\n\n` : ''}

🎓 WHAT YOU GET NOW:
✅ All 12 episodes (7+ hours of content)
✅ Full resource library (15+ templates & guides)
✅ Downloadable checklists and worksheets
✅ Weekly tips from the BakedBot agents

👉 START LEARNING NOW: https://bakedbot.ai/academy

📚 RECOMMENDED FIRST EPISODE:
What Is AI Marketing for Cannabis
https://bakedbot.ai/academy?episode=ep1-intro
12 min • Learn why AI is the competitive moat every dispensary needs

---

NEXT UP: In 3 days, I'll send you a real case study showing how Thrive Syracuse increased sales 40% using BakedBot.

See you in class! 🎓

The BakedBot Team

---

You're receiving this because you signed up for the Cannabis Marketing AI Academy.
Unsubscribe: [link]
  `.trim();
}

/**
 * Email 2: Value Delivery HTML
 */
function generateValueEmailHtml(context: { displayName: string }): string {
  const { displayName } = context;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How Thrive Syracuse Increased Sales 40%</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
    <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Hey ${displayName},
        </p>

        <h1 style="font-size: 28px; color: #10b981; margin-bottom: 20px;">
            How Thrive Syracuse Increased Sales 40% (and Cut Marketing Time in Half)
        </h1>

        <p style="font-size: 16px; margin-bottom: 20px;">
            You've been watching the Academy episodes, so I wanted to share a real-world example of this stuff in action.
        </p>

        <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 30px; margin: 30px 0; border-radius: 8px;">
            <h2 style="font-size: 20px; color: #10b981; margin-top: 0;">
                📊 The Results:
            </h2>
            <ul style="font-size: 16px; line-height: 2;">
                <li><strong>40% increase in revenue</strong> (first 90 days)</li>
                <li><strong>4,200+ new loyalty members</strong> (automated)</li>
                <li><strong>50% reduction in marketing time</strong> (AI automation)</li>
                <li><strong>$18K saved</strong> on competitive intelligence (Ezal vs. manual research)</li>
            </ul>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>How they did it:</strong>
        </p>

        <p style="font-size: 16px; margin-bottom: 15px;">
            🤖 <strong>Smokey (Budtender Agent)</strong> — Automated product search & recommendations, reducing customer decision time<br>
            📧 <strong>Craig (Marketing Agent)</strong> — Ran automated email campaigns with 22% open rates<br>
            🔍 <strong>Ezal (Competitive Intel)</strong> — Monitored 12 competitors daily, identified pricing opportunities<br>
            💜 <strong>Mrs. Parker (Memory Agent)</strong> — Personalized every customer interaction with past purchase history
        </p>

        <p style="font-size: 16px; margin-bottom: 30px;">
            The best part? <strong>Their team didn't grow.</strong> They just got 7 AI agents.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://bakedbot.ai/demo" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                See BakedBot in Action →
            </a>
        </div>

        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
            No pressure — just thought you'd find this interesting! 😊
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 16px; margin-bottom: 10px;">
            Keep learning,
        </p>

        <p style="font-size: 16px; font-weight: 600; color: #10b981; margin: 0;">
            The BakedBot Team
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="#" style="color: #10b981; text-decoration: none;">Unsubscribe</a>
        </p>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Email 2: Value Delivery Text
 */
function generateValueEmailText(context: { displayName: string }): string {
  const { displayName } = context;

  return `
Hey ${displayName},

HOW THRIVE SYRACUSE INCREASED SALES 40%
(and cut marketing time in half)

You've been watching the Academy episodes, so I wanted to share a real-world example of this stuff in action.

📊 THE RESULTS:
• 40% increase in revenue (first 90 days)
• 4,200+ new loyalty members (automated)
• 50% reduction in marketing time (AI automation)
• $18K saved on competitive intelligence (Ezal vs. manual research)

HOW THEY DID IT:
🤖 Smokey (Budtender Agent) — Automated product search & recommendations
📧 Craig (Marketing Agent) — Ran automated email campaigns with 22% open rates
🔍 Ezal (Competitive Intel) — Monitored 12 competitors daily, found pricing opportunities
💜 Mrs. Parker (Memory Agent) — Personalized every customer interaction

The best part? Their team didn't grow. They just got 7 AI agents.

👉 SEE BAKEDBOT IN ACTION: https://bakedbot.ai/demo

No pressure — just thought you'd find this interesting! 😊

Keep learning,
The BakedBot Team

---

Unsubscribe: [link]
  `.trim();
}

/**
 * Email 3: Demo Booking HTML
 */
function generateDemoEmailHtml(context: { displayName: string }): string {
  const { displayName } = context;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Exclusive Academy Offer</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
            Exclusive Academy Offer 🎁
        </h1>
    </div>

    <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 18px; margin-bottom: 20px;">
            Hey ${displayName},
        </p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            You've been crushing it in the Academy! 🎓
        </p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            As a thank you for being an engaged student, we're offering <strong>Academy members only</strong> a special deal on BakedBot:
        </p>

        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 3px solid #f59e0b; padding: 30px; margin: 30px 0; border-radius: 10px; text-align: center;">
            <h2 style="font-size: 32px; color: #92400e; margin: 0 0 10px 0;">
                20% OFF
            </h2>
            <p style="font-size: 18px; color: #92400e; margin: 0; font-weight: 600;">
                Your First 3 Months
            </p>
            <p style="font-size: 14px; color: #92400e; margin: 10px 0 0 0;">
                (That's up to $1,200 in savings)
            </p>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>✨ What you'll get:</strong>
        </p>

        <ul style="font-size: 16px; line-height: 2; margin-bottom: 30px;">
            <li>All 7 BakedBot agents (Smokey, Craig, Ezal, Deebo, Pops, Money Mike, Mrs. Parker)</li>
            <li>White-glove onboarding & training</li>
            <li>Custom POS integration</li>
            <li>Dedicated success manager</li>
            <li>90-day ROI guarantee</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://bakedbot.ai/demo?source=academy&offer=20off" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4);">
                Book Your Demo (Save 20%) →
            </a>
        </div>

        <p style="font-size: 14px; color: #dc2626; text-align: center; font-weight: 600; margin: 20px 0;">
            ⏰ Offer expires in 7 days
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <h3 style="font-size: 18px; margin-bottom: 15px;">
            💬 What our customers say:
        </h3>

        <div style="background: #f9fafb; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px;">
            <p style="font-size: 14px; font-style: italic; margin: 0 0 10px 0;">
                "BakedBot paid for itself in the first month. The agents literally never sleep — they're handling customer questions, running campaigns, and monitoring competitors 24/7."
            </p>
            <p style="font-size: 14px; color: #666; margin: 0;">
                — Sarah M., Dispensary Owner, Syracuse NY
            </p>
        </div>

        <p style="font-size: 16px; margin-top: 30px;">
            Ready to see BakedBot in action? Let's chat! 👋
        </p>

        <p style="font-size: 16px; font-weight: 600; color: #10b981; margin: 20px 0 0 0;">
            The BakedBot Team
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="#" style="color: #10b981; text-decoration: none;">Unsubscribe</a>
        </p>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Email 3: Demo Booking Text
 */
function generateDemoEmailText(context: { displayName: string }): string {
  const { displayName } = context;

  return `
Hey ${displayName},

You've been crushing it in the Academy! 🎓

As a thank you for being an engaged student, we're offering Academy members only a special deal on BakedBot:

🎁 20% OFF YOUR FIRST 3 MONTHS
(That's up to $1,200 in savings)

✨ WHAT YOU'LL GET:
• All 7 BakedBot agents (Smokey, Craig, Ezal, Deebo, Pops, Money Mike, Mrs. Parker)
• White-glove onboarding & training
• Custom POS integration
• Dedicated success manager
• 90-day ROI guarantee

👉 BOOK YOUR DEMO (SAVE 20%):
https://bakedbot.ai/demo?source=academy&offer=20off

⏰ Offer expires in 7 days

---

💬 WHAT OUR CUSTOMERS SAY:

"BakedBot paid for itself in the first month. The agents literally never sleep — they're handling customer questions, running campaigns, and monitoring competitors 24/7."
— Sarah M., Dispensary Owner, Syracuse NY

---

Ready to see BakedBot in action? Let's chat! 👋

The BakedBot Team

---

Unsubscribe: [link]
  `.trim();
}
