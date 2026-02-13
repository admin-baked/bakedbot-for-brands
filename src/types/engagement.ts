/**
 * Customer Engagement & Autoresponder System
 * Usage-based email sequences, gamification, and referral rewards
 */

// ============================================
// AUTORESPONDER SYSTEM
// ============================================

export type EmailTrigger =
    | 'signup'
    | 'first_agent_use'
    | 'first_playbook_created'
    | 'weekly_digest'
    | 'usage_milestone'
    | 'inactive_3_days'
    | 'inactive_7_days'
    | 'feature_unused'
    | 'upgrade_eligible'
    | 'company_update';

export type UserSegment =
    | 'new_user'
    | 'active_user'
    | 'power_user'
    | 'at_risk'
    | 'churned'
    | 'free_tier'
    | 'paid_tier';

export interface AutoresponderEmail {
    id: string;
    name: string;
    subject: string;
    previewText: string;
    htmlContent: string;

    // Targeting
    trigger: EmailTrigger;
    segments: UserSegment[];
    delayHours: number; // After trigger

    // Conditions
    conditions?: {
        hasUsedFeature?: string;
        hasNotUsedFeature?: string;
        minAgentCalls?: number;
        maxAgentCalls?: number;
        planType?: string[];
    };

    // Schedule
    sendDays?: number[]; // 0=Sun, 6=Sat (for weekly emails)
    preferredTimeUtc?: string; // "14:00"

    status: 'draft' | 'active' | 'paused';
    createdAt: Date;
    updatedAt: Date;
}

export interface AutoresponderSequence {
    id: string;
    name: string;
    description: string;

    // Emails in sequence
    emails: {
        emailId: string;
        order: number;
        delayDays: number; // After previous email
    }[];

    // Entry criteria
    entryTrigger: EmailTrigger;
    entrySegments: UserSegment[];

    // Exit criteria
    exitOnUpgrade?: boolean;
    exitOnUnsubscribe?: boolean;
    maxEmails?: number;

    status: 'active' | 'paused';
}

export interface EmailSendLog {
    id: string;
    emailId: string;
    userId: string;
    orgId: string;

    sentAt: Date;
    openedAt?: Date;
    clickedAt?: Date;
    unsubscribedAt?: Date;

    // Tracking
    opens: number;
    clicks: number;
    linkClicks: Record<string, number>;
}

// ============================================
// GAMIFICATION SYSTEM
// ============================================

export type BadgeCategory = 'usage' | 'mastery' | 'social' | 'milestone' | 'special';

export interface Badge {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    category: BadgeCategory;

    // Unlock criteria
    criteria: {
        type: 'agent_calls' | 'playbooks_created' | 'referrals' | 'streak_days' | 'feature_used' | 'artifacts_shared';
        threshold: number;
        featureId?: string;
    };

    // Rewards
    pointsAwarded: number;
    unlockMessage: string;

    // Rarity
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface UserBadge {
    badgeId: string;
    userId: string;
    unlockedAt: Date;
    notified: boolean;
}

export interface UserStreak {
    userId: string;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: Date;
}

export interface UserPoints {
    userId: string;
    totalPoints: number;
    currentTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

    pointsHistory: {
        action: string;
        points: number;
        earnedAt: Date;
    }[];
}

export interface Leaderboard {
    period: 'weekly' | 'monthly' | 'all_time';
    entries: {
        rank: number;
        userId: string;
        displayName: string;
        points: number;
        badges: number;
    }[];
    generatedAt: Date;
}

// ============================================
// REFERRAL SYSTEM
// ============================================

export type ReferralStatus = 'pending' | 'signed_up' | 'activated' | 'converted' | 'rewarded';

export interface ReferralProgram {
    id: string;
    name: string;

    // Rewards
    referrerReward: {
        type: 'credit' | 'points' | 'free_month' | 'discount_percent';
        amount: number;
    };
    refereeReward: {
        type: 'credit' | 'points' | 'free_month' | 'discount_percent';
        amount: number;
    };

    // Rules
    maxReferralsPerUser: number;
    requireActivation: boolean; // Must use product before reward
    requirePaid: boolean; // Must upgrade to paid before reward

    status: 'active' | 'paused';
}

export interface ReferralLink {
    id: string;
    code: string; // e.g., "JOHN50"
    userId: string; // Referrer

