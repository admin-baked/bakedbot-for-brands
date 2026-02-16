/**
 * Blog System Types
 *
 * Multi-tenant blog system with AI generation, compliance checking, and SEO optimization.
 * Leverages existing patterns from creative-content, inbox artifacts, and brand guides.
 */

import { Timestamp } from '@google-cloud/firestore';

// ============================================================================
// Core Blog Types
// ============================================================================

export interface BlogPost {
  id: string;
  orgId: string;
  slug: string; // URL-friendly (kebab-case)

  // Content
  title: string;
  subtitle?: string;
  excerpt: string; // 2-3 sentence summary
  content: string; // Markdown format

  // Taxonomy
  category: BlogCategory;
  tags: string[];

  // Media
  featuredImage?: BlogMedia;
  contentImages: BlogMedia[];

  // Publishing
  status: BlogStatus;
  publishedAt?: Timestamp | null;
  scheduledAt?: Timestamp | null;

  // Author
  author: BlogAuthor;
  createdBy: string; // userId or 'agent:craig'

  // SEO
  seo: BlogSEO;

  // Compliance
  compliance?: BlogCompliance;

  // Approval (reuse from creative-content)
  approvalState?: ApprovalState;

  // Analytics
  viewCount: number;
  lastViewedAt?: Timestamp | null;

