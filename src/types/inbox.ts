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
    | 'campaign'          // Multi-channel campaign (super users)
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
    | 'glenda'      // CMO - campaigns (super users)
    | 'ezal'        // Lookout - competitive intel
    | 'deebo'       // Enforcer - compliance
    | 'pops'        // Analyst - data insights
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
export type InboxArtifactType = 'carousel' | 'bundle' | 'creative_content';

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

/**
 * Default quick actions by role
 */
export const INBOX_QUICK_ACTIONS: InboxQuickAction[] = [
    // Brand/Dispensary/Super User Actions
    {
        id: 'new-carousel',
        label: 'New Carousel',
        description: 'Create a product carousel with AI assistance',
        icon: 'Images',
        threadType: 'carousel',
        defaultAgent: 'smokey',
        promptTemplate: 'Help me create a new product carousel',
        roles: ['super_user', 'brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff'],
    },
    {
        id: 'new-bundle',
        label: 'New Bundle',
        description: 'Build a promotional bundle deal',
        icon: 'PackagePlus',
        threadType: 'bundle',
        defaultAgent: 'money_mike',
        promptTemplate: 'Help me create a new bundle deal',
        roles: ['super_user', 'brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff'],
    },
    {
        id: 'new-creative',
        label: 'New Post',
        description: 'Generate social media content',
        icon: 'Palette',
        threadType: 'creative',
        defaultAgent: 'craig',
        promptTemplate: 'Help me create social media content',
        roles: ['super_user', 'brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff'],
    },
    {
        id: 'new-campaign',
        label: 'Campaign',
        description: 'Plan a multi-channel marketing campaign',
        icon: 'Megaphone',
        threadType: 'campaign',
        defaultAgent: 'glenda',
        promptTemplate: 'Help me plan a marketing campaign',
        roles: ['super_user'],
    },
    // Customer Actions
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
        supporting: ['craig', 'pops', 'ezal'],
    },
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
    'general', 'carousel', 'bundle', 'creative', 'campaign', 'product_discovery', 'support'
]);

export const InboxThreadStatusSchema = z.enum([
    'active', 'draft', 'completed', 'archived'
]);

export const InboxAgentPersonaSchema = z.enum([
    'smokey', 'money_mike', 'craig', 'glenda', 'ezal', 'deebo', 'pops', 'auto'
]);

export const InboxArtifactTypeSchema = z.enum([
    'carousel', 'bundle', 'creative_content'
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
        product_discovery: 'Products',
        support: 'Support',
    };
    return labelMap[type] || 'Unknown';
}

/**
 * Get artifact type from thread type
 */
export function getArtifactTypeForThreadType(type: InboxThreadType): InboxArtifactType | null {
    const mapping: Partial<Record<InboxThreadType, InboxArtifactType>> = {
        carousel: 'carousel',
        bundle: 'bundle',
        creative: 'creative_content',
    };
    return mapping[type] || null;
}
