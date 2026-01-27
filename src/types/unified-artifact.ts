/**
 * Unified Artifact System
 *
 * Single source of truth for all artifacts across brand, dispensary, and super_user roles.
 * Replaces separate collections (carousels, bundles, creative_content, etc.)
 */

import type { Timestamp } from '@google-cloud/firestore';

// ============================================================================
// Core Artifact Types
// ============================================================================

/**
 * Base artifact types - extends InboxArtifactType for full compatibility
 */
export type UnifiedArtifactType =
  // Business Operations (Brand)
  | 'carousel'
  | 'bundle'
  | 'creative_content'
  | 'campaign'
  | 'sell_sheet'
  | 'report'
  | 'outreach_draft'
  | 'event_promo'
  // Customer-Facing (Dispensary)
  | 'product_recommendation'
  | 'support_ticket'
  | 'inventory_alert'
  // Growth Management (Super User)
  | 'growth_report'
  | 'churn_scorecard'
  | 'revenue_model'
  | 'pipeline_report'
  | 'health_scorecard'
  | 'market_analysis'
  | 'partnership_deck'
  | 'experiment_plan'
  // Operations (Super User)
  | 'standup_notes'
  | 'sprint_plan'
  | 'incident_report'
  | 'postmortem'
  | 'feature_spec'
  | 'technical_design'
  | 'release_notes'
  | 'onboarding_checklist'
  | 'content_calendar'
  | 'okr_document'
  | 'meeting_notes'
  | 'board_deck'
  | 'budget_model'
  | 'job_spec'
  | 'research_brief'
  | 'compliance_brief';

/**
 * Artifact status following HitL approval workflow
 */
export type UnifiedArtifactStatus =
  | 'draft'           // Agent created, not yet reviewed
  | 'pending_review'  // Submitted for user approval
  | 'approved'        // User approved, ready to publish
  | 'published'       // Live in production
  | 'scheduled'       // Scheduled for future publish
  | 'rejected'        // User rejected
  | 'archived';       // Archived/deprecated

/**
 * Role that owns this artifact
 */
export type ArtifactRole = 'brand' | 'dispensary' | 'super_user';

/**
 * Agent persona that created the artifact
 */
export type ArtifactAgent =
  // Field Agents
  | 'smokey'      // Budtender
  | 'money_mike'  // Banker
  | 'craig'       // Marketer
  | 'ezal'        // Lookout
  | 'deebo'       // Enforcer
  | 'pops'        // Analytics
  | 'day_day'     // Operations
  | 'mrs_parker'  // Customer Success
  | 'big_worm'    // Research
  | 'roach'       // Knowledge
  // Executive Agents (Super User)
  | 'leo'         // COO
  | 'jack'        // VP Growth
  | 'linus'       // CTO
  | 'glenda'      // CEO
  | 'mike'        // CFO
  | 'auto';       // Auto-routed

// ============================================================================
// Artifact Data Structures (Polymorphic)
// ============================================================================

/**
 * Carousel artifact data (homepage hero, product showcase)
 */
export interface CarouselArtifactData {
  title: string;
  description?: string;
  products: Array<{
    productId: string;
    productName: string;
    order: number;
    imageUrl?: string;
  }>;
  displayOrder?: number;
  autoRotate?: boolean;
  rotationInterval?: number; // milliseconds
  style?: 'hero' | 'grid' | 'minimal';
}

/**
 * Bundle deal artifact data (BOGO, mix-and-match, etc.)
 */
export interface BundleArtifactData {
  name: string;
  description: string;
  type: 'bogo' | 'mix_match' | 'percentage' | 'fixed_price' | 'tiered';
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    originalPrice: number;
    bundlePrice?: number;
  }>;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  minimumPurchase?: number;
  maximumPurchase?: number;
  validFrom?: string;
  validTo?: string;
  marginAnalysis?: {
    totalRevenue: number;
    totalCost: number;
    margin: number;
    marginPercentage: number;
  };
}

