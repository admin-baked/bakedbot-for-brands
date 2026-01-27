'use server';

/**
 * Unified Artifacts Server Actions
 *
 * Replaces separate carousel, bundle, and creative_content actions.
 * Single API for all artifact operations across all roles.
 */

import { db } from '@/lib/firebase-admin';
import { FieldValue } from '@google-cloud/firestore';
import type {
  UnifiedArtifact,
  UnifiedArtifactType,
  UnifiedArtifactStatus,
  UnifiedArtifactData,
  ArtifactRole,
  ArtifactAgent,
  CreateArtifactResult,
  UpdateArtifactResult,
  ApproveArtifactResult,
  PublishArtifactResult,
  ListArtifactsResult,
} from '@/types/unified-artifact';

// Collection name
const ARTIFACTS_COLLECTION = 'artifacts';

// ============================================================================
// Create Artifact
// ============================================================================

export interface CreateArtifactInput {
  type: UnifiedArtifactType;
  role: ArtifactRole;
  orgId: string;
  userId: string;
  brandId?: string;
  dispensaryId?: string;
  title: string;
  description?: string;
  data: UnifiedArtifactData;
  createdBy: ArtifactAgent;
  rationale?: string;
  threadId?: string;
  messageId?: string;
  tags?: string[];
}

export async function createArtifact(
  input: CreateArtifactInput
): Promise<CreateArtifactResult> {
  try {
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc();

    const artifact: UnifiedArtifact = {
      id: artifactRef.id,
      type: input.type,
      role: input.role,
      orgId: input.orgId,
      userId: input.userId,
      brandId: input.brandId,
      dispensaryId: input.dispensaryId,
      title: input.title,
      description: input.description,
      data: input.data,
      status: 'draft',
      createdBy: input.createdBy,
      rationale: input.rationale,
      threadId: input.threadId,
      messageId: input.messageId,
      tags: input.tags || [],
      searchTerms: generateSearchTerms(input.title, input.description, input.tags),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      version: 1,
    };

    await artifactRef.set(artifact);

    // If created in a thread, update thread's artifactIds
    if (input.threadId) {
      await db
        .collection('inbox_threads')
        .doc(input.threadId)
        .update({
          artifactIds: FieldValue.arrayUnion(artifact.id),
          updatedAt: FieldValue.serverTimestamp(),
        });
    }

    return {
      success: true,
      artifactId: artifact.id,
      artifact: serializeArtifact(artifact),
    };
  } catch (error) {
    console.error('[createArtifact] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create artifact',
    };
  }
}

// ============================================================================
// Get Artifacts
// ============================================================================

export interface ListArtifactsInput {
  orgId?: string;
  role?: ArtifactRole;
  type?: UnifiedArtifactType;
  status?: UnifiedArtifactStatus | UnifiedArtifactStatus[];
  brandId?: string;
  dispensaryId?: string;
  threadId?: string;
  userId?: string;
  limit?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'title';
  orderDirection?: 'asc' | 'desc';
}

export async function listArtifacts(
  input: ListArtifactsInput = {}
): Promise<ListArtifactsResult> {
  try {
    let query = db.collection(ARTIFACTS_COLLECTION).limit(input.limit || 100);

    // Apply filters
    if (input.orgId) {
      query = query.where('orgId', '==', input.orgId);
    }
    if (input.role) {
      query = query.where('role', '==', input.role);
    }
    if (input.type) {
      query = query.where('type', '==', input.type);
    }
    if (input.status) {
      if (Array.isArray(input.status)) {
        query = query.where('status', 'in', input.status);
      } else {
        query = query.where('status', '==', input.status);
      }
    }
    if (input.brandId) {
      query = query.where('brandId', '==', input.brandId);
    }
    if (input.dispensaryId) {
      query = query.where('dispensaryId', '==', input.dispensaryId);
    }
    if (input.threadId) {
      query = query.where('threadId', '==', input.threadId);
    }
    if (input.userId) {
      query = query.where('userId', '==', input.userId);
    }

    // Apply ordering
    const orderBy = input.orderBy || 'updatedAt';
    const orderDirection = input.orderDirection || 'desc';
    query = query.orderBy(orderBy, orderDirection);

    const snapshot = await query.get();

    const artifacts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return serializeArtifact(data as UnifiedArtifact);
    });

    return {
      success: true,
      artifacts,
      total: artifacts.length,
    };
  } catch (error) {
    console.error('[listArtifacts] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list artifacts',
    };
  }
}

