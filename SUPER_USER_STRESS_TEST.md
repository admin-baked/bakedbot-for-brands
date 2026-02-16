# Super User Stress Test Suite

**Purpose:** Real-world prompts and playbooks for BakedBot team to operate the platform
**Target:** Super User role (martez@bakedbot.ai, rishabh@bakedbot.ai, team members)
**Features Tested:** Option detection, delegation, integration cards, multi-agent orchestration

---

## Test Categories

### 🏥 System Health & Operations
### 🔗 Integration Management
### 📊 Growth & Analytics
### 🚨 Incident Response
### 💼 Platform Development
### 👥 Customer Success

---

## 🏥 System Health & Operations

### Test 1: Morning System Check
**Prompt:**
```
Good morning! Run my daily system health check
```

**Expected Flow:**
1. Leo shows Operations Dashboard
2. Displays integration status cards (Gmail/Calendar/Drive/Sheets)
3. Shows agent squad status
4. Reports: Firestore, Auth, Letta, Claude, Gemini status
5. Flags any issues

**Success Criteria:**
- ✅ Integration cards render inline
- ✅ Real data from getSystemHealth tool
- ✅ No fabricated metrics

---

### Test 2: Integration Setup Workflow
**Prompt:**
```
I need to connect our Google Workspace integrations
```

**Expected Flow:**
1. Leo shows integration status
2. Presents options:
   - **Option A: Route to Technical Lead** (Linus)
   - **Option B: Create Setup Checklist**
   - **Option C: Show Current Status**

**Follow-up:** `Option A`

**Expected Result:**
- ✅ Auto-delegates to Linus
- ✅ Linus provides OAuth setup instructions
- ✅ No generic dashboard spam

---

### Test 3: Deployment Health Check
**Prompt:**
```
Check our latest Firebase deployment status
```

**Expected Flow:**
1. Leo delegates to Linus (or uses browser tools)
2. Checks Firebase App Hosting build status
3. Reports: Build time, memory usage, errors
4. Recommends action if issues found

---

## 🔗 Integration Management

### Test 4: Gmail OAuth Setup
**Prompt:**
```
Let's set up Gmail integration for the team
```

**Expected Flow:**
1. Shows Gmail offline status card
2. Presents OAuth setup options
3. User clicks "Connect" → OAuth flow
4. Returns with token → Stores encrypted

**Variation:** `Option A` after seeing options should route to Linus

---

### Test 5: Webhook Configuration
**Prompt:**
```
Help me configure webhooks for Alleaves POS
```

**Expected Flow:**
1. Leo delegates to Linus
2. Linus provides webhook URL
3. Shows signature verification setup
4. Offers to test webhook endpoint

---

### Test 6: Integration Audit
**Prompt:**
```
Show me all active integrations and their health
```

**Expected Flow:**
1. Leo runs getSystemHealth
2. Shows integration cards for each service
3. Color-coded status (Online/Offline/Pending)
4. Lists webhook endpoints + last ping times

---

## 📊 Growth & Analytics

### Test 7: Weekly Growth Review
**Prompt:**
```
Run weekly growth review - new signups, churn, revenue
```

**Expected Flow:**
1. Leo coordinates Pops (analytics) + Jack (revenue) + Mrs. Parker (churn)
2. Pops: Signup stats by role (dispensary/brand/customer)
3. Jack: MRR, ACV, expansion revenue
4. Mrs. Parker: Churn risk customers
5. Synthesized dashboard

**Success Criteria:**
- ✅ Multi-agent orchestration works
- ✅ Real data from Firestore (users, subscriptions collections)
- ✅ Markdown table output

---

### Test 8: Lead Funnel Analysis
**Prompt:**
```
Analyze our lead magnet performance - Vibe Studio, Academy, Training
```

**Expected Flow:**
1. Leo delegates to Pops
2. Pops queries:
   - `vibe_leads` collection
   - `academy_leads` collection
   - `training_cohorts` collection
3. Reports: Conversion rates, intent signals, email capture rate
4. Recommends optimization

---

### Test 9: Cohort Analysis
**Prompt:**
```
Compare retention between Empire vs Hustler plan customers
```