/**
 * Social media content artifact data
 */
export interface CreativeContentArtifactData {
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'facebook';
  caption: string;
  hashtags?: string[];
  mediaUrls: string[];
  thumbnailUrl?: string;
  style?: 'professional' | 'casual' | 'bold' | 'minimal';
  targetAudience?: string;
  complianceStatus?: 'active' | 'warning' | 'review_needed';
  complianceNotes?: string;
  scheduledAt?: string; // ISO timestamp
}

/**
 * Campaign artifact data (multi-channel marketing)
 */
export interface CampaignArtifactData {
  name: string;
  description: string;
  channels: Array<'sms' | 'email' | 'social' | 'website'>;
  targetAudience?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  assets?: Array<{
    type: 'creative_content' | 'sell_sheet' | 'outreach_draft';
    artifactId: string;
  }>;
}

/**
 * Generic artifact data for other types
 */
export interface GenericArtifactData {
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Polymorphic artifact data - type depends on artifactType
 */
export type UnifiedArtifactData =
  | CarouselArtifactData
  | BundleArtifactData
  | CreativeContentArtifactData
  | CampaignArtifactData
  | GenericArtifactData;

// ============================================================================
// Main Unified Artifact Interface
// ============================================================================

/**
 * Unified Artifact
 *
 * Single schema for all artifacts across all roles.
 * Replaces: carousels, bundles, creative_content, and inbox_artifacts collections.
 */
export interface UnifiedArtifact {
  // Identity
  id: string;
  type: UnifiedArtifactType;
  role: ArtifactRole;

  // Ownership & Context
  orgId: string;
  userId: string;           // User who owns/approved it
  brandId?: string;         // Brand context (for brand artifacts)
  dispensaryId?: string;    // Dispensary context (for dispensary artifacts)

  // Artifact Metadata
  title: string;            // Display title
  description?: string;     // Optional description
  data: UnifiedArtifactData; // Polymorphic data (type-specific)

  // Workflow Status (HitL Protocol)
  status: UnifiedArtifactStatus;

  // Agent Attribution
  createdBy: ArtifactAgent; // Agent that created it
  createdByUser?: string;   // User ID if manually created
  rationale?: string;       // Agent's explanation of why it created this

  // Thread Context (if created in inbox)
  threadId?: string;        // Inbox thread that created it
  messageId?: string;       // Specific message that generated it

  // Approval Tracking
  reviewedBy?: string;      // User ID who reviewed
  reviewedAt?: Timestamp | number;
  approvedBy?: string;      // User ID who approved
  approvedAt?: Timestamp | number;
  rejectedBy?: string;      // User ID who rejected
  rejectedAt?: Timestamp | number;
  rejectionReason?: string;

  // Publishing
  publishedBy?: string;     // User ID who published
  publishedAt?: Timestamp | number;
  scheduledFor?: Timestamp | number;

  // Legacy Migration Support
  legacyId?: string;        // Original ID from old collection
  legacyCollection?: 'carousels' | 'bundles' | 'creative_content'; // Source collection
  migratedAt?: Timestamp | number;

  // Timestamps
  createdAt: Timestamp | number;
  updatedAt: Timestamp | number;

  // Versioning
  version?: number;         // For tracking artifact iterations
  previousVersionId?: string; // Link to previous version

