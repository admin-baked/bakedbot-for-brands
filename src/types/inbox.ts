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
import type { QRCode } from './qr-code';
import type { IntegrationRequest } from './service-integrations';
import type { ChatMessage } from '@/lib/store/agent-chat-store';
import type { CustomerSegment } from './customers';

// ============ Thread Types ============

/**
 * Types of inbox threads - determines which agents and quick actions are available
 */
export type InboxThreadType =
    // ---- Business Operations (Brand + Dispensary) ----
    | 'general'           // General conversation
    | 'carousel'          // Product carousel creation
    | 'hero'              // Hero banner creation
    | 'bundle'            // Bundle deal creation
    | 'creative'          // Social media content
    | 'video'             // Video content generation
    | 'campaign'          // Multi-channel campaign
    | 'qr_code'           // Trackable QR code generation
    | 'blog'              // Blog post creation
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
    | 'market_research'   // Strategic market analysis
    // ---- CRM / Customer Intelligence ----
    | 'crm_customer';    // CRM customer relationship management

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

    // Project/context reference
    projectId?: string;          // Claude Projects-style context
    brandId?: string;
    dispensaryId?: string;

    // CRM context (optional, set when thread is about a specific customer)
    customerId?: string;          // e.g. 'alleaves_123'
    customerEmail?: string;
    customerSegment?: string;     // Cached segment at thread creation

    // Routing context (for internal support threads)
    assignedToRole?: 'super_user' | 'super_admin';  // Routes thread to Super User inbox
    assignedToUserId?: string;                       // Routes thread to specific user

    // Organization features
    isPinned?: boolean;          // Pin to top of list
    tags?: string[];             // Custom tags for filtering
    color?: string;              // Thread color (inherited from project or custom)

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
    | 'qr_code'           // Trackable QR code
    | 'blog_post'         // Blog post
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
    | 'compliance_brief'  // Compliance research document
    // ---- Research Artifacts ----
    | 'research_report'   // Big Worm deep research task (live progress card + completed report)
    // ---- Integration Artifacts ----
    | 'integration_request' // Request to connect third-party service (OAuth, API key, etc.)
    // ---- Analytics Artifacts ----
    | 'analytics_chart'     // Recharts chart from agent analytics tool output
    | 'analytics_briefing'; // Morning proactive briefing with metrics + news

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
 * Data payload for research_report artifacts (live polling card + completed report)
 */
export interface ResearchReportArtifactData {
    taskId: string;
    reportTitle: string;
    plan?: string[];
    driveFileId?: string;
}

// =============================================================================
// Outreach Draft Artifact Type (Phase 1 — Campaign Inbox Fast Path)
// =============================================================================

/**
 * Data payload for outreach_draft artifacts.
 * Created by Craig when writing email/SMS copy in the inbox.
 * Supports fast-path send (self-approve) without leaving the inbox.
 */
export interface OutreachDraftData {
    /** Primary channel — email-first per product decision */
    channel: 'email' | 'sms';
    /** Email subject line */
    subject?: string;
    /** Plain text body (used as both SMS text and email fallback) */
    body: string;
    /** HTML email body (optional, falls back to body) */
    htmlBody?: string;
    /** Target customer segments for audience resolution */
    targetSegments: CustomerSegment[];
    /** Estimated recipient count shown in UI before send */
    estimatedRecipients?: number;
    /** UI send state — controls button states and status display */
    sendStatus?: 'idle' | 'checking' | 'sending' | 'sent' | 'failed' | 'scheduled';
    /** ISO string — set when sendStatus === 'sent' */
    sentAt?: string;
    /** ISO string — set when sendStatus === 'scheduled' */
    scheduledAt?: string;
    /** Actual resolved recipient count after audience resolution */
    recipientCount?: number;
    /** Campaign document ID created in Firestore after send */
    campaignId?: string;
    /** Compliance check result from Deebo */
    complianceStatus?: 'pending' | 'passed' | 'failed' | 'warning';
    complianceViolations?: string[];
    complianceSuggestions?: string[];
}

// =============================================================================
// Analytics Artifact Types (Phase 5)
// =============================================================================

export interface ChartDataKey {
    key: string;          // matches key in chartData objects
    label: string;        // display label
    color: string;        // hex color e.g., '#22c55e'
    type?: 'line' | 'bar'; // for composed charts
}

