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
    // ---- Business Operations (Brand + Dispensary) ----
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
    // ---- Customer Threads ----
    | 'product_discovery' // Customer product search
    | 'support'           // Customer support
    // ---- Super User: Growth Management ----
    | 'growth_review'     // Weekly/monthly growth metrics review
    | 'churn_risk'        // At-risk customer analysis & intervention
    | 'revenue_forecast'  // Revenue modeling & projections
    | 'pipeline'          // Sales pipeline & deal tracking
    | 'customer_health'   // Customer segment health monitoring
    | 'market_intel'      // Competitive positioning & market share
    | 'bizdev'            // Partnership outreach & expansion
    | 'experiment'        // Growth experiment planning & analysis
    // ---- Super User: Company Operations ----
    | 'daily_standup'     // Daily standup / status check
    | 'sprint_planning'   // Sprint planning & backlog prioritization
    | 'incident_response' // Production issues & debugging
    | 'feature_spec'      // Feature specification & scoping
    | 'code_review'       // Code review & architecture decisions
    | 'release'           // Release preparation & coordination
    | 'customer_onboarding' // New customer setup & training
    | 'customer_feedback' // Feature requests & complaints
    | 'support_escalation' // Escalated support tickets
    | 'content_calendar'  // Blog, social, email planning
    | 'launch_campaign'   // Product/feature launch marketing
    | 'seo_sprint'        // Technical & content SEO
    | 'partnership_outreach' // Integration partners & resellers
    | 'billing_review'    // Invoicing, payments, collections
    | 'budget_planning'   // Quarterly/annual budgets
    | 'vendor_management' // API costs, subscriptions
    | 'compliance_audit'  // SOC2, privacy, cannabis compliance
    | 'weekly_sync'       // Executive team weekly check-in
    | 'quarterly_planning' // OKRs, strategic priorities
    | 'board_prep'        // Investor updates, board decks
    | 'hiring'            // Role definition, candidate review
    // ---- Super User: Research ----
    | 'deep_research'     // Big Worm deep data analysis
    | 'compliance_research' // Roach compliance knowledge base
    | 'market_research';  // Strategic market analysis

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
    // ---- Field Agents ----
    | 'smokey'      // Budtender - products, carousels
    | 'money_mike'  // CFO - bundles, pricing, margins
    | 'craig'       // Marketer - creative content
    | 'ezal'        // Lookout - competitive intel
    | 'deebo'       // Enforcer - compliance
    | 'pops'        // Analyst - data insights
    | 'day_day'     // Ops - inventory, logistics
    | 'mrs_parker'  // Customer success - welcome emails, retention
    | 'big_worm'    // Deep research - data analysis, market research
    | 'roach'       // Research librarian - compliance KB, research briefs
    // ---- Executive Agents ----
    | 'leo'         // COO - operations orchestration
    | 'jack'        // CRO - revenue, sales, pipeline
    | 'linus'       // CTO - analytics, performance, tech
    | 'glenda'      // CMO - marketing, campaigns, strategy
    | 'mike'        // CFO - finance, billing, budgets
    // ---- Auto-routing ----
    | 'auto';       // Auto-route based on message

// ============ Agent Handoffs ============

/**
 * Agent handoff record for tracking agent transitions within a thread
 */
