/**
 * Brand Guide System - Comprehensive Brand Management
 *
 * This module provides types for managing complete brand guides including:
 * - Visual identity (logos, colors, typography)
 * - Brand voice & messaging
 * - Compliance guidelines
 * - Asset management
 * - Version history & A/B testing
 * - Competitor analysis integration
 * - AI-powered suggestions
 */

import { Timestamp } from '@google-cloud/firestore';
import type { ArchetypeId } from '@/constants/brand-archetypes';

// ============================================================================
// BRAND ARCHETYPE (Spec 01)
// ============================================================================

export type { ArchetypeId };

export interface BrandArchetypeSelection {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
  selected_at: Timestamp;
  suggested_by_scanner: ArchetypeId | null;
}

// ============================================================================
// VISUAL IDENTITY
// ============================================================================

export interface BrandLogo {
  primary: string;              // Main logo URL
  secondary?: string;           // Light variant
  dark?: string;                // Dark variant
  icon?: string;                // Icon/favicon only
  wordmark?: string;            // Text-only logo
  horizontal?: string;          // Horizontal layout
  vertical?: string;            // Vertical/stacked layout
  downloadUrls?: {
    svg?: string;
    png?: string;
    highRes?: string;           // 300dpi+ for print
  };
  specifications?: {
    minWidth?: number;          // Minimum display width (px)
    clearSpace?: number;        // Minimum spacing around logo
    fileFormats?: string[];     // ['svg', 'png', 'pdf']
  };
}

export interface BrandColor {
  hex: string;                  // #RRGGBB
  rgb?: { r: number; g: number; b: number };
  name: string;                 // "Forest Green"
  usage: string;                // "Primary CTA buttons, headers"
  accessibility?: {
    wcagLevel: 'AA' | 'AAA' | 'fail';
    contrastRatio: number;      // vs white/black
    textReadable: boolean;
  };
}

export interface BrandColorPalette {
  primary: BrandColor;
  secondary: BrandColor;
  accent: BrandColor;
  text: BrandColor;
  background: BrandColor;
  // Cannabis-specific colors
  strainTypes?: {
    indica?: BrandColor;        // Relaxing/nighttime
    sativa?: BrandColor;        // Energizing/daytime
    hybrid?: BrandColor;        // Balanced
  };
  // Semantic colors
  success?: BrandColor;
  warning?: BrandColor;
  error?: BrandColor;
  info?: BrandColor;
  // Extended palette
  neutral?: BrandColor[];       // Grays/blacks
  extended?: BrandColor[];      // Additional brand colors
}

export interface BrandFont {
  family: string;               // "Inter", "Montserrat"
  weights: number[];            // [400, 500, 700]
  source: 'google' | 'adobe' | 'custom' | 'system';
  fallbacks?: string[];         // ["Arial", "sans-serif"]
  url?: string;                 // Custom font CDN URL
  license?: string;             // Font license info
}

export interface BrandTypography {
  headingFont: BrandFont;
  bodyFont: BrandFont;
  accentFont?: BrandFont;       // For special elements
  monoFont?: BrandFont;         // Code/technical content
  scale?: {
    base: number;               // Base font size (16px)
    ratio: number;              // Type scale ratio (1.25 = Major Third)
  };
  lineHeight?: {
    tight: number;              // 1.2
    normal: number;             // 1.5
    relaxed: number;            // 1.75
  };
}

export interface BrandSpacing {
  scale: 4 | 8;                 // Base spacing unit
  baseUnit?: number;            // Explicit base unit value (e.g., 4 or 8)
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full' | number;
  customRadius?: {
    button: number;
    card: number;
    input: number;
    modal: number;
  };
}

export interface BrandVisualIdentity {
  logo: BrandLogo;
  colors: BrandColorPalette;
  typography: BrandTypography;
  spacing: BrandSpacing;
  imagery?: {
    style: 'lifestyle' | 'product-focused' | 'white-background' | 'abstract' | 'illustrative' | 'mixed';
    guidelines?: string;        // Photo style guidelines
    examples?: string[];        // Example image URLs
    filters?: string;           // "High contrast, vibrant colors"
  };
  iconography?: {
    style: 'outlined' | 'filled' | 'rounded' | 'sharp';
    library?: string;           // "Heroicons", "Font Awesome"
  };
}

// ============================================================================
// BRAND VOICE & MESSAGING
// ============================================================================

export type BrandPersonalityTrait =
  | 'Friendly'
  | 'Professional'
  | 'Playful'
  | 'Sophisticated'
  | 'Educational'
  | 'Trustworthy'
  | 'Innovative'
  | 'Authentic'
  | 'Empowering'
  | 'Wellness-focused';