  // Version control
  version: number;
  versionHistory: BlogVersion[]; // Last 10 versions

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type BlogStatus =
  | 'draft'          // Initial creation, not submitted
  | 'pending_review' // Awaiting Deebo compliance check
  | 'approved'       // Passed compliance, ready to publish
  | 'scheduled'      // Approved with future publish date
  | 'published'      // Live on public blog
  | 'archived';      // Unpublished but kept for history

export type BlogCategory =
  | 'education'           // Cannabis education, how-tos
  | 'product_spotlight'   // Featured products/strains
  | 'industry_news'       // Market trends, legislation
  | 'company_update'      // Brand announcements
  | 'strain_profile'      // Deep dives on strains
  | 'compliance'          // Legal/regulatory guidance
  | 'cannabis_culture'    // Lifestyle, community
  | 'wellness';           // Health & wellness topics

// ============================================================================
// SEO Types
// ============================================================================

export interface BlogSEO {
  title: string;              // Title tag (50-60 chars)
  metaDescription: string;    // Meta description (150-160 chars)
  slug: string;               // URL slug (duplicate for easy access)
  keywords: string[];         // Target keywords
  ogImage?: string;           // Open Graph image URL
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;      // Canonical URL if syndicated
  schemaMarkup?: object;      // JSON-LD BlogPosting schema
}

// ============================================================================
// Compliance Types
// ============================================================================

export interface BlogCompliance {
  status: 'passed' | 'warning' | 'failed';
  checkedAt: Timestamp;
  checkedBy: 'agent:deebo';
  issues: BlogComplianceIssue[];
  approvedStates: string[]; // States where content is compliant
}

export interface BlogComplianceIssue {
  type: 'medical_claim' | 'youth_targeting' | 'state_restriction' | 'prohibited_imagery';
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  line?: number; // Line number in content
}

// ============================================================================
// Media Types
// ============================================================================

export interface BlogMedia {
  id: string;
  url: string;
  thumbnailUrl?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  mimeType: string;
}

// ============================================================================
// Author Types
// ============================================================================

export interface BlogAuthor {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  bio?: string;
}

// ============================================================================
// Version Control Types
// ============================================================================

export interface BlogVersion {
  version: number;
  timestamp: Timestamp;
  updatedBy: string;
  changes: string; // Brief description
  snapshot: Partial<BlogPost>; // Full content at this version
}

// ============================================================================
// Settings Types
// ============================================================================

export interface BlogSettings {
  orgId: string;
  enabled: boolean;
  defaultCategory: BlogCategory;
  defaultAuthor: BlogAuthor;
  requireApproval: boolean;
  approvalChainId?: string;
  seoDefaults: {
    ogImage?: string;
    twitterHandle?: string;
  };
}

// ============================================================================
// Approval State (Reuse from creative-content)
// ============================================================================

export interface ApprovalState {
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  currentLevel: number;
  totalLevels: number;
  approvers: ApprovalLevel[];
  rejectionReason?: string;
  revisionNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApprovalLevel {
  level: number;
  role: string; // e.g., 'compliance_reviewer', 'editor', 'publisher'
  userId?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Timestamp;
  comments?: string;
}

// ============================================================================
// Query & Filter Types
// ============================================================================

export interface BlogFilters {
  orgId: string;
  status?: BlogStatus | BlogStatus[];
  category?: BlogCategory | BlogCategory[];
  tags?: string[];
  author?: string;
  searchQuery?: string;
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'publishedAt' | 'createdAt' | 'updatedAt' | 'viewCount';
  order?: 'asc' | 'desc';
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface BlogAnalytics {
  orgId: string;
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalViews: number;
  viewsLast30Days: number;
  topPosts: Array<{
    postId: string;
    title: string;
    views: number;
  }>;
  viewsByCategory: Record<BlogCategory, number>;
  publishingFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// ============================================================================
// Input Types (for creation/updates)
// ============================================================================

export interface CreateBlogPostInput {
  orgId: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags?: string[];
  featuredImage?: BlogMedia;
  contentImages?: BlogMedia[];
  author?: BlogAuthor;
  createdBy?: string; // userId or 'agent:craig'
  seoKeywords?: string[];
  scheduledAt?: Timestamp;
}

export interface UpdateBlogPostInput {
  title?: string;
  subtitle?: string;
  excerpt?: string;
  content?: string;
  category?: BlogCategory;
  tags?: string[];
  featuredImage?: BlogMedia;
  contentImages?: BlogMedia[];
  seo?: Partial<BlogSEO>;
  scheduledAt?: Timestamp;
}

// ============================================================================
// AI Generation Types
// ============================================================================

export interface BlogGeneratorInput {
  topic: string;
  outline?: string;
  category: BlogCategory;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'educational' | 'playful';
  length?: 'short' | 'medium' | 'long'; // 300w, 700w, 1200w
  seoKeywords?: string[];
  productToFeature?: string; // Product ID
  orgId: string;
  userId: string;
}

export interface BlogGeneratorOutput {
  title: string;
  excerpt: string;
  content: string; // Markdown
  tags: string[];
  seo: Partial<BlogSEO>;
}

// ============================================================================
// Category Metadata
// ============================================================================

export const BLOG_CATEGORY_META: Record<BlogCategory, {
  label: string;
  description: string;
  icon: string;
}> = {
  education: {
    label: 'Education',
    description: 'Cannabis education, how-tos, and guides',
    icon: 'BookOpen',
  },
  product_spotlight: {
    label: 'Product Spotlight',
    description: 'Featured products and strains',
    icon: 'Star',
  },
  industry_news: {
    label: 'Industry News',
    description: 'Market trends and legislation',
    icon: 'Newspaper',
  },
  company_update: {
    label: 'Company Updates',
    description: 'Brand announcements and news',
    icon: 'Building',
  },
  strain_profile: {
    label: 'Strain Profiles',
    description: 'Deep dives on cannabis strains',
    icon: 'Leaf',
  },
  compliance: {
    label: 'Compliance',
    description: 'Legal and regulatory guidance',
    icon: 'Shield',
  },
  cannabis_culture: {
    label: 'Cannabis Culture',
    description: 'Lifestyle and community',
    icon: 'Users',
  },
  wellness: {
    label: 'Wellness',
    description: 'Health and wellness topics',
    icon: 'Heart',
  },
};

// ============================================================================
// Helper Types
// ============================================================================

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  featuredImage?: BlogMedia;
  author: BlogAuthor;
  publishedAt?: Timestamp;
  viewCount: number;
}

// ============================================================================
// Constants
// ============================================================================

export const BLOG_DEFAULTS = {
  EXCERPT_MAX_LENGTH: 300,
  TITLE_MAX_LENGTH: 100,
  SUBTITLE_MAX_LENGTH: 150,
  SEO_TITLE_MAX_LENGTH: 60,
  SEO_DESCRIPTION_MAX_LENGTH: 160,
  MAX_TAGS: 10,
  MAX_KEYWORDS: 10,
  VERSION_HISTORY_LIMIT: 10,
  SHORT_WORD_COUNT: 300,
  MEDIUM_WORD_COUNT: 700,
  LONG_WORD_COUNT: 1200,
} as const;