export interface AgentHandoff {
    id: string;
    fromAgent: InboxAgentPersona;
    toAgent: InboxAgentPersona;
    reason: string;
    timestamp: Date;
    messageId?: string; // Optional: link to the message where handoff occurred
}

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
    handoffHistory?: AgentHandoff[]; // Agent transition history

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
    // ---- Business Artifacts ----
    | 'carousel'          // Product carousel
    | 'bundle'            // Bundle deal
    | 'creative_content'  // Social media post
    | 'sell_sheet'        // Retail partner pitch materials
    | 'report'            // Performance/analytics report
    | 'outreach_draft'    // SMS/Email draft
    | 'event_promo'       // Event promotional materials
    // ---- Growth Management Artifacts (Super User) ----
    | 'growth_report'     // Growth metrics summary
    | 'churn_scorecard'   // At-risk customer analysis
    | 'revenue_model'     // Revenue forecast/projection
    | 'pipeline_report'   // Sales pipeline status
    | 'health_scorecard'  // Customer segment health
    | 'market_analysis'   // Competitive/market report
    | 'partnership_deck'  // BizDev pitch materials
    | 'experiment_plan'   // A/B test or growth experiment
    // ---- Company Operations Artifacts (Super User) ----
    | 'standup_notes'     // Daily standup summary
    | 'sprint_plan'       // Sprint goals, stories, capacity
    | 'incident_report'   // Root cause, timeline, impact
    | 'postmortem'        // What went wrong, lessons learned
    | 'feature_spec'      // User stories, acceptance criteria
    | 'technical_design'  // Architecture, data model, API design
    | 'release_notes'     // Changelog, migration notes
    | 'onboarding_checklist' // Customer setup tasks
    | 'content_calendar'  // Planned content by channel/date
    | 'okr_document'      // Objectives and key results
    | 'meeting_notes'     // Decisions, action items, owners
    | 'board_deck'        // Investor presentation
    | 'budget_model'      // Budget spreadsheet / forecast
    | 'job_spec'          // Role description, requirements
    | 'research_brief'    // Deep research findings
    | 'compliance_brief'; // Compliance research document

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
        description: 'Draft a multi-channel campaign in 30 seconds',
        icon: 'Megaphone',
        threadType: 'campaign',
        defaultAgent: 'craig',  // Glenda restricted to super_user only
        promptTemplate: 'Draft a campaign for me - I need SMS, email, and social content ready to send',
        roles: ALL_BUSINESS_ROLES,
    },

    // ============ Product Launch (Brand + Dispensary) ============
    {
        id: 'product-launch',
        label: 'Product Launch',
        description: 'Create a full launch package with carousel, bundle, and social',
        icon: 'Rocket',
        threadType: 'launch',
        defaultAgent: 'leo',  // Glenda restricted to super_user only
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
        description: 'Draft a compliant SMS or email in 30 seconds',
        icon: 'Send',
        threadType: 'outreach',
        defaultAgent: 'craig',
        promptTemplate: 'Draft a customer outreach message for me - make it compliant and ready to send',
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

    // ============ Super User Only - Executive Marketing ============
    {
        id: 'retail-pitch',
        label: 'Retail Pitch',
        description: 'Find dispensaries to carry your products and draft outreach',
        icon: 'Presentation',
        threadType: 'retail_partner',
        defaultAgent: 'glenda',
        promptTemplate: 'Find dispensaries that would be a good fit for my brand and help me draft an intro email',
        roles: ['super_user'],  // Glenda restricted to Boardroom (super_user) level
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

    // ============ Super User: Growth Management ============
    {
        id: 'growth-review',
        label: 'Growth Review',
        description: 'Review growth metrics, KPIs, and momentum indicators',
        icon: 'TrendingUp',
        threadType: 'growth_review',
        defaultAgent: 'jack',
        promptTemplate: 'Help me review our growth metrics and identify opportunities',
        roles: ['super_user'],
    },
    {
        id: 'churn-analysis',
        label: 'Churn Analysis',
        description: 'Analyze at-risk customers and plan retention interventions',
        icon: 'UserMinus',
        threadType: 'churn_risk',
        defaultAgent: 'jack',
        promptTemplate: 'Help me identify at-risk customers and plan retention strategies',
        roles: ['super_user'],
    },
    {
        id: 'revenue-forecast',
        label: 'Revenue Forecast',
        description: 'Model and project revenue scenarios',
        icon: 'Calculator',
        threadType: 'revenue_forecast',
        defaultAgent: 'money_mike',
        promptTemplate: 'Help me forecast revenue and model different scenarios',
        roles: ['super_user'],
    },
    {
        id: 'pipeline-review',
        label: 'Pipeline Review',
        description: 'Track deals, sales velocity, and conversion funnel',
        icon: 'Funnel',
        threadType: 'pipeline',
        defaultAgent: 'jack',
        promptTemplate: 'Help me review our sales pipeline and deal progress',
        roles: ['super_user'],
    },
    {
        id: 'customer-health',
        label: 'Customer Health',
        description: 'Monitor customer segment health and engagement',
        icon: 'HeartPulse',
        threadType: 'customer_health',
        defaultAgent: 'jack',
        promptTemplate: 'Help me assess customer health across segments',
        roles: ['super_user'],
    },
    {
        id: 'market-intel',
        label: 'Market Intel',
        description: 'Spy on competitor pricing and market positioning',
        icon: 'Target',
        threadType: 'market_intel',
        defaultAgent: 'ezal',
        promptTemplate: 'Spy on competitor pricing near me and show me market opportunities',
        roles: ['super_user'],
    },
    {
        id: 'bizdev-outreach',
        label: 'BizDev',
        description: 'Partnership outreach and expansion opportunities',
        icon: 'Handshake',
        threadType: 'bizdev',
        defaultAgent: 'glenda',
        promptTemplate: 'Help me plan partnership outreach and expansion strategies',
        roles: ['super_user'],
    },
    {
        id: 'growth-experiment',
        label: 'Experiment',
        description: 'Plan and analyze growth experiments and A/B tests',
        icon: 'FlaskConical',
        threadType: 'experiment',
        defaultAgent: 'linus',
        promptTemplate: 'Help me plan a growth experiment or analyze test results',
        roles: ['super_user'],
    },

    // ============ Super User: Company Operations ============
    {
        id: 'daily-standup',
        label: 'Daily Standup',
        description: 'Quick status check across all operational areas',
        icon: 'Coffee',
        threadType: 'daily_standup',
        defaultAgent: 'leo',
        promptTemplate: 'Run our daily standup: What shipped? What\'s blocked? What\'s next?',
        roles: ['super_user'],
    },
    {
        id: 'sprint-planning',
        label: 'Sprint Planning',
        description: 'Plan the next sprint from backlog',
        icon: 'ListTodo',
        threadType: 'sprint_planning',
        defaultAgent: 'linus',
        promptTemplate: 'Let\'s plan the next sprint. Review the backlog and prioritize.',
        roles: ['super_user'],
    },
    {
        id: 'incident-response',
        label: 'Incident Response',
        description: 'Investigate and resolve production issues',
        icon: 'AlertTriangle',
        threadType: 'incident_response',
        defaultAgent: 'linus',
        promptTemplate: 'We have a production issue. Help me investigate and resolve it.',
        roles: ['super_user'],
    },
    {
        id: 'release-prep',
        label: 'Release Prep',
        description: 'Prepare and coordinate a release',
        icon: 'Rocket',
        threadType: 'release',
        defaultAgent: 'linus',
        promptTemplate: 'Let\'s prepare for a release. What\'s ready? What needs testing?',
        roles: ['super_user'],
    },
    {
        id: 'customer-onboarding',
        label: 'Customer Onboarding',
        description: 'Review and optimize customer onboarding flows',
        icon: 'UserPlus',
        threadType: 'customer_onboarding',
        defaultAgent: 'mrs_parker',
        promptTemplate: 'Review our customer onboarding: welcome emails, drip sequences, activation rates.',
        roles: ['super_user'],
    },
    {
        id: 'customer-pulse',
        label: 'Customer Pulse',
        description: 'Review customer health, feedback, and escalations',
        icon: 'HeartHandshake',
        threadType: 'customer_feedback',
        defaultAgent: 'jack',
        promptTemplate: 'Give me a pulse check on our customers: health scores, recent feedback, escalations.',
        roles: ['super_user'],
    },
    {
        id: 'content-brief',
        label: 'Content Brief',
        description: 'Generate content brief for blog, social, or email',
        icon: 'FileEdit',
        threadType: 'content_calendar',
        defaultAgent: 'glenda',
        promptTemplate: 'Help me create a content brief for our next piece of content.',
        roles: ['super_user'],
    },
    {
        id: 'weekly-sync',
        label: 'Weekly Sync',
        description: 'Run the executive team weekly check-in',
        icon: 'Users',
        threadType: 'weekly_sync',
        defaultAgent: 'leo',
        promptTemplate: 'Run our weekly executive sync. Gather updates from all departments.',
        roles: ['super_user'],
    },
    {
        id: 'cash-flow',
        label: 'Cash Flow',
        description: 'Review cash position, runway, and burn rate',
        icon: 'Banknote',
        threadType: 'budget_planning',
        defaultAgent: 'mike',
        promptTemplate: 'Review our cash flow: current position, burn rate, and runway.',
        roles: ['super_user'],
    },
    {
        id: 'board-update',
        label: 'Board Update',
        description: 'Draft investor/board update',
        icon: 'Presentation',
        threadType: 'board_prep',
        defaultAgent: 'mike',
        promptTemplate: 'Help me draft our monthly investor/board update.',
        roles: ['super_user'],
    },
    {
        id: 'compliance-audit',
        label: 'Compliance Audit',
        description: 'Scan for compliance risks before they become fines',
        icon: 'ShieldCheck',
        threadType: 'compliance_audit',
        defaultAgent: 'deebo',
        promptTemplate: 'Scan my site and content for compliance risks - cannabis regulations, health claims, age-gating',
        roles: ['super_user'],
    },
    {
        id: 'hiring-review',
        label: 'Hiring',
        description: 'Plan roles and review candidates',
        icon: 'UserSearch',
        threadType: 'hiring',
        defaultAgent: 'leo',
        promptTemplate: 'Help me with hiring: open roles, candidate pipeline, interview feedback.',
        roles: ['super_user'],
    },

    // ============ Super User: Research ============
    {
        id: 'deep-research',
        label: 'Deep Research',
        description: 'Conduct comprehensive research with Big Worm',
        icon: 'BookOpen',
        threadType: 'deep_research',
        defaultAgent: 'big_worm',
        promptTemplate: 'I need deep research on...',
        roles: ['super_user'],
    },
    {
        id: 'compliance-brief',
        label: 'Compliance Brief',
        description: 'Generate compliance research brief with Roach',
        icon: 'Scale',
        threadType: 'compliance_research',
        defaultAgent: 'roach',
        promptTemplate: 'Research compliance requirements for...',
        roles: ['super_user'],
    },
    {
        id: 'market-analysis',
        label: 'Market Analysis',
        description: 'Deep market analysis and strategic research',
        icon: 'BarChart3',
        threadType: 'market_research',
        defaultAgent: 'big_worm',
        promptTemplate: 'Analyze the market for...',
        roles: ['super_user'],
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
        primary: 'craig',  // Glenda restricted to super_user; Craig handles campaigns for business users
        supporting: ['money_mike', 'pops', 'deebo'],
    },

    // New business thread types
    retail_partner: {
        primary: 'glenda',  // Super User only thread type
        supporting: ['craig', 'money_mike'],
    },
    launch: {
        primary: 'leo',  // Glenda restricted to super_user; Leo coordinates launches for business users
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

    // Super User: Growth Management thread types
    growth_review: {
        primary: 'jack',
        supporting: ['linus', 'pops'],
    },
    churn_risk: {
        primary: 'jack',
        supporting: ['pops', 'leo'],
    },
    revenue_forecast: {
        primary: 'money_mike',
        supporting: ['jack', 'linus'],
    },
    pipeline: {
        primary: 'jack',
        supporting: ['glenda', 'leo'],
    },
    customer_health: {
        primary: 'jack',
        supporting: ['pops', 'leo'],
    },
    market_intel: {
        primary: 'ezal',
        supporting: ['jack', 'glenda'],
    },
    bizdev: {
        primary: 'glenda',
        supporting: ['jack', 'craig'],
    },
    experiment: {
        primary: 'linus',
        supporting: ['jack', 'pops'],
    },

    // Super User: Company Operations thread types
    daily_standup: {
        primary: 'leo',
        supporting: ['linus', 'jack', 'glenda'],
    },
    sprint_planning: {
        primary: 'linus',
        supporting: ['leo', 'pops'],
    },
    incident_response: {
        primary: 'linus',
        supporting: ['leo', 'deebo'],
    },
    feature_spec: {
        primary: 'linus',
        supporting: ['glenda', 'smokey'],
    },
    code_review: {
        primary: 'linus',
        supporting: ['roach'],
    },
    release: {
        primary: 'linus',
        supporting: ['leo', 'craig'],
    },
    customer_onboarding: {
        primary: 'mrs_parker',
        supporting: ['jack', 'smokey'],
    },
    customer_feedback: {
        primary: 'jack',
        supporting: ['mrs_parker', 'linus'],
    },
    support_escalation: {
        primary: 'leo',
        supporting: ['jack', 'linus'],
    },
    content_calendar: {
        primary: 'glenda',
        supporting: ['craig', 'day_day'],
    },
    launch_campaign: {
        primary: 'glenda',
        supporting: ['craig', 'linus'],
    },
    seo_sprint: {
        primary: 'day_day',
        supporting: ['glenda', 'roach'],
    },
    partnership_outreach: {
        primary: 'glenda',
        supporting: ['jack', 'craig'],
    },
    billing_review: {
        primary: 'mike',
        supporting: ['jack', 'leo'],
    },
    budget_planning: {
        primary: 'mike',
        supporting: ['leo', 'jack'],
    },
    vendor_management: {
        primary: 'mike',
        supporting: ['linus', 'leo'],
    },
    compliance_audit: {
        primary: 'deebo',
        supporting: ['roach', 'leo'],
    },
    weekly_sync: {
        primary: 'leo',
        supporting: ['jack', 'linus', 'glenda', 'mike'],
    },
    quarterly_planning: {
        primary: 'leo',
        supporting: ['jack', 'linus', 'glenda', 'mike'],
    },
    board_prep: {
        primary: 'mike',
        supporting: ['jack', 'leo'],
    },
    hiring: {
        primary: 'leo',
        supporting: ['linus', 'glenda'],
    },

    // Super User: Research thread types
    deep_research: {
        primary: 'big_worm',
        supporting: ['roach', 'ezal'],
    },
    compliance_research: {
        primary: 'roach',
        supporting: ['deebo', 'big_worm'],
    },
    market_research: {
        primary: 'big_worm',
        supporting: ['ezal', 'jack'],
    },
};

// ============ Zod Schemas ============

export const InboxThreadTypeSchema = z.enum([
    // Business Operations
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
    // Customer
    'product_discovery',
    'support',
    // Super User: Growth Management
    'growth_review',
    'churn_risk',
    'revenue_forecast',
    'pipeline',
    'customer_health',
    'market_intel',
    'bizdev',
    'experiment',
    // Super User: Company Operations
    'daily_standup',
    'sprint_planning',
    'incident_response',
    'feature_spec',
    'code_review',
    'release',
    'customer_onboarding',
    'customer_feedback',
    'support_escalation',
    'content_calendar',
    'launch_campaign',
    'seo_sprint',
    'partnership_outreach',
    'billing_review',
    'budget_planning',
    'vendor_management',
    'compliance_audit',
    'weekly_sync',
    'quarterly_planning',
    'board_prep',
    'hiring',
    // Super User: Research
    'deep_research',
    'compliance_research',
    'market_research'
]);

export const InboxThreadStatusSchema = z.enum([
    'active', 'draft', 'completed', 'archived'
]);

export const InboxAgentPersonaSchema = z.enum([
    // Field Agents
    'smokey', 'money_mike', 'craig', 'ezal', 'deebo', 'pops', 'day_day',
    'mrs_parker', 'big_worm', 'roach',
    // Executive Agents
    'leo', 'jack', 'linus', 'glenda', 'mike',
    // Auto-routing
    'auto'
]);

export const InboxArtifactTypeSchema = z.enum([
    // Business Artifacts
    'carousel', 'bundle', 'creative_content', 'sell_sheet', 'report', 'outreach_draft', 'event_promo',
    // Growth Management Artifacts
    'growth_report', 'churn_scorecard', 'revenue_model', 'pipeline_report', 'health_scorecard', 'market_analysis', 'partnership_deck', 'experiment_plan',
    // Company Operations Artifacts
    'standup_notes', 'sprint_plan', 'incident_report', 'postmortem', 'feature_spec', 'technical_design',
    'release_notes', 'onboarding_checklist', 'content_calendar', 'okr_document', 'meeting_notes',
    'board_deck', 'budget_model', 'job_spec', 'research_brief', 'compliance_brief'
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
        // Business Operations
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
        // Customer
        product_discovery: 'Search',
        support: 'HelpCircle',
        // Super User: Growth Management
        growth_review: 'TrendingUp',
        churn_risk: 'UserMinus',
        revenue_forecast: 'Calculator',
        pipeline: 'Funnel',
        customer_health: 'HeartPulse',
        market_intel: 'Target',
        bizdev: 'Handshake',
        experiment: 'FlaskConical',
        // Super User: Company Operations
        daily_standup: 'Coffee',
        sprint_planning: 'ListTodo',
        incident_response: 'AlertTriangle',
        feature_spec: 'FileCode',
        code_review: 'GitPullRequest',
        release: 'Rocket',
        customer_onboarding: 'UserPlus',
        customer_feedback: 'MessageCircle',
        support_escalation: 'AlertOctagon',
        content_calendar: 'CalendarRange',
        launch_campaign: 'Megaphone',
        seo_sprint: 'Search',
        partnership_outreach: 'Handshake',
        billing_review: 'Receipt',
        budget_planning: 'PiggyBank',
        vendor_management: 'Building2',
        compliance_audit: 'ShieldCheck',
        weekly_sync: 'Users',
        quarterly_planning: 'Target',
        board_prep: 'Presentation',
        hiring: 'UserSearch',
        // Super User: Research
        deep_research: 'BookOpen',
        compliance_research: 'Scale',
        market_research: 'BarChart3',
    };
    return iconMap[type] || 'MessageSquare';
}

/**
 * Get thread type label
 */
export function getThreadTypeLabel(type: InboxThreadType): string {
    const labelMap: Record<InboxThreadType, string> = {
        // Business Operations
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
        // Customer
        product_discovery: 'Products',
        support: 'Support',
        // Super User: Growth Management
        growth_review: 'Growth Review',
        churn_risk: 'Churn Analysis',
        revenue_forecast: 'Revenue Forecast',
        pipeline: 'Pipeline',
        customer_health: 'Customer Health',
        market_intel: 'Market Intel',
        bizdev: 'BizDev',
        experiment: 'Experiment',
        // Super User: Company Operations
        daily_standup: 'Daily Standup',
        sprint_planning: 'Sprint Planning',
        incident_response: 'Incident Response',
        feature_spec: 'Feature Spec',
        code_review: 'Code Review',
        release: 'Release',
        customer_onboarding: 'Customer Onboarding',
        customer_feedback: 'Customer Feedback',
        support_escalation: 'Escalation',
        content_calendar: 'Content Calendar',
        launch_campaign: 'Launch Campaign',
        seo_sprint: 'SEO Sprint',
        partnership_outreach: 'Partnership',
        billing_review: 'Billing Review',
        budget_planning: 'Budget Planning',
        vendor_management: 'Vendors',
        compliance_audit: 'Compliance Audit',
        weekly_sync: 'Weekly Sync',
        quarterly_planning: 'Quarterly Planning',
        board_prep: 'Board Prep',
        hiring: 'Hiring',
        // Super User: Research
        deep_research: 'Deep Research',
        compliance_research: 'Compliance Research',
        market_research: 'Market Research',
    };
    return labelMap[type] || 'Unknown';
}

/**
 * Get primary artifact type(s) for a thread type
 * Some threads can produce multiple artifact types
 */
export function getArtifactTypesForThreadType(type: InboxThreadType): InboxArtifactType[] {
    const mapping: Record<InboxThreadType, InboxArtifactType[]> = {
        // Business Operations
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
        // Customer
        product_discovery: [],
        support: [],
        general: [],
        // Super User: Growth Management
        growth_review: ['growth_report'],
        churn_risk: ['churn_scorecard'],
        revenue_forecast: ['revenue_model'],
        pipeline: ['pipeline_report'],
        customer_health: ['health_scorecard'],
        market_intel: ['market_analysis'],
        bizdev: ['partnership_deck'],
        experiment: ['experiment_plan'],
        // Super User: Company Operations
        daily_standup: ['standup_notes'],
        sprint_planning: ['sprint_plan'],
        incident_response: ['incident_report', 'postmortem'],
        feature_spec: ['feature_spec', 'technical_design'],
        code_review: ['meeting_notes'],
        release: ['release_notes'],
        customer_onboarding: ['onboarding_checklist'],
        customer_feedback: ['report'],
        support_escalation: ['meeting_notes'],
        content_calendar: ['content_calendar'],
        launch_campaign: ['creative_content', 'outreach_draft'],
        seo_sprint: ['report'],
        partnership_outreach: ['partnership_deck'],
        billing_review: ['report'],
        budget_planning: ['budget_model'],
        vendor_management: ['report'],
        compliance_audit: ['compliance_brief'],
        weekly_sync: ['meeting_notes'],
        quarterly_planning: ['okr_document'],
        board_prep: ['board_deck'],
        hiring: ['job_spec'],
        // Super User: Research
        deep_research: ['research_brief'],
        compliance_research: ['compliance_brief'],
        market_research: ['market_analysis', 'research_brief'],
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
