/**
 * Inbox Tools for Agents
 *
 * Tool definitions that enable agents to create structured artifacts
 * for carousels, bundles, and creative content within the inbox.
 */

import { z } from 'zod';
import type { BundleType } from '@/types/bundles';
import type { SocialPlatform, MediaType, ComplianceStatus } from '@/types/creative-content';
import type { QRCode } from '@/types/qr-code';

// ============================================================================
// CAROUSEL ARTIFACT TOOL
// Used by Smokey to create featured product carousels
// ============================================================================

export const createCarouselArtifactSchema = z.object({
    title: z.string().describe("Display title for the carousel (e.g., 'Weekend Specials', 'Top Sellers')"),
    description: z.string().optional().describe("Optional description of the carousel theme or purpose"),
    productIds: z.array(z.string()).min(1).describe("Array of product IDs to include in the carousel"),
    displayOrder: z.number().optional().describe("Position in the carousel list (lower = higher priority)"),
    rationale: z.string().describe("Explanation of why these products were selected for this carousel"),
});

export type CreateCarouselArtifactInput = z.infer<typeof createCarouselArtifactSchema>;

export const createCarouselArtifactToolDef = {
    name: "createCarouselArtifact",
    description: `Create a featured product carousel for the dispensary. Use this when the user asks for:
- Featured product collections
- Category-specific showcases
- Promotional carousels
- Recommended products display
The carousel will appear as a draft for user approval before publishing.`,
    schema: createCarouselArtifactSchema,
};

// ============================================================================
// BUNDLE ARTIFACT TOOL
// Used by Money Mike to create promotional bundle deals
// ============================================================================

const bundleProductSchema = z.object({
    productId: z.string().describe("The product ID from inventory"),
    name: z.string().describe("Product display name"),
    category: z.string().describe("Product category (e.g., 'flower', 'concentrate', 'edible')"),
    requiredQty: z.number().min(1).describe("Quantity required in the bundle"),
    originalPrice: z.number().describe("Original unit price before discount"),
    bundlePrice: z.number().optional().describe("Special price when purchased in this bundle"),
    discountPercent: z.number().optional().describe("Percentage discount for this product in bundle"),
});

export const createBundleArtifactSchema = z.object({
    name: z.string().describe("Bundle deal name (e.g., 'Chill Weekend Pack', 'Edibles Sampler')"),
    description: z.string().describe("Marketing description of the bundle value proposition"),
    type: z.enum(['bogo', 'mix_match', 'percentage', 'fixed_price', 'tiered'] as const)
        .describe("Bundle type: bogo=buy one get one, mix_match=pick from selection, percentage=% off, fixed_price=set price, tiered=volume discounts"),
    products: z.array(bundleProductSchema).min(1).describe("Products included in the bundle"),
    bundlePrice: z.number().describe("Final bundle price to charge customer"),
    originalTotal: z.number().describe("Sum of original prices (before discount)"),
    savingsAmount: z.number().describe("Dollar amount customer saves"),
    savingsPercent: z.number().describe("Percentage customer saves (e.g., 20 for 20%)"),
    minMarginPercent: z.number().optional().describe("Minimum margin threshold to maintain profitability"),
    rationale: z.string().describe("Explanation of product pairing strategy and margin analysis"),
    badgeText: z.string().optional().describe("Optional promotional badge (e.g., 'Save 20%!', 'Best Value')"),
});

export type CreateBundleArtifactInput = z.infer<typeof createBundleArtifactSchema>;

export const createBundleArtifactToolDef = {
    name: "createBundleArtifact",
    description: `Create a promotional bundle deal combining multiple products at a discounted price. Use this when the user asks for:
- Product bundles or packs
- BOGO (buy one get one) deals
- Mix & match promotions
- Volume discounts or tiered pricing
- Cross-sell combinations

IMPORTANT: Always analyze margins and ensure the bundle maintains profitability. Flag if savings exceed typical thresholds.`,
    schema: createBundleArtifactSchema,
};

// ============================================================================
// CREATIVE CONTENT ARTIFACT TOOL
// Used by Craig to create social media content
// ============================================================================

export const createCreativeArtifactSchema = z.object({
    platform: z.enum(['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'] as const)
        .describe("Target social media platform"),
    caption: z.string().describe("Main text/caption for the post"),
    hashtags: z.array(z.string()).optional().describe("Relevant hashtags (without # symbol)"),
    mediaType: z.enum(['image', 'video', 'carousel', 'text'] as const)
        .describe("Type of media content"),
    mediaUrls: z.array(z.string()).optional().describe("URLs to media assets (images/videos)"),
    thumbnailUrl: z.string().optional().describe("Thumbnail preview URL"),
    style: z.enum(['professional', 'playful', 'educational', 'hype']).optional()
        .describe("Content style/tone"),
    targetAudience: z.string().optional().describe("Description of target audience"),
    productId: z.string().optional().describe("Associated product ID if applicable"),
    productName: z.string().optional().describe("Product name for reference"),
    complianceNotes: z.string().optional().describe("Compliance considerations and warnings"),
    rationale: z.string().describe("Explanation of creative strategy and platform-specific choices"),
});