**Expected Flow:**
1. Leo → Pops → Mike (financial)
2. Pops: Cohort retention curves
3. Mike: LTV by plan tier
4. Combined analysis with recommendations

---

## 🚨 Incident Response

### Test 10: Production Incident
**Prompt:**
```
URGENT: Customers reporting checkout failures on Thrive Syracuse
```

**Expected Flow:**
1. Leo recognizes urgency keyword
2. Delegates to Linus immediately
3. Linus checks:
   - Firebase logs (errors in checkout flow)
   - Alleaves POS connectivity
   - Payment processor status (Aeropay/CannPay)
4. Reports root cause + fix

**Success Criteria:**
- ✅ Immediate delegation (no option menu)
- ✅ Real log analysis
- ✅ Actionable fix recommendations

---

### Test 11: API Rate Limit Alert
**Prompt:**
```
Claude API is returning 429 rate limit errors
```

**Expected Flow:**
1. Leo → Linus
2. Linus checks:
   - Current API usage vs limits
   - Which agents are highest consumers
   - Suggests: Implement exponential backoff, upgrade tier, or use Gemini fallback

---

### Test 12: Database Performance
**Prompt:**
```
Firestore queries are slow - investigate and optimize
```

**Expected Flow:**
1. Linus checks firestore.indexes.json
2. Identifies missing composite indexes
3. Suggests: Deploy indexes, add caching, optimize queries
4. Creates PR if approved

---

## 💼 Platform Development

### Test 13: Feature Planning
**Prompt:**
```
Plan implementation for SMS campaign scheduling feature
```

**Expected Flow:**
1. Leo presents options:
   - **Option A: Route to Linus** (architecture)
   - **Option B: Route to Glenda** (marketing requirements)
   - **Option C: Create Implementation Checklist**

**Follow-up:** `Option A`

**Expected:**
- ✅ Delegates to Linus
- ✅ Linus creates technical spec
- ✅ Lists: Database schema, cron jobs, UI changes, testing plan

---

### Test 14: Code Review Automation
**Prompt:**
```
Review the latest PR for payment integrations - check for security issues
```

**Expected Flow:**
1. Leo → Linus
2. Linus uses gh CLI to fetch PR diff
3. Reviews for: SQL injection, XSS, secrets exposure, proper validation
4. Provides security checklist

---

### Test 15: Deployment Pipeline
**Prompt:**
```
Create a staging environment deployment pipeline
```

**Expected Flow:**
1. Linus creates apphosting config for staging
2. Documents: Branch strategy, environment variables, secrets
3. Creates GitHub Actions workflow (if requested)

---

## 👥 Customer Success

### Test 16: Customer Onboarding
**Prompt:**
```
New Enterprise customer signed up - set up their account and integrations
```

**Expected Flow:**
1. Leo coordinates:
   - Linus: Tenant setup, custom domain
   - Mrs. Parker: Welcome email sequence
   - Craig: Onboarding campaign
2. Creates onboarding checklist
3. Schedules follow-up tasks

---

### Test 17: Customer Health Check
**Prompt:**
```
Which customers are at risk of churning this month?
```

**Expected Flow:**
1. Leo → Mrs. Parker (churn specialist)
2. Mrs. Parker queries:
   - Last login > 14 days
   - No campaigns sent in 30 days
   - Support tickets unresolved
3. Returns list with retention strategies

---

### Test 18: Support Escalation
**Prompt:**
```
Thrive Syracuse needs help with Aeropay transaction stuck in pending
```

**Expected Flow:**
1. Leo → Linus (technical)
2. Linus checks:
   - `aeropay_transactions` collection
   - Webhook delivery logs
   - Aeropay API status
3. Provides resolution steps

---

## 🧪 Advanced Multi-Agent Scenarios

### Test 19: Full Platform Audit
**Prompt:**
```
Run complete platform audit - system health, integrations, performance, security, customer health
```

**Expected Flow:**
1. Leo broadcasts to entire squad:
   - **Linus**: Technical health + security scan
   - **Pops**: Analytics + performance metrics
   - **Mrs. Parker**: Customer engagement scores
   - **Jack**: Revenue metrics
   - **Deebo**: Compliance status
