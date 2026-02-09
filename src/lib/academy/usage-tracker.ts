/**
 * Academy Usage Tracker
 *
 * Client-side tracking for the public Academy.
 * Uses localStorage to track:
 * - Number of videos watched (max 3 free)
 * - Number of resources downloaded
 * - Whether email has been captured
 * - Session data for lead scoring
 */

import type { AcademyUsageData } from '@/types/academy';

const STORAGE_KEY = 'bakedbot_academy_usage';
const MAX_FREE_VIEWS = 3;

function generateSessionId(): string {
  return `academy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getDefaultUsageData(): AcademyUsageData {
  return {
    videosWatched: 0,
    resourcesDownloaded: 0,
    emailCaptured: false,
    sessionId: generateSessionId(),
    firstVisit: new Date().toISOString(),
    lastVisit: new Date().toISOString(),
    watchedContent: [],
  };
}

/**
 * Get current usage data from localStorage
 */
export function getAcademyUsage(): AcademyUsageData {
  if (typeof window === 'undefined') {
    return getDefaultUsageData();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaultData = getDefaultUsageData();
      // Capture UTM params on first visit
      const params = new URLSearchParams(window.location.search);
      defaultData.utmSource = params.get('utm_source') || undefined;
      defaultData.utmMedium = params.get('utm_medium') || undefined;
      defaultData.utmCampaign = params.get('utm_campaign') || undefined;
      saveAcademyUsage(defaultData);
      return defaultData;
    }
    const data = JSON.parse(stored) as AcademyUsageData;
    // Update last visit
    data.lastVisit = new Date().toISOString();
    return data;
  } catch {
    return getDefaultUsageData();
  }
}

/**
 * Save usage data to localStorage
 */
export function saveAcademyUsage(data: AcademyUsageData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Check if user can view content
 */
export function canViewContent(type: 'video' | 'resource' = 'video'): {
  allowed: boolean;
  reason?: 'limit_reached' | 'resource_requires_email';
  remaining: number;
} {
  const usage = getAcademyUsage();

  // If email captured, unlimited views
  if (usage.emailCaptured) {
    return {
      allowed: true,
      remaining: Infinity,
    };
  }

  // Resources always require email
  if (type === 'resource') {
    return {
      allowed: false,
      reason: 'resource_requires_email',
      remaining: Math.max(0, MAX_FREE_VIEWS - usage.videosWatched),
    };
  }

  // Check video view limit
  const remaining = Math.max(0, MAX_FREE_VIEWS - usage.videosWatched);
  if (usage.videosWatched >= MAX_FREE_VIEWS) {
    return {
      allowed: false,
      reason: 'limit_reached',
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining,
  };
}

/**
 * Record a content view (video or resource)
 */
export function recordContentView(content: {
  id: string;
  title: string;
  type: 'video' | 'resource';
}): AcademyUsageData {
  const usage = getAcademyUsage();

  if (content.type === 'video') {
    usage.videosWatched += 1;
  } else {
    usage.resourcesDownloaded += 1;
  }

  usage.watchedContent.push({
    ...content,
    viewedAt: new Date().toISOString(),
  });

  // Keep only last 20 items in storage
  if (usage.watchedContent.length > 20) {
    usage.watchedContent = usage.watchedContent.slice(-20);
  }

  usage.lastVisit = new Date().toISOString();
  saveAcademyUsage(usage);

  return usage;
}

/**
 * Record email capture - grants unlimited access
 */
export function recordEmailCapture(email: string, leadId: string): AcademyUsageData {
  const usage = getAcademyUsage();
  usage.emailCaptured = true;
  usage.capturedEmail = email;
  usage.leadId = leadId;
  usage.lastVisit = new Date().toISOString();
  saveAcademyUsage(usage);
  return usage;
}

/**
 * Check if email has been captured
 */
export function hasProvidedEmail(): boolean {
  const usage = getAcademyUsage();
  return usage.emailCaptured;
}

/**
 * Get captured email if exists
 */
export function getCapturedEmail(): string | undefined {
  const usage = getAcademyUsage();
  return usage.capturedEmail;
}

/**
 * Get lead ID if exists
 */
export function getLeadId(): string | undefined {
  const usage = getAcademyUsage();
  return usage.leadId;
}

/**
 * Get UTM parameters
 */
export function getUtmParams(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  const usage = getAcademyUsage();
  return {
    utmSource: usage.utmSource,
    utmMedium: usage.utmMedium,
    utmCampaign: usage.utmCampaign,
  };
}

/**
 * Get usage stats for display
 */
export function getUsageStats(): {
  videosWatched: number;
  resourcesDownloaded: number;
  viewsRemaining: number;
  maxFreeViews: number;
  emailCaptured: boolean;
  showEmailGate: boolean;
} {
  const usage = getAcademyUsage();
  const remaining = usage.emailCaptured
    ? Infinity
    : Math.max(0, MAX_FREE_VIEWS - usage.videosWatched);

  return {
    videosWatched: usage.videosWatched,
    resourcesDownloaded: usage.resourcesDownloaded,
    viewsRemaining: remaining,
    maxFreeViews: MAX_FREE_VIEWS,
    emailCaptured: usage.emailCaptured,
    showEmailGate: remaining === 0,
  };
}

/**
 * Get remaining view count
 */
export function getRemainingViews(): number {
  const usage = getAcademyUsage();
  if (usage.emailCaptured) return Infinity;
  return Math.max(0, MAX_FREE_VIEWS - usage.videosWatched);
}

/**
 * Get session ID
 */
export function getSessionId(): string {
  const usage = getAcademyUsage();
  return usage.sessionId;
}

/**
 * Get watched video IDs
 */
export function getWatchedVideoIds(): string[] {
  const usage = getAcademyUsage();
  return usage.watchedContent
    .filter((item) => item.type === 'video')
    .map((item) => item.id);
}

/**
 * Get downloaded resource IDs
 */
export function getDownloadedResourceIds(): string[] {
  const usage = getAcademyUsage();
  return usage.watchedContent
    .filter((item) => item.type === 'resource')
    .map((item) => item.id);
}

/**
 * Check if specific video has been watched
 */
export function hasWatchedVideo(videoId: string): boolean {
  return getWatchedVideoIds().includes(videoId);
}

/**
 * Check if specific resource has been downloaded
 */
export function hasDownloadedResource(resourceId: string): boolean {
  return getDownloadedResourceIds().includes(resourceId);
}

/**
 * Calculate visit count (approximation based on session)
 */
export function getVisitCount(): number {
  const usage = getAcademyUsage();
  // Simple heuristic: if last visit was >1 day ago, count as new visit
  const lastVisit = new Date(usage.lastVisit);
  const now = new Date();
  const hoursSinceLastVisit = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60);

  // If been away for 24h+, this is effectively a return visit
  return hoursSinceLastVisit > 24 ? 2 : 1;
}

/**
 * Get total watch time (in seconds) - estimated from video count
 * Real watch time tracking happens server-side
 */
export function getEstimatedWatchTime(): number {
  const usage = getAcademyUsage();
  // Estimate: average 12 minutes per video
  return usage.videosWatched * 12 * 60;
}

/**
 * Reset usage (for testing)
 */
export function resetAcademyUsage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// ALIASES for convenience
// ============================================

/**
 * Alias for getAcademyUsage
 */
export const getUsageData = getAcademyUsage;

/**
 * Alias for hasProvidedEmail
 */
export const hasEmailCaptured = hasProvidedEmail;
