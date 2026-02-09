'use server';

/**
 * Academy Server Actions
 *
 * Handles lead capture, video view tracking, and resource download tracking
 * for the Cannabis Marketing AI Academy.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { AcademyLead, IntentSignal } from '@/types/academy';
import { INTENT_SIGNALS } from '@/types/academy';
import { Timestamp } from '@google-cloud/firestore';
import { sendAcademyWelcomeEmail } from '@/server/services/academy-welcome';

const ACADEMY_LEADS_COLLECTION = 'academy_leads';
const ACADEMY_VIEWS_COLLECTION = 'academy_views';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const LeadCaptureSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  marketingOptIn: z.boolean().default(false),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

const VideoViewSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  leadId: z.string().optional(),
  watchDuration: z.number().min(0).optional(),
  completionRate: z.number().min(0).max(100).optional(),
});

const ResourceDownloadSchema = z.object({
  resourceId: z.string().min(1, 'Resource ID is required'),
  leadId: z.string().min(1, 'Lead ID is required'),
});

// ============================================
// LEAD CAPTURE
// ============================================

export interface CaptureAcademyLeadInput {
  email: string;
  firstName?: string;
  phone?: string;
  company?: string;
  marketingOptIn?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Capture a new Academy lead or update existing lead
 */
export async function captureAcademyLead(
  input: CaptureAcademyLeadInput
): Promise<{ success: boolean; leadId?: string; isNewLead?: boolean; error?: string }> {
  try {
    // Validate input
    const validated = LeadCaptureSchema.parse(input);
    const email = validated.email.toLowerCase().trim();

    const db = getAdminFirestore();

    // Check if lead already exists
    const existingQuery = await db
      .collection(ACADEMY_LEADS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();

    const now = Timestamp.now();

    if (!existingQuery.empty) {
      // Update existing lead
      const existingDoc = existingQuery.docs[0];
      const existingData = existingDoc.data();

      const updates: Record<string, any> = {
        updatedAt: now,
        lastActivityAt: now,
      };

      // Update fields if provided and not already set
      if (validated.firstName && !existingData.firstName) {
        updates.firstName = validated.firstName;
      }
      if (validated.phone && !existingData.phone) {
        updates.phone = validated.phone;
      }
      if (validated.company && !existingData.company) {
        updates.company = validated.company;
      }
      if (validated.marketingOptIn !== undefined) {
        updates.marketingOptIn = validated.marketingOptIn;
      }

      await existingDoc.ref.update(updates);

      logger.info('[ACADEMY] Updated existing lead', {
        email,
        leadId: existingDoc.id,
      });

      return { success: true, leadId: existingDoc.id, isNewLead: false };
    }

    // Create new lead
    const id = uuidv4();
    const newLead = {
      id,
      email,
      firstName: validated.firstName || null,
      phone: validated.phone || null,
      company: validated.company || null,

      // Engagement tracking
      videosWatched: 0,
      resourcesDownloaded: 0,
      completedTracks: [],

      // Intent signals & scoring
      intentSignals: [],
      leadScore: 0,
      highIntent: false,

      // Attribution
      utmSource: validated.utmSource || null,
      utmMedium: validated.utmMedium || null,
      utmCampaign: validated.utmCampaign || null,

      // Status
      status: 'new',
      marketingOptIn: validated.marketingOptIn,

      // Timestamps
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    await db.collection(ACADEMY_LEADS_COLLECTION).doc(id).set(newLead);

    logger.info('[ACADEMY] Created new lead', {
      email,
      leadId: id,
      utmSource: validated.utmSource,
    });

    // Send welcome email via Mrs. Parker (non-blocking)
    sendAcademyWelcomeEmail({
      leadId: id,
      email,
      firstName: validated.firstName,
      company: validated.company,
      utmSource: validated.utmSource,
      utmMedium: validated.utmMedium,
      utmCampaign: validated.utmCampaign,
    }).catch((error) => {
      logger.error('[ACADEMY] Failed to send welcome email (non-fatal)', {
        leadId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return { success: true, leadId: id, isNewLead: true };
  } catch (error) {
    logger.error('[ACADEMY] Failed to capture lead', { error });

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: 'Failed to capture lead' };
  }
}

// ============================================
// VIDEO VIEW TRACKING
// ============================================

export interface TrackVideoViewInput {
  contentId: string;
  sessionId: string;
  leadId?: string;
  watchDuration?: number;
  completionRate?: number;
}

/**
 * Track a video view
 */
export async function trackVideoView(
  input: TrackVideoViewInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const validated = VideoViewSchema.parse(input);

    const db = getAdminFirestore();
    const now = Timestamp.now();

    // Create view record
    const viewId = uuidv4();
    const viewData = {
      id: viewId,
      leadId: validated.leadId || null,
      sessionId: validated.sessionId,
      contentId: validated.contentId,
      contentType: 'video',
      watchDuration: validated.watchDuration || null,
      completionRate: validated.completionRate || null,
      createdAt: now,
    };

    await db.collection(ACADEMY_VIEWS_COLLECTION).doc(viewId).set(viewData);

    // Update lead's videos watched count and intent signals
    if (validated.leadId) {
      await updateLeadEngagement(validated.leadId, 'video');
    }

    logger.info('[ACADEMY] Tracked video view', {
      contentId: validated.contentId,
      leadId: validated.leadId,
      completionRate: validated.completionRate,
    });

    return { success: true };
  } catch (error) {
    logger.error('[ACADEMY] Failed to track video view', { error });

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: 'Failed to track video view' };
  }
}

// ============================================
// RESOURCE DOWNLOAD TRACKING
// ============================================

export interface TrackResourceDownloadInput {
  resourceId: string;
  leadId: string;
}

/**
 * Track a resource download
 */
export async function trackResourceDownload(
  input: TrackResourceDownloadInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const validated = ResourceDownloadSchema.parse(input);

    const db = getAdminFirestore();
    const now = Timestamp.now();

    // Create view record
    const viewId = uuidv4();
    const viewData = {
      id: viewId,
      leadId: validated.leadId,
      sessionId: '', // No session for downloads (always authenticated)
      contentId: validated.resourceId,
      contentType: 'resource',
      createdAt: now,
    };

    await db.collection(ACADEMY_VIEWS_COLLECTION).doc(viewId).set(viewData);

    // Update lead's resources downloaded count and intent signals
    await updateLeadEngagement(validated.leadId, 'resource');

    logger.info('[ACADEMY] Tracked resource download', {
      resourceId: validated.resourceId,
      leadId: validated.leadId,
    });

    return { success: true };
  } catch (error) {
    logger.error('[ACADEMY] Failed to track resource download', { error });

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: 'Failed to track resource download' };
  }
}

// ============================================
// LEAD ENGAGEMENT & SCORING
// ============================================

/**
 * Update lead engagement metrics and intent signals
 */
async function updateLeadEngagement(
  leadId: string,
  type: 'video' | 'resource'
): Promise<void> {
  const db = getAdminFirestore();
  const leadRef = db.collection(ACADEMY_LEADS_COLLECTION).doc(leadId);

  try {
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) {
      logger.warn('[ACADEMY] Lead not found for engagement update', { leadId });
      return;
    }

    const leadData = leadDoc.data();
    const now = Timestamp.now();

    const updates: Record<string, any> = {
      lastActivityAt: now,
      updatedAt: now,
    };

    // Increment counts
    if (type === 'video') {
      updates.videosWatched = (leadData?.videosWatched || 0) + 1;
    } else {
      updates.resourcesDownloaded = (leadData?.resourcesDownloaded || 0) + 1;
    }

    // Detect intent signals
    const intentSignals = detectIntentSignals({
      ...leadData,
      ...updates,
    });

    if (intentSignals.length > 0) {
      // Merge new signals with existing
      const existingSignals = leadData?.intentSignals || [];
      const allSignals = Array.from(new Set([...existingSignals, ...intentSignals]));
      updates.intentSignals = allSignals;
    }

    // Calculate lead score
    const leadScore = calculateLeadScore({
      ...leadData,
      ...updates,
    });
    updates.leadScore = leadScore;
    updates.highIntent = leadScore >= 75;

    await leadRef.update(updates);

    logger.info('[ACADEMY] Updated lead engagement', {
      leadId,
      type,
      newScore: leadScore,
      signals: intentSignals,
    });
  } catch (error) {
    logger.error('[ACADEMY] Failed to update lead engagement', { error, leadId });
  }
}

