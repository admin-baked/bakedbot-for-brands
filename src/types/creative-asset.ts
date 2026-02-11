/**
 * Creative Asset Types
 *
 * Types for AI-generated creative assets for cannabis brands
 */

export type AssetCategory =
  | 'menu_photography'
  | 'lifestyle_imagery'
  | 'social_media'
  | 'education'
  | 'compliance'
  | 'print'
  | 'video'
  | 'web'
  | 'email'
  | 'in_store';

export type AssetFormat =
  | 'image'
  | 'video'
  | 'pdf'
  | 'svg'
  | 'gif'
  | 'html';

export type AssetPlatform =
  | 'instagram_feed'
  | 'instagram_story'
  | 'instagram_reel'
  | 'facebook_feed'
  | 'facebook_story'
  | 'tiktok'
  | 'twitter'
  | 'linkedin'
  | 'pinterest'
  | 'email'
  | 'web'
  | 'print'
  | 'display_screen'
  | 'mobile_app';

export type ComplianceLevel =
  | 'high' // Passes all major platforms (Weedmaps, Leafly, Meta)
  | 'medium' // May need review
  | 'low' // Internal use only
  | 'educational'; // Fully compliant educational content

export interface AssetTemplate {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  format: AssetFormat;
  platforms?: AssetPlatform[];

  // Visual specs
  dimensions?: {
    width: number;
    height: number;
    unit: 'px' | 'in' | 'mm';
  };
  aspectRatio?: string; // e.g., "16:9", "1:1", "9:16"

  // Compliance
  complianceLevel: ComplianceLevel;
  requiredDisclaimers?: string[];
  stateRestrictions?: string[]; // States where this format is restricted

  // Generation specs
  aiModel: 'gemini-flash' | 'gemini-pro' | 'veo' | 'sora' | 'dalle3';
  estimatedCost: number; // USD
  generationTime: number; // seconds

  // Features
  features: string[];
  tags: string[];
  isPremium: boolean;
  conversionOptimized: boolean; // Has proven high conversion rates

  // Usage
  usageCount?: number;
  popularityScore?: number;
  lastUsedAt?: Date;

  // Preview
  previewUrl?: string;
  exampleUrls?: string[];
}

export interface CreativeAsset {
  id: string;
  brandId: string;
  templateId: string;

  // Generation details
  generatedAt: Date;
  generatedBy: string; // User ID
  prompt: string;
  aiModel: string;
  generationCost: number;

  // Asset details
  name: string;
  category: AssetCategory;
  format: AssetFormat;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number; // bytes

  // Metadata
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // for videos, in seconds

  // Brand integration
  usedBrandColors?: string[]; // Hex codes from brand guide
  usedBrandFonts?: string[];
  brandVoiceScore?: number; // 0-100 how well it matches brand voice

  // Compliance
  complianceStatus: 'approved' | 'pending' | 'rejected' | 'needs_review';
  complianceCheckedAt?: Date;
  complianceNotes?: string;
  disclaimers: string[];

  // Performance
  views?: number;
  clicks?: number;
  conversions?: number;
  engagementRate?: number;

  // Variants
  variants?: Array<{
    id: string;
    name: string; // "A", "B", "C"
    fileUrl: string;
    performance?: {
      views: number;
      clicks: number;
      conversions: number;
    };
  }>;

  // Status
  status: 'draft' | 'ready' | 'in_use' | 'archived';
  publishedAt?: Date;
  archivedAt?: Date;

  // Tags and organization
  tags: string[];
  folder?: string;

  // Sharing
  shareUrl?: string;
  sharedWith?: string[]; // User IDs or emails
}

export interface GenerateAssetRequest {
  brandId: string;
  templateId: string;
  customPrompt?: string;

  // Customization
  productNames?: string[]; // Specific products to feature
  dealText?: string; // e.g., "20% OFF"
  ctaText?: string; // e.g., "Shop Now"
  headline?: string;
  subheadline?: string;

