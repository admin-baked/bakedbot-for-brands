import type { PlaybookCategory, PlaybookStep, PlaybookTrigger } from '@/types/playbook';

export interface DefaultSuperUserPlaybookTemplate {
    id: string;
    name: string;
    description: string;
    category: PlaybookCategory;
    agent: string;
    agents: string[];
    triggers: PlaybookTrigger[];
    steps: PlaybookStep[];
    metadata?: Record<string, unknown>;
}

function buildExecutiveBookingPlaybookTemplate(
    profileSlug: 'martez' | 'jack',
    displayName: string,
    title: string,
): DefaultSuperUserPlaybookTemplate {
    return {
        id: `${profileSlug}-booking-emails`,
        name: `${displayName} Booking Emails`,
        description: `Send editable guest confirmation and follow-up emails for ${displayName}'s executive bookings.`,
        category: 'marketing',
        agent: 'craig',
        agents: ['Craig'],
        triggers: [
            { type: 'event', eventName: `executive.booking.${profileSlug}.confirmed` },
            { type: 'event', eventName: `executive.booking.${profileSlug}.followup_ready` },
        ],
        steps: [
            {
                id: 'send-confirmation',
                action: 'send_email',
                agent: 'craig',
                label: 'Send booking confirmation',
                condition: '{{isConfirmationEvent}}',
                params: {
                    to: '{{guest.email}}',
                    fromName: '{{executive.displayName}}',
                    subject: 'Your meeting with {{executive.displayName}} is confirmed ✓',
                    communicationType: 'transactional',
                    htmlBody: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                            <div style="background: #000; padding: 24px; text-align: center;">
                                <h1 style="color: #fff; font-size: 22px; margin: 0;">Meeting Confirmed</h1>
                            </div>
                            <div style="padding: 32px 24px;">
                                <p style="font-size: 16px; color: #444;">Hi {{guest.name}},</p>
                                <p>Your meeting with <strong>{{executive.displayName}}</strong> ({{executive.title}}) has been confirmed.</p>

                                <div style="background: #f9f9f9; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
                                    <p style="margin: 0 0 8px;"><strong>When:</strong> {{meeting.formattedStart}}</p>
                                    <p style="margin: 0 0 8px;"><strong>Duration:</strong> {{meeting.durationMinutes}} minutes</p>
                                    <p style="margin: 0 0 8px;"><strong>Topic:</strong> {{meeting.purpose}}</p>
                                </div>

                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{{meeting.videoRoomUrl}}" style="background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                                        Join Meeting
                                    </a>
                                </div>

                                <p style="color: #666; font-size: 14px;">
                                    Bookmark this email. You can use the button above to join at meeting time.
                                </p>
                            </div>
                            <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
                                Powered by BakedBot AI · bakedbot.ai
                            </div>
                        </div>
                    `,
                    textBody: `Hi {{guest.name}},

Your meeting with {{executive.displayName}} ({{executive.title}}) has been confirmed.

When: {{meeting.formattedStart}}
Duration: {{meeting.durationMinutes}} minutes
Topic: {{meeting.purpose}}
Join link: {{meeting.videoRoomUrl}}

Reply to this email if you need anything before we connect.
                    `,
                },
            },
            {
                id: 'send-followup',
                action: 'send_email',
                agent: 'craig',
                label: 'Send meeting follow-up',
                condition: '{{isFollowUpEvent}}',
                params: {
                    to: '{{guest.email}}',
                    fromName: '{{executive.displayName}}',
                    subject: "Great connecting, {{guest.firstName}}! Here's your meeting recap",
                    communicationType: 'transactional',
                    htmlBody: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                            <div style="background: #000; padding: 24px; text-align: center;">
                                <h1 style="color: #fff; font-size: 20px; margin: 0;">Meeting Recap</h1>
                            </div>
                            <div style="padding: 32px 24px;">
                                <p>Hi {{guest.firstName}},</p>
                                <p>Thanks for meeting with <strong>{{executive.displayName}}</strong> today. Here is a quick recap.</p>

                                <h3 style="margin: 24px 0 8px; color: #111;">Notes</h3>
                                <div style="background: #f9f9f9; padding: 16px; border-radius: 4px; white-space: pre-line; font-size: 14px; color: #444;">
                                    {{meeting.notes}}
                                </div>

                                <h3 style="margin: 24px 0 8px; color: #111;">Action Items</h3>
                                {{meeting.actionItemsHtml}}

                                <div style="margin: 32px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0 0 12px; font-size: 14px; color: #666;">Want to keep the conversation moving?</p>
                                    <a href="{{executive.bookingUrl}}" style="background: #111; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block;">
                                        Book Another Meeting
                                    </a>
                                </div>
                            </div>
                            <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
                                Powered by BakedBot AI · bakedbot.ai
                            </div>
                        </div>
                    `,
                    textBody: `Hi {{guest.firstName}},

Thanks for meeting with {{executive.displayName}}. Here is your recap:

Notes:
{{meeting.notes}}

Action Items:
{{meeting.actionItemsText}}

Book another meeting: {{executive.bookingUrl}}
                    `,
                },
            },
        ],
        metadata: {
            useCase: 'executive_booking_emails',
            requiresEventContext: true,
            profileSlug,
            executiveTitle: title,
        },
    };
}

