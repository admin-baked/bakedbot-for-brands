'use server';

/**
 * Inbox → Unified Artifacts Bridge
 *
 * Integration layer that connects inbox to the unified artifacts system.
 * Replaces old inbox_artifacts collection usage with new unified artifacts.
 */

import { createArtifact, listArtifacts, getArtifact, updateArtifact, approveArtifact, rejectArtifact, publishArtifact } from './unified-artifacts';
import type {
  UnifiedArtifact,
  UnifiedArtifactType,
  UnifiedArtifactData,
  CarouselArtifactData,
  BundleArtifactData,
  CreativeContentArtifactData,
  ArtifactAgent,
} from '@/types/unified-artifact';
import type {
  InboxArtifact,
  InboxArtifactType,
  InboxAgentPersona,
  InboxThread,
} from '@/types/inbox';
import type { Carousel, BundleDeal, CreativeContent } from '@/types/artifact';
import { getDb } from '@/lib/firebase-admin';
import { getServerSessionUser } from '@/lib/auth';
import logger from '@/lib/logger';

// ============================================================================
// Type Mapping: Inbox → Unified
// ============================================================================

const INBOX_TYPE_TO_UNIFIED: Record<InboxArtifactType, UnifiedArtifactType> = {
  // Direct mappings
  carousel: 'carousel',
  bundle: 'bundle',
  creative_content: 'creative_content',
  campaign: 'campaign',
  sell_sheet: 'sell_sheet',
  report: 'report',
  outreach_draft: 'outreach_draft',
  event_promo: 'event_promo',
  growth_report: 'growth_report',
  churn_scorecard: 'churn_scorecard',
  revenue_model: 'revenue_model',
  pipeline_report: 'pipeline_report',
  health_scorecard: 'health_scorecard',
  market_analysis: 'market_analysis',
  partnership_deck: 'partnership_deck',
  experiment_plan: 'experiment_plan',
  standup_notes: 'standup_notes',
  sprint_plan: 'sprint_plan',
  incident_report: 'incident_report',
  postmortem: 'postmortem',
  feature_spec: 'feature_spec',
  technical_design: 'technical_design',
  release_notes: 'release_notes',
  onboarding_checklist: 'onboarding_checklist',
  content_calendar: 'content_calendar',
  okr_document: 'okr_document',
  meeting_notes: 'meeting_notes',
  board_deck: 'board_deck',
  budget_model: 'budget_model',
  job_spec: 'job_spec',
  research_brief: 'research_brief',
  compliance_brief: 'compliance_brief',
};

const AGENT_PERSONA_TO_ARTIFACT_AGENT: Record<InboxAgentPersona, ArtifactAgent> = {
  smokey: 'smokey',
  money_mike: 'money_mike',
  craig: 'craig',
  ezal: 'ezal',
  deebo: 'deebo',
  pops: 'pops',
  day_day: 'day_day',
  mrs_parker: 'mrs_parker',
  big_worm: 'big_worm',
  roach: 'roach',
  leo: 'leo',
  jack: 'jack',
  linus: 'linus',
  glenda: 'glenda',
  mike: 'mike',
  auto: 'auto',
};

// ============================================================================
// Create Inbox Artifact (using Unified System)
// ============================================================================

export async function createInboxArtifactUnified(input: {
  threadId: string;
  type: InboxArtifactType;
  data: Carousel | BundleDeal | CreativeContent | any;
  rationale?: string;
}): Promise<{ success: boolean; artifact?: InboxArtifact; error?: string }> {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = getDb();

    // Get thread to determine context
    const threadDoc = await db.collection('inbox_threads').doc(input.threadId).get();
    if (!threadDoc.exists) {
      return { success: false, error: 'Thread not found' };
    }

    const thread = threadDoc.data() as InboxThread;
    if (thread.userId !== user.uid) {
      return { success: false, error: 'Unauthorized' };
    }

    // Transform data to unified format
    const unifiedData = transformToUnifiedData(input.type, input.data);

    // Create using unified artifacts system
    const result = await createArtifact({
      type: INBOX_TYPE_TO_UNIFIED[input.type] || input.type,
      role: 'brand', // Default to brand for now, can be determined from thread context
      orgId: thread.orgId,
      userId: user.uid,
      brandId: thread.brandId,
      dispensaryId: thread.dispensaryId,
      title: extractTitle(input.type, input.data),
      description: input.data.description,
      data: unifiedData,
      createdBy: AGENT_PERSONA_TO_ARTIFACT_AGENT[thread.primaryAgent] || 'auto',
      rationale: input.rationale,
      threadId: input.threadId,
      tags: input.data.tags || [],
    });

    if (!result.success || !result.artifact) {
      return { success: false, error: result.error };
    }

    // Convert back to InboxArtifact format for compatibility
    const inboxArtifact = unifiedToInboxArtifact(result.artifact);

    logger.info('Created inbox artifact via unified system', {
      artifactId: result.artifactId,
      type: input.type,
      threadId: input.threadId,
    });

    return { success: true, artifact: inboxArtifact };
  } catch (error) {
    logger.error('Failed to create inbox artifact', { error });
    return { success: false, error: 'Failed to create artifact' };
  }
}

