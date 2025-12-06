/**
 * Error Reporting & Support Ticket System
 * AI-powered screenshot analysis for error detection
 */

// ============================================
// ERROR TICKETS
// ============================================

export type TicketStatus = 'new' | 'triaging' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'bug' | 'feature_request' | 'question' | 'integration_issue' | 'billing' | 'other';

export interface ErrorTicket {
    id: string;

    // User info
    reportedBy: string;
    reporterEmail: string;
    orgId: string;
    orgName?: string;
    userRole: 'brand' | 'dispensary' | 'owner';

    // Error details
    title: string;
    description: string;
    aiGeneratedDescription?: string; // AI analysis of screenshot

    // Screenshot
    screenshotUrl: string;
    screenshotBase64?: string; // For quick preview

    // Context
    pageUrl: string;
    userAgent: string;
    viewport: { width: number; height: number };
    timestamp: Date;

    // Technical details (auto-captured)
    errorStack?: string;
    consoleErrors?: string[];
    networkErrors?: {
        url: string;
        status: number;
        message: string;
    }[];

    // AI Analysis
    aiAnalysis?: {
        suggestedCategory: TicketCategory;
        suggestedPriority: TicketPriority;
        possibleCauses: string[];
        suggestedFixes: string[];
        relatedComponents: string[];
        confidence: number;
    };

    // Status
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;

    // Assignment
    assignedTo?: string;

    // Resolution
    resolution?: string;
    fixedInVersion?: string;

    // Tracking
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;

    // Comments
    comments: TicketComment[];
}

export interface TicketComment {
    id: string;
    ticketId: string;
    author: string;
    authorType: 'user' | 'admin' | 'ai';
    content: string;
    attachmentUrl?: string;
    createdAt: Date;
}

// ============================================
// ERROR REPORTER COMPONENT CONFIG
// ============================================

export interface ErrorReporterConfig {
    enabled: boolean;
    showFloatingButton: boolean;
    captureConsoleErrors: boolean;
    captureNetworkErrors: boolean;
    autoCapture500Errors: boolean;
    keyboardShortcut: string; // e.g., "ctrl+shift+e"
}

export const DEFAULT_ERROR_REPORTER_CONFIG: ErrorReporterConfig = {
    enabled: true,
    showFloatingButton: true,
    captureConsoleErrors: true,
    captureNetworkErrors: true,
    autoCapture500Errors: true,
    keyboardShortcut: 'ctrl+shift+e'
};

// ============================================
// AI PROMPT FOR SCREENSHOT ANALYSIS
// ============================================

export const SCREENSHOT_ANALYSIS_PROMPT = `
Analyze this screenshot of an error in the BakedBot platform.

Provide:
1. A clear, concise title for this issue (max 10 words)
2. A detailed description of what appears to be wrong
3. The likely category: bug, feature_request, question, integration_issue, billing, other
4. Priority level: low, medium, high, critical
5. Possible causes (list 2-3)
6. Suggested fixes (list 2-3)
7. Which UI components or features are affected

Format as JSON.
`;

// ============================================
// TICKET ANALYTICS
// ============================================

export interface TicketAnalytics {
    period: 'day' | 'week' | 'month';

    // Counts
    totalTickets: number;
    newTickets: number;
    resolvedTickets: number;
    openTickets: number;

    // By category
    byCategory: Record<TicketCategory, number>;

    // By priority
    byPriority: Record<TicketPriority, number>;

    // Performance
    avgResolutionTimeHours: number;
    avgFirstResponseTimeHours: number;

    // Top issues
    topIssues: {
        component: string;
        count: number;
        trend: 'up' | 'down' | 'stable';
    }[];

    generatedAt: Date;
}

// ============================================
// FELISHA - MEETING BOT PERSONA
// ============================================

export const FELISHA_CONFIG = {
    name: 'Felisha',
    fullName: 'Felisha from BakedBot',
    role: 'Meeting Assistant',
    avatar: '/avatars/felisha.png',

    // Default messages
    joinMessage: "Hi everyone! I'm Felisha from BakedBot. I'll be taking notes and generating action items. Is everyone okay with that?",
    thankYouMessage: "Thanks for a great meeting! I'll send notes to everyone shortly.",

    // Personality
    personality: 'Professional, efficient, and friendly. Gets straight to the point while maintaining warmth.',

    // Capabilities
    capabilities: [
        'Real-time transcription',
        'Speaker identification',
        'Action item extraction',
        'Decision tracking',
        'Playbook recommendations',
        'Follow-up scheduling'
    ]
};