export interface ChartBenchmark {
    value: number;
    label: string;        // e.g., "Industry avg 21.9%"
    color: string;        // e.g., '#ef4444'
}

export type AnalyticsChartType =
    | 'line' | 'bar' | 'horizontal_bar' | 'donut'
    | 'heatmap' | 'stacked_bar' | 'composed';

export interface AnalyticsChart {
    title: string;
    description?: string;
    chartType: AnalyticsChartType;
    chartData: Record<string, unknown>[];  // Recharts-compatible data array
    dataKeys: ChartDataKey[];
    xAxisKey?: string;                      // for line/bar charts
    benchmark?: ChartBenchmark;
    insight: string;                        // Agent-written 1-2 sentence insight
    disclaimer?: string;                    // e.g., §280E disclaimer
    toolSource: 'promotion_scorecard' | 'sku_profitability_view' | 'inventory_health_score' | 'vendor_scorecard' | 'morning_briefing' | 'orders_analytics' | 'custom';
    generatedAt: string;                    // ISO string
}

export interface BriefingMetric {
    title: string;
    value: string;
    trend: 'up' | 'down' | 'flat';
    vsLabel: string;       // e.g., "vs. 12% market target"
    status: 'good' | 'warning' | 'critical';
    actionable?: string;   // Short action if warning/critical
}

export interface BriefingNewsItem {
    headline: string;
    source: string;
    url?: string;
    relevance: 'high' | 'medium';
}

export interface AnalyticsBriefing {
    date: string;          // YYYY-MM-DD
    dayOfWeek: string;     // e.g., 'Tuesday'
    metrics: BriefingMetric[];
    newsItems: BriefingNewsItem[];
    urgencyLevel: 'critical' | 'warning' | 'info' | 'clean';
    topAlert?: string;     // Most urgent single-line alert if any
    marketContext: string; // e.g., "NY Limited License | Early Market"
}

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
    data: Carousel | BundleDeal | CreativeContent | QRCode | IntegrationRequest | ResearchReportArtifactData | AnalyticsChart | AnalyticsBriefing | OutreachDraftData;

    // Agent rationale for the suggestion
    rationale?: string;

    // Drive integration — set when artifact has a corresponding BakedBot Drive file
    driveFileId?: string;

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
    // When true, clicking shows a query dialog instead of immediately creating a thread
    requiresQueryDialog?: boolean;
}

