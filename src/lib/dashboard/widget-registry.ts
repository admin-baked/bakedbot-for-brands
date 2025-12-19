/**
 * Widget Registry - Central registry for all dashboard widgets
 * Defines widget types, configurations, and role-based visibility
 */

export type UserRole = 'owner' | 'admin' | 'brand' | 'dispensary' | 'editor' | 'customer';

export interface WidgetConfig {
    id: string;
    type: string;
    title: string;
    description: string;
    component: string; // Component name to render
    minWidth: number;  // Minimum grid columns (react-grid-layout)
    minHeight: number; // Minimum grid rows
    defaultWidth: number;
    defaultHeight: number;
    visibleFor: UserRole[];
    category: WidgetCategory;
    icon?: string;
}

export type WidgetCategory =
    | 'insights'
    | 'seo'
    | 'operations'
    | 'growth'
    | 'content'
    | 'compliance';

export interface WidgetInstance {
    id: string;
    widgetType: string;
    x: number;
    y: number;
    w: number;
    h: number;
    settings?: Record<string, unknown>;
}

export interface DashboardLayout {
    version: number;
    role: UserRole;
    widgets: WidgetInstance[];
    updatedAt: string;
}

// Widget definitions
const WIDGET_DEFINITIONS: WidgetConfig[] = [
    // Insights
    {
        id: 'top-zips',
        type: 'top-zips',
        title: 'Top Performing ZIPs',
        description: 'View your highest traffic ZIP codes by views and CTR',
        component: 'TopZipsWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 3,
        visibleFor: ['owner', 'admin', 'brand', 'dispensary'],
        category: 'insights',
        icon: 'MapPin'
    },
    {
        id: 'foot-traffic',
        type: 'foot-traffic',
        title: 'Foot Traffic Stats',
        description: 'Real-time foot traffic metrics and trends',
        component: 'FootTrafficWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin', 'brand', 'dispensary'],
        category: 'insights',
        icon: 'TrendingUp'
    },
    {
        id: 'revenue-summary',
        type: 'revenue-summary',
        title: 'Revenue Summary',
        description: 'Daily revenue from connected POS systems',
        component: 'RevenueSummaryWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 2,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin', 'dispensary'],
        category: 'insights',
        icon: 'DollarSign'
    },

    // SEO & Visibility
    {
        id: 'seo-health',
        type: 'seo-health',
        title: 'SEO Health',
        description: 'Deebo SEO review score and recent issues',
        component: 'SeoHealthWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 3,
        visibleFor: ['owner', 'admin', 'brand'],
        category: 'seo',
        icon: 'Search'
    },
    {
        id: 'crawl-status',
        type: 'crawl-status',
        title: 'Crawl Status',
        description: 'Index coverage and crawl health',
        component: 'CrawlStatusWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 2,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin'],
        category: 'seo',
        icon: 'Globe'
    },

    // Operations
    {
        id: 'agent-status',
        type: 'agent-status',
        title: 'Agent Status',
        description: 'Monitor agent uptime and health',
        component: 'AgentStatusWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 2,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin'],
        category: 'operations',
        icon: 'Bot'
    },
    {
        id: 'playbook-tracker',
        type: 'playbook-tracker',
        title: 'Playbook Runs',
        description: 'Recent playbook executions (last 7 days)',
        component: 'PlaybookTrackerWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin', 'brand', 'dispensary'],
        category: 'operations',
        icon: 'Play'
    },

    // Growth & Sales
    {
        id: 'claim-cta',
        type: 'claim-cta',
        title: 'Claim More Pages',
        description: 'Pages available to claim in your area',
        component: 'ClaimCtaWidget',
        minWidth: 2,
        minHeight: 1,
        defaultWidth: 3,
        defaultHeight: 2,
        visibleFor: ['brand', 'dispensary'],
        category: 'growth',
        icon: 'Zap'
    },
    {
        id: 'new-detected',
        type: 'new-detected',
        title: 'New Discoveries',
        description: 'Recently detected dispensaries and brands',
        component: 'NewDetectedWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 2,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin'],
        category: 'growth',
        icon: 'Sparkles'
    },
    {
        id: 'campaign-metrics',
        type: 'campaign-metrics',
        title: 'Campaign Metrics',
        description: 'Craig campaign performance (open/click rates)',
        component: 'CampaignMetricsWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin', 'brand'],
        category: 'growth',
        icon: 'BarChart'
    },

    // Content & Editorial
    {
        id: 'recent-reviews',
        type: 'recent-reviews',
        title: 'Recent Reviews',
        description: 'Moderation queue for new reviews',
        component: 'RecentReviewsWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 3,
        visibleFor: ['owner', 'admin', 'editor'],
        category: 'content',
        icon: 'MessageSquare'
    },
    {
        id: 'editor-requests',
        type: 'editor-requests',
        title: 'Editor Requests',
        description: 'Pending guest editor access requests',
        component: 'EditorRequestsWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 2,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin'],
        category: 'content',
        icon: 'UserPlus'
    },

    // Compliance
    {
        id: 'compliance-alerts',
        type: 'compliance-alerts',
        title: 'Compliance Alerts',
        description: 'Violations flagged by Deebo',
        component: 'ComplianceAlertsWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin', 'brand', 'dispensary'],
        category: 'compliance',
        icon: 'Shield'
    },
    {
        id: 'rule-changes',
        type: 'rule-changes',
        title: 'Upcoming Rule Changes',
        description: 'Cannabis regulation updates by state',
        component: 'RuleChangesWidget',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 2,
        defaultHeight: 2,
        visibleFor: ['owner', 'admin'],
        category: 'compliance',
        icon: 'AlertTriangle'
    }
];

/**
 * Get all registered widgets
 */
export function getAllWidgets(): WidgetConfig[] {
    return [...WIDGET_DEFINITIONS];
}

/**
 * Get widget by type
 */
export function getWidgetByType(type: string): WidgetConfig | undefined {
    return WIDGET_DEFINITIONS.find(w => w.type === type);
}

/**
 * Get widgets available for a specific role
 */
export function getWidgetsForRole(role: UserRole): WidgetConfig[] {
    return WIDGET_DEFINITIONS.filter(w => w.visibleFor.includes(role));
}

/**
 * Get widgets by category
 */
export function getWidgetsByCategory(category: WidgetCategory): WidgetConfig[] {
    return WIDGET_DEFINITIONS.filter(w => w.category === category);
}

/**
 * Get all widget categories with their widgets
 */
export function getWidgetsByCategories(): Record<WidgetCategory, WidgetConfig[]> {
    const categories: WidgetCategory[] = ['insights', 'seo', 'operations', 'growth', 'content', 'compliance'];
    return categories.reduce((acc, cat) => {
        acc[cat] = getWidgetsByCategory(cat);
        return acc;
    }, {} as Record<WidgetCategory, WidgetConfig[]>);
}

/**
 * Check if a widget is visible for a role
 */
export function isWidgetVisibleForRole(widgetType: string, role: UserRole): boolean {
    const widget = getWidgetByType(widgetType);
    return widget ? widget.visibleFor.includes(role) : false;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: WidgetCategory): string {
    const names: Record<WidgetCategory, string> = {
        insights: '🧠 Insights',
        seo: '📈 SEO & Visibility',
        operations: '🧰 Operational Health',
        growth: '🚀 Growth & Sales',
        content: '📝 Content & Editorial',
        compliance: '🔐 Compliance Watch'
    };
    return names[category];
}

// Current layout version - increment when layout structure changes
export const LAYOUT_VERSION = 1;