2. Synthesizes executive summary
3. Flags urgent issues at top

**Success Criteria:**
- ✅ 5+ agents working in parallel
- ✅ Consolidated dashboard output
- ✅ Prioritized action items

---

### Test 20: Competitive Intelligence
**Prompt:**
```
Research competitor "Jane Technologies" - what features do they have that we don't?
```

**Expected Flow:**
1. Leo → Ezal (competitive intel)
2. Ezal uses RTRvr browser agent:
   - Scrapes jane.io website
   - Analyzes product pages
   - Identifies unique features
3. Creates feature gap analysis
4. Recommends roadmap priorities

---

### Test 21: Go-to-Market Campaign
**Prompt:**
```
Plan and execute a launch campaign for new Aeropay payment integration
```

**Expected Flow:**
1. Leo coordinates:
   - **Glenda**: Marketing strategy
   - **Craig**: Email campaign creation
   - **Day Day**: SEO content plan
   - **Deebo**: Compliance review
2. Creates launch checklist
3. Schedules execution

---

## 🎯 Stress Test Sequences

### Sequence A: Morning Operations (15 prompts)
**Simulates:** Daily super user routine

1. "Good morning, what do I need to know today?"
2. "Show me yesterday's signups"
3. "Any system errors overnight?"
4. "Check Firebase deployment status"
5. "Run growth review"
6. "Show at-risk customers"
7. "Review pending approvals"
8. "Check campaign performance"
9. "What's our MRR this month?"
10. "Any compliance issues?"
11. "Schedule weekly team sync"
12. "Create board update report"
13. "Review agent performance"
14. "Check API usage limits"
15. "What should I prioritize today?"

**Expected:**
- ✅ All responses use real data
- ✅ Delegation works correctly
- ✅ No hallucinated metrics
- ✅ Consistent agent routing

---

### Sequence B: Integration Deep Dive (10 prompts)
**Simulates:** Setting up all integrations

1. "Let's connect integrations"
2. "Option A" (delegates to Linus)
3. "Start with Gmail OAuth setup"
4. "Now set up Google Calendar"
5. "Configure Google Drive access"
6. "Add Google Sheets integration"
7. "Set up HubSpot CRM"
8. "Configure Mailjet for email campaigns"
9. "Enable Blackleaf SMS"
10. "Test all integrations"

**Expected:**
- ✅ Option detection works across all prompts
- ✅ Integration cards update status
- ✅ OAuth flows complete successfully

---

### Sequence C: Incident → Resolution (8 prompts)
**Simulates:** Production incident handling

1. "URGENT: Production is down"
2. "Option A" (route to Linus)
3. "Check error logs"
4. "What's the root cause?"
5. "Create a fix"
6. "Deploy the fix to staging"
7. "Test in staging"
8. "Deploy to production"

**Expected:**
- ✅ Immediate delegation on urgent keyword
- ✅ Real log analysis
- ✅ Actionable fixes
- ✅ Deployment verification

---

## 📋 Playbook Templates

### Playbook 1: Daily System Health
```yaml
name: Daily System Health Check
schedule: Every weekday at 9:00 AM EST
agent: leo
steps:
  - type: tool_call
    tool: getSystemHealth
    store_as: health_status

  - type: tool_call
    tool: crmGetStats
    store_as: platform_stats

  - type: synthesize
    template: |
      **Daily System Health Report**
      Date: {{today}}

      **System Status:**
      {{health_status}}

      **Platform Metrics:**
      {{platform_stats}}

      **Action Items:**
      {{prioritize_issues}}

  - type: notify
    channels: [email, slack]
    recipients: [martez@bakedbot.ai]
```

---

