/**
 * Unified Inbox Types
 *
 * Data model for the conversation-driven workspace that consolidates
 * Carousels, Bundles, and Creative Center into a single inbox experience.
 */

import { z } from 'zod';
import type { Carousel } from './carousels';
import type { BundleDeal } from './bundles';
import type { CreativeContent } from './creative-content';
import type { ChatMessage } from '@/lib/store/agent-chat-store';

// ============ Thread Types ============

/**
 * Types of inbox threads - determines which agents and quick actions are available
 */
export type InboxThreadType =
    | 'general'           // General conversation
    | 'carousel'          // Product carousel creation
    | 'bundle'            // Bundle deal creation
    | 'creative'          // Social media content
    | 'campaign'          // Multi-channel campaign
    | 'retail_partner'    // Retail partner outreach (brands only)
    | 'launch'            // Product launch coordination
    | 'performance'       // Performance review & analytics
    | 'outreach'          // Customer outreach (SMS/Email)
    | 'inventory_promo'   // Inventory-driven promotions
    | 'event'             // Event marketing
    | 'product_discovery' // Customer product search
    | 'support';          // Customer support

/**
 * Thread lifecycle status
 */
export type InboxThreadStatus =
    | 'active'      // Currently being worked on
    | 'draft'       // Has unsaved/unapproved artifacts
    | 'completed'   // All artifacts approved/published
    | 'archived';   // Closed, kept for history

/**
 * Agent personas available for inbox threads
 */
export type InboxAgentPersona =
    | 'smokey'      // Budtender - products, carousels
    | 'money_mike'  // Banker - bundles, pricing
    | 'craig'       // Marketer - creative content
    | 'glenda'      // CMO - campaigns, strategy
    | 'ezal'        // Lookout - competitive intel
    | 'deebo'       // Enforcer - compliance
    | 'pops'        // Analyst - data insights
    | 'linus'       // CTO - analytics, performance
    | 'day_day'     // Ops - inventory, logistics
    | 'auto';       // Auto-route based on message

// ============ Inbox Thread ============

/**
 * A conversation thread in the inbox
 */
export interface InboxThread {
    id: string;
    orgId: string;
    userId: string;

    // Thread metadata
    type: InboxThreadType;
    status: InboxThreadStatus;
    title: string;
    preview: string;

    // Agent context
    primaryAgent: InboxAgentPersona;
    assignedAgents: InboxAgentPersona[];

    // Associated artifacts (carousels, bundles, content)
    artifactIds: string[];

    // Conversation messages
    messages: ChatMessage[];

    // Project/context reference (optional)
    projectId?: string;
    brandId?: string;
    dispensaryId?: string;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;
}

// ============ Inbox Artifact ============

/**
 * Artifact types specific to inbox
 */
export type InboxArtifactType =
    | 'carousel'          // Product carousel
    | 'bundle'            // Bundle deal
    | 'creative_content'  // Social media post
    | 'sell_sheet'        // Retail partner pitch materials
    | 'report'            // Performance/analytics report
    | 'outreach_draft'    // SMS/Email draft
    | 'event_promo';      // Event promotional materials

/**
 * Artifact approval status
 */
export type InboxArtifactStatus =
    | 'draft'           // Just created, not reviewed
    | 'pending_review'  // Waiting for approval
    | 'approved'        // Approved, ready to publish
    | 'published'       // Live/active
    | 'rejected';       // Not approved

/**
 * An artifact created through inbox conversation
 */
export interface InboxArtifact {
    id: string;
    threadId: string;
    orgId: string;

    // Type discrimination
    type: InboxArtifactType;

    // Status tracking
    status: InboxArtifactStatus;

    // The actual data (polymorphic based on type)
    data: Carousel | BundleDeal | CreativeContent;

    // Agent rationale for the suggestion
    rationale?: string;

    // Tracking
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    approvedBy?: string;
    approvedAt?: Date;
    publishedAt?: Date;
}

// ============ Quick Actions ============

/**
 * Quick action configuration for inbox
 */