  // Tags & Search
  tags?: string[];
  searchTerms?: string[];   // Computed for full-text search
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Type guard to check if artifact is a carousel
 */
export function isCarouselArtifact(
  artifact: UnifiedArtifact
): artifact is UnifiedArtifact & { data: CarouselArtifactData } {
  return artifact.type === 'carousel';
}

/**
 * Type guard to check if artifact is a bundle
 */
export function isBundleArtifact(
  artifact: UnifiedArtifact
): artifact is UnifiedArtifact & { data: BundleArtifactData } {
  return artifact.type === 'bundle';
}

/**
 * Type guard to check if artifact is creative content
 */
export function isCreativeContentArtifact(
  artifact: UnifiedArtifact
): artifact is UnifiedArtifact & { data: CreativeContentArtifactData } {
  return artifact.type === 'creative_content';
}

/**
 * Type guard to check if artifact is a campaign
 */
export function isCampaignArtifact(
  artifact: UnifiedArtifact
): artifact is UnifiedArtifact & { data: CampaignArtifactData } {
  return artifact.type === 'campaign';
}

/**
 * Get display title for artifact type
 */
export function getArtifactTypeLabel(type: UnifiedArtifactType): string {
  const labels: Record<UnifiedArtifactType, string> = {
    // Business
    carousel: 'Carousel',
    bundle: 'Bundle Deal',
    creative_content: 'Social Post',
    campaign: 'Campaign',
    sell_sheet: 'Sell Sheet',
    report: 'Report',
    outreach_draft: 'Outreach Draft',
    event_promo: 'Event Promo',
    // Customer
    product_recommendation: 'Product Recommendation',
    support_ticket: 'Support Ticket',
    inventory_alert: 'Inventory Alert',
    // Growth
    growth_report: 'Growth Report',
    churn_scorecard: 'Churn Scorecard',
    revenue_model: 'Revenue Model',
    pipeline_report: 'Pipeline Report',
    health_scorecard: 'Health Scorecard',
    market_analysis: 'Market Analysis',
    partnership_deck: 'Partnership Deck',
    experiment_plan: 'Experiment Plan',
    // Operations
    standup_notes: 'Standup Notes',
    sprint_plan: 'Sprint Plan',
    incident_report: 'Incident Report',
    postmortem: 'Postmortem',
    feature_spec: 'Feature Spec',
    technical_design: 'Technical Design',
    release_notes: 'Release Notes',
    onboarding_checklist: 'Onboarding Checklist',
    content_calendar: 'Content Calendar',
    okr_document: 'OKR Document',
    meeting_notes: 'Meeting Notes',
    board_deck: 'Board Deck',
    budget_model: 'Budget Model',
    job_spec: 'Job Spec',
    research_brief: 'Research Brief',
    compliance_brief: 'Compliance Brief',
  };
  return labels[type] || type;
}

/**
 * Get status badge color
 */
export function getArtifactStatusColor(status: UnifiedArtifactStatus): string {
  const colors: Record<UnifiedArtifactStatus, string> = {
    draft: 'yellow',
    pending_review: 'amber',
    approved: 'green',
    published: 'emerald',
    scheduled: 'blue',
    rejected: 'red',
    archived: 'gray',
  };
  return colors[status];
}

/**
 * Check if artifact can be edited
 */
export function canEditArtifact(status: UnifiedArtifactStatus): boolean {
  return ['draft', 'pending_review', 'rejected'].includes(status);
}

/**
 * Check if artifact can be approved
 */
export function canApproveArtifact(status: UnifiedArtifactStatus): boolean {
  return status === 'pending_review';
}

/**
 * Check if artifact can be published
 */
export function canPublishArtifact(status: UnifiedArtifactStatus): boolean {
  return status === 'approved';
}

// ============================================================================
// Server Action Result Types
// ============================================================================

export interface CreateArtifactResult {
  success: boolean;
  artifactId?: string;
  artifact?: UnifiedArtifact;
  error?: string;
}

export interface UpdateArtifactResult {
  success: boolean;
  artifact?: UnifiedArtifact;
  error?: string;
}

export interface ApproveArtifactResult {
  success: boolean;
  artifact?: UnifiedArtifact;
  error?: string;
}

export interface PublishArtifactResult {
  success: boolean;
  artifact?: UnifiedArtifact;
  publishedId?: string; // ID in destination collection (if applicable)
  error?: string;
}

export interface ListArtifactsResult {
  success: boolean;
  artifacts?: UnifiedArtifact[];
  total?: number;
  error?: string;
}