export type CreateCreativeArtifactInput = z.infer<typeof createCreativeArtifactSchema>;

export const createCreativeArtifactToolDef = {
    name: "createCreativeArtifact",
    description: `Create social media content for a specific platform. Use this when the user asks for:
- Social media posts (Instagram, TikTok, LinkedIn, Twitter, Facebook)
- Product announcements or promotions
- Brand storytelling content
- Educational cannabis content
- Campaign creative assets

IMPORTANT: Always consider platform-specific requirements and cannabis advertising compliance rules. Flag potential compliance issues.`,
    schema: createCreativeArtifactSchema,
};

// ============================================================================
// QR CODE ARTIFACT TOOL
// Used by Craig to create trackable QR codes for campaigns
// ============================================================================

export const createQRCodeArtifactSchema = z.object({
    type: z.enum(['link', 'menu', 'promotion', 'event', 'social', 'vcard'] as const)
        .describe("QR code type: link=general URL, menu=product menu, promotion=special offer, event=event details, social=social profile, vcard=contact card"),
    title: z.string().describe("Display title for the QR code (e.g., 'Shop Our Menu', 'Follow Us on Instagram')"),
    description: z.string().optional().describe("Optional description of what the QR code links to"),
    targetUrl: z.string().url().describe("Full URL the QR code should direct to"),
    style: z.enum(['standard', 'rounded', 'dots', 'gradient'] as const).optional()
        .describe("Visual style of the QR code"),
    primaryColor: z.string().optional().describe("Primary color for the QR code in hex format (e.g., '#000000')"),
    backgroundColor: z.string().optional().describe("Background color in hex format (e.g., '#FFFFFF')"),
    logoUrl: z.string().url().optional().describe("Optional logo to embed in center of QR code"),
    campaign: z.string().optional().describe("Campaign name for tracking purposes"),
    tags: z.array(z.string()).optional().describe("Tags for organizing QR codes"),
    expiresAt: z.string().optional().describe("Optional expiration date in ISO format (YYYY-MM-DD)"),
    rationale: z.string().describe("Explanation of QR code purpose and campaign strategy"),
});

export type CreateQRCodeArtifactInput = z.infer<typeof createQRCodeArtifactSchema>;

export const createQRCodeArtifactToolDef = {
    name: "createQRCodeArtifact",
    description: `Create a trackable QR code for marketing campaigns. Use this when the user asks for:
- QR codes for menus, websites, or landing pages
- Trackable links for print materials (flyers, posters, packaging)
- Social media profile QR codes
- Event or promotion QR codes
- Contactless ordering or menu access

The QR code will include tracking analytics (scans, locations, devices) and can be customized with brand colors and logos.`,
    schema: createQRCodeArtifactSchema,
};

// ============================================================================
// BLOG POST ARTIFACT TOOL
// Used by Craig to create blog content
// ============================================================================

export const createBlogPostArtifactSchema = z.object({
    title: z.string().min(10).max(100).describe("Blog post title (SEO-optimized, 50-60 characters ideal)"),
    subtitle: z.string().max(150).optional().describe("Optional subtitle or subheading"),
    excerpt: z.string().min(50).max(300).describe("2-3 sentence summary for preview and meta description"),
    content: z.string().min(200).describe("Full blog post content in Markdown format"),
    category: z.enum([
        'education',
        'product_spotlight',
        'industry_news',
        'company_update',
        'strain_profile',
        'compliance',
        'cannabis_culture',
        'wellness',
    ] as const).describe("Blog post category for organization and filtering"),
    tags: z.array(z.string()).max(10).optional().describe("Tags for SEO and content discovery"),
    seoKeywords: z.array(z.string()).max(10).optional().describe("Primary SEO keywords to target"),
    featuredImageUrl: z.string().url().optional().describe("URL to featured image (16:9 aspect ratio recommended)"),
    targetAudience: z.string().optional().describe("Intended audience (e.g., 'first-time users', 'connoisseurs')"),
    tone: z.enum(['professional', 'casual', 'educational', 'playful'] as const).optional().describe("Tone of voice for the post"),
    scheduledAt: z.string().optional().describe("Optional scheduled publish date in ISO format (YYYY-MM-DDTHH:mm:ss)"),
    rationale: z.string().describe("Explanation of why this blog post will resonate with the audience and drive SEO/engagement"),
});

export type CreateBlogPostArtifactInput = z.infer<typeof createBlogPostArtifactSchema>;

