'use server';

/**
 * Academy Analytics Server Actions
 *
 * Provides aggregated analytics data for the Academy dashboard.
 * Super admin only.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireSuperUser } from '@/server/auth/auth';
import type { AcademyAnalytics } from '@/types/academy';
import { Timestamp } from '@google-cloud/firestore';

const ACADEMY_LEADS_COLLECTION = 'academy_leads';
const ACADEMY_VIEWS_COLLECTION = 'academy_views';

export interface GetAcademyAnalyticsInput {
  timeRange: 'week' | 'month' | 'all';
}

/**
 * Get Academy analytics data
 * Super admin only
 */
export async function getAcademyAnalytics(
  input: GetAcademyAnalyticsInput
): Promise<{
  success: boolean;
  data?: AcademyAnalytics;
  error?: string;
}> {
  try {
    // Require super_user role
    await requireSuperUser();

    const { timeRange } = input;
    const db = getAdminFirestore();

    // Calculate time range for filtering
    const now = Date.now();
    const timeRangeMs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: now, // All time = since epoch
    };

    const startTime =
      timeRange === 'all'
        ? Timestamp.fromMillis(0)
        : Timestamp.fromMillis(now - timeRangeMs[timeRange]);

    // Fetch all leads in time range
    const leadsQuery = db.collection(ACADEMY_LEADS_COLLECTION);
    const leadsSnapshot =
      timeRange === 'all'
        ? await leadsQuery.get()
        : await leadsQuery.where('createdAt', '>=', startTime).get();

    const allLeads = leadsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate overview metrics
    const totalLeads = allLeads.length;
    const totalDemoRequests = allLeads.filter((lead: any) =>
      lead.intentSignals?.includes('demo_interest')
    ).length;

    // Fetch video views
    const viewsSnapshot = await db
      .collection(ACADEMY_VIEWS_COLLECTION)
      .where('createdAt', '>=', startTime)
      .get();

    const totalVideoViews = viewsSnapshot.docs.filter(
      (doc) => doc.data().type === 'video'
    ).length;
    const totalDownloads = viewsSnapshot.docs.filter(
      (doc) => doc.data().type === 'resource'
    ).length;

    // Calculate growth (simplified - compare to previous period)
    // In production, this would query previous period data
    const leadGrowth = 15; // Placeholder
    const videoGrowth = 25; // Placeholder
    const downloadGrowth = 30; // Placeholder
    const demoGrowth = 20; // Placeholder

    // Conversion funnel (simplified)
    const emailCaptures = allLeads.length;
    const visitors = Math.round(emailCaptures * 2.5); // Estimate: 40% capture rate
    const conversions = allLeads.filter((lead: any) => lead.status === 'converted').length;

    const funnel = {
      visitors,
      videoViews: totalVideoViews,
      emailCaptures,
      demoRequests: totalDemoRequests,
      conversions,
    };

    // Popular episodes
    const episodeViews: Record<string, { count: number; totalTime: number }> = {};
    viewsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'video') {
        const id = data.contentId;
        if (!episodeViews[id]) {
          episodeViews[id] = { count: 0, totalTime: 0 };
        }
        episodeViews[id].count++;
        episodeViews[id].totalTime += data.watchDuration || 0;
      }
    });

    const popularEpisodes = Object.entries(episodeViews)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([episodeId, stats]) => ({
        episodeId,
        title: getEpisodeTitleFromId(episodeId),
        views: stats.count,
        avgWatchTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
        completionRate: 75, // Placeholder - would calculate from completion events
      }));

    // Popular resources
    const resourceDownloads: Record<string, number> = {};
    viewsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'resource') {
        const id = data.contentId;
        resourceDownloads[id] = (resourceDownloads[id] || 0) + 1;
      }
    });

    const popularResources = Object.entries(resourceDownloads)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([resourceId, downloads]) => ({
        resourceId,
        title: getResourceTitleFromId(resourceId),
        downloads,
        type: getResourceTypeFromId(resourceId),
      }));

    // High-intent leads (score > 75)
    const highIntentLeads = allLeads
      .filter((lead: any) => lead.leadScore > 75)
      .sort((a: any, b: any) => b.leadScore - a.leadScore)
      .slice(0, 10)
      .map((lead: any) => ({
        id: lead.id,
        email: lead.email,
        firstName: lead.firstName,
        leadScore: lead.leadScore,
        videosWatched: lead.videosWatched || 0,
        resourcesDownloaded: lead.resourcesDownloaded || 0,
        intentSignals: lead.intentSignals || [],
      }));

    // Lead score distribution
    const leadScoreDistribution = {
      '0-24': allLeads.filter((lead: any) => lead.leadScore >= 0 && lead.leadScore < 25)
        .length,
      '25-49': allLeads.filter((lead: any) => lead.leadScore >= 25 && lead.leadScore < 50)
        .length,
      '50-74': allLeads.filter((lead: any) => lead.leadScore >= 50 && lead.leadScore < 75)
        .length,
      '75-100': allLeads.filter((lead: any) => lead.leadScore >= 75 && lead.leadScore <= 100)
        .length,
    };

    const analytics: AcademyAnalytics = {
      totalLeads,
      totalVideoViews,
      totalDownloads,
      totalDemoRequests,
      leadGrowth,
      videoGrowth,
      downloadGrowth,
      demoGrowth,
      funnel,
      popularEpisodes,
      popularResources,
      highIntentLeads,
      leadScoreDistribution,
    };

    logger.info('[ACADEMY_ANALYTICS] Fetched analytics', {
      timeRange,
      totalLeads,
      totalVideoViews,
    });

    return { success: true, data: analytics };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's an auth error
    if (errorMessage.includes('Forbidden') || errorMessage.includes('Unauthorized')) {
      return { success: false, error: 'Unauthorized' };
    }

    logger.error('[ACADEMY_ANALYTICS] Failed to fetch analytics', { error });
    return {
      success: false,
      error: 'Failed to fetch analytics data',
    };
  }
}