/**
 * Detect intent signals based on lead activity
 */
function detectIntentSignals(leadData: any): IntentSignal[] {
  const signals: IntentSignal[] = [];

  // Video binge: 3+ videos in session
  if (leadData.videosWatched >= 3) {
    signals.push(INTENT_SIGNALS.VIDEO_BINGE);
  }

  // Multiple downloads: 2+ resources
  if (leadData.resourcesDownloaded >= 2) {
    signals.push(INTENT_SIGNALS.MULTIPLE_DOWNLOADS);
  }

  // High engagement: >30 min estimated watch time
  const estimatedWatchTime = (leadData.videosWatched || 0) * 12 * 60; // 12 min avg
  if (estimatedWatchTime > 30 * 60) {
    signals.push(INTENT_SIGNALS.HIGH_ENGAGEMENT);
  }

  // Completed track: watched all episodes in a track
  if ((leadData.completedTracks || []).length > 0) {
    signals.push(INTENT_SIGNALS.COMPLETED_TRACK);
  }

  return signals;
}

/**
 * Calculate lead score (0-100)
 */
function calculateLeadScore(leadData: any): number {
  let score = 0;

  // Video engagement
  const videosWatched = leadData.videosWatched || 0;
  score += videosWatched * 5;
  if (videosWatched >= 5) {
    score += 15; // Binge bonus
  }

  // Resource downloads
  const resourcesDownloaded = leadData.resourcesDownloaded || 0;
  score += resourcesDownloaded * 10;

  // Intent signals
  const intentSignals = leadData.intentSignals || [];
  score += intentSignals.length * 10;

  // Special signal bonuses
  if (intentSignals.includes(INTENT_SIGNALS.DEMO_INTEREST)) {
    score += 25;
  }
  if (intentSignals.includes(INTENT_SIGNALS.COMPLETED_TRACK)) {
    score += 20;
  }

  // Marketing opt-in
  if (leadData.marketingOptIn) {
    score += 5;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Update lead score manually (for admin use)
 */
export async function updateLeadScore(
  leadId: string
): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    const db = getAdminFirestore();
    const leadRef = db.collection(ACADEMY_LEADS_COLLECTION).doc(leadId);

    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) {
      return { success: false, error: 'Lead not found' };
    }

    const leadData = leadDoc.data();
    const score = calculateLeadScore(leadData);
    const intentSignals = detectIntentSignals(leadData);

    await leadRef.update({
      leadScore: score,
      highIntent: score >= 75,
      intentSignals,
      updatedAt: Timestamp.now(),
    });

    logger.info('[ACADEMY] Updated lead score', { leadId, score });

    return { success: true, score };
  } catch (error) {
    logger.error('[ACADEMY] Failed to update lead score', { error, leadId });
    return { success: false, error: 'Failed to update lead score' };
  }
}