export const DEFAULT_SUPER_USER_PLAYBOOKS: DefaultSuperUserPlaybookTemplate[] = [
    {
        id: 'welcome-emails',
        name: 'Welcome Email Automation',
        description: 'Draft personalized onboarding emails for new BakedBot signups and route them for approval.',
        category: 'marketing',
        agent: 'jack',
        agents: ['Craig', 'Smokey'],
        triggers: [
            { type: 'schedule', cron: '*/30 * * * *', timezone: 'America/Chicago' },
        ],
        steps: [
            {
                action: 'query',
                agent: 'smokey',
                label: 'Find new signups',
                params: {
                    task: 'Find new BakedBot signups from the last 24 hours and summarize their company context, role, and signup source.',
                },
            },
            {
                action: 'generate',
                agent: 'craig',
                label: 'Draft welcome sequence',
                params: {
                    type: 'welcome_email_sequence',
                    task: 'Write approval-ready onboarding emails for new BakedBot users with cannabis tech startup positioning and a clear product activation CTA.',
                },
            },
            {
                action: 'notify',
                label: 'Send approval-ready summary',
                params: {
                    channel: 'inbox',
                    description: 'Welcome email drafts are ready for review in Super User mode.',
                },
            },
        ],
        metadata: {
            useCase: 'crm_onboarding',
        },
    },
    {
        id: 'dayday-seo-discovery',
        name: 'Day Day SEO Discovery',
        description: 'Identify high-opportunity cannabis tech search markets and queue discovery pages for review.',
        category: 'seo',
        agent: 'jack',
        agents: ['Day Day', 'Ezal', 'Craig'],
        triggers: [
            { type: 'schedule', cron: '0 5 * * *', timezone: 'America/Chicago' },
        ],
        steps: [
            {
                action: 'query',
                agent: 'ezal',
                label: 'Find opportunities',
                params: {
                    task: 'Find 5 to 10 high-opportunity cannabis technology SEO opportunities using CRM leads, Search Console, and low-competition market gaps.',
                },
            },
            {
                action: 'generate',
                agent: 'craig',
                label: 'Draft page briefs',
                params: {
                    type: 'seo_brief',
                    task: 'Prepare page briefs for location, dispensary, and brand pages aligned to BakedBot and Super Users positioning.',
                },
            },
            {
                action: 'notify',
                label: 'Post discovery summary',
                params: {
                    channel: 'inbox',
                    description: 'Day Day SEO discovery briefs are ready for review.',
                },
            },
        ],
        metadata: {
            useCase: 'discovery_hub',
        },
    },
    {
        id: 'competitor-scan',
        name: 'Competitor Price Monitor',
        description: 'Monitor AIpine IQ and adjacent cannabis technology competitors for positioning, pricing, and messaging shifts.',
        category: 'intel',
        agent: 'ezal',
        agents: ['Ezal', 'Pops'],
        triggers: [
            { type: 'schedule', cron: '0 6 * * *', timezone: 'America/Chicago' },
        ],
        steps: [
            {
                action: 'query',
                agent: 'ezal',
                label: 'Monitor AIQ',
                params: {
                    task: 'Scan AIpine IQ, cannabis retail marketing automation vendors, and cannabis data platforms for pricing, product, and messaging changes.',
                },
            },
            {
                action: 'generate',
                agent: 'pops',
                label: 'Summarize the gap',
                params: {
                    type: 'competitor_brief',
                    task: 'Summarize the most important competitive shifts for BakedBot leadership, highlight threats, and recommend response actions.',
                },
            },
            {
                action: 'notify',
                label: 'Deliver briefing',
                params: {
                    channel: 'inbox',
                    description: 'AIQ competitor monitoring brief is ready in Super User mode.',
                },
            },
        ],
        metadata: {
            primaryCompetitor: 'AIpine IQ',
        },
    },
    buildExecutiveBookingPlaybookTemplate('martez', 'Martez', 'Founder'),
    buildExecutiveBookingPlaybookTemplate('jack', 'Jack', 'Head of Revenue'),
];

export function getDefaultSuperUserPlaybookTemplate(
    playbookId: string,
): DefaultSuperUserPlaybookTemplate | null {
    return DEFAULT_SUPER_USER_PLAYBOOKS.find((playbook) => playbook.id === playbookId) || null;
}