// Helper functions to map IDs to titles (simplified)
function getEpisodeTitleFromId(episodeId: string): string {
  const titles: Record<string, string> = {
    'ep1-intro': 'What Is AI Marketing for Cannabis',
    'ep2-menu': 'The Invisible Menu Problem',
    'ep3-segments': 'Indica vs Sativa Is a Lie',
    'ep4-compliance': 'Compliance as Competitive Moat',
    'ep5-smokey': 'Meet Smokey: The AI Budtender',
    'ep6-craig': 'Meet Craig: The AI Marketer',
    'ep7-pops': 'Meet Pops: The AI Analyst',
    'ep8-ezal': 'Meet Ezal: The AI Lookout',
    'ep9-money-mike': 'Meet Money Mike: The Loyalty Expert',
    'ep10-mrs-parker': 'Meet Mrs. Parker: The Memory Agent',
    'ep11-deebo': 'Meet Deebo: The Operations Enforcer',
    'ep12-full-stack': 'The Full Stack',
  };
  return titles[episodeId] || episodeId;
}

function getResourceTitleFromId(resourceId: string): string {
  const titles: Record<string, string> = {
    'checklist-ai-readiness': 'AI Readiness Checklist',
    'template-persona-worksheet': 'Customer Persona Worksheet',
    'checklist-menu-audit': 'Menu Audit Checklist',
    'guide-seo-2026': 'Cannabis SEO Guide 2026',
    'template-segment-calculator': 'Segment Calculator',
    'checklist-compliance': 'Compliance Checklist',
    'template-product-knowledge': 'Product Knowledge Quiz',
    'checklist-campaign-planning': 'Campaign Planning Checklist',
    'template-email-campaign': 'Email Campaign Template',
    'template-content-calendar': 'Social Media Content Calendar',
    'template-budget-calculator': 'Marketing Budget Calculator',
    'guide-competitive-intelligence': 'Competitive Intelligence Playbook',
    'template-loyalty-roi': 'Loyalty ROI Calculator',
    'guide-email-marketing': 'Email Marketing Guide',
    'checklist-operations': 'Operations Checklist',
    'guide-integration': 'Full Stack Integration Guide',
  };
  return titles[resourceId] || resourceId;
}

function getResourceTypeFromId(resourceId: string): string {
  if (resourceId.startsWith('checklist-')) return 'checklist';
  if (resourceId.startsWith('template-')) return 'template';
  if (resourceId.startsWith('guide-')) return 'guide';
  return 'resource';
}
