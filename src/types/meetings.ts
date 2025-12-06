/**
 * AI Meeting Assistant System
 * Agents attend meetings, take notes, and generate playbook recommendations
 * Available on paid plans only
 */

// ============================================
// MEETING CONFIGURATION
// ============================================

export type MeetingPlatform = 'google_meet' | 'zoom' | 'microsoft_teams' | 'webex';
export type MeetingStatus = 'scheduled' | 'joining' | 'in_progress' | 'processing' | 'completed' | 'failed';
export type MeetingType = 'sales_call' | 'vendor_meeting' | 'team_standup' | 'strategy' | 'customer_support' | 'training' | 'other';

export interface MeetingConnection {
    id: string;
    platform: MeetingPlatform;

    // OAuth connection
    connected: boolean;
    accountEmail?: string;
    accessToken?: string; // Encrypted
    refreshToken?: string; // Encrypted
    tokenExpiresAt?: Date;

    // Permissions
    canJoinMeetings: boolean;
    canRecordAudio: boolean;
    canAccessCalendar: boolean;

    connectedAt?: Date;
    orgId: string;
}

export interface ScheduledMeeting {
    id: string;
    title: string;
    description?: string;

    // Platform info
    platform: MeetingPlatform;
    meetingUrl: string;
    meetingId?: string;
    passcode?: string;

    // Schedule
    scheduledStart: Date;
    scheduledEnd: Date;
    timezone: string;

    // Participants
    organizer: string;
    participants: {
        email: string;
        name?: string;
        role?: 'host' | 'co-host' | 'participant';
    }[];

    // AI attendance config
    agentAttending: boolean;
    assignedAgent: 'felisha' | 'craig' | 'pops' | 'money_mike' | 'auto';
    meetingType: MeetingType;

    // Context for agent
    context?: {
        relatedCustomerId?: string;
        relatedOrderId?: string;
        relatedProductIds?: string[];
        preMeetingBrief?: string;
    };

    // Status
    status: MeetingStatus;

    // Calendar sync
    calendarEventId?: string;
    calendarSource?: 'google' | 'outlook' | 'manual';

    createdAt: Date;
    updatedAt: Date;
    orgId: string;
}

// ============================================
// MEETING NOTES & TRANSCRIPTION
// ============================================

export interface MeetingTranscript {
    id: string;
    meetingId: string;

    // Full transcript
    segments: {
        speaker: string;
        speakerId?: string;
        text: string;
        startTime: number; // seconds from start
        endTime: number;
        confidence: number;
    }[];

    // Audio/video info
    audioUrl?: string;
    videUrl?: string;
    duration: number; // seconds

    // Processing
    language: string;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';

    createdAt: Date;
    orgId: string;
}

export interface MeetingNotes {
    id: string;
    meetingId: string;

    // AI-generated summary
    summary: string;

    // Key points
    keyPoints: {
        topic: string;
        details: string;
        importance: 'high' | 'medium' | 'low';
        timestamp?: number;
    }[];

    // Decisions made
    decisions: {
        decision: string;
        madeBy?: string;
        context: string;
    }[];

    // Action items
    actionItems: {
        task: string;
        assignedTo?: string;
        dueDate?: Date;
        priority: 'high' | 'medium' | 'low';
        status: 'pending' | 'in_progress' | 'completed';
    }[];

    // Questions raised
    questions: {
        question: string;
        askedBy?: string;
        answered: boolean;
        answer?: string;
    }[];

    // Sentiment analysis
    overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';

    createdAt: Date;
    orgId: string;
}

// ============================================
// PLAYBOOK RECOMMENDATIONS
// ============================================

export interface MeetingRecommendation {
    id: string;
    meetingId: string;

    // Recommendation
    title: string;
    description: string;
    rationale: string;

    // Type
    type: 'playbook' | 'task' | 'alert' | 'follow_up';

    // Suggested playbook
    suggestedPlaybook?: {
        name: string;
        description: string;
        triggers: string[];
        estimatedImpact: string;
        yamlTemplate: string;
    };

    // Suggested task
    suggestedTask?: {
        title: string;
        description: string;
        dueDate?: Date;
        assignTo?: string;
    };

    // Priority & confidence
    priority: 'high' | 'medium' | 'low';
    confidence: number; // 0-100