// ============================================
// LEAD PROGRESS (FOR DASHBOARD)
// ============================================

export interface GetLeadProgressInput {
  email: string;
}

/**
 * Get lead progress by email (for dashboard display)
 */
export async function getLeadProgress(
  email: string
): Promise<{
  success: boolean;
  data?: {
    videosWatched: number;
    resourcesDownloaded: number;
    completedTracks: string[];
    leadScore: number;
    highIntent: boolean;
  };
  error?: string;
}> {
  try {
    const db = getAdminFirestore();

    const query = await db
      .collection(ACADEMY_LEADS_COLLECTION)
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    if (query.empty) {
      return { success: false, error: 'Lead not found' };
    }

    const leadData = query.docs[0].data();

    return {
      success: true,
      data: {
        videosWatched: leadData.videosWatched || 0,
        resourcesDownloaded: leadData.resourcesDownloaded || 0,
        completedTracks: leadData.completedTracks || [],
        leadScore: leadData.leadScore || 0,
        highIntent: leadData.highIntent || false,
      },
    };
  } catch (error) {
    logger.error('[ACADEMY] Failed to get lead progress', { error, email });
    return { success: false, error: 'Failed to get lead progress' };
  }
}

// ============================================
// DEMO INTEREST TRACKING
// ============================================

export interface TrackDemoInterestInput {
  leadId: string;
}

/**
 * Track when a lead clicks the demo booking CTA
 */
export async function trackDemoInterest(
  input: TrackDemoInterestInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    const leadRef = db.collection(ACADEMY_LEADS_COLLECTION).doc(input.leadId);

    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) {
      return { success: false, error: 'Lead not found' };
    }

    const leadData = leadDoc.data();
    const existingSignals = leadData?.intentSignals || [];

    // Add demo_interest signal
    const intentSignals = Array.from(
      new Set([...existingSignals, INTENT_SIGNALS.DEMO_INTEREST])
    );

    // Recalculate score with demo interest
    const leadScore = calculateLeadScore({
      ...leadData,
      intentSignals,
    });

    await leadRef.update({
      intentSignals,
      leadScore,
      highIntent: leadScore >= 75,
      status: 'demo_booked',
      updatedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
    });

    logger.info('[ACADEMY] Tracked demo interest', {
      leadId: input.leadId,
      newScore: leadScore,
    });

    return { success: true };
  } catch (error) {
    logger.error('[ACADEMY] Failed to track demo interest', { error });
    return { success: false, error: 'Failed to track demo interest' };
  }
}
