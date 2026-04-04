/**
 * Shared types for Server Actions to comply with Next.js 'use server' rules.
 * 'use server' files can only export async functions. Interfaces and types 
 * must be exported from separate non-'use server' files.
 */

import type { CRMFilters } from '@/server/services/crm-service';
import type { CustomerSegment } from '@/types/customers';
import type { POSProvider } from '@/lib/pos/types';

// =============================================================================
// Blog Research Types
// =============================================================================

export interface NewsIdea {
    id?: string;
    title: string;
    description?: string;
    snippet?: string;
    suggestedAngle?: string;
    source?: string;
    url?: string;
    publishedAt?: string;
    relevanceScore?: number;
}

export interface Citation {
    text?: string;
    url: string;
    source?: string;
    sourceTitle?: string;
    quote?: string;
    author?: string;
    company?: string;
}

export interface ResearchBrief {
    topic: string;
    summary?: string;
    keyPoints?: string[];
    keyFindings: string[];
    rawResearch: string;
    citations: Citation[];
    suggestedTitle: string;
    suggestedKeywords: string[];
    suggestedAngles: string[];
    competitorGaps: string[];
    analyticsSignals?: any;
}

export interface ContentScorecard {
    hubCount: number;
    spokeCount: number;
    programmaticCount: number;
    comparisonCount: number;
    reportCount: number;
    standardCount: number;
    totalPublished: number;
    hubTarget: number;
    spokeTarget: number;
    programmaticTarget: number;
}

export interface NewsIdeasResult {
    ideas: NewsIdea[];
    cachedAt: string | null;
}

// =============================================================================
// CRM AI Types (Jack CRMAI)
// =============================================================================

export type CRMAIInsightType = 'flag' | 'opportunity' | 'alert';

export interface CRMAIInsight {
    id: string;
    type: CRMAIInsightType;
    message: string;
    action?: string;
    filterHint?: Partial<CRMFilters>;
    count?: number;
}

export type CRMAISearchResult =
    | { success: true; result: { summary: string; users: any[]; filtersApplied: string } }
    | { success: false; error: string };

// =============================================================================
// NY Outreach Types
// =============================================================================

export interface NYOutreachCRMLead {
    id: string;
    dispensaryName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    city: string;
    address: string | null;
    websiteUrl: string | null;
    licenseNumber: string | null;
    status: string;
    outreachSent: boolean;
    enriched: boolean;
    notes: string | null;
    createdAt: number;
    updatedAt: number;
    dataQualityScore?: number;
    isDuplicate?: boolean;
    duplicateOf?: string | null;
}

export interface SuperUserStatusCounts {
    pendingOutreachDrafts: number;
    unenrichedLeads: number;
    pendingBlogDrafts: number;
    leadQueueDepth: number;
    apolloCreditsRemaining: number;
    glmPercentUsed?: number;
    glmProvider?: 'glm' | 'anthropic';
    glmCycleEnd?: number;
}

// =============================================================================
// Pilot Setup Types
// =============================================================================

export interface PilotSetupResult {
    success: boolean;
    message: string;
    data?: {
        userId: string;
        brandId: string;
        orgId: string;
        locationId?: string;
        menuUrl: string;
        groundTruth?: {
            configured: boolean;
            totalQAPairs?: number;
            criticalCount?: number;
            categories?: string[];
        };
    };
    error?: string;
}

export interface BrandPilotConfig {
    type: 'brand';
    email: string;
    password: string;
    brandName: string;
    brandSlug: string;
    tagline?: string;
    description?: string;
    website?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    purchaseModel: 'online_only' | 'local_pickup' | 'hybrid';
    shipsNationwide: boolean;
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    contactEmail?: string;
    contactPhone?: string;
    chatbotEnabled: boolean;
    chatbotName?: string;
    chatbotWelcome?: string;
    groundTruthBrandId?: string;
}

export interface DispensaryPilotConfig {
    type: 'dispensary';
    email: string;
    password: string;
    dispensaryName: string;
    dispensarySlug: string;
    tagline?: string;
    description?: string;
    website?: string;
    primaryColor: string;
    secondaryColor: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    licenseNumber?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    hours?: {
        monday?: string;
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
    };
    chatbotEnabled: boolean;
    chatbotName?: string;
    chatbotWelcome?: string;
    zipCodes?: string[];
    groundTruthBrandId?: string;
}

export type PilotConfig = BrandPilotConfig | DispensaryPilotConfig;

export interface ImportedMenuData {
    dispensary: {
        name: string;
        tagline?: string;
        description?: string;
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        hours?: string;
    };
    products: Array<{
        name: string;
        brand?: string;
        category: string;
        price: number | null;
        thcPercent?: number | null;
        cbdPercent?: number | null;
        strainType?: string;
        description?: string;
        imageUrl?: string;
        effects?: string[];
        weight?: string;
    }>;
    promotions?: Array<{
        title: string;
        subtitle?: string;
        description?: string;
    }>;
}

export interface PilotPOSConfig {
    provider: POSProvider;
    apiKey?: string;
    storeId: string;
    locationId?: string;
    partnerId?: string;
    environment?: 'sandbox' | 'production';
    username?: string;
    password?: string;
    pin?: string;
}

export interface PilotEmailConfig {
    provider: 'mailjet';
    senderEmail: string;
    senderName: string;
    replyToEmail?: string;
    enableWelcomePlaybook: boolean;
    enableWinbackPlaybook: boolean;
    enableVIPPlaybook: boolean;
}

export interface CreateTestCustomersResult {
    success: boolean;
    created: number;
    customers: Array<{
        id: string;
        email: string;
        segment: CustomerSegment;
        firstName: string;
        lastName: string;
    }>;
    error?: string;
}

export interface CreateSampleOrdersResult {
    success: boolean;
    created: number;
    orders: Array<{
        id: string;
        customerId: string;
        customerEmail: string;
        total: number;
        itemCount: number;
        createdAt: number;
    }>;
    error?: string;
}
