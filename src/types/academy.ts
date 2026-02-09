/**
 * Type definitions for the Cannabis Marketing AI Academy
 *
 * The Academy serves as BakedBot's lead generation engine and thought leadership platform.
 * It features 12 episodes organized by agent tracks, with progressive email gating for lead capture.
 */

export interface AcademyLead {
  id: string;
  email: string;
  firstName?: string;
  phone?: string;
  company?: string;

  // Engagement tracking
  videosWatched: number;
  resourcesDownloaded: number;
  completedTracks: string[];

  // Intent signals & scoring
  intentSignals: string[];
  leadScore: number;
  highIntent: boolean;

  // Attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  // Status
  status: 'new' | 'welcomed' | 'nurtured' | 'demo_booked' | 'converted';
  marketingOptIn: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

export type AgentTrack =
  | 'smokey'      // Product recommendations
  | 'craig'       // Marketing campaigns
  | 'pops'        // Inventory management
  | 'ezal'        // Competitive intelligence
  | 'money-mike'  // Revenue optimization
  | 'mrs-parker'  // Customer retention
  | 'deebo';      // Compliance

export interface AcademyEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  description: string;
  track: AgentTrack | 'general';
  youtubeId: string; // Placeholder: 'PLACEHOLDER' until video ready
  duration: number; // in seconds
  learningObjectives: string[];
  resources: AcademyResource[];
  requiresEmail: boolean;
}

export interface AcademyResource {
  id: string;
  title: string;
  description: string;
  type: 'checklist' | 'template' | 'guide';
  downloadUrl: string; // Firebase Storage path
  fileType: 'pdf' | 'xlsx' | 'docx';
  requiresEmail: boolean;
}

export interface AgentTrackInfo {
  name: string;
  tagline: string;
  description: string;
  color: string; // Hex color for UI
  icon: string;
  modules: number;
}

export interface AcademyUsageData {
  // Usage tracking
  videosWatched: number;
  resourcesDownloaded: number;

  // Email capture
  emailCaptured: boolean;
  capturedEmail?: string;
  leadId?: string;

  // Session info
  sessionId: string;
  firstVisit: string;
  lastVisit: string;

  // Content viewed
  watchedContent: Array<{
    id: string;
    title: string;
    type: 'video' | 'resource';
    viewedAt: string;
  }>;

  // UTM tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface AcademyProgress {
  userId: string;
  email: string;

  // Progress tracking
  videosWatched: string[]; // Episode IDs
  resourcesDownloaded: string[]; // Resource IDs
  completedTracks: string[]; // Track IDs
  currentEpisode?: string;

  // Achievements
  badges: string[]; // e.g., 'completed-smokey-track'
  certificateEarned: boolean;
  certificateIssuedAt?: Date;

  // Timestamps
  enrolledAt: Date;
  lastActivityAt: Date;
  totalWatchTime: number; // seconds
}

export const INTENT_SIGNALS = {
  VIDEO_BINGE: 'video_binge',           // 3+ videos in session
  MULTIPLE_DOWNLOADS: 'multiple_downloads', // 2+ resources
  DEMO_INTEREST: 'demo_interest',        // Clicked demo CTA
  HIGH_ENGAGEMENT: 'high_engagement',    // >30 min watch time
  RETURN_VISITOR: 'return_visitor',      // 2+ sessions
  COMPLETED_TRACK: 'completed_track',    // Watched all in track
} as const;

export type IntentSignal = typeof INTENT_SIGNALS[keyof typeof INTENT_SIGNALS];

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface AcademyAnalytics {
  // Overview metrics
  totalLeads: number;
  totalVideoViews: number;
  totalDownloads: number;
  totalDemoRequests: number;

  // Growth trends (vs previous period)
  leadGrowth: number;
  videoGrowth: number;
  downloadGrowth: number;
  demoGrowth: number;

  // Conversion funnel
  funnel: {
    visitors: number;
    videoViews: number;
    emailCaptures: number;
    demoRequests: number;
    conversions: number;
  };

  // Popular content
  popularEpisodes: Array<{
    episodeId: string;
    title: string;
    views: number;
    avgWatchTime: number;
    completionRate: number;
  }>;

  popularResources: Array<{
    resourceId: string;
    title: string;
    downloads: number;
    type: string;
  }>;

  // High-intent leads
  highIntentLeads: Array<{
    id: string;
    email: string;
    firstName?: string;
    leadScore: number;
    videosWatched: number;
    resourcesDownloaded: number;
    intentSignals: string[];
  }>;

  // Lead score distribution
  leadScoreDistribution: {
    '0-24': number;
    '25-49': number;
    '50-74': number;
    '75-100': number;
  };
}
