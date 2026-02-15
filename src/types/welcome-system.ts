/**
 * Welcome System Types
 *
 * Unified welcome email/SMS system for all signup contexts:
 * - Age gate leads (dispensary customers)
 * - Platform signups (BakedBot.ai users)
 * - Brand leads (brands interested in BakedBot)
 */

export type SignupContext =
    | 'age_gate'           // Customer age verification
    | 'platform_signup'    // BakedBot.ai account creation
    | 'brand_inquiry'      // Brand lead magnet (Academy, Vibe Studio)
    | 'demo_request'       // Demo/sales inquiry
    | 'referral'          // Referred by existing user
    | 'trial_signup';     // Free trial activation

export type UserSegment =
    | 'customer'          // Dispensary customer
    | 'super_user'        // BakedBot employee/admin
    | 'dispensary_owner'  // Dispensary operator
    | 'brand_marketer'    // Brand/agency marketer
    | 'lead';            // Unqualified lead

export interface WelcomeEmailContext {
    // Identity
    leadId?: string;
    userId?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;

    // Segmentation
    segment: UserSegment;
    signupContext: SignupContext;
    role?: string; // UserRole from Firebase claims

    // Organization Context
    brandId?: string;
    dispensaryId?: string;
    orgId?: string;
    state?: string;

    // Behavioral Signals
    source: string;          // Specific page/feature that triggered signup
    referrer?: string;       // HTTP referrer
    utmParams?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
    };
    pageVisited?: string;    // Last page before signup
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';

    // Personalization Data
    interests?: string[];    // Inferred from browsing
    priorVisits?: number;    // Returning visitor count
    lettaMemory?: any[];     // Prior interactions from Letta

    // Timing
    signupTimestamp: number;
    timezone?: string;

    // Offers & Incentives
    welcomeOffer?: {
        type: 'discount' | 'freebie' | 'credit';
        value: string; // "20% off", "$10 credit", etc.
        code?: string;
        expiresAt?: number;
    };
}

export interface WeeklyNurtureContext {
    userId: string;
    email: string;
    firstName?: string;
    segment: UserSegment;
    role?: string;

    // Engagement Data
    daysSinceSignup: number;
    lastActiveAt?: number;
    featureUsage?: Record<string, number>; // feature -> usage count
    completionRate?: number; // Onboarding completion %

    // Role-Specific Context
    dispensaryId?: string;
    brandId?: string;
    orgId?: string;

    // Content Preferences (from AI settings)
    preferredTone?: string;
    preferredLength?: 'concise' | 'detailed';
    topicsToAvoid?: string[];
}

export interface WelcomeEmailTemplate {
    subject: string;
    htmlBody: string;
    textBody: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
}

export interface NurtureEmailSeries {
    seriesId: string;
    name: string;
    segment: UserSegment;
    emails: {
        day: number; // Days after signup (0 = immediate, 3 = day 3, etc.)
        type: 'welcome' | 'value' | 'engagement' | 'retention' | 'winback';
        subject: string;
        generateContent: (context: WelcomeEmailContext | WeeklyNurtureContext) => Promise<WelcomeEmailTemplate>;
    }[];
}

/**
 * Welcome Email Playbook Configuration
 */
export interface WelcomePlaybookConfig {
    playbookId: string;
    name: string;
    description: string;
    segment: UserSegment;
    triggerEvent: string; // 'user.signup', 'user.signup.platform', etc.
    enabled: boolean;

    // Timing
    schedule: {
        immediate: boolean;   // Send welcome email immediately
        followUp: {          // Follow-up emails
            day3: boolean;   // Value email on day 3
            day7: boolean;   // Engagement email on day 7
            weekly: boolean; // Weekly nurture (every 7 days)
        };
    };

    // Content Generation
    aiGenerated: boolean;     // Use Claude to generate content
    templateId?: string;      // Or use static template
    personalizationLevel: 'basic' | 'contextual' | 'deep'; // How much to personalize

    // Channels
    channels: {
        email: boolean;
        sms: boolean;
        push?: boolean;
        dashboard?: boolean; // Show welcome message in dashboard
    };

    // Tracking
    trackOpens: boolean;
    trackClicks: boolean;
    trackConversions: boolean;
}

/**
 * Default Playbook Configurations for Each Segment
 */
