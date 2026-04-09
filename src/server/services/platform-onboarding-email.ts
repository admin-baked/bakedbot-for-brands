import { getAdminFirestore } from '@/firebase/admin';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import {
  getDefaultOnboardingPrimaryGoal,
  getOnboardingGoalDefinition,
  getOnboardingGoalHref,
} from '@/lib/onboarding/activation';
import { logger } from '@/lib/logger';
import type { OnboardingPrimaryGoal } from '@/types/onboarding';
import {
  isBrandRole,
  isDispensaryRole,
  type UserRole,
} from '@/types/roles';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const PLATFORM_ONBOARDING_EMAIL_JOB_TYPE = 'send_platform_onboarding_email';

type PlatformOnboardingTopicKey =
  | 'start_here'
  | 'brand_guide'
  | 'checkin'
  | 'competitive'
  | 'creative'
  | 'playbooks'
  | 'inbox'
  | 'inbox_martez'
  | 'martez';

export interface PlatformOnboardingEmailContext {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  orgId?: string;
  brandId?: string;
  dispensaryId?: string;
  source?: string;
  campaignId?: string | null;
  primaryGoal?: OnboardingPrimaryGoal;
  workspaceName?: string;
}

export interface PlatformOnboardingEmailJobData extends PlatformOnboardingEmailContext {
  sequenceType: 'first_week' | 'weekly_feature';
  dayIndex?: number;
  weekIndex?: number;
  topicKey?: PlatformOnboardingTopicKey;
  scheduledAt: number;
}

interface EmailTemplateContent {
  subject: string;
  preview: string;
  heading: string;
  body: string[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  helpCta?: { label: string; href: string };
}

function normalizeFirstName(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'there';
}

function normalizeWorkspaceName(value: string | undefined, role: UserRole | undefined): string {
  const trimmed = value?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }

  if (isDispensaryRole(role ?? null)) {
    return 'your dispensary';
  }

  if (isBrandRole(role ?? null)) {
    return 'your brand';
  }

  return 'your workspace';
}

function getRoleSpecificFirstWeekTopics(role: UserRole | undefined): PlatformOnboardingTopicKey[] {
  if (isDispensaryRole(role ?? null)) {
    return ['start_here', 'brand_guide', 'checkin', 'competitive', 'creative', 'playbooks', 'inbox_martez'];
  }

  return ['start_here', 'brand_guide', 'creative', 'competitive', 'playbooks', 'inbox', 'martez'];
}

function getRoleSpecificWeeklyTopics(role: UserRole | undefined): PlatformOnboardingTopicKey[] {
  if (isDispensaryRole(role ?? null)) {
    return ['competitive', 'checkin', 'creative', 'playbooks', 'inbox'];
  }

  return ['creative', 'competitive', 'playbooks', 'inbox', 'brand_guide'];
}

function getWeeklyTopic(role: UserRole | undefined, weekIndex: number): PlatformOnboardingTopicKey {
  const topics = getRoleSpecificWeeklyTopics(role);
  return topics[weekIndex % topics.length] ?? topics[0];
}