    // Source
    sourceQuotes: {
        text: string;
        speaker: string;
        timestamp: number;
    }[];

    // Status
    status: 'new' | 'accepted' | 'dismissed' | 'implemented';
    implementedPlaybookId?: string;

    createdAt: Date;
    orgId: string;
}

// ============================================
// MEETING INSIGHTS
// ============================================

export interface MeetingInsights {
    meetingId: string;

    // Participation
    participationStats: {
        speaker: string;
        talkTimeSeconds: number;
        talkTimePercent: number;
        interruptionCount: number;
    }[];

    // Topics discussed
    topics: {
        topic: string;
        timeSpent: number; // seconds
        sentiment: 'positive' | 'neutral' | 'negative';
    }[];

    // Key entities mentioned
    entities: {
        type: 'product' | 'competitor' | 'customer' | 'price' | 'date' | 'person';
        value: string;
        mentions: number;
        context: string;
    }[];

    // Follow-up suggestions
    followUpSuggestions: string[];

    // Meeting quality
    qualityScore: number; // 0-100
    qualityNotes: string[];

    createdAt: Date;
}

// ============================================
// FEATURE GATING
// ============================================

export const MEETING_FEATURE_GATES = {
    // Free plan - no access
    free: {
        enabled: false,
        maxMeetingsPerMonth: 0,
        transcription: false,
        recommendations: false,
    },
    // Pro plan - limited
    pro: {
        enabled: true,
        maxMeetingsPerMonth: 10,
        transcription: true,
        recommendations: true,
        maxTranscriptMinutes: 60,
    },
    // Enterprise - unlimited
    enterprise: {
        enabled: true,
        maxMeetingsPerMonth: -1, // Unlimited
        transcription: true,
        recommendations: true,
        maxTranscriptMinutes: -1, // Unlimited
        customAgentPersonality: true,
        apiAccess: true,
    }
};

export type PlanType = keyof typeof MEETING_FEATURE_GATES;

// ============================================
// CALENDAR INTEGRATIONS
// ============================================

export interface CalendarIntegration {
    id: string;
    provider: 'google' | 'outlook' | 'apple';

    // Connection
    accountEmail: string;
    connected: boolean;
    accessToken?: string;
    refreshToken?: string;

    // Sync settings
    autoImportMeetings: boolean;
    autoAttendNewMeetings: boolean;
    excludePatterns: string[]; // e.g., "1:1", "Personal"

    // Sync status
    lastSyncAt?: Date;
    syncErrors?: string[];

    connectedAt: Date;
    orgId: string;
}

// ============================================
// BOT PERSONA FOR MEETINGS
// ============================================

export interface MeetingBotPersona {
    id: string;
    orgId: string;

    // Display
    botName: string; // e.g., "Smokey from BakedBot"
    avatarUrl?: string;

    // Behavior
    announceJoin: boolean;
    joinMessage?: string;

    // Recording consent
    requestRecordingConsent: boolean;
    consentMessage?: string;

    // Focus areas by meeting type
    focusAreas: {
        meetingType: MeetingType;
        priorities: string[];
        customPrompt?: string;
    }[];

    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// DEFAULT MEETING AGENT PROMPTS
// ============================================

export const MEETING_AGENT_PROMPTS: Record<MeetingType, string> = {
    sales_call: `Focus on: pricing discussions, competitor mentions, objections raised, 
                 commitment signals, next steps agreed, and decision-maker involvement.`,

    vendor_meeting: `Focus on: contract terms, pricing negotiations, delivery timelines, 
                     quality concerns, relationship health, and action items.`,

    team_standup: `Focus on: blockers mentioned, progress updates, resource needs, 
                   timeline risks, and cross-team dependencies.`,

    strategy: `Focus on: strategic decisions, market insights, competitive positioning, 
               resource allocation, and long-term goals discussed.`,

    customer_support: `Focus on: issues raised, resolution provided, customer sentiment, 
                       escalation needs, and follow-up required.`,

    training: `Focus on: key concepts covered, questions asked, confusion points, 
               hands-on exercises, and knowledge gaps identified.`,

    other: `Focus on: key decisions, action items, important deadlines, 
            participants' concerns, and follow-up needs.`
};