    // Tracking
    clicks: number;
    signups: number;
    conversions: number;

    // Rewards earned
    totalRewardsEarned: number;

    createdAt: Date;
}

export interface Referral {
    id: string;
    referrerId: string;
    refereeId: string;
    referralCode: string;

    status: ReferralStatus;

    // Timestamps
    clickedAt: Date;
    signedUpAt?: Date;
    activatedAt?: Date;
    convertedAt?: Date;
    rewardedAt?: Date;

    // Rewards
    referrerRewardAmount?: number;
    refereeRewardAmount?: number;
}

// ============================================
// ARTIFACT SHARING (Viral Loops)
// ============================================

export interface ShareableArtifact {
    id: string;
    type: 'report' | 'playbook' | 'dashboard' | 'insight' | 'recommendation';
    title: string;

    // Content
    content: Record<string, unknown>;
    thumbnailUrl?: string;

    // Sharing
    shareUrl: string;
    shareCode: string;

    // Creator
    createdBy: string;
    orgId: string;

    // Settings
    isPublic: boolean;
    allowCopy: boolean; // Others can duplicate

    // Tracking
    views: number;
    copies: number;
    referralSignups: number;

    createdAt: Date;
    expiresAt?: Date;
}

export interface ArtifactShare {
    artifactId: string;
    sharedBy: string;
    sharedTo: 'twitter' | 'linkedin' | 'email' | 'link_copy';
    sharedAt: Date;
    resultedInSignup: boolean;
    newUserId?: string;
}

// ============================================
// DEFAULT EMAIL TEMPLATES
// ============================================

export const DEFAULT_AUTORESPONDER_EMAILS: Partial<AutoresponderEmail>[] = [
    {
        name: 'Welcome to BakedBot',
        trigger: 'signup',
        subject: 'Welcome to BakedBot! Let\'s get you started 🚀',
        delayHours: 0,
        segments: ['new_user']
    },
    {
        name: 'Day 2: Meet Your AI Agents',
        trigger: 'signup',
        subject: 'Meet Smokey, Craig, and the AI team ready to help',
        delayHours: 24,
        segments: ['new_user']
    },
    {
        name: 'Day 4: Create Your First Playbook',
        trigger: 'signup',
        subject: 'Automate your first workflow in 5 minutes',
        delayHours: 96,
        segments: ['new_user'],
        conditions: { hasNotUsedFeature: 'playbook_created' }
    },
    {
        name: 'Weekly Insights Digest',
        trigger: 'weekly_digest',
        subject: 'Your weekly AI insights from BakedBot',
        delayHours: 0,
        sendDays: [1, 4], // Monday & Thursday
        segments: ['active_user', 'power_user']
    },
    {
        name: 'We Miss You',
        trigger: 'inactive_7_days',
        subject: 'Your AI agents are waiting for you',
        delayHours: 0,
        segments: ['at_risk']
    }
];

// ============================================
// DEFAULT BADGES
// ============================================

export const DEFAULT_BADGES: Partial<Badge>[] = [
    {
        id: 'first_chat',
        name: 'First Steps',
        description: 'Made your first agent request',
        category: 'usage',
        criteria: { type: 'agent_calls', threshold: 1 },
        rarity: 'common',
        pointsAwarded: 10
    },
    {
        id: 'automation_wizard',
        name: 'Automation Wizard',
        description: 'Created 5 playbooks',
        category: 'mastery',
        criteria: { type: 'playbooks_created', threshold: 5 },
        rarity: 'uncommon',
        pointsAwarded: 50
    },
    {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Referred 3 friends',
        category: 'social',
        criteria: { type: 'referrals', threshold: 3 },
        rarity: 'rare',
        pointsAwarded: 100
    },
    {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Used BakedBot 30 days in a row',
        category: 'milestone',
        criteria: { type: 'streak_days', threshold: 30 },
        rarity: 'epic',
        pointsAwarded: 200
    },
    {
        id: 'influencer',
        name: 'Influencer',
        description: 'Shared an artifact that got 100+ views',
        category: 'social',
        criteria: { type: 'artifacts_shared', threshold: 100 },
        rarity: 'legendary',
        pointsAwarded: 500
    }
];