export interface InboxQuickAction {
    id: string;
    label: string;
    description: string;
    icon: string;
    threadType: InboxThreadType;
    defaultAgent: InboxAgentPersona;
    promptTemplate: string;
    roles: string[]; // Allowed roles
}

/** Role constants for cleaner action definitions */
const BRAND_ROLES = ['super_user', 'brand', 'brand_admin', 'brand_member'];
const DISPENSARY_ROLES = ['super_user', 'dispensary', 'dispensary_admin', 'dispensary_staff'];
const ALL_BUSINESS_ROLES = [...BRAND_ROLES, ...DISPENSARY_ROLES.filter(r => r !== 'super_user')];

/**
 * Default quick actions by role
 */
export const INBOX_QUICK_ACTIONS: InboxQuickAction[] = [
    // ============ Core Marketing Actions (Brand + Dispensary) ============
    {
        id: 'new-carousel',
        label: 'New Carousel',
        description: 'Create a product carousel with AI assistance',
        icon: 'Images',
        threadType: 'carousel',
        defaultAgent: 'smokey',
        promptTemplate: 'Help me create a new product carousel',
        roles: ALL_BUSINESS_ROLES,
    },
    {
        id: 'new-bundle',
        label: 'New Bundle',
        description: 'Build a promotional bundle deal',
        icon: 'PackagePlus',
        threadType: 'bundle',
        defaultAgent: 'money_mike',
        promptTemplate: 'Help me create a new bundle deal',
        roles: ALL_BUSINESS_ROLES,
    },
    {
        id: 'new-creative',
        label: 'Create Post',
        description: 'Generate social media content',
        icon: 'Palette',
        threadType: 'creative',
        defaultAgent: 'craig',
        promptTemplate: 'Help me create social media content',
        roles: ALL_BUSINESS_ROLES,
    },
    {
        id: 'new-campaign',
        label: 'Plan Campaign',
        description: 'Plan a multi-channel marketing campaign',
        icon: 'Megaphone',
        threadType: 'campaign',
        defaultAgent: 'glenda',
        promptTemplate: 'Help me plan a marketing campaign',
        roles: ALL_BUSINESS_ROLES,
    },

    // ============ Product Launch (Brand + Dispensary) ============
    {
        id: 'product-launch',
        label: 'Product Launch',
        description: 'Create a full launch package with carousel, bundle, and social',
        icon: 'Rocket',
        threadType: 'launch',
        defaultAgent: 'glenda',
        promptTemplate: 'Help me plan a product launch',
        roles: ALL_BUSINESS_ROLES,
    },

    // ============ Performance & Analytics (Brand + Dispensary) ============
    {
        id: 'review-performance',
        label: 'Review Performance',
        description: 'Analyze what\'s working and get optimization suggestions',
        icon: 'TrendingUp',
        threadType: 'performance',
        defaultAgent: 'linus',
        promptTemplate: 'Help me review my recent performance and suggest improvements',
        roles: ALL_BUSINESS_ROLES,
    },

    // ============ Customer Outreach (Brand + Dispensary) ============
    {
        id: 'customer-blast',
        label: 'Customer Blast',
        description: 'Draft SMS or email campaign for customers',
        icon: 'Send',
        threadType: 'outreach',
        defaultAgent: 'craig',
        promptTemplate: 'Help me create a customer outreach message',
        roles: ALL_BUSINESS_ROLES,
    },

    // ============ Inventory Promotions (Brand + Dispensary) ============
    {
        id: 'move-inventory',
        label: 'Move Inventory',
        description: 'Create promotions to clear slow-moving stock',
        icon: 'Package',
        threadType: 'inventory_promo',
        defaultAgent: 'money_mike',
        promptTemplate: 'Help me create promotions to move excess inventory',
        roles: ALL_BUSINESS_ROLES,
    },

    // ============ Events (Brand + Dispensary) ============
    {
        id: 'plan-event',
        label: 'Plan Event',
        description: 'Create marketing materials for an event',
        icon: 'CalendarDays',
        threadType: 'event',
        defaultAgent: 'craig',
        promptTemplate: 'Help me plan marketing for an upcoming event',
        roles: ALL_BUSINESS_ROLES,
    },

    // ============ Brand-Only Actions ============
    {
        id: 'retail-pitch',
        label: 'Retail Pitch',
        description: 'Create materials to pitch dispensaries on your products',
        icon: 'Presentation',
        threadType: 'retail_partner',
        defaultAgent: 'glenda',
        promptTemplate: 'Help me create a pitch for retail partners',
        roles: BRAND_ROLES,
    },

    // ============ Customer Actions ============
    {
        id: 'find-products',
        label: 'Find Products',
        description: 'Get personalized product recommendations',
        icon: 'Search',
        threadType: 'product_discovery',
        defaultAgent: 'smokey',
        promptTemplate: 'Help me find products',
        roles: ['customer'],
    },
    {
        id: 'my-routines',
        label: 'My Routines',
        description: 'Manage your cannabis routines and preferences',
        icon: 'Calendar',
        threadType: 'general',
        defaultAgent: 'smokey',
        promptTemplate: 'Help me with my routines',
        roles: ['customer'],
    },
    {
        id: 'get-help',
        label: 'Get Help',
        description: 'Get support and answers to questions',
        icon: 'HelpCircle',
        threadType: 'support',
        defaultAgent: 'smokey',
        promptTemplate: 'I need help with something',
        roles: ['customer'],
    },
];