### Playbook 2: Weekly Growth Review
```yaml
name: Weekly Growth Review
schedule: Every Monday at 8:00 AM EST
agent: leo
steps:
  - type: delegate
    agent: pops
    task: "Generate signup analytics for last 7 days"
    store_as: signup_stats

  - type: delegate
    agent: jack
    task: "Calculate MRR growth and expansion revenue"
    store_as: revenue_stats

  - type: delegate
    agent: mrs_parker
    task: "Identify at-risk customers this week"
    store_as: churn_risk

  - type: synthesize
    template: |
      **Weekly Growth Review**
      Week of: {{week_start}}

      **Signups:**
      {{signup_stats}}

      **Revenue:**
      {{revenue_stats}}

      **Churn Risk:**
      {{churn_risk}}

      **Recommendations:**
      {{generate_recommendations}}

  - type: create_thread
    type: growth_review
    title: "Growth Review - Week {{week_number}}"
    attach_report: true
```

---

### Playbook 3: Integration Health Monitor
```yaml
name: Integration Health Monitor
schedule: Every hour
agent: leo
steps:
  - type: tool_call
    tool: getIntegrationStatus
    integrations: [gmail, calendar, drive, sheets, hubspot, mailjet, blackleaf]
    store_as: integration_status

  - type: condition
    if: "any_offline"
    then:
      - type: notify
        severity: high
        message: "Integration offline: {{offline_services}}"
        channels: [slack]

      - type: delegate
        agent: linus
        task: "Investigate offline integration: {{offline_services}}"
```

---

### Playbook 4: Customer Churn Prevention
```yaml
name: Proactive Churn Prevention
schedule: Every day at 10:00 AM EST
agent: leo
steps:
  - type: delegate
    agent: mrs_parker
    task: "Find customers inactive for 7+ days"
    store_as: inactive_customers

  - type: condition
    if: "inactive_customers.length > 0"
    then:
      - type: delegate
        agent: craig
        task: "Create re-engagement campaign for {{inactive_customers}}"

      - type: create_thread
        type: campaign
        title: "Re-engagement Campaign - {{date}}"
        auto_approve: false
```

---

## 🎪 Chaos Engineering Tests

### Chaos Test 1: Rapid Option Switching
**Prompt sequence (send rapidly):**
1. "Let's connect integrations"
2. "Option B"
3. "Actually, Option A instead"
4. "No wait, Option C"

**Expected:** System should handle last selection gracefully

---

### Chaos Test 2: Malformed Options
**Prompts:**
- "option z" (invalid letter)
- "99" (invalid number)
- "Option ABC" (invalid format)

**Expected:** System should not crash, should ask for clarification

---

### Chaos Test 3: Nested Options
**Prompt 1:** "Let's set up integrations"
**Response:** Shows Options A/B/C
**Prompt 2:** "Tell me about each option in detail"
**Response:** Detailed explanation
**Prompt 3:** "Option A"

**Expected:** Should still detect Option A from original menu

---

## 📊 Success Metrics

**Track these during stress tests:**

1. **Option Detection Rate**
   - Target: 95%+ accuracy
   - Measure: Correct option → action mapping

2. **Delegation Success Rate**
   - Target: 100% (should never fail to delegate)
   - Measure: Tool call completion

3. **Integration Card Render Rate**
   - Target: 100%
   - Measure: Cards appear inline correctly

4. **Response Time**
   - Target: <5s for simple queries, <15s for multi-agent
   - Measure: Time from prompt to first response

5. **Data Accuracy**
   - Target: 100% (never fabricate)
   - Measure: All metrics verifiable in Firestore

6. **Agent Routing Accuracy**
   - Target: 90%+ (correct agent for task)
   - Measure: User satisfaction / manual review

---

## 🚀 Running the Stress Tests

### Quick Test (5 min)
```bash
# Test core functionality
1. "Good morning, run system health check"
2. "Let's connect integrations"
3. "Option A"
4. "New Chat" (click button)
5. "Check our MRR this month"
```

### Standard Test (30 min)
Run Sequences A, B, or C (15-10-8 prompts each)

### Full Stress Test (2 hours)
Run all 21 individual tests + all 3 sequences + chaos tests

### Load Test (Continuous)
Set up playbooks to run automatically on schedule, monitor for 1 week

---

**Created:** 2026-02-15
**For:** Super User stress testing and playbook development
**Status:** Ready for execution