/** Role constants for cleaner action definitions */
// NOTE: Super Users have their own executive presets and should not inherit
// brand/dispensary quick actions unless they're explicitly operating in that role context.
const BRAND_ROLES = ['brand', 'brand_admin', 'brand_member'];
const DISPENSARY_ROLES = ['dispensary', 'dispensary_admin', 'dispensary_staff'];
const ALL_BUSINESS_ROLES = [...BRAND_ROLES, ...DISPENSARY_ROLES];

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
        id: 'new-hero',
        label: 'New Hero Banner',
        description: 'Create a hero banner with AI assistance',
        icon: 'ImagePlus',
        threadType: 'hero',
        defaultAgent: 'craig',
        promptTemplate: 'Help me create a new hero banner',
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
    {
        id: 'create-qr',
        label: 'QR Code',
        description: 'Generate trackable QR codes for products, menus, or promotions',
        icon: 'QrCode',
        threadType: 'qr_code',
        defaultAgent: 'craig',
        promptTemplate: 'Help me create a trackable QR code',
        roles: ALL_BUSINESS_ROLES,
    },
    {
        id: 'create-image',
        label: 'Create Image',
        description: 'Generate AI product or lifestyle images for marketing',
        icon: 'ImagePlus',
        threadType: 'creative',
        defaultAgent: 'craig',
        promptTemplate: 'Help me create marketing images. I need product photography or lifestyle imagery for my dispensary.',
        roles: ALL_BUSINESS_ROLES,
    },
    {
        id: 'create-video',
        label: 'Create Video',
        description: 'Generate short-form video content for social media',
        icon: 'Video',
        threadType: 'video',
        defaultAgent: 'craig',
        promptTemplate: 'Help me create video content for social media. I need engaging short-form videos for TikTok or Instagram Reels.',
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
        label: 'Outbound Pitch',
        description: 'Draft outbound outreach to high-fit brands/dispensaries for BakedBot',
        icon: 'Presentation',
        threadType: 'partnership_outreach',
        defaultAgent: 'glenda',
        promptTemplate: 'Build an outbound pitch pack for BakedBot. Identify 10 high-fit brands/dispensaries, write a short cold email + follow-up, and list the key hook, ICP fit, and likely objections for each.',
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

    // ============ Dispensary: Upsell & AOV Optimization ============
    {
        id: 'upsell-review',
        label: 'Upsell Performance',
        description: 'Review upsell conversion rates and top-pairing products',
        icon: 'Zap',
        threadType: 'analytics' as InboxThreadType,
        defaultAgent: 'pops' as InboxAgentPersona,
        promptTemplate: 'Analyze our upsell performance. Which product pairings are converting best? What terpene-based pairings should we promote more? Show me AOV trends with and without upsells.',
        roles: [...DISPENSARY_ROLES],
    },
    {
        id: 'suggest-bundles',
        label: 'Suggest Bundles',
        description: 'AI-generated bundle ideas based on terpene pairings and sales data',
        icon: 'Package',
        threadType: 'product_discovery' as InboxThreadType,
        defaultAgent: 'smokey' as InboxAgentPersona,
        promptTemplate: 'Based on our current menu and terpene profiles, suggest 3 new product bundles we should create. Consider the entourage effect, seasonal trends, and products that pair well scientifically. Include suggested bundle names and pricing.',
        roles: [...ALL_BUSINESS_ROLES],
    },
    {
        id: 'cart-recovery',
        label: 'Cart Recovery',
        description: 'Review abandoned carts and create recovery campaigns',
        icon: 'ShoppingCart',
        threadType: 'marketing' as InboxThreadType,
        defaultAgent: 'craig' as InboxAgentPersona,
        promptTemplate: 'Show me recent abandoned carts. Draft a recovery SMS/email campaign with personalized product recommendations for customers who left items behind. Include a time-limited discount incentive.',
        roles: [...DISPENSARY_ROLES],
    },

    // ============ Super User: Growth Management ============
    {
        id: 'growth-review',
        label: 'Growth Review',
        description: 'Review growth metrics, KPIs, and momentum indicators',
        icon: 'TrendingUp',
        threadType: 'growth_review',
        defaultAgent: 'jack',
        promptTemplate: 'Run a weekly growth review for BakedBot: MRR, net new MRR, churn, expansion, pipeline, activation, WAU/MAU, and top bottlenecks. End with 5 concrete next actions.',
        roles: ['super_user'],
    },
    {
        id: 'churn-analysis',
        label: 'Churn Analysis',
        description: 'Analyze at-risk customers and plan retention interventions',
        icon: 'UserMinus',
        threadType: 'churn_risk',
        defaultAgent: 'jack',
        promptTemplate: 'Analyze churn risk for BakedBot customers: who is at risk, why, and what win-back actions we should run this week. Include a prioritized list and recommended playbooks.',
        roles: ['super_user'],
    },
    {
        id: 'revenue-forecast',
        label: 'Revenue Forecast',
        description: 'Model and project revenue scenarios',
        icon: 'Calculator',
        threadType: 'revenue_forecast',
        defaultAgent: 'money_mike',
        promptTemplate: 'Forecast BakedBot revenue for the next 3 months. Provide best/base/worst scenarios using assumptions for pipeline conversion, churn, and pricing, and list what to measure to validate assumptions.',
        roles: ['super_user'],
    },
    {
        id: 'pipeline-review',
        label: 'Pipeline Review',
        description: 'Track deals, sales velocity, and conversion funnel',
        icon: 'Funnel',
        threadType: 'pipeline',
        defaultAgent: 'jack',
        promptTemplate: 'Review the BakedBot sales pipeline: stage totals, top deals, next steps, risks, and what to do today to unblock revenue. Summarize in an exec-ready format.',
        roles: ['super_user'],
    },
    {
        id: 'customer-health',
        label: 'Customer Health',
        description: 'Monitor customer segment health and engagement',
        icon: 'HeartPulse',
        threadType: 'customer_health',
        defaultAgent: 'jack',
        promptTemplate: 'Assess customer health for BakedBot: segment accounts by lifecycle stage and usage, flag red accounts, and recommend retention + activation actions. Focus on preventing churn.',
        roles: ['super_user'],
    },
    {
        id: 'market-intel',
        label: 'Market Intel',
        description: 'Competitive landscape and positioning for BakedBot',
        icon: 'Target',
        threadType: 'market_intel',
        defaultAgent: 'ezal',
        promptTemplate: 'Analyze BakedBot competitors (POS, menus/marketplaces, CRM/marketing automation, AI agents). Produce a concise battlecard: pricing, positioning, strengths/weaknesses, and our recommended counter-moves.',
        roles: ['super_user'],
    },
    {
        id: 'bizdev-outreach',
        label: 'BizDev',
        description: 'Partnership outreach and expansion opportunities',
        icon: 'Handshake',
        threadType: 'bizdev',
        defaultAgent: 'glenda',
        promptTemplate: 'Plan BizDev for BakedBot: top partner categories, target list, partnership offers, and outreach messaging. Include a 30-day action plan.',
        roles: ['super_user'],
    },
    {
        id: 'growth-experiment',
        label: 'Experiment',
        description: 'Plan and analyze growth experiments and A/B tests',
        icon: 'FlaskConical',
        threadType: 'experiment',
        defaultAgent: 'linus',
        promptTemplate: 'Design a growth experiment for BakedBot (activation, conversion, or retention). Define hypothesis, success metrics, rollout plan, and what data we need to collect.',
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
        promptTemplate: 'Run the BakedBot daily standup: what shipped, what\'s blocked, incidents, revenue/pipeline highlights, and priorities for today. End with owners + next steps.',
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
        promptTemplate: 'Review BakedBot customer onboarding: signup flow, activation checklist, welcome sequences, and where users drop. Suggest improvements and a 7-day activation playbook.',
        roles: ['super_user'],
    },
    {
        id: 'customer-pulse',
        label: 'Customer Pulse',
        description: 'Review customer health, feedback, and escalations',
        icon: 'HeartHandshake',
        threadType: 'customer_feedback',
        defaultAgent: 'jack',
        promptTemplate: 'Give me a customer pulse for BakedBot: recent feedback themes, escalations, top requests, and accounts at risk. Recommend what to do this week.',
        roles: ['super_user'],
    },
    {
        id: 'content-brief',
        label: 'Content Brief',
        description: 'Generate content brief for blog, social, or email',
        icon: 'FileEdit',
        threadType: 'content_calendar',
        defaultAgent: 'glenda',
        promptTemplate: 'Create a content brief for BakedBot: topic, angle, target persona, key points, CTA, and distribution plan. Keep it crisp and actionable.',
        roles: ['super_user'],
    },
    {
        id: 'weekly-sync',
        label: 'Weekly Sync',
        description: 'Run the executive team weekly check-in',
        icon: 'Users',
        threadType: 'weekly_sync',
        defaultAgent: 'leo',
        promptTemplate: 'Run the weekly exec sync for BakedBot. Collect updates (growth, product, ops, finance), decisions needed, and action items with owners/dates.',
        roles: ['super_user'],
    },
    {
        id: 'cash-flow',
        label: 'Cash Flow',
        description: 'Review cash position, runway, and burn rate',
        icon: 'Banknote',
        threadType: 'budget_planning',
        defaultAgent: 'mike',
        promptTemplate: 'Review BakedBot cash flow: burn, runway, upcoming vendor/API costs, and where to cut or optimize. Include a simple risk register.',
        roles: ['super_user'],
    },
    {
        id: 'board-update',
        label: 'Board Update',
        description: 'Draft investor/board update',
        icon: 'Presentation',
        threadType: 'board_prep',
        defaultAgent: 'mike',
        promptTemplate: 'Draft the monthly BakedBot investor update: wins, metrics (MRR, churn, pipeline), product progress, risks, and next month goals. Keep it board-ready.',
        roles: ['super_user'],
    },
    {
        id: 'compliance-audit',
        label: 'Compliance Audit',
        description: 'Scan for compliance risks before they become fines',
        icon: 'ShieldCheck',
        threadType: 'compliance_audit',
        defaultAgent: 'deebo',
        promptTemplate: 'Audit BakedBot for compliance risks: cannabis marketing claims, age-gating, privacy/security basics, and high-risk copy patterns. Output prioritized fixes.',
        roles: ['super_user'],
    },
    {
        id: 'hiring-review',
        label: 'Hiring',
        description: 'Plan roles and review candidates',
        icon: 'UserSearch',
        threadType: 'hiring',
        defaultAgent: 'leo',
        promptTemplate: 'Help with hiring for BakedBot: define roles needed, write job specs, and create an interview loop + scorecard. If given candidates, summarize strengths/risks.',
        roles: ['super_user'],
    },

    // ============ Research (all business roles) ============
    {
        id: 'deep-research',
        label: 'Deep Research',
        description: 'Comprehensive market, product, or competitor research by Big Worm',
        icon: 'BookOpen',
        threadType: 'deep_research',
        defaultAgent: 'big_worm',
        promptTemplate: '',
        roles: ['super_user', 'brand_admin', 'brand', 'dispensary_admin', 'dispensary'],
        requiresQueryDialog: true,
    },
    {
        id: 'compliance-brief',
        label: 'Compliance Brief',
        description: 'Generate compliance research brief with Roach',
        icon: 'Scale',
        threadType: 'compliance_research',
        defaultAgent: 'roach',
        promptTemplate: 'Research compliance requirements regarding:',
        roles: ['super_user', 'brand_admin', 'dispensary_admin'],
        requiresQueryDialog: true,
    },
    {
        id: 'market-analysis',
        label: 'Market Analysis',
        description: 'Deep market analysis and strategic research',
        icon: 'BarChart3',
        threadType: 'market_research',
        defaultAgent: 'big_worm',
        promptTemplate: 'Analyze the market around:',
        roles: ['super_user', 'brand_admin', 'dispensary_admin'],
        requiresQueryDialog: true,
    },

    // ============ CRM / Customer Intelligence ============
    {
        id: 'winback-at-risk',
        label: 'Win Back At-Risk',
        description: 'Find at-risk customers and draft personalized win-back campaigns',
        icon: 'UserMinus',
        threadType: 'crm_customer',
        defaultAgent: 'craig',
        promptTemplate: 'Find at-risk and slipping customers (30+ days inactive). Draft personalized win-back messages for the top 10 by LTV with special offers.',
        roles: DISPENSARY_ROLES,
    },
    {
        id: 'birthday-campaign',
        label: 'Birthday Campaign',
        description: 'Check upcoming birthdays and draft personalized messages',
        icon: 'Cake',
        threadType: 'crm_customer',
        defaultAgent: 'mrs_parker',
        promptTemplate: 'Check for customer birthdays this week and next. Draft personalized birthday messages with loyalty reward offers.',
        roles: DISPENSARY_ROLES,
    },
    {
        id: 'vip-appreciation',
        label: 'VIP Appreciation',
        description: 'Create exclusive VIP appreciation campaigns',
        icon: 'Crown',
        threadType: 'crm_customer',
        defaultAgent: 'craig',
        promptTemplate: 'Pull VIP and high-value customer segments. Create an exclusive appreciation campaign — early access, special pricing, or bonus loyalty points.',
        roles: DISPENSARY_ROLES,
    },
    {
        id: 'segment-analysis',
        label: 'Segment Analysis',
        description: 'Break down customer segments with spending and LTV data',
        icon: 'PieChart',
        threadType: 'crm_customer',
        defaultAgent: 'money_mike',
        promptTemplate: 'Break down our customer segments: counts, average spend, LTV, and trends. Where are the biggest revenue growth opportunities?',
        roles: ALL_BUSINESS_ROLES,
    },
    {
        id: 'restock-alert',
        label: 'Restock Alert',
        description: 'Draft restock notifications for loyal customers',
        icon: 'PackageCheck',
        threadType: 'crm_customer',
        defaultAgent: 'smokey',
        promptTemplate: 'Look at our VIP and loyal customers. Check their preferred products and order history. Draft restock notifications for products they buy regularly.',
        roles: DISPENSARY_ROLES,
    },
    {
        id: 'comms-review',
        label: 'Comms Review',
        description: 'Review recent customer communications and suggest improvements',
        icon: 'MailCheck',
        threadType: 'crm_customer',
        defaultAgent: 'mrs_parker',
        promptTemplate: 'Review recent customer emails and SMS sent this month. Which had the best engagement? Suggest improvements for the next round.',
        roles: DISPENSARY_ROLES,
    },
    // Campaign Management
    {
        id: 'plan-campaign',
        label: 'Plan Campaign',
        description: 'Plan a marketing campaign — goal, audience, channels, and content',
        icon: 'Megaphone',
        threadType: 'campaign',
        defaultAgent: 'craig' as InboxAgentPersona,
        promptTemplate: 'Help me plan a marketing campaign. What\'s the goal, who should we target, and which channels (email/SMS) should we use? Analyze our customer segments to recommend the best audience.',
        roles: DISPENSARY_ROLES,
    },
    {
        id: 'campaign-performance',
        label: 'Campaign Performance',
        description: 'Analyze performance across recent campaigns',
        icon: 'BarChart3',
        threadType: 'campaign',
        defaultAgent: 'craig' as InboxAgentPersona,
        promptTemplate: 'Show me performance for our recent campaigns. What are the open rates, click rates, and attributed revenue? Which campaigns performed best and what can we learn?',
        roles: DISPENSARY_ROLES,
    },
];