function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${APP_URL}${path}`;
}

function getResolvedPrimaryGoal(
  role: UserRole | undefined,
  primaryGoal: OnboardingPrimaryGoal | undefined,
): OnboardingPrimaryGoal {
  return primaryGoal ?? getDefaultOnboardingPrimaryGoal(role ?? null);
}

function buildEmailContent(job: PlatformOnboardingEmailJobData): EmailTemplateContent {
  const role = job.role;
  const firstName = normalizeFirstName(job.firstName);
  const workspaceName = normalizeWorkspaceName(job.workspaceName, role);
  const primaryGoal = getResolvedPrimaryGoal(role, job.primaryGoal);
  const goalDefinition = getOnboardingGoalDefinition(primaryGoal);
  const goalHref = getOnboardingGoalHref(primaryGoal, role ?? null);
  const topicKey = job.topicKey
    ?? (job.sequenceType === 'weekly_feature'
      ? getWeeklyTopic(role, job.weekIndex ?? 0)
      : getRoleSpecificFirstWeekTopics(role)[job.dayIndex ?? 0]
    );

  switch (topicKey) {
    case 'brand_guide':
      return {
        subject: `Day ${(job.dayIndex ?? 0) + 1}: build the Brand Guide before you scale`,
        preview: 'Voice, visuals, and compliance rules all get sharper once this is done.',
        heading: 'Build the Brand Guide before anything else',
        body: [
          `Hi ${firstName}, Brand Guide is the fastest way to make BakedBot sound like ${workspaceName} instead of a generic tool.`,
          'Set the voice, colors, guardrails, and assets once so Craig, Smokey, and the rest of the system work from the same source of truth.',
          'If you only have a few minutes today, this is the setup step with the highest leverage.',
        ],
        primaryCta: { label: 'Open Brand Guide', href: absoluteUrl('/dashboard/settings/brand-guide') },
        helpCta: { label: 'Read the quick-start guide', href: absoluteUrl('/help/getting-started/brand-quick-start') },
        secondaryCta: { label: 'Book onboarding with Martez', href: absoluteUrl('/martez') },
      };
    case 'checkin':
      return {
        subject: 'Launch the Check-In flow and train the front door',
        preview: 'Tablet check-in is one of the fastest ways to capture repeat revenue.',
        heading: 'Make the front door work harder for you',
        body: [
          `Hi ${firstName}, the Check-In flow is built for fast activation: launch the tablet experience, print the QR, and give staff one clean workflow to run.`,
          'This is where first-party capture, consent, repeat visits, and review follow-up start to compound.',
          'Once the flow is live, your team can use the same setup guide to finish QR training and launch QA.',
        ],
        primaryCta: { label: 'Open Check-In Manager', href: absoluteUrl('/dashboard/dispensary/checkin') },
        helpCta: { label: 'Read the loyalty + check-in guide', href: absoluteUrl('/help/dispensary/loyalty-program') },
        secondaryCta: { label: 'Preview the QR launch page', href: absoluteUrl('/dashboard/loyalty-tablet-qr') },
      };
    case 'competitive':
      return {
        subject: 'Turn on the daily Competitive Intelligence report',
        preview: 'Ezal should be landing pricing and market moves in your inbox every day.',
        heading: 'Daily market context beats reactive guessing',
        body: [
          `Hi ${firstName}, Competitive Intelligence is one of the clearest ways to show value early because you can see price shifts, assortment gaps, and threats before they cost ${workspaceName} money.`,
          'Activate the report, review the first delivery, and use it to decide your next pricing, assortment, or campaign move.',
          'If you already know your first win, this is still the feature that keeps the rest of the system better informed.',
        ],
        primaryCta: { label: 'Open Competitive Intel', href: absoluteUrl('/dashboard/competitive-intel') },
        helpCta: { label: 'Read the Ezal help guide', href: absoluteUrl('/help/agents/ezal') },
        secondaryCta: { label: 'Review pricing report guidance', href: absoluteUrl('/help/analytics/competitive-pricing') },
      };
    case 'creative':
      return {
        subject: 'Use Creative Center to ship the first draft faster',
        preview: 'Creative Center is built for fast wins, not blank-page brainstorming.',
        heading: 'Create something real this week',
        body: [
          `Hi ${firstName}, Creative Center works best once Brand Guide is set because Craig can draft content that already sounds and looks like ${workspaceName}.`,
          'The goal is not perfection on day one. Generate one draft, tighten the hook, and move one asset onto the calendar so the workflow becomes real.',
          'This is the fastest path from "we should post something" to "we already have the draft."',
        ],
        primaryCta: { label: 'Open Creative Center', href: absoluteUrl('/dashboard/creative') },
        helpCta: { label: 'Read the Creative Center guide', href: absoluteUrl('/help/marketing/creative-content') },
        secondaryCta: { label: 'See Vibe Studio inspiration', href: absoluteUrl('/help/marketing/vibe-studio') },
      };
    case 'playbooks':
      return {
        subject: 'Turn on the Welcome Playbook once the basics are in place',
        preview: 'Your first-week setup should end with follow-up running automatically.',
        heading: 'Let the welcome motion keep working after you log off',
        body: [
          `Hi ${firstName}, once Brand Guide and your first win are in motion, Welcome Playbook is how you stop onboarding from depending on memory and manual follow-up.`,
          'Review the automation, confirm the copy, and make sure new contacts have a clean first-touch path.',
          'These platform onboarding emails are part of that same philosophy: fewer loose ends, more consistent activation.',
        ],
        primaryCta: { label: 'Open Playbooks', href: absoluteUrl('/dashboard/playbooks') },
        helpCta: { label: 'Read the Playbooks guide', href: absoluteUrl('/help/marketing/playbooks') },
        secondaryCta: { label: 'Review SES email settings', href: absoluteUrl('/dashboard/settings?tab=email') },
      };
    case 'inbox':
      return {
        subject: 'Use Inbox as your daily operator console',
        preview: 'Inbox is where drafts, reports, approvals, and next actions land.',
        heading: 'Inbox is where the work shows up',
        body: [
          `Hi ${firstName}, the fastest way to feel momentum in BakedBot is to use Inbox as the place where the team drops completed work.`,
          'Creative drafts, competitive reports, approvals, and recurring outputs all make more sense once you treat Inbox as mission control instead of another notification feed.',
          'Spend five minutes there each morning and the rest of the product gets easier to manage.',
        ],
        primaryCta: { label: 'Open Inbox', href: absoluteUrl('/dashboard/inbox') },
        helpCta: { label: 'Read the Inbox guide', href: absoluteUrl('/help/getting-started/inbox-guide') },
        secondaryCta: { label: 'Open your setup guide', href: absoluteUrl('/dashboard') },
      };
    case 'inbox_martez':
      return {
        subject: 'Final first-week push: check Inbox and book help if you want it',
        preview: 'You do not need to figure out the last mile alone.',
        heading: 'Bring the first week together',
        body: [
          `Hi ${firstName}, by now you should have enough context to use Inbox as the daily control room for ${workspaceName}.`,
          'That is where reports, drafts, approvals, and next actions come together after your first wins are live.',
          'If you want hands-on help finishing setup, book time with Martez and we will walk through the exact blockers together.',
        ],
        primaryCta: { label: 'Open Inbox', href: absoluteUrl('/dashboard/inbox') },
        helpCta: { label: 'Read the Inbox guide', href: absoluteUrl('/help/getting-started/inbox-guide') },
        secondaryCta: { label: 'Book onboarding with Martez', href: absoluteUrl('/martez') },
      };
    case 'martez':
      return {
        subject: 'Want help finishing onboarding? Book time with Martez',
        preview: 'If your first win is not fully live yet, we can unblock it together.',
        heading: 'Hands-on onboarding is available',
        body: [
          `Hi ${firstName}, if ${workspaceName} still needs help getting the first win all the way live, you can book time directly with Martez.`,
          'The best onboarding motions stay focused: finish Brand Guide, push the first core feature live, then tighten follow-up and reporting around it.',
          `Your current recommended first win is still ${goalDefinition.title}, so that is the place I would focus first on the call.`,
        ],
        primaryCta: { label: 'Book onboarding with Martez', href: absoluteUrl('/martez') },
        helpCta: { label: 'Review your first-win page', href: absoluteUrl(goalHref) },
        secondaryCta: { label: 'Open the dashboard', href: absoluteUrl('/dashboard') },
      };
    case 'start_here':
    default:
      return {
        subject: `Your first BakedBot win is ${goalDefinition.title}`,
        preview: 'Start with Brand Guide, then move directly into the first feature that matters most.',
        heading: 'Start with one live win, not everything at once',
        body: [
          `Hi ${firstName}, welcome to BakedBot. I want to get ${workspaceName} to a first win quickly, so your setup now points at ${goalDefinition.title} instead of asking you to learn everything at once.`,
          'Brand Guide still comes first because that makes every agent output sharper, but right after that you should move directly into the feature that creates immediate traction.',
          'If you want hands-on help from the start, you can book onboarding with Martez any time.',
        ],
        primaryCta: { label: `Open ${goalDefinition.title}`, href: absoluteUrl(goalHref) },
        helpCta: { label: 'Open the setup guide', href: absoluteUrl('/dashboard') },
        secondaryCta: { label: 'Book onboarding with Martez', href: absoluteUrl('/martez') },
      };
  }
}

function renderEmailHtml(content: EmailTemplateContent): string {
  const bodyHtml = content.body
    .map((paragraph) => `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">${paragraph}</p>`)
    .join('');

  const secondaryHtml = content.secondaryCta
    ? `<a href="${content.secondaryCta.href}" style="display:inline-block;margin-left:12px;color:#065f46;font-size:14px;font-weight:600;text-decoration:none;">${content.secondaryCta.label}</a>`
    : '';

  const helpHtml = content.helpCta
    ? `<p style="margin:24px 0 0;color:#4b5563;font-size:14px;line-height:1.6;">Need the walkthrough? <a href="${content.helpCta.href}" style="color:#065f46;font-weight:600;text-decoration:none;">${content.helpCta.label}</a>.</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${content.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#0f766e,#111827);">
              <p style="margin:0 0 8px;color:#ccfbf1;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">BakedBot Onboarding</p>
              <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2;">${content.heading}</h1>
              <p style="margin:10px 0 0;color:#d1d5db;font-size:14px;line-height:1.6;">${content.preview}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              <div style="margin-top:28px;">
                <a href="${content.primaryCta.href}" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:999px;">
                  ${content.primaryCta.label}
                </a>
                ${secondaryHtml}
              </div>
              ${helpHtml}
              <p style="margin:28px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                Martez<br>
                Founder, BakedBot
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function renderEmailText(content: EmailTemplateContent): string {
  const sections = [
    content.heading,
    ...content.body,
    `${content.primaryCta.label}: ${content.primaryCta.href}`,
    content.secondaryCta ? `${content.secondaryCta.label}: ${content.secondaryCta.href}` : null,
    content.helpCta ? `${content.helpCta.label}: ${content.helpCta.href}` : null,
    '',
    'Martez',
    'Founder, BakedBot',
  ];

  return sections.filter((value): value is string => Boolean(value)).join('\n\n');
}

function buildJobId(userId: string, suffix: string): string {
  return `platform_onboarding:${userId}:${suffix}`;
}

async function ensureJob(jobId: string, data: PlatformOnboardingEmailJobData): Promise<void> {
  const db = getAdminFirestore();
  const jobRef = db.collection('jobs').doc(jobId);
  const existing = await jobRef.get();
  if (existing.exists) {
    return;
  }

  await jobRef.set({
    type: PLATFORM_ONBOARDING_EMAIL_JOB_TYPE,
    agent: 'mrs_parker',
    status: 'pending',
    data,
    scheduledAt: data.scheduledAt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attempts: 0,
    priority: data.sequenceType === 'first_week' && data.dayIndex === 0 ? 'high' : 'normal',
  });
}

export async function schedulePlatformOnboardingEmailSeries(
  context: PlatformOnboardingEmailContext,
): Promise<void> {
  const topics = getRoleSpecificFirstWeekTopics(context.role);
  const now = Date.now();

  await Promise.all(
    topics.map((topicKey, dayIndex) => ensureJob(
      buildJobId(context.userId, `day:${dayIndex}`),
      {
        ...context,
        sequenceType: 'first_week',
        dayIndex,
        topicKey,
        scheduledAt: now + (dayIndex * DAY_IN_MS),
      },
    )),
  );

  logger.info('[PlatformOnboardingEmail] Scheduled onboarding email series', {
    userId: context.userId,
    email: context.email,
    role: context.role ?? null,
    primaryGoal: context.primaryGoal ?? null,
  });
}

export async function sendPlatformOnboardingEmail(
  job: PlatformOnboardingEmailJobData,
): Promise<{ success: boolean; error?: string }> {
  const content = buildEmailContent(job);
  const result = await sendGenericEmail({
    to: job.email,
    subject: content.subject,
    htmlBody: renderEmailHtml(content),
    textBody: renderEmailText(content),
    fromEmail: 'team@bakedbot.ai',
    fromName: 'BakedBot Onboarding',
    orgId: job.orgId,
    userId: job.userId,
    communicationType: 'welcome',
    agentName: 'platform-onboarding',
  });

  if (!result.success) {
    logger.warn('[PlatformOnboardingEmail] Delivery failed', {
      userId: job.userId,
      email: job.email,
      sequenceType: job.sequenceType,
      dayIndex: job.dayIndex ?? null,
      weekIndex: job.weekIndex ?? null,
      error: result.error ?? 'unknown',
    });
  }

  return result;
}