export type BrandTone =
  | 'professional'
  | 'casual'
  | 'playful'
  | 'sophisticated'
  | 'educational'
  | 'empathetic'
  | 'authoritative';

export interface BrandVocabulary {
  preferred: Array<{
    term: string;               // "Flower"
    instead: string;            // Instead of "Bud"
    context?: string;           // When to use
  }>;
  avoid: Array<{
    term: string;               // "Weed", "Pot"
    reason: string;             // "Unprofessional"
  }>;
  cannabisTerms: Array<{
    term: string;               // "Terpene"
    definition: string;
    pronunciation?: string;     // "TUR-peen"
    audience: 'all' | 'beginner' | 'advanced';
  }>;
  brandSpecific?: Array<{
    term: string;               // Proprietary terms
    definition: string;
    trademarked?: boolean;
  }>;
}

export interface BrandWritingStyle {
  sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  paragraphLength: 'concise' | 'moderate' | 'detailed';
  useEmojis: boolean;
  emojiFrequency?: 'rare' | 'occasional' | 'frequent';
  useExclamation: boolean;
  useQuestions: boolean;
  useHumor: boolean;
  formalityLevel: 1 | 2 | 3 | 4 | 5;  // 1=very casual, 5=very formal
  complexity: 'simple' | 'moderate' | 'advanced';
  perspective: 'first-person' | 'second-person' | 'third-person' | 'mixed';
}

export interface BrandVoiceSample {
  type: 'social_post' | 'product_description' | 'email' | 'blog' | 'customer_response';
  content: string;
  context?: string;             // When/why this voice is used
  audience?: string;            // Target audience
  aiGenerated?: boolean;
  approvedBy?: string;          // User ID
}

export interface BrandVoice {
  personality: BrandPersonalityTrait[];
  tone: BrandTone;
  subTones?: {
    social: BrandTone;          // Social media tone
    email: BrandTone;           // Email marketing tone
    customer_service: BrandTone; // Support/CS tone
    educational: BrandTone;     // Blog/educational content
  };
  vocabulary: BrandVocabulary;
  writingStyle: BrandWritingStyle;
  sampleContent: BrandVoiceSample[];
  // AI Analysis results
  voiceAnalysis?: {
    analyzedAt: Date;
    sourceContent: Array<{
      url: string;
      type: 'website' | 'instagram' | 'twitter' | 'facebook' | 'email';
      analyzedText: string;
    }>;
    detectedTraits: Array<{
      trait: string;
      confidence: number;       // 0-100
      evidence: string[];       // Example phrases
    }>;
    recommendations: string[];
  };
}

// ============================================================================
// MESSAGING GUIDELINES
// ============================================================================

export interface BrandMessaging {
  brandName?: string;           // Extracted brand name (e.g., "Thrive Syracuse")
  tagline: string;
  alternateTaglines?: string[]; // A/B test variants
  positioning: string;          // "Premium craft cannabis for connoisseurs"
  missionStatement: string;
  visionStatement?: string;
  valuePropositions: string[];
  keyMessages: Array<{
    audience: string;           // "First-time users", "Medical patients"
    message: string;
    supportingPoints?: string[];
  }>;
  targetAudience?: {
    primary?: string;           // Primary target audience description
    secondary?: string;         // Secondary target audience description
    segments?: Array<{          // Detailed audience segments
      segment: string;
      description: string;
      characteristics?: string[];
    }>;
  };
  elevatorPitch?: string;       // 30-second brand pitch
  originStory?: string;         // Brand origin/founding story
  brandStory?: {
    origin: string;             // Founding story
    values: string[];           // Core values
    differentiators: string[];  // What makes us unique
  };
  productNamingConvention?: string;
  doNotSay?: string[];          // Phrases to avoid
}

// ============================================================================
// COMPLIANCE & LEGAL
// ============================================================================

export type USState =
  | 'CA' | 'CO' | 'MA' | 'MI' | 'NV' | 'OR' | 'WA' | 'AZ' | 'IL' | 'NJ'
  | 'NY' | 'CT' | 'VT' | 'ME' | 'MT' | 'NM' | 'VA' | 'RI' | 'MD' | 'MO'
  | 'AK' | 'DC' | 'OK' | 'PA' | 'AL' | 'MS';