export const createBlogPostArtifactToolDef = {
    name: "createBlogPostArtifact",
    description: `Create a blog post draft for content marketing and SEO. Use this when the user asks for:
- Blog articles or educational content
- Product spotlight posts or strain profiles
- Industry news commentary or company updates
- SEO-focused content to drive organic traffic
- Cannabis culture or wellness articles

The blog post will go through compliance checking (Deebo) before publishing. Content should be:
- Cannabis-compliant (no medical claims, 21+ audience)
- SEO-optimized with target keywords
- Valuable and engaging for the target audience
- Well-structured with clear sections (use Markdown headers)`,
    schema: createBlogPostArtifactSchema,
};

// ============================================================================
// COMBINED INBOX TOOL DEFINITIONS
// Import these into agent configurations
// ============================================================================

export const inboxToolDefs = [
    createCarouselArtifactToolDef,
    createBundleArtifactToolDef,
    createCreativeArtifactToolDef,
    createQRCodeArtifactToolDef,
    createBlogPostArtifactToolDef,
];

// Per-agent tool sets
export const smokeyInboxToolDefs = [createCarouselArtifactToolDef];
export const moneyMikeInboxToolDefs = [createBundleArtifactToolDef];
export const craigInboxToolDefs = [createCreativeArtifactToolDef, createQRCodeArtifactToolDef, createBlogPostArtifactToolDef];

// ============================================================================
// TOOL IMPLEMENTATION INTERFACES
// TypeScript interfaces for agent tool implementations
// ============================================================================

export interface InboxTools {
    createCarouselArtifact(input: CreateCarouselArtifactInput): Promise<CarouselArtifactResult>;
    createBundleArtifact(input: CreateBundleArtifactInput): Promise<BundleArtifactResult>;
    createCreativeArtifact(input: CreateCreativeArtifactInput): Promise<CreativeArtifactResult>;
    createQRCodeArtifact(input: CreateQRCodeArtifactInput): Promise<QRCodeArtifactResult>;
}

export interface CarouselArtifactResult {
    success: boolean;
    artifactId: string;
    carousel: {
        title: string;
        description?: string;
        productIds: string[];
        displayOrder: number;
    };
    rationale: string;
}

export interface BundleArtifactResult {
    success: boolean;
    artifactId: string;
    bundle: {
        name: string;
        description: string;
        type: BundleType;
        products: Array<{
            productId: string;
            name: string;
            category: string;
            requiredQty: number;
            originalPrice: number;
            bundlePrice?: number;
        }>;
        bundlePrice: number;
        originalTotal: number;
        savingsAmount: number;
        savingsPercent: number;
    };
    marginAnalysis?: {
        isViable: boolean;
        marginPercent: number;
        warnings: string[];
    };
    rationale: string;
}

export interface CreativeArtifactResult {
    success: boolean;
    artifactId: string;
    content: {
        platform: SocialPlatform;
        caption: string;
        hashtags?: string[];
        mediaType: MediaType;
        mediaUrls?: string[];
        thumbnailUrl?: string;
    };
    complianceCheck?: {
        status: ComplianceStatus;
        issues: string[];
    };
    rationale: string;
}

export interface QRCodeArtifactResult {
    success: boolean;
    artifactId: string;
    qrCode: {
        id: string;
        type: QRCode['type'];
        title: string;
        description?: string;
        targetUrl: string;
        shortCode: string;
        imageUrl: string;
        trackingUrl: string;
        style?: string;
        primaryColor?: string;
        backgroundColor?: string;
        campaign?: string;
        tags?: string[];
    };
    rationale: string;
}

// ============================================================================
// ARTIFACT MARKER UTILITIES
// Functions to format tool outputs as parseable artifact markers
// ============================================================================

/**
 * Format carousel artifact as marker for parsing
 */
export function formatCarouselArtifactMarker(result: CarouselArtifactResult): string {
    const data = JSON.stringify({
        ...result.carousel,
        rationale: result.rationale,
    });
    return `:::artifact:carousel:${result.carousel.title}\n${data}\n:::`;
}

/**
 * Format bundle artifact as marker for parsing
 */
export function formatBundleArtifactMarker(result: BundleArtifactResult): string {
    const data = JSON.stringify({
        ...result.bundle,
        marginAnalysis: result.marginAnalysis,
        rationale: result.rationale,
    });
    return `:::artifact:bundle:${result.bundle.name}\n${data}\n:::`;
}

/**
 * Format creative artifact as marker for parsing
 */
export function formatCreativeArtifactMarker(result: CreativeArtifactResult): string {
    const data = JSON.stringify({
        ...result.content,
        complianceCheck: result.complianceCheck,
        rationale: result.rationale,
    });
    return `:::artifact:creative_content:${result.content.platform} Post\n${data}\n:::`;
}

/**
 * Format QR code artifact as marker for parsing
 */
export function formatQRCodeArtifactMarker(result: QRCodeArtifactResult): string {
    const data = JSON.stringify({
        ...result.qrCode,
        rationale: result.rationale,
    });
    return `:::artifact:qr_code:${result.qrCode.title}\n${data}\n:::`;
}
