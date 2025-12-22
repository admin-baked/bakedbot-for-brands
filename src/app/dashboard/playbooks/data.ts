
export type Playbook = {
    id: string;
    title: string;
    type: 'SIGNAL' | 'AUTOMATION' | 'REPORTING' | 'INTEL' | 'OPS' | 'SEO' | 'COMPLIANCE' | 'FINANCE';
    description: string;
    tags: string[];
    active: boolean;
    status: 'active' | 'disabled';
    prompt: string;
};

export const PLAYBOOKS: Playbook[] = [
    {
        id: 'pb_intel_daily_snapshot_v1',
        title: 'Daily Intelligence Snapshot',
        type: 'INTEL',
        description: 'Daily brand/dispensary snapshot tracking placements, pricing, and promos.',
        tags: ['monitoring', 'market-sensors', 'email-digest'],
        active: true,
        status: 'active',
        prompt: "Set up a daily intelligence snapshot for MFNY. Email it to me every morning. Track new stores, lost stores, pricing changes, and promos."
    },
    {
        id: 'pb_intel_price_index_weekly_v1',
        title: 'Competitor Price Index (Weekly)',
        type: 'INTEL',
        description: 'Weekly price index vs market w/ competitor ranking and trendline.',
        tags: ['pricing', 'competitive', 'weekly-report'],
        active: true,
        status: 'active',
        prompt: "Show me how our vape pricing compares to the market in Chicago. I want a weekly price index and the top 10 cheapest competitors."
    },
    {
        id: 'pb_marketing_claim_lead_followup_v1',
        title: 'Claim Lead Follow-up (Compliant)',
        type: 'AUTOMATION', // Marketing -> Automation
        description: 'Auto-log leads, send compliant intro email, and follow up based on engagement.',
        tags: ['lead-gen', 'automation', 'email', 'compliance'],
        active: true,
        status: 'active',
        prompt: "Anyone who claims our page or submits a lead form—send them a friendly follow-up and schedule a demo."
    },
    {
        id: 'pb_seo_25pages_daily_il_v1',
        title: '25 Pages/Day SEO Publisher',
        type: 'SEO',
        description: 'Generates and publishes 25 compliant ZIP pages daily.',
        tags: ['seo', 'content-gen', 'growth'],
        active: true,
        status: 'active',
        prompt: "Generate 25 new Illinois ZIP pages daily and publish them. Use our menu data and make sure the copy is compliant."
    },
    {
        id: 'pb_reporting_weekly_exec_v1',
        title: 'Weekly Operator Report',
        type: 'REPORTING',
        description: 'Monday morning KPI report with deltas, drivers, and next actions.',
        tags: ['kpis', 'analytics', 'weekly-digest'],
        active: true,
        status: 'active',
        prompt: "Every Monday send me a simple weekly report: traffic, chats, leads, sales, and what changed."
    },
    {
        id: 'pb_ops_low_stock_radar_v1',
        title: 'Low Stock Risk Radar',
        type: 'OPS',
        description: 'Monitors stock risk for top sellers and suggests safer promo alternatives.',
        tags: ['inventory', 'risk-alert', 'operations'],
        active: true,
        status: 'active',
        prompt: "Alert me when top sellers are at risk of going out of stock and suggest a safer promo alternative."
    },
    {
        id: 'pb_compliance_redline_v1',
        title: 'Deebo Compliance Redline',
        type: 'COMPLIANCE',
        description: 'Redlines risky promo text and returns compliant versions for IL SMS + Email.',
        tags: ['compliance', 'sms', 'email', 'risk-check'],
        active: true,
        status: 'active',
        prompt: "Here’s a promo text. Make it compliant for Illinois SMS and email, and tell me what was risky."
    },
    {
        id: 'pb_intel_partner_targets_gap_v1',
        title: 'Retail Partner Targeting List',
        type: 'INTEL',
        description: 'Finds retailers that carry a competitor but not you.',
        tags: ['sales', 'targeting', 'competitor-gap'],
        active: true,
        status: 'active',
        prompt: "Find me 50 dispensaries in New York that carry our competitor but don’t carry us. Put them in a sheet with contact info if possible."
    },
    {
        id: 'pb_marketing_event_leads_v1',
        title: 'Event Lead Engine',
        type: 'OPS', // Ops/Marketing
        description: 'Clean, segment, and email event leads with compliance checks.',
        tags: ['events', 'leads', 'data-cleaning'],
        active: true,
        status: 'active',
        prompt: "I have a CSV of event leads. Clean it, dedupe it, segment it, and email them a welcome message."
    },
    {
        id: 'pb_intel_brand_footprint_audit_v1',
        title: 'Brand Footprint Audit',
        type: 'INTEL',
        description: 'Audit placements, gaps by market, and easiest-win targets.',
        tags: ['audit', 'distribution', 'growth'],
        active: true,
        status: 'active',
        prompt: "Run a footprint audit for our brand: where we’re listed, where we’re missing, and what markets are easiest wins."
    },
    {
        id: 'finance_what_if_promo_simulation_beta',
        title: '“What If” Promo Simulation',
        type: 'FINANCE',
        description: 'Simulate promo impact on margin and AOV with best/worst case bands.',
        tags: ['simulation', 'pricing', 'forecasting'],
        active: true,
        status: 'active',
        prompt: "If we run 10% off edibles for 30 days, what happens to margin and AOV? Send me the result."
    },
    {
        id: 'ops_inbox_assist_sales_thread',
        title: 'Inbox Assist for Sales Thread',
        type: 'OPS',
        description: 'Drafts compliant replies to retailer email threads and logs interactions.',
        tags: ['email-assist', 'sales', 'productivity'],
        active: true,
        status: 'active',
        prompt: "Reply to this retailer email thread. Keep it short, professional, and compliant."
    }
];