export interface ComplianceRule {
  state: USState;
  category: 'marketing' | 'claims' | 'age_verification' | 'labeling' | 'advertising';
  rule: string;
  required: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;         // Detailed explanation
  penalty?: string;
  reference?: string;           // Law/regulation reference
}

export interface BrandCompliance {
  primaryState: USState;
  operatingStates: USState[];
  requiredDisclaimers?: {
    age?: string;               // Age restriction disclaimer
    health?: string;            // Health/medical disclaimer
    legal?: string;             // Legal disclaimer
    general?: Array<{           // Other custom disclaimers
      text: string;
      context: 'all' | 'medical' | 'recreational' | 'online' | 'print';
      placement: 'header' | 'footer' | 'inline' | 'modal';
    }>;
  };
  stateSpecificRules: ComplianceRule[];
  ageGateLanguage: string;
  medicalClaims: 'none' | 'limited' | 'supported';
  medicalClaimsGuidelines?: string;
  contentRestrictions: Array<{
    restriction: string;
    reason: string;
    alternatives?: string;
  }>;
  restrictions?: string[];      // General restrictions list
  packagingRequirements?: string; // Packaging-specific requirements (as text)
  socialMediaGuidelines?: {
    platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube';
    restrictions: string[];
    approved: boolean;          // Platform approved us?
  }[];
  lastReviewedAt?: Date;
  reviewedBy?: string;          // Compliance officer/Deebo
}

// ============================================================================
// ASSETS LIBRARY
// ============================================================================

