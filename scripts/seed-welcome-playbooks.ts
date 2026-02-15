/**
 * Seed Default Welcome Playbooks
 *
 * Creates automated welcome + nurture playbooks for all user segments:
 * - Customer (age gate leads)
 * - Super User (BakedBot team members)
 * - Dispensary Owner (platform users)
 * - Brand Marketer (platform users)
 * - Lead (unqualified)
 *
 * Each playbook includes:
 * - Immediate: Welcome email
 * - Day 3: Value/education email
 * - Day 7: Engagement email
 * - Weekly: Nurture emails (ongoing)
 *
 * Run with: npx tsx scripts/seed-welcome-playbooks.ts
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

/**
 * Default Welcome Playbooks Configuration
 */
const WELCOME_PLAYBOOKS = [
    // === CUSTOMER WELCOME (Age Gate Leads) ===
    {
        id: 'welcome_customer',
        name: '🌿 Customer Welcome Series',
        description: 'Personalized welcome sequence for dispensary customers',
        segment: 'customer',
        triggerEvents: ['user.signup'],
        enabled: true,
        orgId: 'system', // Global playbook
        schedule: 'event-triggered',
        steps: [
            {
                id: 'immediate_welcome',
                type: 'send_email',
                name: 'Immediate Welcome Email',
                agent: 'mrs_parker',
                delay: 0,
                config: {
                    emailType: 'welcome',
                    aiGenerated: true,
                    personalizationLevel: 'deep',
                    trackOpens: true,
                    trackClicks: true,
                },
            },
            {
                id: 'day3_value',
                type: 'send_email',
                name: 'Day 3: Product Education',
                agent: 'mrs_parker',
                delay: 259200000, // 3 days in ms
                config: {
                    emailType: 'education',
                    subject: 'Your cannabis journey starts here 🌱',
                    topics: ['product types', 'dosing guidance', 'consumption methods'],
                    aiGenerated: true,
                },
            },
            {
                id: 'day7_engagement',
                type: 'send_email',
                name: 'Day 7: First Purchase Incentive',
                agent: 'mrs_parker',
                delay: 604800000, // 7 days in ms
                config: {
                    emailType: 'incentive',
                    subject: 'Ready to shop? Here\'s 15% off your first order 🎁',
                    includeDiscount: true,
                    discountValue: '15%',
                    aiGenerated: true,
                },
            },
            {
                id: 'weekly_nurture',
                type: 'send_email',
                name: 'Weekly: Deals & New Products',
                agent: 'mrs_parker',
                delay: 604800000, // 7 days, then repeats weekly
                recurring: true,
                recurringInterval: 604800000, // 7 days
                config: {
                    emailType: 'nurture',
                    topics: ['new products', 'weekly deals', 'education', 'loyalty rewards'],
                    aiGenerated: true,
                },
            },
        ],
    },

    // === SUPER USER WELCOME (BakedBot Team) ===
    {
        id: 'welcome_super_user',
        name: '🚀 Team Member Welcome',
        description: 'Onboarding sequence for BakedBot team members',
        segment: 'super_user',
        triggerEvents: ['user.signup.platform'],
        enabled: true,
        orgId: 'system',
        schedule: 'event-triggered',
        steps: [
            {
                id: 'immediate_welcome',
                type: 'send_email',
                name: 'Immediate: Welcome to BakedBot',
                agent: 'mrs_parker',
                delay: 0,
                config: {
                    emailType: 'welcome',
                    subject: 'Welcome to the BakedBot family! 🎉',
                    aiGenerated: true,
                    personalizationLevel: 'contextual',
                },
            },
            {
                id: 'dashboard_notification',
                type: 'create_inbox_notification',
                name: 'Dashboard Welcome Message',
                agent: 'mrs_parker',
                delay: 0,
                config: {
                    title: 'Welcome to BakedBot!',
                    message: 'Check your email for onboarding resources. Let\'s grow to $100k MRR together!',
                    priority: 'high',
                },
            },
            {
                id: 'day3_resources',
                type: 'send_email',
                name: 'Day 3: Getting Started Resources',
                agent: 'mrs_parker',
                delay: 259200000,
                config: {
                    emailType: 'onboarding',
                    subject: 'Your BakedBot toolkit: knowledge base, playbooks, agents',
                    topics: ['knowledge base', 'playbook system', 'agent capabilities', 'competitive context'],
                    aiGenerated: true,
                },
            },
            {
                id: 'weekly_updates',
                type: 'send_email',
                name: 'Weekly: Company Updates',
                agent: 'mrs_parker',
                delay: 604800000,
                recurring: true,
                recurringInterval: 604800000,
                config: {
                    emailType: 'company_update',
                    topics: ['growth metrics', 'customer wins', 'competitive intel', 'roadmap updates'],
                    aiGenerated: true,
                },
            },
        ],
    },

    // === DISPENSARY OWNER WELCOME ===
    {
        id: 'welcome_dispensary',
        name: '💼 Dispensary Onboarding',
        description: 'Welcome sequence for dispensary operators',
        segment: 'dispensary_owner',
        triggerEvents: ['user.signup.platform'],
        enabled: true,
        orgId: 'system',
        schedule: 'event-triggered',
        steps: [
            {
                id: 'immediate_welcome',
                type: 'send_email',
                name: 'Immediate: Welcome to BakedBot',
                agent: 'mrs_parker',
                delay: 0,
                config: {
                    emailType: 'welcome',
                    subject: 'Welcome to BakedBot - Your Cannabis OS 🌿',
                    aiGenerated: true,
                    personalizationLevel: 'deep',
                },
            },
            {
                id: 'day3_setup',
                type: 'send_email',
                name: 'Day 3: Quick Setup Guide',
                agent: 'mrs_parker',
                delay: 259200000,
                config: {
                    emailType: 'setup',
                    subject: 'Get started in 3 steps: POS, compliance, marketing',
                    topics: ['POS integration', 'compliance setup', 'marketing automation'],
                    aiGenerated: true,
                },
            },
            {
                id: 'day7_features',
                type: 'send_email',
                name: 'Day 7: Feature Walkthrough',
                agent: 'mrs_parker',
                delay: 604800000,
                config: {
                    emailType: 'feature_tour',
                    subject: 'Unlock BakedBot\'s full potential: agents, playbooks, intelligence',
                    topics: ['agent capabilities', 'playbook automation', 'inventory intelligence'],
                    aiGenerated: true,
                },
            },
            {
                id: 'weekly_insights',
                type: 'send_email',
                name: 'Weekly: Dispensary Insights',
                agent: 'pops',
                delay: 604800000,
                recurring: true,
                recurringInterval: 604800000,
                config: {
                    emailType: 'insights',
                    topics: ['inventory trends', 'compliance updates', 'customer retention', 'revenue optimization'],
                    aiGenerated: true,
                },
            },
        ],
    },

    // === BRAND MARKETER WELCOME ===
    {
        id: 'welcome_brand',
        name: '🎨 Brand Partner Welcome',
        description: 'Welcome sequence for cannabis brands',
        segment: 'brand_marketer',
        triggerEvents: ['user.signup.platform'],
        enabled: true,
        orgId: 'system',
        schedule: 'event-triggered',
        steps: [
            {
                id: 'immediate_welcome',
                type: 'send_email',
                name: 'Immediate: Welcome to BakedBot',
                agent: 'craig',
                delay: 0,
                config: {
                    emailType: 'welcome',
                    subject: 'Welcome to BakedBot - Your Marketing AI 🚀',
                    aiGenerated: true,
                    personalizationLevel: 'deep',
                },
            },
            {
                id: 'day3_quick_wins',
                type: 'send_email',
                name: 'Day 3: Quick Marketing Wins',
                agent: 'craig',
                delay: 259200000,
                config: {
                    emailType: 'quick_wins',
                    subject: '3 ways to automate your cannabis marketing today',
                    topics: ['content automation', 'competitive intelligence', 'campaign playbooks'],
                    aiGenerated: true,
                },
            },
            {
                id: 'day7_campaign_ideas',
                type: 'send_email',
                name: 'Day 7: Campaign Ideas',
                agent: 'craig',
                delay: 604800000,
                config: {
                    emailType: 'campaign_ideas',
                    subject: 'Campaign ideas that convert: templates from top brands',
                    topics: ['campaign templates', 'content calendar', 'social media automation'],
                    aiGenerated: true,
                },
            },
            {
                id: 'weekly_marketing',
                type: 'send_email',
                name: 'Weekly: Marketing Tips',
                agent: 'craig',
                delay: 604800000,
                recurring: true,
                recurringInterval: 604800000,
                config: {
                    emailType: 'marketing_tips',
                    topics: ['campaign performance', 'content ideas', 'competitive intel', 'industry trends'],
                    aiGenerated: true,
                },
            },
        ],
    },

    // === LEAD NURTURE (Unqualified) ===
    {
        id: 'welcome_lead',
        name: '🧲 Lead Nurture Series',
        description: 'Welcome sequence for unqualified leads',
        segment: 'lead',
        triggerEvents: ['user.signup.lead'],
        enabled: true,
        orgId: 'system',
        schedule: 'event-triggered',
        steps: [
            {
                id: 'immediate_welcome',
                type: 'send_email',
                name: 'Immediate: Welcome Email',
                agent: 'mrs_parker',
                delay: 0,
                config: {
                    emailType: 'welcome',
                    subject: 'Thanks for your interest in BakedBot! 🌿',
                    aiGenerated: true,
                    personalizationLevel: 'contextual',
                },
            },
            {
                id: 'day3_education',
                type: 'send_email',
                name: 'Day 3: Educational Content',
                agent: 'craig',
                delay: 259200000,
                config: {
                    emailType: 'education',
                    subject: 'Cannabis marketing 101: The BakedBot way',
                    topics: ['cannabis marketing basics', 'compliance', 'automation benefits'],
                    aiGenerated: true,
                },
            },
            {
                id: 'day7_demo',
                type: 'send_email',
                name: 'Day 7: Demo Invitation',
                agent: 'mrs_parker',
                delay: 604800000,
                config: {
                    emailType: 'demo_invite',
                    subject: 'See BakedBot in action: Book your demo',
                    aiGenerated: true,
                },
            },
            {
                id: 'weekly_value',
                type: 'send_email',
                name: 'Weekly: Value Emails',
                agent: 'craig',
                delay: 604800000,
                recurring: true,
                recurringInterval: 604800000,
                config: {
                    emailType: 'value',
                    topics: ['case studies', 'platform highlights', 'industry insights', 'trial offer'],
                    aiGenerated: true,
                },
            },
        ],
    },
];

