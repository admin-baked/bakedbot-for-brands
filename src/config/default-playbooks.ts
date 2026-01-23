/**
 * Default Playbook Templates
 * Pre-built automations that come with the platform
 */

import { Playbook } from '@/types/playbook';

export const DEFAULT_PLAYBOOKS: Partial<Playbook>[] = [
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
      { action: 'delegate', params: { agent: 'ezal', task: 'Scan competitor menus' }, retryOnFailure: true },
      { action: 'analyze', params: { agent: 'money_mike' }, retryOnFailure: true, validationThreshold: 85 },
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
      { action: 'query', params: { agent: 'pops' }, retryOnFailure: true },
      { action: 'forecast', params: { agent: 'pops' }, retryOnFailure: true, validationThreshold: 80 },
      { action: 'analyze', params: { agent: 'money_mike' }, retryOnFailure: true, validationThreshold: 90 },
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
      { action: 'query', params: { agent: 'pops', task: 'trend_analysis' }, retryOnFailure: true },
      { action: 'generate', params: { agent: 'craig', type: 'blog' }, retryOnFailure: true, validationThreshold: 85 },
      { action: 'generate', params: { agent: 'craig', type: 'social' }, retryOnFailure: true, validationThreshold: 80 },
      { action: 'review', params: { agent: 'deebo', task: 'compliance_review' }, retryOnFailure: true },
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
      { action: 'parallel', params: { agents: ['smokey', 'ezal', 'pops'] }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'money_mike' }, retryOnFailure: true, validationThreshold: 85 },
      { action: 'delegate', params: { agent: 'craig' }, retryOnFailure: true, validationThreshold: 85 },
      { action: 'delegate', params: { agent: 'deebo' }, retryOnFailure: true, validationThreshold: 100 },
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
      { action: 'parallel', params: { agents: ['ezal'] }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'money_mike' }, retryOnFailure: true, validationThreshold: 90 },
      { action: 'generate', params: { type: 'table' }, retryOnFailure: true },
      { action: 'apply', params: { autoApply: true, threshold: 85 }, agent: 'money_mike', retryOnFailure: true, validationThreshold: 95 },
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
      { action: 'query', params: { agent: 'pops', task: 'segmentation' }, retryOnFailure: true },
      { action: 'parallel', params: { agent: 'craig', task: 'content_generation' }, retryOnFailure: true, validationThreshold: 90 },
      { action: 'delegate', params: { agent: 'deebo', task: 'compliance_check' }, retryOnFailure: true, validationThreshold: 100 },
      { action: 'send_email', params: { track: true }, retryOnFailure: true }
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
      { action: 'query', params: { agent: 'pops', data: 'vision' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'smokey' }, retryOnFailure: true, validationThreshold: 80 },
      { action: 'delegate', params: { agent: 'money_mike' }, retryOnFailure: true, validationThreshold: 85 },
      { action: 'generate', params: { type: 'recommendations' }, retryOnFailure: true },
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
      { action: 'join_meeting', params: { agent: 'smokey' }, retryOnFailure: true },
      { action: 'transcribe', params: { language: 'auto' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'smokey', task: 'notes' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'pops', task: 'recommendations' }, retryOnFailure: true, validationThreshold: 80 },
      { action: 'generate', params: { type: 'recommendations' }, retryOnFailure: true },
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
      { action: 'parallel', params: { agents: ['deebo'], tasks: ['scan_compliance'] }, retryOnFailure: true },
      { action: 'analyze', params: { agent: 'deebo', task: 'diff_knowledge' }, retryOnFailure: true },
      { action: 'queue_discovery', params: { status: 'pending_review' }, retryOnFailure: true },
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
        { action: 'tool', params: { tool: 'intel.scanCompetitors' }, retryOnFailure: true },
        { action: 'tool', params: { tool: 'intel.generateCompetitiveReport' }, retryOnFailure: true },
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
        { action: 'tool', params: { tool: 'intel.generateWeeklyReport' }, retryOnFailure: true },
        { action: 'delegate', params: { agent: 'pops', task: 'market_analysis' }, retryOnFailure: true },
        { action: 'delegate', params: { agent: 'money_mike', task: 'recommendations' }, retryOnFailure: true, validationThreshold: 85 },
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
      { action: 'tool', params: { tool: 'weedmaps.discover', agent: 'ezal' }, retryOnFailure: true },
      { action: 'transform', params: { agent: 'ezal' }, retryOnFailure: true },
      { action: 'tool', params: { tool: 'sheets.append' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'pops' }, retryOnFailure: true },
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
        params: { url: '{{config.target_urls}}' },
        retryOnFailure: true
      },
      {
        id: 'submit',
        action: 'tracker.submit',
        params: { orgs: '{{scan.data}}' },
        retryOnFailure: true
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
      { action: 'tool', params: { tool: 'intel.scanCompetitors', agent: 'ezal' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'money_mike' }, retryOnFailure: true, validationThreshold: 85 },
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
      { action: 'delegate', params: { agent: 'smokey', task: 'generate_response' }, retryOnFailure: true, validationThreshold: 90 },
      { action: 'delegate', params: { agent: 'deebo', task: 'compliance_check' }, retryOnFailure: true, validationThreshold: 100 },
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
      { action: 'tool', params: { tool: 'crm.findInactiveCustomers', agent: 'mrs_parker' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'craig', task: 'personalize' }, retryOnFailure: true, validationThreshold: 95 },
      { action: 'tool', params: { tool: 'email.sendBatch' }, retryOnFailure: true },
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
      { action: 'tool', params: { tool: 'pos.getTopSellers', agent: 'pops' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'money_mike', conditional: true }, retryOnFailure: true, validationThreshold: 85 },
      { action: 'delegate', params: { agent: 'pops', task: 'summary' }, retryOnFailure: true },
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
      { action: 'tool', params: { tool: 'pos.getInventory', agent: 'pops' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'smokey', task: 'analyze' }, retryOnFailure: true, validationThreshold: 80 },
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
      { action: 'tool', params: { tool: 'scanner.scanMenus', agent: 'ezal' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'money_mike' }, retryOnFailure: true, validationThreshold: 90 },
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
      { action: 'tool', params: { tool: 'intel.findNewLicenses', agent: 'deebo' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'craig' }, retryOnFailure: true, validationThreshold: 90 },
      { action: 'tool', params: { tool: 'email.sendBatch', conditional: true }, retryOnFailure: true },
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
      { action: 'tool', params: { tool: 'scanner.checkAvailability', agent: 'pops' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'craig' }, retryOnFailure: true, validationThreshold: 90 },
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
  },

  // 11. Daily Financial Summary (Super User)
  {
    name: 'Daily Financial Summary',
    description: 'Automated daily revenue and margin analysis with strict financial validation.',
    status: 'draft',
    yaml: `name: Daily Financial Summary
description: Daily revenue and margin check with validation
triggers:
  - type: schedule
    cron: "0 8 * * *"
steps:
  - action: query
    agent: pops
    task: Aggregate yesterday's revenue
    retryOnFailure: true
  - action: analyze
    agent: money_mike
    task: Calculate margins vs targets
  - action: notify
    channels: [email, dashboard]
    to: "{{user.email}}"
    subject: "💰 Daily Financial Summary"
    body: "{{money_mike.analysis}}"
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Morning', config: { cron: '0 8 * * *' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops', task: 'revenue_aggregation' }, retryOnFailure: true, maxRetries: 3 },
      { action: 'analyze', params: { agent: 'money_mike', task: 'margin_calc' } },
      { action: 'notify', params: { channels: ['email', 'dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'money_mike',
    category: 'reporting',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 12. System Health Pipeline (Super User)
  {
    name: 'System Health Pipeline',
    description: 'Monitor API latency, database connections, and webhook endpoints with technical validation.',
    status: 'draft',
    yaml: `name: System Health Pipeline
description: Technical health check with self-healing validation
triggers:
  - type: schedule
    cron: "0 * * * *" # Hourly
steps:
  - action: check_health
    agent: linus
    task: Verify API latency and database connectivity
    retryOnFailure: true
    validationThreshold: 90
  - action: notify
    condition: "{{linus.status != 'healthy'}}"
    channels: [sms]
    to: "{{user.phone}}"
    subject: "🚨 System Health Alert"
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Hourly Check', config: { cron: '0 * * * *' }, enabled: true }
    ],
    steps: [
      { action: 'check_health', params: { agent: 'linus' }, retryOnFailure: true, validationThreshold: 90 },
      { action: 'notify', params: { channels: ['sms'] }, condition: "{{linus.status != 'healthy'}}" }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'linus',
    category: 'ops',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 13. POS Reconciliation (Dispensary)
  {
    name: 'POS Reconciliation',
    description: 'Compare POS transaction logs with expected drawer counts. Validates financial integrity.',
    status: 'draft',
    yaml: `name: POS Reconciliation
description: Validate POS transactions against drawer counts
triggers:
  - type: schedule
    cron: "0 6 * * *"
steps:
  - action: query
    agent: pops
    task: Fetch POS transactions
    retryOnFailure: true
  - action: analyze
    agent: money_mike
    task: Compare to expected drawer count
  - condition: "{{money_mike.discrepancy > 5}}"
    action: notify
    channels: [sms]
    urgency: high
    message: "⚠️ Cash drawer discrepancy detected: \${{money_mike.discrepancy}}"
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Daily Audit', config: { cron: '0 6 * * *' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops', task: 'pos_fetch' }, retryOnFailure: true },
      { action: 'analyze', params: { agent: 'money_mike', task: 'drawer_compare' } },
      { action: 'notify', params: { channels: ['sms'] }, condition: "{{money_mike.discrepancy > 5}}" }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'pops',
    category: 'ops',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 14. Inventory Audit (Dispensary)
  {
    name: 'Inventory Audit',
    description: 'Cross-reference METRC data with physical inventory counts. Validates compliance and data accuracy.',
    status: 'draft',
    yaml: `name: Inventory Audit
description: METRC vs Physical Inventory Check
triggers:
  - type: schedule
    cron: "0 23 * * 0" # Weekly on Sunday
steps:
  - action: query
    agent: pops
    task: Fetch METRC package data
    retryOnFailure: true
  - action: analyze
    agent: smokey
    task: Compare with latest cycle count
  - action: report
    agent: deebo
    task: Generate compliance discrepancy report
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Audit', config: { cron: '0 23 * * 0' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops', task: 'metrc_fetch' }, retryOnFailure: true },
      { action: 'analyze', params: { agent: 'smokey', task: 'cycle_count_compare' } },
      { action: 'report', params: { agent: 'deebo', task: 'compliance_report' } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'deebo',
    category: 'compliance',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 15. Product Launch Validator (Brand)
  {
    name: 'Product Launch Validator',
    description: 'Ensure new products meet compliance and SEO standards before launch. Prevents costly take-downs.',
    status: 'draft',
    yaml: `name: Product Launch Validator
description: Compliance and SEO check for new products
triggers:
  - type: event
    pattern: "product.created"
steps:
  - action: validate
    agent: deebo
    task: Check product image compliance
    retryOnFailure: false
  - action: generate
    agent: craig
    task: Create SEO description
    retryOnFailure: true
  - action: validate
    agent: deebo
    task: Compliance check on copy
`,
    triggers: [
      { id: 'trigger-1', type: 'event', name: 'New Product', config: { eventPattern: 'product.created' }, enabled: true }
    ],
    steps: [
      { action: 'validate', params: { agent: 'deebo', task: 'image_check' }, retryOnFailure: false },
      { action: 'generate', params: { agent: 'craig', task: 'seo_desc' }, retryOnFailure: true },
      { action: 'validate', params: { agent: 'deebo', task: 'copy_check' } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'deebo',
    category: 'compliance',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 16. Weekly Brand Performance (Brand)
  {
    name: 'Weekly Brand Performance',
    description: 'Weekly sales and margin report for Brand Managers. Tracks sell-through and competitive positioning.',
    status: 'draft',
    yaml: `name: Weekly Brand Performance
description: Weekly sales and margin check
triggers:
  - type: schedule
    cron: "0 9 * * 1" # Weekly Monday 9am
steps:
  - action: query
    agent: pops
    task: Aggregate weekly sales by SKU
    retryOnFailure: true
  - action: analyze
    agent: money_mike
    task: Compare sales against weekly targets
  - action: forecast
    agent: money_mike
    task: Forecast next week demand
  - action: notify
    channels: [email]
    to: "{{user.email}}"
    subject: "📈 Weekly Brand Performance"
`,
    triggers: [
      { id: 'trigger-1', type: 'schedule', name: 'Weekly Monday', config: { cron: '0 9 * * 1' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops', task: 'sales_agg' }, retryOnFailure: true },
      { action: 'analyze', params: { agent: 'money_mike', task: 'target_compare' } },
      { action: 'forecast', params: { agent: 'money_mike', task: 'demand_forecast' } },
      { action: 'notify', params: { channels: ['email'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'money_mike',
    category: 'reporting',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },
  // 26. Linus Zero Bug Tolerance
  {
    name: 'Protocol: Zero Bug Tolerance',
    description: 'Proactive bug hunting and codebase health verification by Linus (CTO).',
    status: 'active',
    yaml: `name: Protocol: Zero Bug Tolerance
description: Pulse check for codebase health
triggers:
  - type: schedule
    cron: "0 * * * *" # Hourly
steps:
  - action: git_log
    count: 5
  - action: run_health_check
    scope: build_only
  - action: search_codebase
    pattern: "FIXME"
`,
    triggers: [
       { id: 'linus-pulse', type: 'schedule', name: 'Hourly Pulse', config: { cron: '0 * * * *' }, enabled: true }
    ],
    steps: [
        { action: 'git_log', params: { count: 5 } },
        { action: 'run_health_check', params: { scope: 'build_only' } },
        { action: 'read_support_tickets', params: { status: 'new', limit: 5 } },
        { action: 'search_codebase', params: { pattern: 'FIXME|TODO: HIGH PRIORITY' } },
        { action: 'context_log_decision', params: { decision: 'Completed Routine Sweep', reasoning: 'Hourly Pulse', category: 'operations' } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'linus',
    category: 'ops',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 27. Leo Operations Heartbeat
  {
    name: 'Protocol: Operations Heartbeat',
    description: 'Hourly system health and workflow monitoring by Leo (COO).',
    status: 'active',
    yaml: `name: Protocol: Operations Heartbeat
description: Hourly system health check
triggers:
  - type: schedule
    cron: "0 * * * *"
steps:
  - action: getSystemHealth
  - action: getQueueStatus
`,
    triggers: [
       { id: 'leo-pulse', type: 'schedule', name: 'Hourly Pulse', config: { cron: '0 * * * *' }, enabled: true }
    ],
    steps: [
        { action: 'getSystemHealth', params: {} },
        { action: 'getQueueStatus', params: {} },
        { action: 'context_log_decision', params: { decision: 'Operations Logged', reasoning: 'Hourly Heartbeat', category: 'operations' } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'leo',
    category: 'ops',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 28. Jack Revenue Pulse
  {
    name: 'Protocol: Revenue Pulse',
    description: 'Daily revenue and pipeline health check by Jack (CRO).',
    status: 'active',
    yaml: `name: Protocol: Revenue Pulse
description: Daily revenue check
triggers:
  - type: schedule
    cron: "0 9 * * *"
steps:
  - action: getRevenueMetrics
  - action: crmGetStats
`,
    triggers: [
       { id: 'jack-pulse', type: 'schedule', name: 'Daily Morning', config: { cron: '0 9 * * *' }, enabled: true }
    ],
    steps: [
        { action: 'getRevenueMetrics', params: { period: 'day' } },
        { action: 'crmGetStats', params: {} },
        { action: 'context_log_decision', params: { decision: 'Revenue Logged', reasoning: 'Daily Pulse', category: 'finance' } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'jack',
    category: 'marketing',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 29. Glenda Brand Watch
  {
    name: 'Protocol: Brand Watch',
    description: 'Daily brand sentiment and traffic monitoring by Glenda (CMO).',
    status: 'active',
    yaml: `name: Protocol: Brand Watch
description: Daily brand sentiment check
triggers:
  - type: schedule
    cron: "0 9 * * *"
steps:
  - action: getGA4Traffic
  - action: getSocialMetrics
`,
    triggers: [
       { id: 'glenda-pulse', type: 'schedule', name: 'Daily Morning', config: { cron: '0 9 * * *' }, enabled: true }
    ],
    steps: [
        { action: 'getGA4Traffic', params: {} },
        { action: 'getSocialMetrics', params: { platform: 'instagram' } },
        { action: 'context_log_decision', params: { decision: 'Marketing Logged', reasoning: 'Daily Pulse', category: 'marketing' } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'glenda',
    category: 'marketing',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 30. Mrs. Parker Welcome Email Campaign
  {
    name: 'Protocol: Welcome Email Campaign',
    description: 'Weekly personalized welcome emails to new customers via Mrs. Parker. Uses Letta memory for personalization.',
    status: 'active',
    yaml: `name: Protocol: Welcome Email Campaign
description: Personalized welcome emails powered by Mrs. Parker and Letta memory

triggers:
  - type: schedule
    cron: "0 10 * * 1"  # Every Monday at 10 AM
  - type: event
    pattern: "user.signup"  # Also triggers on new signups

config:
  email_provider: mailjet
  personalization: letta  # Use Letta memory for personalization

steps:
  # Step 1: Query new signups from the past week
  - action: query
    agent: pops
    task: Get all new signups from the past 7 days with their account type and signup source
    output: new_signups

  # Step 2: Mrs. Parker updates her memory with new signups
  - action: delegate
    agent: mrs_parker
    input: "{{pops.new_signups}}"
    task: |
      For each new signup:
      1. Update your Letta memory block with the new customer
      2. Note their account type (brand, dispensary, customer)
      3. Record their signup source for personalization
    tools:
      - lettaUpdateCoreMemory
      - lettaMessageAgent

  # Step 3: Generate personalized welcome content via Letta
  - action: generate
    agent: mrs_parker
    input: "{{pops.new_signups}}"
    task: |
      Generate personalized welcome emails for each new signup:
      - Brand accounts: Highlight distribution network, brand dashboard, Craig for marketing
      - Dispensary accounts: Highlight Smokey budtender, menu integration, customer engagement
      - Customer accounts: Highlight product discovery, nearby dispensaries, Smokey chat
      Use your Letta memory to add personal touches based on their signup context.
    output: welcome_emails

  # Step 4: Compliance check with Deebo
  - action: delegate
    agent: deebo
    input: "{{mrs_parker.welcome_emails}}"
    task: Review all email content for cannabis marketing compliance

  # Step 5: Send emails via Mailjet
  - action: send_email
    agent: mrs_parker
    input: "{{mrs_parker.welcome_emails}}"
    provider: mailjet
    template: welcome_personalized

  # Step 6: Log to customer insights
  - action: delegate
    agent: mrs_parker
    task: |
      Log welcome emails sent to the CUSTOMER_INSIGHTS Letta block:
      - Count: {{mrs_parker.emails_sent}}
      - Account types breakdown
      - Any delivery failures
    tools:
      - lettaUpdateCoreMemory

  # Step 7: Notify operations
  - action: notify
    channels:
      - dashboard
    to: "{{boardroom}}"
    subject: "📧 Weekly Welcome Emails Sent"
    body: |
      Mrs. Parker's Weekly Welcome Report:

      📬 EMAILS SENT: {{mrs_parker.emails_sent}}

      By Account Type:
      - Brands: {{mrs_parker.brand_count}}
      - Dispensaries: {{mrs_parker.dispensary_count}}
      - Customers: {{mrs_parker.customer_count}}

      ✅ Compliance: {{deebo.review_status}}
      📊 Personalization: Letta memory active
`,
    triggers: [
      { id: 'weekly-welcome', type: 'schedule', name: 'Weekly Monday', config: { cron: '0 10 * * 1' }, enabled: true },
      { id: 'signup-trigger', type: 'event', name: 'New Signup', config: { eventPattern: 'user.signup' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops', query: 'new_signups_7d' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'mrs_parker', task: 'update_letta_memory' }, retryOnFailure: true },
      { action: 'generate', params: { agent: 'mrs_parker', type: 'email_batch' }, retryOnFailure: true, validationThreshold: 85 },
      { action: 'delegate', params: { agent: 'deebo', task: 'compliance_review' }, retryOnFailure: true, validationThreshold: 100 },
      { action: 'send_email', params: { provider: 'mailjet', template: 'welcome_personalized' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'mrs_parker', task: 'log_to_letta' }, retryOnFailure: true },
      { action: 'notify', params: { channels: ['dashboard'] } }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'mrs_parker',
    category: 'customer_success',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  },

  // 31. Mrs. Parker Onboarding Drip Campaign
  {
    name: 'Protocol: Onboarding Drip Sequence',
    description: 'Automated onboarding email sequence (Day 1, 3, 7) for new customers via Mrs. Parker.',
    status: 'active',
    yaml: `name: Protocol: Onboarding Drip Sequence
description: Multi-day onboarding email sequence

triggers:
  - type: schedule
    cron: "0 9 * * *"  # Daily at 9 AM - checks who needs emails
  - type: event
    pattern: "user.signup"

drip_schedule:
  day_1:
    delay_hours: 24
    subject: "Getting Started with BakedBot"
    focus: platform_orientation
  day_3:
    delay_hours: 72
    subject: "Pro Tips: Get More from Your AI Squad"
    focus: feature_discovery
  day_7:
    delay_hours: 168
    subject: "You're Ready to Level Up"
    focus: advanced_features

steps:
  # Step 1: Query customers in onboarding window
  - action: query
    agent: pops
    task: |
      Find customers who need onboarding emails:
      - Day 1: Signed up 24 hours ago, haven't received Day 1 email
      - Day 3: Signed up 72 hours ago, haven't received Day 3 email
      - Day 7: Signed up 168 hours ago, haven't received Day 7 email

  # Step 2: Mrs. Parker retrieves customer context from Letta
  - action: delegate
    agent: mrs_parker
    input: "{{pops.onboarding_queue}}"
    task: |
      For each customer in the onboarding queue:
      1. Search Letta memory for their signup context
      2. Check their account type and activity
      3. Personalize the onboarding content accordingly

  # Step 3: Generate personalized onboarding content
  - action: generate
    agent: mrs_parker
    task: |
      Generate day-specific onboarding emails:

      Day 1 (Orientation):
      - Welcome and quick wins
      - Key features for their account type
      - How to get help

      Day 3 (Feature Discovery):
      - Tips based on their usage (or lack thereof)
      - Highlight underused features
      - Success stories from similar accounts

      Day 7 (Level Up):
      - Advanced features introduction
      - Playbook recommendations
      - Invitation to schedule success call

  # Step 4: Send emails
  - action: send_email
    agent: mrs_parker
    provider: mailjet

  # Step 5: Update Letta memory with send status
  - action: delegate
    agent: mrs_parker
    task: Update CUSTOMER_INSIGHTS with onboarding progress
`,
    triggers: [
      { id: 'daily-drip', type: 'schedule', name: 'Daily Check', config: { cron: '0 9 * * *' }, enabled: true },
      { id: 'signup-drip', type: 'event', name: 'New Signup', config: { eventPattern: 'user.signup' }, enabled: true }
    ],
    steps: [
      { action: 'query', params: { agent: 'pops', query: 'onboarding_queue' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'mrs_parker', task: 'retrieve_letta_context' }, retryOnFailure: true },
      { action: 'generate', params: { agent: 'mrs_parker', type: 'onboarding_email' }, retryOnFailure: true, validationThreshold: 85 },
      { action: 'send_email', params: { provider: 'mailjet' }, retryOnFailure: true },
      { action: 'delegate', params: { agent: 'mrs_parker', task: 'update_letta' }, retryOnFailure: true }
    ],
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
    agent: 'mrs_parker',
    category: 'customer_success',
    ownerId: 'system',
    isCustom: false,
    requiresApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    orgId: 'system'
  }
];

/**
 * Get a default playbook by name
 */
export function getDefaultPlaybook(name: string) {
  return DEFAULT_PLAYBOOKS.find(p => p.name?.toLowerCase().includes(name.toLowerCase()));
}

/**
 * Get all default playbook names for display
 */
export function getDefaultPlaybookNames(): string[] {
  return DEFAULT_PLAYBOOKS.map(p => p.name).filter((name): name is string => !!name);
}