  // Advanced
  colorOverrides?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  stylePreference?: 'minimal' | 'bold' | 'organic' | 'luxury' | 'street';

  // Output options
  generateVariants?: boolean; // Generate A/B test variants
  variantCount?: number; // 2-5
}

export interface AssetFilter {
  category?: AssetCategory;
  format?: AssetFormat;
  platform?: AssetPlatform;
  complianceLevel?: ComplianceLevel;
  isPremium?: boolean;
  tags?: string[];
  search?: string;
}

// Predefined asset templates
export const ASSET_TEMPLATES: Record<string, Omit<AssetTemplate, 'id'>> = {
  // MENU PHOTOGRAPHY
  menu_product_shot: {
    name: 'Menu Product Shots',
    description: 'Studio-quality product photos for online menus (Dutchie, Leafly, Jane)',
    category: 'menu_photography',
    format: 'image',
    platforms: ['web', 'mobile_app'],
    dimensions: { width: 1000, height: 1000, unit: 'px' },
    aspectRatio: '1:1',
    complianceLevel: 'high',
    aiModel: 'gemini-pro',
    estimatedCost: 0.04,
    generationTime: 8,
    features: ['White background removal', 'Studio lighting', 'Product isolation', 'Shadow enhancement'],
    tags: ['menu', 'product', 'ecommerce'],
    isPremium: false,
    conversionOptimized: true,
  },

  menu_lifestyle_shot: {
    name: 'Lifestyle Product Photography',
    description: 'Products in natural settings for premium menu displays',
    category: 'menu_photography',
    format: 'image',
    platforms: ['web', 'mobile_app'],
    dimensions: { width: 1200, height: 800, unit: 'px' },
    aspectRatio: '3:2',
    complianceLevel: 'high',
    aiModel: 'gemini-pro',
    estimatedCost: 0.04,
    generationTime: 10,
    features: ['Natural lighting', 'Contextual backgrounds', 'Depth of field'],
    tags: ['menu', 'lifestyle', 'premium'],
    isPremium: true,
    conversionOptimized: true,
  },

  // SOCIAL MEDIA
  instagram_feed_post: {
    name: 'Instagram Feed Post',
    description: 'Eye-catching feed posts optimized for engagement',
    category: 'social_media',
    format: 'image',
    platforms: ['instagram_feed'],
    dimensions: { width: 1080, height: 1080, unit: 'px' },
    aspectRatio: '1:1',
    complianceLevel: 'medium',
    requiredDisclaimers: ['21+ only', 'State-specific warnings'],
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 5,
    features: ['Brand colors', 'Engagement hooks', 'CTA placement'],
    tags: ['social', 'instagram', 'engagement'],
    isPremium: false,
    conversionOptimized: true,
  },

  instagram_story: {
    name: 'Instagram Story',
    description: 'Vertical stories with interactive elements and swipe-ups',
    category: 'social_media',
    format: 'image',
    platforms: ['instagram_story'],
    dimensions: { width: 1080, height: 1920, unit: 'px' },
    aspectRatio: '9:16',
    complianceLevel: 'medium',
    requiredDisclaimers: ['21+ only'],
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 5,
    features: ['Poll stickers', 'Question boxes', 'Swipe-up CTAs'],
    tags: ['social', 'instagram', 'stories'],
    isPremium: false,
    conversionOptimized: true,
  },

  instagram_reel: {
    name: 'Instagram Reel',
    description: 'Short-form vertical video content (15-60 seconds)',
    category: 'social_media',
    format: 'video',
    platforms: ['instagram_reel'],
    dimensions: { width: 1080, height: 1920, unit: 'px' },
    aspectRatio: '9:16',
    complianceLevel: 'medium',
    aiModel: 'veo',
    estimatedCost: 0.625,
    generationTime: 120,
    features: ['Trending audio', 'Text overlays', 'Transitions', 'Captions'],
    tags: ['social', 'instagram', 'video', 'reels'],
    isPremium: true,
    conversionOptimized: true,
  },

  // EDUCATIONAL
  terpene_guide: {
    name: 'Terpene Education Tiles',
    description: 'Visual guides explaining terpene profiles and effects',
    category: 'education',
    format: 'image',
    platforms: ['instagram_feed', 'facebook_feed', 'web'],
    dimensions: { width: 1080, height: 1080, unit: 'px' },
    aspectRatio: '1:1',
    complianceLevel: 'educational',
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 6,
    features: ['Molecule diagrams', 'Effect icons', 'Color-coded profiles'],
    tags: ['education', 'terpenes', 'science'],
    isPremium: false,
    conversionOptimized: false,
  },

  strain_lineage: {
    name: 'Strain Lineage Tree',
    description: 'Visual family trees showing strain genetics and heritage',
    category: 'education',
    format: 'image',
    platforms: ['web', 'instagram_feed'],
    dimensions: { width: 1200, height: 1600, unit: 'px' },
    aspectRatio: '3:4',
    complianceLevel: 'educational',
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 7,
    features: ['Parent strains', 'Genetic percentages', 'Breeding timeline'],
    tags: ['education', 'genetics', 'strains'],
    isPremium: false,
    conversionOptimized: false,
  },

  dosing_guide: {
    name: 'Dosing & Effects Chart',
    description: 'Beginner-friendly guides for responsible consumption',
    category: 'education',
    format: 'image',
    platforms: ['web', 'email', 'print'],
    dimensions: { width: 1200, height: 1600, unit: 'px' },
    aspectRatio: '3:4',
    complianceLevel: 'educational',
    requiredDisclaimers: ['Start low, go slow', 'Consult healthcare provider'],
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 6,
    features: ['Dosage scales', 'Effect timelines', 'Safety tips'],
    tags: ['education', 'dosing', 'safety'],
    isPremium: false,
    conversionOptimized: false,
  },

  // COMPLIANCE ADS
  weedmaps_banner: {
    name: 'Weedmaps Display Ad',
    description: 'Compliant banner ads pre-approved for Weedmaps',
    category: 'compliance',
    format: 'image',
    platforms: ['web'],
    dimensions: { width: 728, height: 90, unit: 'px' },
    aspectRatio: '728:90',
    complianceLevel: 'high',
    requiredDisclaimers: ['21+', 'State license number'],
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 5,
    features: ['Auto-disclaimer placement', 'Compliant imagery', 'Clear CTA'],
    tags: ['compliance', 'ads', 'weedmaps'],
    isPremium: false,
    conversionOptimized: true,
  },

  leafly_featured: {
    name: 'Leafly Featured Listing',
    description: 'Enhanced listing images for Leafly storefronts',
    category: 'compliance',
    format: 'image',
    platforms: ['web'],
    dimensions: { width: 1200, height: 630, unit: 'px' },
    aspectRatio: '1200:630',
    complianceLevel: 'high',
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 5,
    features: ['Store branding', 'Deal highlights', 'Compliant text'],
    tags: ['compliance', 'leafly', 'listing'],
    isPremium: false,
    conversionOptimized: true,
  },

  // IN-STORE
  digital_menu_board: {
    name: 'Digital Menu Board (4K)',
    description: 'High-impact visuals for in-store TV displays',
    category: 'in_store',
    format: 'image',
    platforms: ['display_screen'],
    dimensions: { width: 3840, height: 2160, unit: 'px' },
    aspectRatio: '16:9',
    complianceLevel: 'low', // Internal use
    aiModel: 'gemini-pro',
    estimatedCost: 0.04,
    generationTime: 10,
    features: ['4K resolution', 'Animated elements', 'QR codes', 'Pricing grids'],
    tags: ['in-store', 'menu', '4k'],
    isPremium: true,
    conversionOptimized: true,
  },

  shelf_talker: {
    name: 'Product Shelf Talkers',
    description: 'Eye-catching POS displays for product shelves',
    category: 'in_store',
    format: 'pdf',
    platforms: ['print'],
    dimensions: { width: 3, height: 5, unit: 'in' },
    complianceLevel: 'low',
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 5,
    features: ['Print-ready PDF', 'Effects icons', 'THC/CBD percentages'],
    tags: ['in-store', 'print', 'pos'],
    isPremium: false,
    conversionOptimized: true,
  },

  window_cling: {
    name: 'Window Cling Promotions',
    description: 'Eye-catching storefront promotions',
    category: 'in_store',
    format: 'pdf',
    platforms: ['print'],
    dimensions: { width: 18, height: 24, unit: 'in' },
    complianceLevel: 'medium',
    requiredDisclaimers: ['State license', 'Age restriction'],
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 6,
    features: ['Print-ready', 'Bold typography', 'QR codes'],
    tags: ['in-store', 'print', 'promotion'],
    isPremium: false,
    conversionOptimized: true,
  },

  // VIDEO
  strain_story_video: {
    name: 'Strain Story Video',
    description: 'Vertical videos explaining strain history and effects',
    category: 'video',
    format: 'video',
    platforms: ['instagram_reel', 'tiktok'],
    dimensions: { width: 1080, height: 1920, unit: 'px' },
    aspectRatio: '9:16',
    complianceLevel: 'medium',
    aiModel: 'veo',
    estimatedCost: 0.75,
    generationTime: 150,
    features: ['Voiceover', 'Motion graphics', 'Captions', 'Brand integration'],
    tags: ['video', 'education', 'strains'],
    isPremium: true,
    conversionOptimized: true,
  },

  product_demo: {
    name: 'Product Demonstration',
    description: 'How-to videos for consumption methods and products',
    category: 'video',
    format: 'video',
    platforms: ['instagram_reel', 'tiktok', 'web'],
    dimensions: { width: 1080, height: 1920, unit: 'px' },
    aspectRatio: '9:16',
    complianceLevel: 'educational',
    requiredDisclaimers: ['Educational purposes only', '21+'],
    aiModel: 'veo',
    estimatedCost: 0.625,
    generationTime: 120,
    features: ['Step-by-step', 'Text overlays', 'Safety tips'],
    tags: ['video', 'education', 'how-to'],
    isPremium: true,
    conversionOptimized: false,
  },

  // EMAIL
  email_header: {
    name: 'Email Campaign Header',
    description: 'Branded email headers for newsletters and promotions',
    category: 'email',
    format: 'image',
    platforms: ['email'],
    dimensions: { width: 600, height: 200, unit: 'px' },
    aspectRatio: '3:1',
    complianceLevel: 'high',
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 4,
    features: ['Mobile responsive', 'CTA buttons', 'Brand colors'],
    tags: ['email', 'marketing', 'header'],
    isPremium: false,
    conversionOptimized: true,
  },

  // WEB
  hero_banner: {
    name: 'Website Hero Banner',
    description: 'Full-width homepage banners with CTAs',
    category: 'web',
    format: 'image',
    platforms: ['web'],
    dimensions: { width: 1920, height: 600, unit: 'px' },
    aspectRatio: '16:5',
    complianceLevel: 'medium',
    aiModel: 'gemini-pro',
    estimatedCost: 0.04,
    generationTime: 8,
    features: ['Responsive sizing', 'CTA overlay', 'Brand integration'],
    tags: ['web', 'hero', 'homepage'],
    isPremium: true,
    conversionOptimized: true,
  },

  product_card: {
    name: 'Product Card Graphics',
    description: 'Thumbnail images for product grids and carousels',
    category: 'web',
    format: 'image',
    platforms: ['web'],
    dimensions: { width: 400, height: 400, unit: 'px' },
    aspectRatio: '1:1',
    complianceLevel: 'high',
    aiModel: 'gemini-flash',
    estimatedCost: 0.02,
    generationTime: 5,
    features: ['Consistent styling', 'Badge overlays', 'Hover states'],
    tags: ['web', 'product', 'ecommerce'],
    isPremium: false,
    conversionOptimized: true,
  },
};