// ============================================================================
// Get Single Artifact
// ============================================================================

export async function getArtifact(
  artifactId: string
): Promise<CreateArtifactResult> {
  try {
    const doc = await db.collection(ARTIFACTS_COLLECTION).doc(artifactId).get();

    if (!doc.exists) {
      return {
        success: false,
        error: 'Artifact not found',
      };
    }

    const artifact = doc.data() as UnifiedArtifact;

    return {
      success: true,
      artifact: serializeArtifact(artifact),
    };
  } catch (error) {
    console.error('[getArtifact] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get artifact',
    };
  }
}

// ============================================================================
// Update Artifact
// ============================================================================

export interface UpdateArtifactInput {
  artifactId: string;
  title?: string;
  description?: string;
  data?: Partial<UnifiedArtifactData>;
  tags?: string[];
  status?: UnifiedArtifactStatus;
}

export async function updateArtifact(
  input: UpdateArtifactInput
): Promise<UpdateArtifactResult> {
  try {
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(input.artifactId);
    const doc = await artifactRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: 'Artifact not found',
      };
    }

    const updates: Partial<UnifiedArtifact> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.data !== undefined) {
      // Merge data fields
      const currentData = (doc.data() as UnifiedArtifact).data;
      updates.data = { ...currentData, ...input.data } as UnifiedArtifactData;
    }
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.status !== undefined) updates.status = input.status;

    // Update search terms if title/description/tags changed
    if (input.title || input.description || input.tags) {
      const artifact = doc.data() as UnifiedArtifact;
      updates.searchTerms = generateSearchTerms(
        input.title || artifact.title,
        input.description || artifact.description,
        input.tags || artifact.tags
      );
    }

    await artifactRef.update(updates);

    // Fetch updated artifact
    const updatedDoc = await artifactRef.get();
    const updatedArtifact = updatedDoc.data() as UnifiedArtifact;

    return {
      success: true,
      artifact: serializeArtifact(updatedArtifact),
    };
  } catch (error) {
    console.error('[updateArtifact] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update artifact',
    };
  }
}

// ============================================================================
// Approve Artifact (HitL Protocol)
// ============================================================================

export async function approveArtifact(
  artifactId: string,
  userId: string
): Promise<ApproveArtifactResult> {
  try {
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(artifactId);
    const doc = await artifactRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: 'Artifact not found',
      };
    }

    const artifact = doc.data() as UnifiedArtifact;

    if (artifact.status !== 'pending_review') {
      return {
        success: false,
        error: `Cannot approve artifact with status: ${artifact.status}`,
      };
    }

    await artifactRef.update({
      status: 'approved',
      approvedBy: userId,
      approvedAt: FieldValue.serverTimestamp(),
      reviewedBy: userId,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDoc = await artifactRef.get();
    const updatedArtifact = updatedDoc.data() as UnifiedArtifact;

    return {
      success: true,
      artifact: serializeArtifact(updatedArtifact),
    };
  } catch (error) {
    console.error('[approveArtifact] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve artifact',
    };
  }
}

// ============================================================================
// Reject Artifact
// ============================================================================

export async function rejectArtifact(
  artifactId: string,
  userId: string,
  reason?: string
): Promise<ApproveArtifactResult> {
  try {
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(artifactId);
    const doc = await artifactRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: 'Artifact not found',
      };
    }

    await artifactRef.update({
      status: 'rejected',
      rejectedBy: userId,
      rejectedAt: FieldValue.serverTimestamp(),
      rejectionReason: reason,
      reviewedBy: userId,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDoc = await artifactRef.get();
    const updatedArtifact = updatedDoc.data() as UnifiedArtifact;

    return {
      success: true,
      artifact: serializeArtifact(updatedArtifact),
    };
  } catch (error) {
    console.error('[rejectArtifact] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject artifact',
    };
  }
}

// ============================================================================
// Publish Artifact
// ============================================================================