// ============ Thread Filters ============

export interface InboxFilter {
    type: InboxThreadType | 'all';
    status: InboxThreadStatus | 'all';
    agent: InboxAgentPersona | 'all';
    dateRange?: {
        start: Date;
        end: Date;
    };
}

// ============ Agent Routing ============

/**
 * Maps thread types to their primary and supporting agents
 */
export const THREAD_AGENT_MAPPING: Record<InboxThreadType, {
    primary: InboxAgentPersona;
    supporting: InboxAgentPersona[];
}> = {
    // Core marketing
    carousel: {
        primary: 'smokey',
        supporting: ['ezal', 'pops'],
    },
    bundle: {
        primary: 'money_mike',
        supporting: ['smokey', 'pops'],
    },
    creative: {
        primary: 'craig',
        supporting: ['deebo', 'ezal'],
    },
    campaign: {
        primary: 'glenda',
        supporting: ['craig', 'money_mike', 'pops'],
    },

    // New business thread types
    retail_partner: {
        primary: 'glenda',
        supporting: ['craig', 'money_mike'],
    },
    launch: {
        primary: 'glenda',
        supporting: ['smokey', 'money_mike', 'craig'],
    },
    performance: {
        primary: 'linus',
        supporting: ['pops', 'ezal'],
    },
    outreach: {
        primary: 'craig',
        supporting: ['deebo'], // Compliance check on messaging
    },
    inventory_promo: {
        primary: 'money_mike',
        supporting: ['day_day', 'smokey'],
    },
    event: {
        primary: 'craig',
        supporting: ['glenda', 'deebo'],
    },

    // Customer thread types
    product_discovery: {
        primary: 'smokey',
        supporting: ['ezal'],
    },
    support: {
        primary: 'smokey',
        supporting: ['deebo'],
    },
    general: {
        primary: 'auto',
        supporting: [],
    },
};

// ============ Zod Schemas ============

export const InboxThreadTypeSchema = z.enum([
    'general',
    'carousel',
    'bundle',
    'creative',
    'campaign',
    'retail_partner',
    'launch',
    'performance',
    'outreach',
    'inventory_promo',
    'event',
    'product_discovery',
    'support'
]);

export const InboxThreadStatusSchema = z.enum([
    'active', 'draft', 'completed', 'archived'
]);

export const InboxAgentPersonaSchema = z.enum([
    'smokey', 'money_mike', 'craig', 'glenda', 'ezal', 'deebo', 'pops', 'linus', 'day_day', 'auto'
]);

export const InboxArtifactTypeSchema = z.enum([
    'carousel', 'bundle', 'creative_content', 'sell_sheet', 'report', 'outreach_draft', 'event_promo'
]);