// ============================================================================
// Get Inbox Artifacts (from Unified System)
// ============================================================================

export async function getInboxArtifactsUnified(
  threadId: string
): Promise<{ success: boolean; artifacts?: InboxArtifact[]; error?: string }> {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = getDb();

    // Verify thread ownership
    const threadDoc = await db.collection('inbox_threads').doc(threadId).get();
    if (!threadDoc.exists) {
      return { success: false, error: 'Thread not found' };
    }

    const thread = threadDoc.data() as InboxThread;
    if (thread.userId !== user.uid) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get artifacts from unified system
    const result = await listArtifacts({
      threadId: threadId,
      orgId: thread.orgId,
    });

    if (!result.success || !result.artifacts) {
      return { success: false, error: result.error };
    }

    // Convert to inbox artifact format
    const inboxArtifacts = result.artifacts.map(unifiedToInboxArtifact);

    return { success: true, artifacts: inboxArtifacts };
  } catch (error) {
    logger.error('Failed to get inbox artifacts', { error });
    return { success: false, error: 'Failed to get artifacts' };
  }
}

// ============================================================================
// Approval Actions (delegating to Unified System)
// ============================================================================

export async function approveInboxArtifactUnified(
  artifactId: string
): Promise<{ success: boolean; artifact?: InboxArtifact; error?: string }> {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await approveArtifact(artifactId, user.uid);

    if (!result.success || !result.artifact) {
      return { success: false, error: result.error };
    }

    return { success: true, artifact: unifiedToInboxArtifact(result.artifact) };
  } catch (error) {
    logger.error('Failed to approve inbox artifact', { error });
    return { success: false, error: 'Failed to approve artifact' };
  }
}

export async function rejectInboxArtifactUnified(
  artifactId: string,
  reason?: string
): Promise<{ success: boolean; artifact?: InboxArtifact; error?: string }> {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await rejectArtifact(artifactId, user.uid, reason);

    if (!result.success || !result.artifact) {
      return { success: false, error: result.error };
    }

    return { success: true, artifact: unifiedToInboxArtifact(result.artifact) };
  } catch (error) {
    logger.error('Failed to reject inbox artifact', { error });
    return { success: false, error: 'Failed to reject artifact' };
  }
}

export async function publishInboxArtifactUnified(
  artifactId: string,
  destination: 'live' | 'scheduled' = 'live'
): Promise<{ success: boolean; publishedId?: string; error?: string }> {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await publishArtifact(artifactId, user.uid, destination);

    return result;
  } catch (error) {
    logger.error('Failed to publish inbox artifact', { error });
    return { success: false, error: 'Failed to publish artifact' };
  }
}

// ============================================================================
// Transformation Helpers
// ============================================================================

function transformToUnifiedData(
  type: InboxArtifactType,
  data: any
): UnifiedArtifactData {
  switch (type) {
    case 'carousel':
      return {
        title: data.title || '',
        description: data.description,
        products: data.products || [],
        displayOrder: data.displayOrder || 0,
        autoRotate: data.autoRotate ?? true,
        rotationInterval: data.rotationInterval || 5000,
        style: data.style || 'hero',
      } as CarouselArtifactData;

    case 'bundle':
      return {
        name: data.name || '',
        description: data.description || '',
        type: data.type || 'percentage',
        products: data.products || [],
        discount: data.discount,
        minimumPurchase: data.minimumPurchase,
        maximumPurchase: data.maximumPurchase,
        validFrom: data.validFrom,
        validTo: data.validTo,
        marginAnalysis: data.marginAnalysis,
      } as BundleArtifactData;

    case 'creative_content':
      return {
        platform: data.platform || 'instagram',
        caption: data.caption || '',
        hashtags: data.hashtags || [],
        mediaUrls: data.mediaUrls || [],
        thumbnailUrl: data.thumbnailUrl,
        style: data.style,
        targetAudience: data.targetAudience,
        complianceStatus: data.complianceStatus || 'active',
        complianceNotes: data.complianceNotes,
        scheduledAt: data.scheduledAt,
      } as CreativeContentArtifactData;

    default:
      return {
        title: data.title,
        content: data.content,
        metadata: data,
      };
  }
}

function extractTitle(type: InboxArtifactType, data: any): string {
  switch (type) {
    case 'carousel':
      return data.title || 'Unnamed Carousel';
    case 'bundle':
      return data.name || 'Unnamed Bundle';
    case 'creative_content':
      return `${data.platform || 'Social'} Post`;
    default:
      return data.title || data.name || 'Untitled Artifact';
  }
}

function unifiedToInboxArtifact(unified: UnifiedArtifact): InboxArtifact {
  return {
    id: unified.id,
    threadId: unified.threadId || '',
    orgId: unified.orgId,
    type: unified.type as InboxArtifactType,
    status: unified.status as InboxArtifact['status'],
    data: unified.data,
    rationale: unified.rationale,
    createdAt: unified.createdAt,
    updatedAt: unified.updatedAt,
    createdBy: unified.userId,
    approvedBy: unified.approvedBy,
    approvedAt: unified.approvedAt,
    publishedAt: unified.publishedAt,
  };
}
