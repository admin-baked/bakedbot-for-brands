/**
 * Default Playbook Templates
 * Pre-built automations that come with the platform
 */

import { Playbook } from '@/types/playbook';

export const DEFAULT_PLAYBOOKS: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'orgId' | 'agent' | 'category' | 'ownerId' | 'ownerName' | 'isCustom' | 'requiresApproval'>[] = [
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
  },

  // 7. Smokey Vision - Floor Analytics
  {
    name: 'Smokey Vision Floor Analytics',
    description: 'AI-powered camera analytics for dispensary floor traffic, heatmaps, and merchandising optimization.',
    status: 'draft',
    yaml: `name: Smokey Vision Floor Analytics
description: Camera-based retail analytics and recommendations

triggers:
  - type: schedule
    cron: "0 22 * * *"  # Daily at 10 PM (end of day analysis)
  - type: event
    pattern: "vision.crowding_detected"
  - type: event
    pattern: "vision.queue_long"

cameras:
  - location: entrance
    track: [traffic_count, path_analysis]
  - location: floor
    track: [heatmap, dwell_time, product_interaction]
  - location: checkout
    track: [queue_detection, traffic_count]

steps:
  # Stage 1: Aggregate Daily Vision Data
  - action: query
    agent: pops
    task: Aggregate all camera analytics for today
    data:
      - traffic_counts
      - heatmaps
      - dwell_times
      - queue_metrics
      - path_analysis
      
  # Stage 2: Generate Insights
  - action: delegate
    agent: smokey
    input: "{{pops.vision_data}}"
    task: |
      Analyze floor data and identify:
      1. High-traffic zones and optimal product placement
      2. Underperforming areas that need attention
      3. Queue bottlenecks and staffing recommendations
      4. Merchandising opportunities based on dwell times
      
  # Stage 3: Correlate with Sales
  - action: delegate
    agent: money_mike
    input:
      vision: "{{smokey.insights}}"
      sales: "{{pops.daily_sales}}"
    task: Correlate floor traffic with actual sales conversions
    
  # Stage 4: Generate Recommendations
  - action: generate
    agent: smokey
    output_type: recommendations
    categories:
      - merchandising
      - staffing
      - layout
      - signage
      
  # Stage 5: Alert on Issues
  - condition: "{{smokey.critical_issues.length > 0}}"
    action: notify
    channels:
      - sms
      - dashboard
    to: "{{user.email}}"
    subject: "👁️ Vision Alert: Action Required"
    body: "{{smokey.critical_issues}}"
    
  # Stage 6: Daily Report
  - action: notify
    channels:
      - email
      - dashboard
    to: "{{user.email}}"
    subject: "📊 Daily Floor Analytics Report"
    body: |
      Today's Vision Insights:
      
      👥 TRAFFIC
      - Total visitors: {{pops.traffic.total}}
      - Peak hour: {{pops.traffic.peak_hour}}
      - Conversion rate: {{pops.traffic.conversion}}%
      
      🔥 HOTSPOTS
      {{#each smokey.hotspots}}
      - {{this.zone}}: {{this.dwell_time}}s avg dwell
      {{/each}}
      
      📋 RECOMMENDATIONS
      {{#each smokey.recommendations}}
      - {{this.title}}
      {{/each}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Nightly Analysis', config: { cron: '0 22 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'Crowding Alert', config: { eventPattern: 'vision.crowding_detected' }, enabled: true },
      { id: 'trigger-3', type: 'event', name: 'Queue Alert', config: { eventPattern: 'vision.queue_long' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops', data: 'vision' } },
      { action: 'delegate', params: { agent: 'smokey' } },
      { action: 'delegate', params: { agent: 'money_mike' } },
      { action: 'generate', params: { type: 'recommendations' } },
      { action: 'notify', params: { channels: ['email', 'dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 8. AI Meeting Assistant (Paid Plans Only)
  {
    name: 'AI Meeting Assistant',
    description: 'Agent attends meetings via Google Meet or Zoom, takes notes, and generates actionable playbook recommendations.',
    status: 'draft',
    yaml: `name: AI Meeting Assistant
description: Attend meetings, take notes, generate recommendations

# PAID PLANS ONLY
requires_plan: pro

triggers:
  - type: calendar
    source: google_calendar
    minutes_before: 2
  - type: manual
    action: join_meeting

platforms:
  - google_meet
  - zoom

steps:
  # Step 1: Join Meeting
  - action: join_meeting
    agent: smokey
    config:
      announce: true
      message: "Hi everyone, I'm Smokey from BakedBot. I'll be taking notes today."
      request_consent: true
      
  # Step 2: Transcribe Audio
  - action: transcribe
    config:
      language: auto
      speaker_diarization: true
      
  # Step 3: Generate Notes
  - action: delegate
    agent: smokey
    task: |
      Analyze the meeting and generate:
      1. Executive summary (2-3 sentences)
      2. Key discussion points
      3. Decisions made
      4. Action items with owners
      5. Open questions
      
  # Step 4: Analyze for Playbook Opportunities
  - action: delegate
    agent: pops
    input: "{{smokey.meeting_notes}}"
    task: |
      Based on the meeting content and user's role, identify:
      1. Automation opportunities
      2. Follow-up tasks that could be playbooks
      3. Recurring patterns that suggest new workflows
      
  # Step 5: Generate Recommendations
  - action: generate
    agent: pops
    output_type: recommendations
    template: |
      Meeting: {{meeting.title}}
      Date: {{meeting.date}}
      
      📝 SUMMARY
      {{smokey.summary}}
      
      🎯 ACTION ITEMS
      {{#each smokey.action_items}}
      - [ ] {{this.task}} ({{this.assignee}}) - Due: {{this.due}}
      {{/each}}
      
      🤖 PLAYBOOK RECOMMENDATIONS
      {{#each pops.recommendations}}
      **{{this.title}}**
      {{this.description}}
      Confidence: {{this.confidence}}%
      {{/each}}
      
  # Step 6: Save & Notify
  - action: save
    to: firestore
    collection: meeting_notes
    
  - action: notify
    channels:
      - email
      - dashboard
    to: "{{meeting.organizer}}"
    subject: "📋 Meeting Notes: {{meeting.title}}"
    attach:
      - notes
      - transcript
`,
    triggers: [
      { id: 'trigger-1', type: 'calendar', name: 'Calendar Event', config: { minutesBefore: 2 }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Manual Join', config: {}, enabled: true }
    ],
    steps: [
      { action: 'join_meeting', params: { agent: 'smokey' } },
      { action: 'transcribe', params: { language: 'auto' } },
      { action: 'delegate', params: { agent: 'smokey', task: 'notes' } },
      { action: 'delegate', params: { agent: 'pops', task: 'recommendations' } },
      { action: 'generate', params: { type: 'recommendations' } },
      { action: 'notify', params: { channels: ['email', 'dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 9. Deebo Compliance Scanner - Proactive Compliance Data Discovery
  {
    name: 'Deebo Compliance Scanner',
    description: 'Automatically scan state cannabis regulatory websites for compliance updates. Surfaces new rules for review before indexing.',
    status: 'draft',
    yaml: `name: Deebo Compliance Scanner
description: Proactively search for state compliance updates and queue for approval

triggers:
  - type: schedule
    cron: "0 6 * * 1"  # Weekly on Monday at 6 AM
  - type: manual
    name: Run Now

config:
  states:
    - IL
    - CA
    - MI
    - CO
    - NY
    - NJ

steps:
  - action: parallel
    tasks:
      - agent: deebo
        task: Search for Illinois cannabis advertising compliance updates
        sources:
          - https://www.idfpr.com/profs/cannabis.asp
          - https://www.dph.illinois.gov/cannabis
          
      - agent: deebo
        task: Search for California cannabis advertising rules
        sources:
          - https://cannabis.ca.gov/cannabis-laws/
          
      - agent: deebo
        task: Search for Michigan cannabis compliance updates
        sources:
          - https://www.michigan.gov/cra
          
  - action: analyze
    agent: deebo
    task: Compare discovered content against existing knowledge base
    output: new_content_diff
    
  - condition: "{{deebo.has_new_content}}"
    action: queue_discovery
    data:
      content: "{{deebo.new_content}}"
      sources: "{{deebo.sources}}"
      summary: "{{deebo.summary}}"
      state: "{{deebo.state}}"
    status: pending_review
    
  - action: notify
    channels:
      - dashboard
      - email
    to: "{{admin.email}}"
    subject: "🔍 New Compliance Data Discovered"
    body: |
      Deebo found {{deebo.discovered_count}} potential compliance updates:
      
      {{#each deebo.discoveries}}
      **{{this.state}}**: {{this.title}}
      Source: {{this.source}}
      {{/each}}
      
      Review and approve in the Agent Knowledge dashboard.
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Scan', config: { cron: '0 6 * * 1' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Manual Run', config: {}, enabled: true }
    ],
    steps: [
      { action: 'parallel', params: { agents: ['deebo'], tasks: ['scan_compliance'] } },
      { action: 'analyze', params: { agent: 'deebo', task: 'diff_knowledge' } },
      { action: 'queue_discovery', params: { status: 'pending_review' } },
      { action: 'notify', params: { channels: ['dashboard', 'email'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },
  
  // 10. Daily Competitive Intelligence
  {
    name: 'Daily Competitive Intelligence',
    description: 'Daily analysis of competitor menus and pricing. Generates a strategic report on opportunities and risks.',
    status: 'draft',
    yaml: `name: Daily Competitive Intelligence
description: Daily competitor scan and strategic report generation

triggers:
  - type: schedule
    cron: "0 8 * * *"  # Daily at 8 AM
  - type: manual
    name: Run Analysis

steps:
  - action: tool
    tool: intel.scanCompetitors
    agent: ezal
    task: Scan all active competitors for latest menu data
    
  - action: tool
    tool: intel.generateCompetitiveReport
    agent: ezal
    task: Analyze market data and generate strategic markdown report
    output: report_markdown
    
  - action: notify
    channels:
      - dashboard
      - email
    to: "{{user.email}}"
    subject: "📊 Daily Competitive Intelligence Report"
    body: "{{ezal.report_markdown}}"
`,
    triggers: [
        { id: 'trigger-1', type: 'schedule', name: 'Daily Analysis', config: { cron: '0 8 * * *' }, enabled: true },
        { id: 'trigger-2', type: 'manual', name: 'Manual Run', config: {}, enabled: true }
    ],
    steps: [
        { action: 'tool', params: { tool: 'intel.scanCompetitors' } },
        { action: 'tool', params: { tool: 'intel.generateCompetitiveReport' } },
        { action: 'notify', params: { channels: ['dashboard', 'email'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 10b. Weekly Competitive Intelligence Report (Free Users)
  {
    name: 'Weekly Competitive Intelligence Report',
    description: 'Weekly summary of competitor activity, pricing trends, and strategic recommendations. Included with Free tier.',
    status: 'active',
    yaml: `name: Weekly Competitive Intelligence Report
description: Aggregates daily competitor data into weekly strategic insights

triggers:
  - type: schedule
    cron: "0 9 * * 1"  # Monday at 9 AM
  - type: manual
    name: Run Now

config:
  tier: free  # Included with Free tier
  
steps:
  # Step 1: Aggregate weekly snapshots
  - action: tool
    tool: intel.generateWeeklyReport
    agent: ezal
    task: Aggregate last 7 days of competitor snapshots into weekly report
    
  # Step 2: Generate strategic insights
  - action: delegate
    agent: pops
    input: "{{ezal.weekly_data}}"
    task: |
      Calculate market positioning metrics:
      1. Average deal prices by competitor
      2. Pricing strategy analysis (discount vs premium)
      3. Deal frequency patterns
      4. Market trend summary
    
  # Step 3: Generate recommendations
  - action: delegate
    agent: money_mike
    input: "{{pops.market_analysis}}"
    task: |
      Based on competitive intelligence, recommend:
      1. Pricing opportunities
      2. Deal timing suggestions
      3. Competitor weaknesses to exploit
    
  # Step 4: Notify via email and dashboard
  - action: notify
    channels:
      - email
      - dashboard
    to: "{{user.email}}"
    subject: "📊 Weekly Competitive Intelligence Report"
    body: |
      Here's your weekly competitive intelligence summary:
      
      📈 MARKET OVERVIEW
      {{pops.market_summary}}
      
      🏆 TOP COMPETITOR DEALS
      {{ezal.top_deals}}
      
      💡 RECOMMENDATIONS
      {{money_mike.recommendations}}
      
      View full report in your dashboard.
`,
    triggers: [
        { id: 'trigger-1', type: 'schedule', name: 'Weekly Report', config: { cron: '0 9 * * 1' }, enabled: true },
        { id: 'trigger-2', type: 'manual', name: 'Run Now', config: {}, enabled: true }
    ],
    steps: [
        { action: 'tool', params: { tool: 'intel.generateWeeklyReport' } },
        { action: 'delegate', params: { agent: 'pops', task: 'market_analysis' } },
        { action: 'delegate', params: { agent: 'money_mike', task: 'recommendations' } },
        { action: 'notify', params: { channels: ['email', 'dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 11. Daily Brand Price Tracker (Agent Discovery)
  {
    name: 'Daily Brand Price Tracker',
    description: 'Discover competitor pricing for your brand across multiple dispensaries and log to Google Sheets.',
    status: 'active',
    yaml: `name: Daily Brand Price Tracker
description: Discover competitor pricing and log to Google Sheets
icon: trending-up

triggers:
  - type: schedule
    cron: "0 9 * * *"  # Daily at 9 AM
  - type: manual
    name: Run Now

config:
  # Configure these when activating the playbook
  spreadsheetId: ""  # Google Sheet ID for logging
  brand: ""  # Brand name to filter (e.g., "40-tons")
  dispensaryUrls:  # List of Weedmaps URLs to discover
    - "https://weedmaps.com/dispensaries/example?filter[brandSlugs][]=brand-name"

steps:
  # Step 1: Discover All Dispensaries
  - action: tool
    tool: weedmaps.discover
    agent: ezal
    task: Discover product prices from all configured dispensary URLs
    params:
      urls: "{{config.dispensaryUrls}}"
      brand: "{{config.brand}}"
    
  # Step 2: Format Data for Sheets
  - action: transform
    agent: ezal
    input: "{{discovery_results}}"
    task: Format discovered data into rows for Google Sheets
    output:
      columns:
        - Date
        - Dispensary
        - Product
        - Price
        - Stock Status
        - THC
        - Category
        
  # Step 3: Append to Google Sheet
  - action: tool
    tool: sheets.append
    params:
      spreadsheetId: "{{config.spreadsheetId}}"
      range: "Sheet1!A:G"
      values: "{{ezal.formatted_rows}}"
      
  # Step 4: Generate Summary
  - action: delegate
    agent: pops
    input: "{{discovery_results}}"
    task: |
      Analyze price data and generate insights:
      1. Average price by product
      2. Price changes from yesterday
      3. Stock availability summary
      4. Lowest/highest price locations
      
  # Step 5: Notify on Completion
  - action: notify
    channels:
      - dashboard
    to: "{{user.email}}"
    subject: "📊 Daily Price Tracking Complete"
    body: |
      Price tracking completed for {{config.brand}}:
      
      ✅ {{ezal.products_found}} products discovered
      📍 {{ezal.dispensaries_discovered}} dispensaries checked
      📉 {{pops.price_drops}} price drops detected
      📈 {{pops.price_increases}} price increases detected
      
      View full data in your Google Sheet.
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily at 9 AM', config: { cron: '0 9 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Manual Run', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'weedmaps.discover', agent: 'ezal' } },
      { action: 'transform', params: { agent: 'ezal' } },
      { action: 'tool', params: { tool: 'sheets.append' } },
      { action: 'delegate', params: { agent: 'pops' } },
      { action: 'notify', params: { channels: ['dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // 12. Weekly AI Adoption Tracker (Agent Discovery)
  {
    name: 'Weekly AI Adoption Tracker',
    description: 'Scan cannabis business websites for AI signals (chatbots, headless menus). Submit to BakedBot Tracker API and backup to Google Sheets.',
    status: 'draft',
    yaml: `name: Weekly AI Adoption Tracker
description: Scan websites for AI tech stack and log adoption metrics

triggers:
  - type: schedule
    cron: "0 10 * * 1"  # Weekly on Mondays at 10 AM
  - type: manual
    name: Run Discovery

config:
  target_urls: []  # List of websites to scan
  spreadsheet_id: ""  # Backup Google Sheet ID

steps:
  - id: scan_loop
    # Loop capability is conceptual in playbook v1, typically handled by agent logic
    # Here we show the conceptual step calls
    tool: discovery.scan
    params:
      url: "{{item}}" # Iterated in execution

  - id: submit_api
    tool: tracker.submit
    params:
      orgs: "{{scan_loop.results}}"

  - id: backup_sheets
    tool: sheets.append
    params:
      spreadsheetId: "{{config.spreadsheet_id}}"
      values: "{{scan_loop.formatted_rows}}"
`,
    triggers: [
      { type: 'schedule', cron: '0 10 * * 1' },
      { type: 'manual' }
    ],
    icon: 'bot',
    steps: [
      {
        id: 'scan',
        action: 'discovery.scan',
        params: { url: '{{config.target_urls}}' }
      },
      {
        id: 'submit',
        action: 'tracker.submit',
        params: { orgs: '{{scan.data}}' }
      }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // =============================================================================
  // SMOKEY RECOMMENDS: Dispensary Playbooks (MVP)
  // =============================================================================

  // SR-1. Competitor Price Match Alert
  {
    name: 'Competitor Price Match Alert',
    description: 'Get notified when competitors undercut your prices on key products. Runs daily scan via Firecrawl.',
    status: 'active',
    yaml: `name: Competitor Price Match Alert
description: Daily competitor price monitoring with threshold alerts

triggers:
  - type: schedule
    cron: "0 8 * * *"  # Daily at 8 AM
  - type: manual
    name: Run Now

config:
  threshold: 5  # Alert when difference > $5

steps:
  - action: tool
    tool: intel.scanCompetitors
    agent: ezal
    task: Scan competitor menus for current prices
    
  - action: delegate
    agent: money_mike
    input: "{{ezal.competitor_prices}}"
    task: |
      Compare competitor prices to ours and identify:
      1. Products where competitor is \${{config.threshold}}+ cheaper
      2. Opportunity to price match or differentiate
      3. Products where we have competitive advantage
    
  - condition: "{{money_mike.alerts.length > 0}}"
    action: notify
    channels:
      - email
      - dashboard
    to: "{{user.email}}"
    subject: "🚨 Competitor Price Alert"
    body: |
      {{money_mike.alert_count}} price alerts detected:
      
      {{#each money_mike.alerts}}
      • {{this.product}}: Competitor at \${{this.competitor_price}} vs our \${{this.our_price}}
      {{/each}}
      
      Suggested actions in your dashboard.
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Scan', config: { cron: '0 8 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Run Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'intel.scanCompetitors', agent: 'ezal' } },
      { action: 'delegate', params: { agent: 'money_mike' } },
      { action: 'notify', params: { channels: ['email', 'dashboard'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-2. Review Response Autopilot
  {
    name: 'Review Response Autopilot',
    description: 'Auto-generate responses to new Google & Weedmaps reviews. Deebo checks compliance before posting.',
    status: 'active',
    yaml: `name: Review Response Autopilot
description: AI-generated review responses with compliance check

triggers:
  - type: event
    pattern: "review.received"
  - type: manual
    name: Generate Response

config:
  auto_post: false  # Require approval by default
  tone: friendly

steps:
  - action: delegate
    agent: smokey
    input: "{{trigger.review}}"
    task: |
      Generate a response to this customer review:
      Rating: {{trigger.review.rating}}/5
      Content: "{{trigger.review.content}}"
      
      Tone: {{config.tone}}
      Guidelines:
      - Thank them for visiting
      - Address any specific feedback
      - Invite them back
      - Keep under 100 words
    
  - action: delegate
    agent: deebo
    input: "{{smokey.response}}"
    task: Check response for compliance issues (no medical claims, no pricing promises)
    
  - condition: "{{config.auto_post && deebo.approved}}"
    action: tool
    tool: reviews.postResponse
    params:
      platform: "{{trigger.review.platform}}"
      reviewId: "{{trigger.review.id}}"
      response: "{{smokey.response}}"
    
  - action: notify
    channels:
      - dashboard
    to: "{{user.email}}"
    subject: "⭐ Review Response Ready"
    body: |
      New {{trigger.review.rating}}-star review from {{trigger.review.author}}:
      "{{trigger.review.content}}"
      
      Suggested response:
      "{{smokey.response}}"
      
      {{#if config.auto_post}}Auto-posted ✓{{else}}Approve in dashboard{{/if}}
`,
    triggers: [
      { id: 'trigger-1', type: 'event', name: 'New Review', config: { eventPattern: 'review.received' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Generate', config: {}, enabled: true }
    ],
    steps: [
      { action: 'delegate', params: { agent: 'smokey', task: 'generate_response' } },
      { action: 'delegate', params: { agent: 'deebo', task: 'compliance_check' } },
      { action: 'tool', params: { tool: 'reviews.postResponse', conditional: true } },
      { action: 'notify', params: { channels: ['dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-3. Win-Back Campaign
  {
    name: 'Win-Back Campaign',
    description: 'Auto-reach customers who haven\'t visited in 30+ days with a personalized offer.',
    status: 'active',
    yaml: `name: Win-Back Campaign
description: Re-engage lapsed customers with targeted offers

triggers:
  - type: schedule
    cron: "0 10 * * 1"  # Weekly on Mondays at 10 AM
  - type: manual
    name: Run Campaign

config:
  inactive_days: 30
  offer: "15_percent"

steps:
  - action: tool
    tool: crm.findInactiveCustomers
    agent: mrs_parker
    params:
      days: "{{config.inactive_days}}"
    
  - action: delegate
    agent: craig
    input: "{{mrs_parker.inactive_customers}}"
    task: |
      Create personalized win-back emails for each customer:
      - Reference their last purchase
      - Include {{config.offer}} offer
      - Create urgency (offer expires in 7 days)
      - Keep friendly and non-pushy
    
  - action: tool
    tool: email.sendBatch
    params:
      recipients: "{{mrs_parker.inactive_customers}}"
      template: "win_back"
      personalization: "{{craig.personalized_messages}}"
    
  - action: notify
    channels:
      - dashboard
    to: "{{user.email}}"
    subject: "📧 Win-Back Campaign Sent"
    body: |
      Win-back campaign completed:
      
      📤 Emails sent: {{mrs_parker.inactive_customers.length}}
      🎁 Offer: {{config.offer}}
      ⏰ Valid for: 7 days
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly', config: { cron: '0 10 * * 1' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Run Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'crm.findInactiveCustomers', agent: 'mrs_parker' } },
      { action: 'delegate', params: { agent: 'craig', task: 'personalize' } },
      { action: 'tool', params: { tool: 'email.sendBatch' } },
      { action: 'notify', params: { channels: ['dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-4. Weekly Top Sellers Report
  {
    name: 'Weekly Top Sellers Report',
    description: 'Email digest of your best-performing products every Monday morning.',
    status: 'active',
    yaml: `name: Weekly Top Sellers Report
description: Automated weekly sales performance digest

triggers:
  - type: schedule
    cron: "0 9 * * 1"  # Mondays at 9 AM
  - type: manual
    name: Generate Report

config:
  top_count: 10
  include_margins: true

steps:
  - action: tool
    tool: pos.getTopSellers
    agent: pops
    params:
      days: 7
      limit: "{{config.top_count}}"
    
  - condition: "{{config.include_margins}}"
    action: delegate
    agent: money_mike
    input: "{{pops.top_sellers}}"
    task: Calculate margin % for each product and identify margin opportunities
    
  - action: delegate
    agent: pops
    input:
      products: "{{pops.top_sellers}}"
      margins: "{{money_mike.margins}}"
    task: |
      Generate executive summary:
      1. Revenue highlight
      2. Top performer spotlight
      3. Week-over-week comparison
      4. Recommendations
    
  - action: notify
    channels:
      - email
    to: "{{user.email}}"
    subject: "🏆 Weekly Top Sellers Report"
    body: |
      {{pops.executive_summary}}
      
      **Top {{config.top_count}} Products This Week:**
      
      {{#each pops.top_sellers}}
      - {{this.name}} - \${{this.revenue}} ({{this.units}} units)
      {{/each}}
      
      {{#if config.include_margins}}
      **Margin Analysis:**
      {{money_mike.margin_summary}}
      {{/if}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Report', config: { cron: '0 9 * * 1' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Generate', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'pos.getTopSellers', agent: 'pops' } },
      { action: 'delegate', params: { agent: 'money_mike', conditional: true } },
      { action: 'delegate', params: { agent: 'pops', task: 'summary' } },
      { action: 'notify', params: { channels: ['email'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-5. Low Stock Alert
  {
    name: 'Low Stock Alert',
    description: 'Get notified when popular products drop below your restock threshold.',
    status: 'active',
    yaml: `name: Low Stock Alert
description: Real-time inventory monitoring with restock alerts

triggers:
  - type: schedule
    cron: "0 */2 * * *"  # Every 2 hours
  - type: event
    pattern: "inventory.updated"
  - type: manual
    name: Check Now

config:
  threshold: 10
  categories: ["flower", "concentrates", "edibles", "vapes"]

steps:
  - action: tool
    tool: pos.getInventory
    agent: pops
    params:
      categories: "{{config.categories}}"
    
  - action: delegate
    agent: smokey
    input: "{{pops.inventory}}"
    task: |
      Identify products below threshold:
      - Threshold: {{config.threshold}} units
      - Flag best sellers at risk
      - Recommend reorder quantities based on velocity
    
  - condition: "{{smokey.low_stock_items.length > 0}}"
    action: notify
    channels:
      - dashboard
      - email
    to: "{{user.email}}"
    subject: "📦 Low Stock Alert: {{smokey.low_stock_items.length}} items"
    body: |
      The following products need attention:
      
      {{#each smokey.low_stock_items}}
      ⚠️ **{{this.name}}**
         Stock: {{this.current_qty}} units
         Velocity: {{this.daily_velocity}}/day
         Days until stockout: ~{{this.days_remaining}}
         Suggested reorder: {{this.reorder_qty}} units
      
      {{/each}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Hourly Check', config: { cron: '0 */2 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'event', name: 'Inventory Update', config: { eventPattern: 'inventory.updated' }, enabled: true },
      { id: 'trigger-3', type: 'manual', name: 'Check Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'pos.getInventory', agent: 'pops' } },
      { action: 'delegate', params: { agent: 'smokey', task: 'analyze' } },
      { action: 'notify', params: { channels: ['dashboard', 'email'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // =============================================================================
  // SMOKEY RECOMMENDS: Brand Playbooks (CPG)
  // =============================================================================

  // SR-B1. Price Violation Watch (MAP)
  {
    name: 'Price Violation Watch (MAP)',
    description: 'Alerts when retailers list your products below Minimum Advertised Price.',
    status: 'active',
    yaml: `name: Price Violation Watch (MAP)
description: Monitor retailer menus for MAP violations

triggers:
  - type: schedule
    cron: "0 9 * * *"  # Daily at 9 AM
  - type: manual
    name: Check Prices

config:
  map_price: 0
  variance_percent: 5

steps:
  - action: tool
    tool: scanner.scanMenus
    agent: ezal
    task: Scan all authorized retailer menus for our products
  
  - action: delegate
    agent: money_mike
    input: "{{ezal.menu_prices}}"
    task: |
      Identify MAP violations:
      - MAP Price: \${{config.map_price}}
      - Allowed Variance: {{config.variance_percent}}%
      - Flag any price below \${{config.map_price * (1 - config.variance_percent/100)}}
    
  - condition: "{{money_mike.violations.length > 0}}"
    action: notify
    channels:
      - email
      - dashboard
    to: "{{user.email}}"
    subject: "🚨 MAP Violations Detected: {{money_mike.violations.length}} items"
    body: |
      The following retailers are below MAP:
      
      {{#each money_mike.violations}}
      • {{this.retailer}}: {{this.product}} @ \${{this.price}} (MAP: \${{config.map_price}})
      {{/each}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Check', config: { cron: '0 9 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Check Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'scanner.scanMenus', agent: 'ezal' } },
      { action: 'delegate', params: { agent: 'money_mike' } },
      { action: 'notify', params: { channels: ['email', 'dashboard'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-B2. New Store Opener
  {
    name: 'New Store Opener',
    description: 'Auto-send intro kits to newly issued retail licenses in your territory.',
    status: 'active',
    yaml: `name: New Store Opener
description: Lead generation for new dispensary licenses

triggers:
  - type: schedule
    cron: "0 10 * * 1"  # Weekly on Mondays
  - type: manual
    name: Run Search

config:
  territory: "CA"
  send_email: false

steps:
  - action: tool
    tool: intel.findNewLicenses
    agent: deebo
    params:
      state: "{{config.territory}}"
      days: 7
    
  - action: delegate
    agent: craig
    input: "{{deebo.new_licenses}}"
    task: |
      Draft intro emails for each new licensee:
      - Congratulate them on the new license
      - Introduce our brand portfolio
      - Attach wholesale catalog
    
  - condition: "{{config.send_email}}"
    action: tool
    tool: email.sendBatch
    params:
      recipients: "{{deebo.new_licenses}}"
      template: "new_store_intro"
      personalization: "{{craig.drafts}}"
    
  - action: notify
    channels:
      - dashboard
    to: "{{user.email}}"
    subject: "🏪 New Licenses Found: {{deebo.new_licenses.length}}"
    body: |
      Found {{deebo.new_licenses.length}} new licenses in {{config.territory}}:
      
      {{#each deebo.new_licenses}}
      • {{this.name}} ({{this.city}})
      {{/each}}
      
      {{#if config.send_email}}Emails sent via Craig.{{else}}Drafts ready for review.{{/if}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Search', config: { cron: '0 10 * * 1' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Run Search', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'intel.findNewLicenses', agent: 'deebo' } },
      { action: 'delegate', params: { agent: 'craig' } },
      { action: 'tool', params: { tool: 'email.sendBatch', conditional: true } },
      { action: 'notify', params: { channels: ['dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-B3. Retailer Stockout Alert
  {
    name: 'Retailer Stockout Alert',
    description: 'Notify sales rep when a partner menu no longer lists your SKUs.',
    status: 'active',
    yaml: `name: Retailer Stockout Alert
description: Monitor partners for stockouts (menu gaps)

triggers:
  - type: schedule
    cron: "0 8 * * *"  # Daily at 8 AM
  - type: manual
    name: Check Stock

config:
  retailers: []
  products: []

steps:
  - action: tool
    tool: scanner.checkAvailability
    agent: pops
    params:
      retailers: "{{config.retailers}}"
      products: "{{config.products}}"
    
  - action: delegate
    agent: craig
    input: "{{pops.missing_items}}"
    task: |
      Draft reorder reminder emails for partners with gaps:
      - Mention missing SKUs
      - Suggest reorder quantity
      - Highlight fast delivery options
    
  - condition: "{{pops.missing_items.length > 0}}"
    action: notify
    channels:
      - email
      - dashboard
    to: "{{user.email}}"
    subject: "📉 Stockouts Detected at {{pops.affected_retailers.length}} Stores"
    body: |
      The following partners are missing SKUs on their menu:
      
      {{#each pops.missing_items}}
      • {{this.retailer}}: Missing {{this.sku}}
      {{/each}}
      
      Draft emails prepared by Craig.
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Check', config: { cron: '0 8 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Check Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'scanner.checkAvailability', agent: 'pops' } },
      { action: 'delegate', params: { agent: 'craig' } },
      { action: 'notify', params: { channels: ['email', 'dashboard'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-B4. Competitor Shelf Space Alert
  {
    name: 'Competitor Shelf Space Alert',
    description: 'Get notified when key competitors launch new products at your retail partners.',
    status: 'active',
    yaml: `name: Competitor Shelf Space Alert
description: Track competitor expansion in your accounts

triggers:
  - type: schedule
    cron: "0 9 * * 1"  # Weekly on Mondays
  - type: manual
    name: Scan Shelf

config:
  competitors: []

steps:
  - action: tool
    tool: scanner.scanShelf
    agent: ezal
    params:
      competitors: "{{config.competitors}}"
    
  - action: delegate
    agent: ezal
    input: "{{ezal.new_listings}}"
    task: |
      Analyze new competitor listings:
      - Identify new SKUs requiring response
      - Compare price points
      - Estimate shelf share impact
    
  - condition: "{{ezal.new_listings.length > 0}}"
    action: notify
    channels:
      - email
    to: "{{user.email}}"
    subject: "🕵️ Competitor Activity Alert"
    body: |
      New competitor products detected at your accounts:
      
      {{#each ezal.new_listings}}
      • {{this.retailer}}: {{this.competitor}} launched {{this.product}} (\${{this.price}})
      {{/each}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Scan', config: { cron: '0 9 * * 1' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Scan Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'scanner.scanShelf', agent: 'ezal' } },
      { action: 'delegate', params: { agent: 'ezal', task: 'analyze' } },
      { action: 'notify', params: { channels: ['email'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-B5. Slow Mover Alert
  {
    name: 'Slow Mover Alert',
    description: 'Identify retail partners who haven\'t reordered in X days despite high initial volume.',
    status: 'active',
    yaml: `name: Slow Mover Alert
description: Wholesale velocity and reorder monitoring

triggers:
  - type: schedule
    cron: "0 9 * * 5"  # Fridays at 9 AM
  - type: manual
    name: Check Velocity

config:
  days_without_reorder: 45
  min_initial_order: 1000

steps:
  - action: tool
    tool: wholesale.checkOrders
    agent: pops
    params:
      days: "{{config.days_without_reorder}}"
      min_amount: "{{config.min_initial_order}}"
    
  - action: delegate
    agent: pops
    input: "{{pops.slow_movers}}"
    task: |
      Analyze slow movers:
      - Calculate days since last order
      - Check if sell-through data available (Metrc)
      - Flag accounts at risk of churn
    
  - condition: "{{pops.slow_movers.length > 0}}"
    action: notify
    channels:
      - dashboard
      - email
    to: "{{user.email}}"
    subject: "🐢 Slow Mover Alert: {{pops.slow_movers.length}} Accounts"
    body: |
      The following accounts haven't reordered in {{config.days_without_reorder}}+ days:
      
      {{#each pops.slow_movers}}
      • {{this.account_name}} (Last order: {{this.last_order_date}})
      {{/each}}
      
      Consider running a "Sell-through Support" promo.
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Check', config: { cron: '0 9 * * 5' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Check Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'wholesale.checkOrders', agent: 'pops' } },
      { action: 'delegate', params: { agent: 'pops', task: 'analyze' } },
      { action: 'notify', params: { channels: ['dashboard', 'email'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // =============================================================================
  // SMOKEY RECOMMENDS: Consumer Playbooks (Customer Role)
  // =============================================================================

  // SR-C1. Deal Hunter
  {
    name: 'Deal Hunter',
    description: 'Alerts when your favorite products or brands go on sale at nearby dispensaries.',
    status: 'active',
    yaml: `name: Deal Hunter
description: Find local deals on favorite brands

triggers:
  - type: schedule
    cron: "0 10 * * *"  # Daily at 10 AM
  - type: manual
    name: Scan Deals

config:
  brands: []
  max_distance_miles: 10

steps:
  - action: tool
    tool: scanner.findDeals
    agent: ezal
    params:
      brands: "{{config.brands}}"
      radius: "{{config.max_distance_miles}}"
    
  - action: delegate
    agent: money_mike
    input: "{{ezal.deals}}"
    task: |
      Curate the best deals found:
      - Highlight biggest savings
      - Verify deal freshness
      - Sort by distance
      - Format as a savings report
    
  - condition: "{{money_mike.curated_deals.length > 0}}"
    action: notify
    channels:
      - push
    to: "{{user.uid}}"
    title: "💰 Deal Alert: Save up to {{money_mike.max_savings}}%"
    body: |
      Found {{money_mike.deal_count}} deals near you for {{config.brands}}:
      
      {{#each money_mike.curated_deals}}
      • {{this.retailer}}: {{this.product}} (\${{this.price}}) - {{this.discount}} Off
      {{/each}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Scan', config: { cron: '0 10 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Scan Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'scanner.findDeals', agent: 'ezal' } },
      { action: 'delegate', params: { agent: 'money_mike' } },
      { action: 'notify', params: { channels: ['push'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-C2. Fresh Drop Alert
  {
    name: 'Fresh Drop Alert',
    description: 'Get notified as soon as a hyped brand or strain lands at a dispensary near you.',
    status: 'active',
    yaml: `name: Fresh Drop Alert
description: Be the first to know about new inventory

triggers:
  - type: schedule
    cron: "0 * * * *"  # Hourly
  - type: manual
    name: Check Drops

config:
  watch_list: []

steps:
  - action: tool
    tool: scanner.checkNewArrivals
    agent: ezal
    params:
      keywords: "{{config.watch_list}}"
    
  - action: delegate
    agent: smokey
    input: "{{ezal.new_arrivals}}"
    task: |
      Verify hype factor:
      - Confirm these are actual new drops
      - Check strain ratings
      - Add tasting notes if available
    
  - condition: "{{ezal.new_arrivals.length > 0}}"
    action: notify
    channels:
      - push
    to: "{{user.uid}}"
    title: "🚀 Fresh Drop: {{ezal.new_arrivals.0.name}} Just Landed"
    body: |
      New arrivals at {{ezal.new_arrivals.0.retailer}}:
      
      {{#each ezal.new_arrivals}}
      • {{this.name}}
      {{/each}}
      
      Tap to reserve before it's gone!
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Hourly Scan', config: { cron: '0 * * * *' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Check Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'scanner.checkNewArrivals', agent: 'ezal' } },
      { action: 'delegate', params: { agent: 'smokey' } },
      { action: 'notify', params: { channels: ['push'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-C3. The Re-Up Reminder
  {
    name: 'The Re-Up Reminder',
    description: 'Smart reminders to restock your stash based on your consumption habits.',
    status: 'active',
    yaml: `name: Re-Up Reminder
description: Predictive restocking based on purchase history

triggers:
  - type: schedule
    cron: "0 18 * * *"  # Daily at 6 PM
  - type: manual
    name: Check Stash

config:
  weekly_consumption_grams: 3.5

steps:
  - action: tool
    tool: user.getLastPurchase
    agent: pops
    task: Get last purchase date and quantity
    
  - action: delegate
    agent: pops
    task: |
      Calculate stash status:
      - Days since purchase: {{pops.days_since}}
      - Estimated usage: {{pops.days_since * (config.weekly_consumption_grams / 7)}}g
      - Remaining: {{pops.last_quantity - pops.estimated_usage}}g
      - Alert if remaining < 20%
    
  - condition: "{{pops.needs_restock}}"
    action: notify
    channels:
      - push
    to: "{{user.uid}}"
    title: "🔄 Time to Re-Up?"
    body: |
      Running low? It's been {{pops.days_since}} days since your last pick-up.
      
      Check out new arrivals at {{pops.favorite_retailer}}.
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Check', config: { cron: '0 18 * * *' }, enabled: true },
      { id: 'trigger-2', type: 'manual', name: 'Check Now', config: {}, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'user.getLastPurchase', agent: 'pops' } },
      { action: 'delegate', params: { agent: 'pops', task: 'analyze' } },
      { action: 'notify', params: { channels: ['push'], conditional: true } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-C4. Consumption Journal
  {
    name: 'Consumption Journal',
    description: 'Get prompted to rate and review products the day after you buy them.',
    status: 'active',
    yaml: `name: Consumption Journal
description: Post-purchase feedback loop

triggers:
  - type: event
    pattern: "order.completed"
    delay: "24h"

config:
  ask_time: "19:00"

steps:
  - action: tool
    tool: user.getRecentOrder
    agent: smokey
    
  - action: notify
    channels:
      - push
    to: "{{user.uid}}"
    title: "📓 How was the {{smokey.order.product}}?"
    body: |
      Rate your experience to help me find better strains for you next time.
      
      Tap to log:
      1. Effect (Energy vs Sleep)
      2. Flavor
      3. Overall Rating
`,
    triggers: [
      { id: 'trigger-1', type: 'event', name: 'Post-Purchase', config: { eventPattern: 'order.completed', delay: '24h' }, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'user.getRecentOrder', agent: 'smokey' } },
      { action: 'notify', params: { channels: ['push'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1
  },

  // SR-C5. Strain of the Week
  {
    name: 'Strain of the Week',
    description: 'Weekly curated recommendation based on your unique terpene profile.',
    status: 'active',
    yaml: `name: Strain of the Week
description: Personalized weekly recommendation

triggers:
  - type: schedule
    cron: "0 16 * * 5"  # Fridays at 4 PM

config:
  preference_profile: "hybrid"

steps:
  - action: tool
    tool: recommendations.getPersonalized
    agent: smokey
    params:
      profile: "{{config.preference_profile}}"
      limit: 1
    
  - action: notify
    channels:
      - push
      - email
    to: "{{user.uid}}"
    title: "🌿 Your Weekend Pick: {{smokey.recommendation.name}}"
    body: |
      Based on your love for {{smokey.user_top_terps}}, we think you'll love this:
      
      {{smokey.recommendation.name}} by {{smokey.recommendation.brand}}
      
      Why: {{smokey.reasoning}}
      Available at: {{smokey.nearest_retailer}}
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Rec', config: { cron: '0 16 * * 5' }, enabled: true }
    ],
    steps: [
      { action: 'tool', params: { tool: 'recommendations.getPersonalized', agent: 'smokey' } },
      { action: 'notify', params: { channels: ['push', 'email'] } }
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