export interface BrandAsset {
  id: string;
  type: 'logo' | 'image' | 'video' | 'template' | 'document' | 'font';
  name: string;
  url: string;                  // Firebase Storage URL
  thumbnailUrl?: string;
  fileSize?: number;            // Bytes
  dimensions?: {
    width: number;
    height: number;
  };
  format?: string;              // 'svg', 'png', 'mp4', 'pdf'
  category?: string;            // "Product Photography", "Social Templates"
  tags?: string[];
  uploadedBy: string;
  uploadedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface BrandAssetLibrary {
  heroImages: BrandAsset[];
  productPhotography: {
    style: 'lifestyle' | 'white-background' | 'mixed';
    examples: BrandAsset[];
    guidelines?: string;
  };
  templates: {
    instagram: BrandAsset[];
    instagramStory: BrandAsset[];
    facebook: BrandAsset[];
    twitter: BrandAsset[];
    email: BrandAsset[];
    printable: BrandAsset[];    // Flyers, menus, sell sheets
  };
  videos?: BrandAsset[];
  documents?: BrandAsset[];     // Brand guidelines PDF, one-pagers
  customAssets?: BrandAsset[];
}

// ============================================================================
// VERSION HISTORY & A/B TESTING
// ============================================================================

export interface BrandGuideVersion {
  version: number;
  timestamp: Date;
  updatedBy: string;            // User ID
  changes: Array<{
    field: string;              // "voice.tone", "colors.primary"
    oldValue: unknown;
    newValue: unknown;
    reason?: string;            // Why changed
  }>;
  snapshot: Partial<BrandGuide>; // Full state at this version
  isActive: boolean;            // Current version?
  tags?: string[];              // "Major redesign", "Voice update"
}

export interface BrandVoiceABTest {
  id: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'completed' | 'paused';
  variants: Array<{
    id: string;
    name: string;               // "Control", "Variant A"
    voiceSettings: Partial<BrandVoice>;
    weight: number;             // Traffic allocation %
    performance?: {
      impressions: number;
      clicks: number;
      conversions: number;
      engagementRate: number;
      sentimentScore: number;
    };
  }>;
  goal: 'engagement' | 'conversion' | 'sentiment' | 'brand_recall';
  winner?: string;              // Variant ID
  notes?: string;
}

// ============================================================================
// COMPETITOR ANALYSIS (EZAL INTEGRATION)
// ============================================================================

export interface CompetitorBrandProfile {
  competitorId: string;         // Ezal competitor ID
  name: string;
  website?: string;
  extractedBrandGuide?: {
    colors: string[];           // Hex codes
    fonts: string[];
    voiceTraits: string[];
    messaging: string[];
  };
  lastAnalyzed: Date;
  insights: Array<{
    category: 'visual' | 'voice' | 'messaging' | 'positioning';
    observation: string;
    recommendation?: string;    // How we compare
  }>;
}

export interface BrandCompetitorAnalysis {
  enabled: boolean;
  competitors: CompetitorBrandProfile[];
  differentiationStrategy: string;
  positioningMap?: {
    axes: { x: string; y: string };  // "Premium-Value" x "Medical-Recreational"
    ourPosition: { x: number; y: number };
    competitorPositions: Array<{
      competitorId: string;
      position: { x: number; y: number };
    }>;
  };
  lastUpdated: Date;
}

// ============================================================================
// AI SUGGESTIONS & INTELLIGENCE
// ============================================================================

export interface BrandGuideSuggestion {
  id: string;
  category: 'visual' | 'voice' | 'messaging' | 'compliance' | 'accessibility';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string;            // Why this suggestion
  recommendation: {
    field: string;              // What to change
    currentValue?: unknown;
    suggestedValue: unknown;
  };
  source: 'ai' | 'competitor_analysis' | 'industry_best_practice' | 'compliance';
  confidence: number;           // 0-100
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface BrandAuditReport {
  id: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  consistencyScore: number;     // 0-100
  sections: {
    visualConsistency: {
      score: number;
      violations: Array<{
        content: string;        // URL or content ID
        issue: string;
        severity: 'low' | 'medium' | 'high';
      }>;
    };
    voiceConsistency: {
      score: number;
      violations: Array<{
        content: string;
        issue: string;
        expectedTone: string;
        actualTone: string;
      }>;
    };
    complianceScore: {
      score: number;
      violations: Array<{
        content: string;
        rule: string;
        state?: USState;
      }>;
    };
    accessibilityScore: {
      score: number;
      violations: Array<{
        element: string;
        issue: string;
        wcagLevel: 'A' | 'AA' | 'AAA';
      }>;
    };
  };
  recommendations: BrandGuideSuggestion[];
  previousReport?: string;      // Previous report ID
  improvements?: string[];      // What improved since last
}

// ============================================================================
// EXPORT & INTEGRATION
// ============================================================================

export interface BrandGuideExport {
  format: 'pdf' | 'json' | 'figma' | 'adobe_xd' | 'css' | 'tailwind';
  generatedAt: Date;
  url: string;
  expiresAt?: Date;
  metadata?: {
    version: number;
    includeAssets: boolean;
    includeTemplates: boolean;
  };
}

export interface FigmaExport {
  colorStyles: Array<{
    name: string;
    color: string;
  }>;
  textStyles: Array<{
    name: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
  }>;
  exportUrl?: string;           // Figma plugin URL
}

export interface LLMTrainingData {
  brandName: string;
  voiceProfile: {
    personality: string[];
    tone: string;
    writingStyle: Record<string, unknown>;
    examplePrompts: Array<{
      prompt: string;
      expectedResponse: string;
    }>;
  };
  vocabulary: {
    preferred: Record<string, string>;
    avoid: string[];
  };
  systemPrompt: string;         // Generated system prompt for fine-tuning
  finetuneFormat: 'openai' | 'anthropic' | 'generic';
  generatedAt: Date;
}

// ============================================================================
// BRAND GUIDE TEMPLATES
// ============================================================================

export type BrandGuideTemplateCategory =
  | 'premium'
  | 'medical'
  | 'recreational'
  | 'wellness'
  | 'craft'
  | 'corporate'
  | 'lifestyle';

export interface BrandGuideTemplate {
  id: string;
  name: string;
  category: BrandGuideTemplateCategory;
  description: string;
  preview?: string;             // Preview image URL
  defaults: {
    visualIdentity: Partial<BrandVisualIdentity>;
    voice: Partial<BrandVoice>;
    messaging: Partial<BrandMessaging>;
    compliance?: Partial<BrandCompliance>;
  };
  popularInStates?: USState[];
  usageCount?: number;
  featured?: boolean;
}

// ============================================================================
// SOURCE & EXTRACTION
// ============================================================================

export interface BrandGuideSource {
  method: 'url_extraction' | 'manual_entry' | 'ai_generated' | 'template' | 'hybrid';
  sourceUrl?: string;
  socialMediaSources?: Array<{
    platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'tiktok';
    handle: string;
    profileUrl: string;
    extractedData?: {
      bio?: string;
      posts?: Array<{
        text: string;
        engagement?: number;
        timestamp?: Date;
      }>;
      colors?: string[];
      visualStyle?: string;
    };
  }>;
  templateId?: string;          // If started from template
  extractedAt?: Date;
  extractionConfidence?: number; // 0-100
  lastManualUpdate?: Date;
  manualOverrides?: string[];   // Fields manually edited
  aiGenerationPrompt?: string;
}

// ============================================================================
// SHARING & ACCESS
// ============================================================================

export interface BrandGuideSharing {
  isPublic: boolean;
  shareToken?: string;          // Unique share URL token
  allowedVendors: Array<{
    email?: string;
    domain?: string;            // "@printshop.com"
    name: string;
    accessLevel: 'view' | 'download';
    invitedAt: Date;
    invitedBy: string;
    lastAccessed?: Date;
  }>;
  downloadEnabled: boolean;
  accessControl: 'public' | 'email-gated' | 'vendor-only' | 'private';
  viewCount?: number;
  downloadCount?: number;
  lastSharedAt?: Date;
  expiresAt?: Date;
  analytics?: Array<{
    accessorEmail?: string;
    accessedAt: Date;
    action: 'view' | 'download' | 'export';
    userAgent?: string;
  }>;
}

// ============================================================================
// MAIN BRAND GUIDE TYPE
// ============================================================================

export interface BrandGuide {
  id: string;                   // Same as brandId
  brandId: string;
  brandName: string;