export const InboxArtifactStatusSchema = z.enum([
    'draft', 'pending_review', 'approved', 'published', 'rejected'
]);

export const CreateInboxThreadSchema = z.object({
    type: InboxThreadTypeSchema,
    title: z.string().min(1).max(200).optional(),
    primaryAgent: InboxAgentPersonaSchema.optional(),
    projectId: z.string().optional(),
    brandId: z.string().optional(),
    dispensaryId: z.string().optional(),
});

export const UpdateInboxThreadSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    status: InboxThreadStatusSchema.optional(),
    primaryAgent: InboxAgentPersonaSchema.optional(),
});

// ============ Helper Functions ============

/**
 * Get quick actions available for a given role
 */
export function getQuickActionsForRole(role: string): InboxQuickAction[] {
    return INBOX_QUICK_ACTIONS.filter(action => action.roles.includes(role));
}

/**
 * Get the default agent for a thread type
 */
export function getDefaultAgentForThreadType(type: InboxThreadType): InboxAgentPersona {
    return THREAD_AGENT_MAPPING[type].primary;
}

/**
 * Get supporting agents for a thread type
 */
export function getSupportingAgentsForThreadType(type: InboxThreadType): InboxAgentPersona[] {
    return THREAD_AGENT_MAPPING[type].supporting;
}

/**
 * Generate a thread ID
 */
export function createInboxThreadId(): string {
    return `inbox-thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate an artifact ID
 */
export function createInboxArtifactId(): string {
    return `inbox-artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a role can create a specific thread type
 */
export function canCreateThreadType(role: string, type: InboxThreadType): boolean {
    const actions = getQuickActionsForRole(role);
    return actions.some(action => action.threadType === type);
}

/**
 * Get thread type icon
 */
export function getThreadTypeIcon(type: InboxThreadType): string {
    const iconMap: Record<InboxThreadType, string> = {
        general: 'MessageSquare',
        carousel: 'Images',
        bundle: 'PackagePlus',
        creative: 'Palette',
        campaign: 'Megaphone',
        retail_partner: 'Presentation',
        launch: 'Rocket',
        performance: 'TrendingUp',
        outreach: 'Send',
        inventory_promo: 'Package',
        event: 'CalendarDays',
        product_discovery: 'Search',
        support: 'HelpCircle',
    };
    return iconMap[type] || 'MessageSquare';
}

/**
 * Get thread type label
 */
export function getThreadTypeLabel(type: InboxThreadType): string {
    const labelMap: Record<InboxThreadType, string> = {
        general: 'General',
        carousel: 'Carousel',
        bundle: 'Bundle',
        creative: 'Creative',
        campaign: 'Campaign',
        retail_partner: 'Retail Partner',
        launch: 'Product Launch',
        performance: 'Performance',
        outreach: 'Outreach',
        inventory_promo: 'Inventory Promo',
        event: 'Event',
        product_discovery: 'Products',
        support: 'Support',
    };
    return labelMap[type] || 'Unknown';
}

/**
 * Get primary artifact type(s) for a thread type
 * Some threads can produce multiple artifact types
 */
export function getArtifactTypesForThreadType(type: InboxThreadType): InboxArtifactType[] {
    const mapping: Record<InboxThreadType, InboxArtifactType[]> = {
        carousel: ['carousel'],
        bundle: ['bundle'],
        creative: ['creative_content'],
        campaign: ['carousel', 'bundle', 'creative_content'],
        retail_partner: ['sell_sheet'],
        launch: ['carousel', 'bundle', 'creative_content'],
        performance: ['report'],
        outreach: ['outreach_draft'],
        inventory_promo: ['bundle'],
        event: ['event_promo', 'creative_content'],
        product_discovery: [],
        support: [],
        general: [],
    };
    return mapping[type] || [];
}

/**
 * Get artifact type from thread type (legacy - returns first type or null)
 */
export function getArtifactTypeForThreadType(type: InboxThreadType): InboxArtifactType | null {
    const types = getArtifactTypesForThreadType(type);
    return types.length > 0 ? types[0] : null;
}