async function main() {
    logger.info('[Seed] Starting default welcome playbooks import...\n');

    try {
        let created = 0;
        let updated = 0;

        for (const playbook of WELCOME_PLAYBOOKS) {
            const docRef = firestore
                .collection('playbook_templates')
                .doc(playbook.id);

            const existing = await docRef.get();

            const playbookData = {
                ...playbook,
                createdAt: existing.exists ? existing.data()?.createdAt : new Date(),
                updatedAt: new Date(),
                version: (existing.data()?.version || 0) + 1,
            };

            await docRef.set(playbookData, { merge: true });

            if (existing.exists) {
                updated++;
                logger.info(`[Seed] ✅ Updated: ${playbook.name}`);
            } else {
                created++;
                logger.info(`[Seed] ✨ Created: ${playbook.name}`);
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ DEFAULT WELCOME PLAYBOOKS SEEDED');
        console.log('='.repeat(70));
        console.log(`\nCreated: ${created} playbooks`);
        console.log(`Updated: ${updated} playbooks`);
        console.log(`Total: ${WELCOME_PLAYBOOKS.length} playbooks`);
        console.log('\nPlaybooks by Segment:');
        console.log('  🌿 Customer (age gate leads) - 4 steps');
        console.log('  🚀 Super User (BakedBot team) - 4 steps');
        console.log('  💼 Dispensary Owner - 4 steps');
        console.log('  🎨 Brand Marketer - 4 steps');
        console.log('  🧲 Lead (unqualified) - 4 steps');
        console.log('\nEach playbook includes:');
        console.log('  - Immediate: Welcome email (AI-generated)');
        console.log('  - Day 3: Value/education email');
        console.log('  - Day 7: Engagement/demo email');
        console.log('  - Weekly: Nurture emails (recurring)');
        console.log('\nTrigger Events:');
        console.log('  - user.signup (age gate captures)');
        console.log('  - user.signup.platform (BakedBot.ai signups)');
        console.log('  - user.signup.lead (lead magnets)');
        console.log('\nNext Steps:');
        console.log('  1. Verify in Firestore: playbook_templates collection');
        console.log('  2. Update email-capture.ts to trigger events');
        console.log('  3. Create platform signup handler for user.signup.platform');
        console.log('  4. Test each playbook with test jobs');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Seed] Failed to seed playbooks:', { error });
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
