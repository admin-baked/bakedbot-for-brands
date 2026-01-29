/**
 * Export INBOX_QUICK_ACTIONS to JSON
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define constants
const BRAND_ROLES = ['super_user', 'brand', 'brand_admin', 'brand_member'];
const DISPENSARY_ROLES = ['super_user', 'dispensary', 'dispensary_admin', 'dispensary_staff'];
const ALL_BUSINESS_ROLES = [...BRAND_ROLES, ...DISPENSARY_ROLES.filter(r => r !== 'super_user')];

// Define quick actions
const INBOX_QUICK_ACTIONS = [
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
        defaultAgent: 'craig',
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

    // ============ Product Launch (Brand + Dispensary) ============
    {
        id: 'product-launch',
        label: 'Product Launch',
        description: 'Create a full launch package with carousel, bundle, and social',
        icon: 'Rocket',
        threadType: 'launch',
        defaultAgent: 'leo',
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
        roles: ['super_user'],
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

// Write to JSON file
const outputPath = join(__dirname, '..', 'src', 'types', 'inbox-quick-actions.json');
writeFileSync(outputPath, JSON.stringify(INBOX_QUICK_ACTIONS, null, 2), 'utf-8');

console.log(`✅ Exported ${INBOX_QUICK_ACTIONS.length} quick actions to ${outputPath}`);
