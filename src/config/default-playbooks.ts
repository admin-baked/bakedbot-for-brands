/**
 * Default Playbook Templates
 * Pre-built automations that come with the platform
 */

import { Playbook } from '@/types/playbook';

export const DEFAULT_PLAYBOOKS: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'orgId'>[] = [
  // 1. Competitive Alerts
  {
    name: 'Competitive Price Watch',
    description: 'Monitor competitor pricing and get alerts when they drop below your prices. Sends email and SMS notifications.',
    status: 'draft',
    yaml: `name: Competitive Price Watch
description: Monitor competitor pricing and alert on significant changes

triggers:
  - type: schedule
    cron: "0 8 * * *"  # Daily at 8 AM
  - type: event
    pattern: "competitor.price.changed"

steps:
  - action: delegate
    agent: ezal
    task: Scan competitor menus for price changes
    
  - action: analyze
    agent: money_mike
    input: "{{ezal.results}}"
    task: Compare against our pricing and margins
    
  - condition: "{{money_mike.alert_needed}}"
    action: notify
    channels:
      - email
      - sms
    to: "{{user.email}}"
    subject: "⚠️ Competitor Price Alert"
    body: |
      {{money_mike.summary}}
      
      Affected SKUs:
      {{#each money_mike.affected_skus}}
      - {{this.name}}: Competitor at \${{this.competitor_price}} vs our \${{this.our_price}}
      {{/each}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Check', config: { cron: '0 8 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'Price Change Event', config: { eventPattern: 'competitor.price.changed' }, enabled: true }
    ],
    steps: [
      { action: 'delegate', params: { agent: 'ezal', task: 'Scan competitor menus' } },
      { action: 'analyze', params: { agent: 'money_mike' } },
      { action: 'notify', params: { channels: ['email', 'sms'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 2. Inventory Reorder Suggestions
  {
    name: 'Smart Inventory Reorder',
    description: 'Analyze sales velocity and suggest reorders before stockouts. Integrates with POS for real-time inventory.',
    status: 'draft',
    yaml: `name: Smart Inventory Reorder
description: Predict stockouts and suggest reorders based on velocity

triggers:
  - type: schedule
    cron: "0 6 * * *"  # Daily at 6 AM
  - type: event
    pattern: "inventory.low_stock"

steps:
  - action: query
    agent: pops
    task: Analyze 30-day sales velocity by SKU
    
  - action: forecast
    agent: pops
    input: "{{pops.velocity_data}}"
    task: Predict days until stockout for each SKU
    
  - action: analyze
    agent: money_mike
    input: "{{pops.stockout_forecast}}"
    task: Calculate optimal reorder quantities based on margins
    
  - action: generate
    output_type: table
    title: "Reorder Recommendations"
    data: "{{money_mike.recommendations}}"
    
  - action: notify
    channels:
      - email
    to: "{{user.email}}"
    subject: "📦 Inventory Reorder Suggestions"
    body: |
      Based on current velocity, here are today's reorder recommendations:
      
      {{#each money_mike.recommendations}}
      {{this.product_name}}
      - Current Stock: {{this.current_qty}}
      - Days to Stockout: {{this.days_remaining}}
      - Suggested Order: {{this.suggested_qty}} units
      - Estimated Cost: \${{this.estimated_cost}}
      {{/each}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Morning Analysis', config: { cron: '0 6 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'Low Stock Alert', config: { eventPattern: 'inventory.low_stock' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops' } },
      { action: 'forecast', params: { agent: 'pops' } },
      { action: 'analyze', params: { agent: 'money_mike' } },
      { action: 'notify', params: { channels: ['email'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 3. Content Generation
  {
    name: 'AI Content Factory',
    description: 'Automatically generate blog posts, social media content, and SEO-optimized product descriptions.',
    status: 'draft',
    yaml: `name: AI Content Factory
description: Generate marketing content, blogs, and product SEO text

triggers:
  - type: schedule
    cron: "0 9 * * 1"  # Weekly on Monday at 9 AM
  - type: event
    pattern: "product.created"
  - type: manual

steps:
  - action: query
    agent: pops
    task: Get top performing products and trending categories
    
  - action: generate
    agent: craig
    input: "{{pops.trending_data}}"
    task: Generate weekly blog post about trending products
    output:
      - type: blog_post
        title: "{{craig.blog_title}}"
        content: "{{craig.blog_content}}"
        
  - action: generate
    agent: craig
    task: Create 5 social media posts for the week
    output:
      - type: social_posts
        posts: "{{craig.social_posts}}"
        
  - action: generate
    agent: craig
    input: "{{trigger.product}}"
    condition: "{{trigger.type == 'product.created'}}"
    task: Write SEO-optimized product description
    output:
      - type: product_seo
        description: "{{craig.seo_description}}"
        meta_title: "{{craig.meta_title}}"
        meta_description: "{{craig.meta_description}}"
        
  - action: review
    agent: deebo
    input: "{{craig.all_content}}"
    task: Check content for compliance issues
    
  - action: notify
    channels:
      - email
    to: "{{user.email}}"
    subject: "📝 Weekly Content Ready for Review"
    body: |
      Your AI-generated content is ready:
      
      Blog Post: {{craig.blog_title}}
      Social Posts: {{craig.social_posts.length}} posts queued
      
      Review and publish from your dashboard.
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Content', config: { cron: '0 9 * * 1' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'New Product', config: { eventPattern: 'product.created' }, enabled: true },
      { id: 'trigger-3', type: 'manual', name: 'On Demand', config: {}, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops' } },
      { action: 'generate', params: { agent: 'craig', type: 'blog' } },
      { action: 'generate', params: { agent: 'craig', type: 'social' } },
      { action: 'review', params: { agent: 'deebo' } },
      { action: 'notify', params: { channels: ['email'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 4. Multi-Agent Coordination
  {
    name: 'Full Stack AI Ops',
    description: 'End-to-end automation: Smokey handles customers → Craig markets → Pops analyzes → Money Mike optimizes.',
    status: 'draft',
    yaml: `name: Full Stack AI Ops
description: Multi-agent workflow coordinating all AI agents

triggers:
  - type: schedule
    cron: "0 7 * * *"  # Daily at 7 AM
  - type: event
    pattern: "daily.kickoff"

agents:
  - smokey: Customer Intelligence
  - craig: Marketing Automation
  - pops: Business Analytics
  - money_mike: Financial Optimization
  - ezal: Competitive Intel
  - deebo: Compliance Check

steps:
  # Stage 1: Gather Intelligence
  - action: parallel
    tasks:
      - agent: smokey
        task: Summarize yesterday's customer conversations and top requests
      - agent: ezal
        task: Scan competitor activity and pricing changes
      - agent: pops
        task: Generate daily sales and inventory report
        
  # Stage 2: Analyze & Plan
  - action: delegate
    agent: money_mike
    input:
      smokey: "{{smokey.customer_insights}}"
      ezal: "{{ezal.competitor_intel}}"
      pops: "{{pops.daily_report}}"
    task: Identify revenue opportunities and margin risks
    
  # Stage 3: Execute Marketing
  - action: delegate
    agent: craig
    input: "{{money_mike.opportunities}}"
    task: Create targeted campaigns for identified opportunities
    
  # Stage 4: Compliance Review
  - action: delegate
    agent: deebo
    input: "{{craig.campaigns}}"
    task: Review campaigns for compliance before sending
    
  # Stage 5: Notify & Report
  - action: notify
    channels:
      - email
      - sms
    to: "{{user.email}}"
    subject: "🤖 Daily AI Ops Report"
    body: |
      Good morning! Here's what your AI team accomplished:
      
      📊 POPS ANALYTICS
      {{pops.summary}}
      
      👤 SMOKEY INSIGHTS
      {{smokey.summary}}
      
      🔍 EZAL COMPETITIVE
      {{ezal.summary}}
      
      💰 MONEY MIKE RECOMMENDATIONS
      {{money_mike.summary}}
      
      📣 CRAIG CAMPAIGNS
      {{craig.campaigns_scheduled}} campaigns ready to send
      
      ✅ DEEBO COMPLIANCE
      {{deebo.review_status}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Ops', config: { cron: '0 7 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'Manual Kickoff', config: { eventPattern: 'daily.kickoff' }, enabled: true }
    ],
    steps: [
      { action: 'parallel', params: { agents: ['smokey', 'ezal', 'pops'] } },
      { action: 'delegate', params: { agent: 'money_mike' } },
      { action: 'delegate', params: { agent: 'craig' } },
      { action: 'delegate', params: { agent: 'deebo' } },
      { action: 'notify', params: { channels: ['email', 'sms'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 5. Dynamic Pricing Optimizer
  {
    name: 'Autonomous Price Optimizer',
    description: 'Monitor competitor prices and stockouts via CannMenus, automatically adjust prices to maximize margins and sell-through.',
    status: 'draft',
    yaml: `name: Autonomous Price Optimizer
description: Live pricing based on competitor intelligence

triggers:
  - type: schedule
    cron: "0 */4 * * *"  # Every 4 hours
  - type: event
    pattern: "competitor.stockout"
  - type: event
    pattern: "competitor.price.changed"

config:
  source: cannmenus
  radius_miles: 10
  strategy: margin_target
  target_margin: 35
  auto_apply_threshold: 85

steps:
  # Stage 1: Gather Competitive Intelligence
  - action: parallel
    tasks:
      - agent: ezal
        task: Fetch competitor prices from CannMenus within radius
      - agent: ezal
        task: Check for competitor stockouts on high-velocity items
        
  # Stage 2: Analyze Opportunities
  - action: delegate
    agent: money_mike
    input:
      competitor_prices: "{{ezal.prices}}"
      stockouts: "{{ezal.stockouts}}"
      our_inventory: "{{pops.inventory}}"
    task: |
      Identify pricing opportunities:
      1. Products where competitors are out of stock (price UP opportunity)
      2. Products where we're priced too high vs market (price DOWN to move)
      3. Products with margin below target
      
  # Stage 3: Generate Price Adjustments
  - action: generate
    agent: money_mike
    output_type: table
    title: "Recommended Price Changes"
    columns:
      - Product
      - Current Price
      - Suggested Price
      - Reason
      - Projected Margin Impact
    data: "{{money_mike.recommendations}}"
    
  # Stage 4: Auto-Apply High Confidence
  - condition: "{{money_mike.high_confidence_changes.length > 0}}"
    action: apply
    agent: money_mike
    changes: "{{money_mike.high_confidence_changes}}"
    task: Auto-apply price changes with confidence > 85%
    
  # Stage 5: Notify for Review
  - action: notify
    channels:
      - email
      - dashboard
    to: "{{user.email}}"
    subject: "💰 Pricing Opportunities Detected"
    body: |
      Your AI pricing engine found {{money_mike.total_opportunities}} opportunities:
      
      📈 PRICE INCREASE OPPORTUNITIES (Competitor Stockouts)
      {{#each money_mike.increase_opps}}
      - {{this.product}}: \${{this.current}} → \${{this.suggested}} (+{{this.margin_gain}}% margin)
      {{/each}}
      
      📉 COMPETITIVE ADJUSTMENTS NEEDED
      {{#each money_mike.decrease_opps}}
      - {{this.product}}: \${{this.current}} → \${{this.suggested}} (match market)
      {{/each}}
      
      ✅ AUTO-APPLIED: {{money_mike.auto_applied_count}} changes
      ⏳ AWAITING REVIEW: {{money_mike.pending_review_count}} changes
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Every 4 Hours', config: { cron: '0 */4 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'Competitor Stockout', config: { eventPattern: 'competitor.stockout' }, enabled: true },
      { id: 'trigger-3', type: 'event', name: 'Price Change', config: { eventPattern: 'competitor.price.changed' }, enabled: true }
    ],
    steps: [
      { action: 'parallel', params: { agents: ['ezal'] } },
      { action: 'delegate', params: { agent: 'money_mike' } },
      { action: 'generate', params: { type: 'table' } },
      { action: 'apply', params: { autoApply: true, threshold: 85 } },
      { action: 'notify', params: { channels: ['email', 'dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 6. Customer Engagement Autoresponder
  {
    name: 'Customer Engagement Engine',
    description: 'Usage-based autoresponder that sends personalized emails twice weekly based on how customers use the platform.',
    status: 'draft',
    yaml: `name: Customer Engagement Engine
description: Personalized autoresponder based on customer usage

triggers:
  - type: schedule
    cron: "0 10 * * 1,4"  # Monday & Thursday at 10 AM
  - type: event
    pattern: "user.signup"

segments:
  new_user: "signed_up_days < 7"
  active_user: "agent_calls_30d > 10"
  power_user: "playbooks_created > 3"
  at_risk: "last_active_days > 7"

steps:
  - action: query
    agent: pops
    task: Segment all users by engagement level
    
  - action: parallel
    tasks:
      - agent: craig
        segment: new_user
        task: Generate onboarding tips
      - agent: craig
        segment: active_user
        task: Create weekly insights digest
      - agent: craig
        segment: at_risk
        task: Create re-engagement email
        
  - action: delegate
    agent: deebo
    task: Check emails for compliance
    
  - action: send_email
    to: "{{segment.users}}"
    content: "{{craig.personalized_email}}"
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Mon & Thu', config: { cron: '0 10 * * 1,4' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'Signup', config: { eventPattern: 'user.signup' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops' } },
      { action: 'parallel', params: { agent: 'craig' } },
      { action: 'delegate', params: { agent: 'deebo' } },
      { action: 'send_email', params: { track: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  }
];

/**
 * Get a default playbook by name
 */
export function getDefaultPlaybook(name: string) {
  return DEFAULT_PLAYBOOKS.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
}

/**
 * Get all default playbook names for display
 */
export function getDefaultPlaybookNames(): string[] {
  return DEFAULT_PLAYBOOKS.map(p => p.name);
}