export const DEFAULT_WELCOME_PLAYBOOKS: Record<UserSegment, WelcomePlaybookConfig> = {
    customer: {
        playbookId: 'welcome_customer',
        name: '🌿 Customer Welcome Series',
        description: 'Personalized welcome for dispensary customers',
        segment: 'customer',
        triggerEvent: 'user.signup',
        enabled: true,
        schedule: {
            immediate: true,
            followUp: {
                day3: true,
                day7: true,
                weekly: true,
            },
        },
        aiGenerated: true,
        personalizationLevel: 'deep',
        channels: {
            email: true,
            sms: true,
            dashboard: false,
        },
        trackOpens: true,
        trackClicks: true,
        trackConversions: true,
    },
    super_user: {
        playbookId: 'welcome_super_user',
        name: '🚀 Team Member Welcome',
        description: 'BakedBot team onboarding sequence',
        segment: 'super_user',
        triggerEvent: 'user.signup.platform',
        enabled: true,
        schedule: {
            immediate: true,
            followUp: {
                day3: true,
                day7: true,
                weekly: true, // Weekly company updates
            },
        },
        aiGenerated: true,
        personalizationLevel: 'contextual',
        channels: {
            email: true,
            sms: false,
            dashboard: true, // Show onboarding checklist
        },
        trackOpens: true,
        trackClicks: true,
        trackConversions: false,
    },
    dispensary_owner: {
        playbookId: 'welcome_dispensary',
        name: '💼 Dispensary Onboarding',
        description: 'Welcome sequence for dispensary operators',
        segment: 'dispensary_owner',
        triggerEvent: 'user.signup.platform',
        enabled: true,
        schedule: {
            immediate: true,
            followUp: {
                day3: true,  // Setup guide
                day7: true,  // Feature walkthrough
                weekly: true, // Weekly insights
            },
        },
        aiGenerated: true,
        personalizationLevel: 'deep',
        channels: {
            email: true,
            sms: true,
            dashboard: true,
        },
        trackOpens: true,
        trackClicks: true,
        trackConversions: true,
    },
    brand_marketer: {
        playbookId: 'welcome_brand',
        name: '🎨 Brand Partner Welcome',
        description: 'Welcome sequence for cannabis brands',
        segment: 'brand_marketer',
        triggerEvent: 'user.signup.platform',
        enabled: true,
        schedule: {
            immediate: true,
            followUp: {
                day3: true,  // Quick wins guide
                day7: true,  // Campaign ideas
                weekly: true, // Weekly marketing tips
            },
        },
        aiGenerated: true,
        personalizationLevel: 'deep',
        channels: {
            email: true,
            sms: false,
            dashboard: true,
        },
        trackOpens: true,
        trackClicks: true,
        trackConversions: true,
    },
    lead: {
        playbookId: 'welcome_lead',
        name: '🧲 Lead Nurture Series',
        description: 'Welcome sequence for unqualified leads',
        segment: 'lead',
        triggerEvent: 'user.signup.lead',
        enabled: true,
        schedule: {
            immediate: true,
            followUp: {
                day3: true,  // Educational content
                day7: true,  // Demo invitation
                weekly: true, // Weekly value emails
            },
        },
        aiGenerated: true,
        personalizationLevel: 'contextual',
        channels: {
            email: true,
            sms: false,
            dashboard: false,
        },
        trackOpens: true,
        trackClicks: true,
        trackConversions: true,
    },
};

/**
 * Weekly Nurture Email Topics by Segment
 */
export const WEEKLY_NURTURE_TOPICS: Record<UserSegment, string[]> = {
    customer: [
        'New product drops this week',
        'Exclusive member deals',
        'Cannabis education & tips',
        'Loyalty rewards update',
        'Upcoming events & specials',
    ],
    super_user: [
        'Company growth metrics',
        'Customer wins & testimonials',
        'Competitive intelligence updates',
        'Product roadmap progress',
        'Team celebrations & announcements',
    ],
    dispensary_owner: [
        'Inventory insights & trends',
        'Compliance updates',
        'Customer retention strategies',
        'Revenue optimization tips',
        'Industry news & regulations',
    ],
    brand_marketer: [
        'Campaign performance review',
        'Content creation ideas',
        'Partner spotlight',
        'Industry trends & insights',
        'Marketing automation wins',
    ],
    lead: [
        'Cannabis marketing 101',
        'Case studies & success stories',
        'Platform feature highlights',
        'Industry best practices',
        'Demo invitation & trial offer',
    ],
};