// ============ Thread Filters ============

export interface InboxFilter {
    type: InboxThreadType | 'all';
    status: InboxThreadStatus | 'all';
    agent: InboxAgentPersona | 'all';
    projectId?: string | 'all';     // Filter by project
    tags?: string[];                 // Filter by tags
    isPinned?: boolean;              // Show only pinned
    searchQuery?: string;            // Search in title/messages
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
    hero: {
        primary: 'craig',
        supporting: ['deebo', 'ezal'],
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
    qr_code: {
        primary: 'craig',
        supporting: ['linus'], // Technical implementation
    },
    blog: {
        primary: 'craig',
        supporting: ['deebo'], // Compliance check
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

    // CRM / Customer Intelligence
    crm_customer: {
        primary: 'mrs_parker',
        supporting: ['craig', 'money_mike', 'smokey'],
    },
};

// ============ Zod Schemas ============

export const InboxThreadTypeSchema = z.enum([
    // Business Operations
    'general',
    'carousel',
    'hero',
    'bundle',
    'creative',
    'campaign',
    'qr_code',
    'blog',
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
    'market_research',
    // CRM / Customer Intelligence
    'crm_customer'
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
    'carousel', 'bundle', 'creative_content', 'qr_code', 'blog_post', 'sell_sheet', 'report', 'outreach_draft', 'event_promo',
    // Growth Management Artifacts
    'growth_report', 'churn_scorecard', 'revenue_model', 'pipeline_report', 'health_scorecard', 'market_analysis', 'partnership_deck', 'experiment_plan',
    // Company Operations Artifacts
    'standup_notes', 'sprint_plan', 'incident_report', 'postmortem', 'feature_spec', 'technical_design',
    'release_notes', 'onboarding_checklist', 'content_calendar', 'okr_document', 'meeting_notes',
    'board_deck', 'budget_model', 'job_spec', 'research_brief', 'compliance_brief',
    // Analytics Artifacts
    'analytics_chart', 'analytics_briefing',
]);

export const InboxArtifactStatusSchema = z.enum([
    'draft', 'pending_review', 'approved', 'published', 'rejected'
]);

export const CreateInboxThreadSchema = z.object({
    id: z.string().optional(), // Client-generated ID to avoid race conditions
    type: InboxThreadTypeSchema,
    title: z.string().min(1).max(200).optional(),
    primaryAgent: InboxAgentPersonaSchema.optional(),
    projectId: z.string().optional(),
    brandId: z.string().optional(),
    dispensaryId: z.string().optional(),
    // CRM context (optional, set when thread is about a specific customer)
    customerId: z.string().optional(),
    customerEmail: z.string().optional(),
    customerSegment: z.string().optional(),
    tags: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    initialMessage: z.any().optional(), // ChatMessage object (optional)
});

export const UpdateInboxThreadSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    status: InboxThreadStatusSchema.optional(),
    primaryAgent: InboxAgentPersonaSchema.optional(),
    isPinned: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// ============ Helper Functions ============

/**
 * Get quick actions available for a given role (hardcoded fallback)
 *
 * @deprecated Use getQuickActionsForRoleAsync for database-backed actions
 */
export function getQuickActionsForRole(role: string): InboxQuickAction[] {
    return INBOX_QUICK_ACTIONS.filter(action => action.roles.includes(role));
}

/**
 * Get quick actions available for a given role (database-backed with fallback)
 *
 * Feature flag: NEXT_PUBLIC_USE_DB_QUICK_ACTIONS
 *
 * Load strategy:
 * 1. If feature flag enabled, load from database (with tenant overrides)
 * 2. Fallback to hardcoded INBOX_QUICK_ACTIONS
 * 3. Cache for 5 minutes
 *
 * @param role - User role context
 * @param tenantId - Optional tenant ID for tenant-specific overrides
 */
export async function getQuickActionsForRoleAsync(
    role: string,
    tenantId?: string
): Promise<InboxQuickAction[]> {
    // Check feature flag
    const useDatabase = process.env.NEXT_PUBLIC_USE_DB_QUICK_ACTIONS === 'true';

    if (!useDatabase) {
        // Fallback to hardcoded actions
        return getQuickActionsForRole(role);
    }

    try {
        // Dynamic import to avoid circular dependencies
        const { getPresetPrompts } = await import('@/server/actions/role-ground-truth');

        // Map role to RoleContextType
        let roleContext: 'brand' | 'dispensary' | 'super_user' | 'customer' = 'brand';
        if (role === 'dispensary' || role === 'budtender') {
            roleContext = 'dispensary';
        } else if (role === 'super_user' || role === 'super_admin' || role === 'owner') {
            roleContext = 'super_user';
        } else if (role === 'customer') {
            roleContext = 'customer';
        } else if (role === 'brand' || role === 'brand_admin' || role === 'brand_member') {
            roleContext = 'brand';
        }

        // Load preset prompts from database (with tenant overrides)
        const result = await getPresetPrompts(roleContext, tenantId);

        if (result.success && result.data) {
            const actions = result.data.map(preset => ({
                id: preset.id,
                label: preset.label,
                description: preset.description,
                icon: preset.icon || 'MessageSquare',
                threadType: preset.threadType,
                defaultAgent: preset.defaultAgent,
                promptTemplate: preset.promptTemplate,
                roles: preset.roles,
            })) as InboxQuickAction[];

            // Guardrail: if DB presets were migrated incorrectly, Super Users can end up
            // with brand/dispensary quick actions. Filter to executive thread types and
            // fall back to hardcoded presets when none remain.
            if (roleContext === 'super_user') {
                const allowed = new Set<InboxThreadType>([
                    // Growth management
                    'growth_review',
                    'churn_risk',
                    'revenue_forecast',
                    'pipeline',
                    'customer_health',
                    'market_intel',
                    'bizdev',
                    'experiment',

                    // Company ops
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

                    // Research
                    'deep_research',
                    'compliance_research',
                    'market_research',
                ]);

                const filtered = actions.filter((a) => allowed.has(a.threadType as InboxThreadType));
                if (filtered.length > 0) {
                    return filtered;
                }
                return getQuickActionsForRole(role);
            }

            return actions;
        }

        // Fallback to hardcoded if database load fails
        return getQuickActionsForRole(role);
    } catch (error) {
        console.error('[getQuickActionsForRoleAsync] Error loading from database, falling back to hardcoded:', error);
        return getQuickActionsForRole(role);
    }
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
        hero: 'ImagePlus',
        bundle: 'PackagePlus',
        creative: 'Palette',
        campaign: 'Megaphone',
        qr_code: 'QrCode',
        blog: 'FileText',
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
        // CRM / Customer Intelligence
        crm_customer: 'UserRound',
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
        hero: 'Hero Banner',
        bundle: 'Bundle',
        creative: 'Creative',
        campaign: 'Campaign',
        qr_code: 'QR Code',
        blog: 'Blog Post',
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
        // CRM / Customer Intelligence
        crm_customer: 'CRM Customer',
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
        hero: ['creative_content'],
        bundle: ['bundle'],
        creative: ['creative_content'],
        campaign: ['carousel', 'bundle', 'creative_content'],
        qr_code: ['qr_code'],
        blog: ['blog_post'],
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
        // CRM / Customer Intelligence
        crm_customer: ['report'],
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