  // Core brand elements
  visualIdentity: BrandVisualIdentity;
  voice: BrandVoice;
  messaging: BrandMessaging;
  compliance: BrandCompliance;
  assets: BrandAssetLibrary;

  // Brand archetype (Spec 01 — Brand Guide 2.0)
  archetype?: BrandArchetypeSelection;

  // Intelligence & optimization
  competitorAnalysis?: BrandCompetitorAnalysis;
  suggestions: BrandGuideSuggestion[];
  abTests?: BrandVoiceABTest[];

  // Version control & history
  version: number;
  versionHistory: BrandGuideVersion[];
  brandEvolutionTimeline?: Array<{
    date: Date;
    milestone: string;
    changes: string[];
    visualSnapshot?: string;    // Screenshot/image of brand at this time
  }>;

  // Source & generation
  source: BrandGuideSource;
  template?: BrandGuideTemplateCategory;

  // Sharing & access
  sharing: BrandGuideSharing;

  // Exports & integrations
  exports?: BrandGuideExport[];
  figmaIntegration?: FigmaExport;
  llmTrainingData?: LLMTrainingData;

  // Audit & reporting
  lastAudit?: BrandAuditReport;
  nextAuditDate?: Date;
  auditFrequency?: 'weekly' | 'monthly' | 'quarterly';

  // Metadata
  completenessScore: number;    // 0-100 based on filled fields
  status: 'draft' | 'in_review' | 'active' | 'archived';
  createdAt: Date | Timestamp;
  createdBy: string;            // User ID
  lastUpdatedAt: Date | Timestamp;
  lastUpdatedBy: string;
  archivedAt?: Date;
  archivedReason?: string;
}

// ============================================================================
// HELPER TYPES FOR OPERATIONS
// ============================================================================

export interface CreateBrandGuideInput {
  brandId: string;
  brandName: string;
  method: 'url' | 'template' | 'manual';
  sourceUrl?: string;
  socialHandles?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  templateId?: string;
  initialData?: Partial<BrandGuide>;
}

export interface UpdateBrandGuideInput {
  brandId: string;
  updates: Partial<BrandGuide>;
  reason?: string;              // Why updating
  createVersion?: boolean;      // Create version history entry
}

export interface ExtractBrandGuideFromUrlInput {
  url: string;
  socialHandles?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
  };
  includeCompetitorAnalysis?: boolean;
  autoApplySuggestions?: boolean;
}

export interface GenerateBrandAssetsInput {
  brandId: string;
  assetTypes: Array<'instagram_post' | 'instagram_story' | 'facebook_post' | 'email_header' | 'flyer' | 'sell_sheet'>;
  quantity?: number;            // Batch generation
  variations?: boolean;         // Generate A/B test variants
  templates?: string[];         // Template IDs to use
}

export interface RunBrandAuditInput {
  brandId: string;
  period?: {
    start: Date;
    end: Date;
  };
  includeCompetitors?: boolean;
  generateReport?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type BrandGuideSection =
  | 'visualIdentity'
  | 'voice'
  | 'messaging'
  | 'compliance'
  | 'assets'
  | 'competitorAnalysis'
  | 'suggestions'
  | 'abTests'
  | 'versionHistory'
  | 'sharing'
  | 'exports';

export type BrandGuideAction =
  | 'create'
  | 'update'
  | 'extract_from_url'
  | 'apply_template'
  | 'generate_suggestion'
  | 'run_audit'
  | 'generate_assets'
  | 'export'
  | 'share'
  | 'archive';

// Firestore serialization helpers
export type BrandGuideFirestore = Omit<BrandGuide, 'createdAt' | 'lastUpdatedAt'> & {
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
};