export async function publishArtifact(
  artifactId: string,
  userId: string,
  destination: 'live' | 'scheduled' = 'live'
): Promise<PublishArtifactResult> {
  try {
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(artifactId);
    const doc = await artifactRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: 'Artifact not found',
      };
    }

    const artifact = doc.data() as UnifiedArtifact;

    if (artifact.status !== 'approved') {
      return {
        success: false,
        error: `Cannot publish artifact with status: ${artifact.status}`,
      };
    }

    const updates: Partial<UnifiedArtifact> = {
      status: destination === 'scheduled' ? 'scheduled' : 'published',
      publishedBy: userId,
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await artifactRef.update(updates);

    // TODO: If needed, copy to legacy collections for backwards compatibility
    // This would be temporary during migration period

    const updatedDoc = await artifactRef.get();
    const updatedArtifact = updatedDoc.data() as UnifiedArtifact;

    return {
      success: true,
      artifact: serializeArtifact(updatedArtifact),
      publishedId: artifact.id,
    };
  } catch (error) {
    console.error('[publishArtifact] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish artifact',
    };
  }
}

// ============================================================================
// Submit for Review (Draft → Pending Review)
// ============================================================================

export async function submitForReview(
  artifactId: string
): Promise<ApproveArtifactResult> {
  try {
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(artifactId);
    const doc = await artifactRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: 'Artifact not found',
      };
    }

    const artifact = doc.data() as UnifiedArtifact;

    if (artifact.status !== 'draft' && artifact.status !== 'rejected') {
      return {
        success: false,
        error: `Cannot submit artifact with status: ${artifact.status}`,
      };
    }

    await artifactRef.update({
      status: 'pending_review',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDoc = await artifactRef.get();
    const updatedArtifact = updatedDoc.data() as UnifiedArtifact;

    return {
      success: true,
      artifact: serializeArtifact(updatedArtifact),
    };
  } catch (error) {
    console.error('[submitForReview] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit for review',
    };
  }
}

// ============================================================================
// Delete Artifact
// ============================================================================

export async function deleteArtifact(artifactId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(artifactId);
    const doc = await artifactRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: 'Artifact not found',
      };
    }

    const artifact = doc.data() as UnifiedArtifact;

    // If associated with thread, remove from thread's artifactIds
    if (artifact.threadId) {
      await db
        .collection('inbox_threads')
        .doc(artifact.threadId)
        .update({
          artifactIds: FieldValue.arrayRemove(artifactId),
          updatedAt: FieldValue.serverTimestamp(),
        });
    }

    await artifactRef.delete();

    return { success: true };
  } catch (error) {
    console.error('[deleteArtifact] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete artifact',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate search terms for full-text search
 */
function generateSearchTerms(
  title?: string,
  description?: string,
  tags?: string[]
): string[] {
  const terms: string[] = [];

  if (title) {
    terms.push(...title.toLowerCase().split(/\s+/));
  }
  if (description) {
    terms.push(...description.toLowerCase().split(/\s+/));
  }
  if (tags) {
    terms.push(...tags.map((t) => t.toLowerCase()));
  }

  // Remove duplicates and empty strings
  return Array.from(new Set(terms.filter((t) => t.length > 2)));
}

/**
 * Serialize artifact (convert Firestore timestamps to numbers)
 */
function serializeArtifact(artifact: UnifiedArtifact): UnifiedArtifact {
  return {
    ...artifact,
    createdAt: typeof artifact.createdAt === 'number'
      ? artifact.createdAt
      : artifact.createdAt?.toMillis?.() || Date.now(),
    updatedAt: typeof artifact.updatedAt === 'number'
      ? artifact.updatedAt
      : artifact.updatedAt?.toMillis?.() || Date.now(),
    reviewedAt: artifact.reviewedAt
      ? typeof artifact.reviewedAt === 'number'
        ? artifact.reviewedAt
        : artifact.reviewedAt?.toMillis?.()
      : undefined,
    approvedAt: artifact.approvedAt
      ? typeof artifact.approvedAt === 'number'
        ? artifact.approvedAt
        : artifact.approvedAt?.toMillis?.()
      : undefined,
    rejectedAt: artifact.rejectedAt
      ? typeof artifact.rejectedAt === 'number'
        ? artifact.rejectedAt
        : artifact.rejectedAt?.toMillis?.()
      : undefined,
    publishedAt: artifact.publishedAt
      ? typeof artifact.publishedAt === 'number'
        ? artifact.publishedAt
        : artifact.publishedAt?.toMillis?.()
      : undefined,
    migratedAt: artifact.migratedAt
      ? typeof artifact.migratedAt === 'number'
        ? artifact.migratedAt
        : artifact.migratedAt?.toMillis?.()
      : undefined,
  };
}
