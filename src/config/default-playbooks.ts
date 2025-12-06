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
