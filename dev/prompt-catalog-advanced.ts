/**
 * Failure Recovery, Time-Sensitive, and Complex Scenario Prompts
 * 
 * Covers:
 * - Failure recovery and graceful degradation
 * - Time-sensitive urgency handling
 * - Follow-up and clarification flows
 * - Complex multi-step scenarios
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// FAILURE RECOVERY PROMPTS
// =============================================================================

export const FAILURE_RECOVERY_PROMPTS: PromptScenario[] = [
    // --- API Timeout ---
    {
        id: 'fail-001',
        role: 'dispensary',
        category: 'failure_recovery',
        prompt: 'Show me my Dutchie orders',
        context: 'Dutchie API is timing out',
        expectedBehavior: 'Graceful degradation with alternatives',
        idealResponsePattern: `⚠️ **Connection Issue**

I'm having trouble reaching your Dutchie account right now. The connection timed out.

**What's happening:**
• Dutchie API is slow to respond
• This could be temporary maintenance

**What I can do instead:**
• 📊 Show you cached data from yesterday
• 🔄 Retry the connection in a few minutes
• 📧 Email you when the connection is restored

**Cached Summary (Dec 31):**
• Orders: 52 | Revenue: $4,850
• Top seller: Cresco Rise 3.5g

[Use Cached Data] [Retry Now] [Notify When Fixed]

*I'll keep trying in the background.*`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Rate Limit ---
    {
        id: 'fail-002',
        role: 'brand',
        category: 'failure_recovery',
        prompt: 'Research all my competitors',
        context: 'Web search rate limited',
        expectedBehavior: 'Queue request, offer partial results',
        idealResponsePattern: `⏳ **Rate Limit Reached**

I've hit my search limit for this hour. Your request has been queued.

**What I found so far (3 of 12 competitors):**
| Competitor | Status |
|------------|--------|
| Cresco ✅ | Data collected |
| GTI ✅ | Data collected |
| Verano ✅ | Data collected |
| Columbia Care ⏳ | Queued |
| Curaleaf ⏳ | Queued |
| ... | Queued |

**Options:**
1. **Wait**: Full results in ~45 minutes
2. **Partial Now**: View the 3 I've completed
3. **Schedule**: Run tonight during off-peak

[View Partial Results] [Wait for Full] [Schedule for Later]

*I'll notify you when the full report is ready.*`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- No Data ---
    {
        id: 'fail-003',
        role: 'dispensary',
        category: 'failure_recovery',
        prompt: "What's my customer lifetime value?",
        context: 'No CRM or historical data connected',
        expectedBehavior: 'Explain data requirement',
        idealResponsePattern: `📊 **Data Not Available**

I don't have enough data to calculate your Customer Lifetime Value (CLV) yet.

**What I need:**
• ⚠️ At least 90 days of purchase history
• ⚠️ Customer identification (email or phone)
• ⚠️ POS or CRM integration

**Your Current Status:**
• POS: Not connected
• CRM: Not connected
• Historical data: None imported

**To unlock CLV insights:**
1. Connect your POS (Dutchie, Flowhub, etc.)
2. Wait ~30 days for data to accumulate
3. I'll automatically calculate CLV metrics

[Connect POS] [Import Historical Data] [Learn More About CLV]

*Once connected, I can track CLV trends automatically.*`,
        shouldAskClarification: false,
        targetAgent: 'mrs_parker'
    },
];

// =============================================================================
// TIME-SENSITIVE PROMPTS
// =============================================================================

export const TIME_SENSITIVE_PROMPTS: PromptScenario[] = [
    // --- Urgent Response ---
    {
        id: 'time-001',
        role: 'dispensary',
        category: 'urgent',
        prompt: 'A customer just posted a 1-star review, what do I do?',
        expectedBehavior: 'Prioritize urgency, provide immediate action plan',
        idealResponsePattern: `🚨 **Urgent: Negative Review Response**

**Immediate Actions (Do Now):**

1. **Respond Publicly (within 1 hour)**
   > "We're sorry to hear about your experience. We take feedback seriously and would love to make this right. Please reach out to [email] so we can resolve this personally."

2. **Do NOT:**
   ❌ Be defensive
   ❌ Argue publicly
   ❌ Offer compensation in public reply

3. **Investigate Internally:**
   - Check transaction history
   - Review staff notes
   - Identify what went wrong

**Template Response:**
> Thank you for your feedback. We sincerely apologize that your visit didn't meet expectations. Our manager [Name] would like to personally discuss this with you. Please contact us at [phone/email] at your earliest convenience.

[Copy Response] [See Full Playbook] [Log Issue]

*Would you like help drafting a direct message to the customer?*`,
        shouldAskClarification: false,
        targetAgent: 'mrs_parker'
    },
    // --- Time-Sensitive Deal ---
    {
        id: 'time-002',
        role: 'dispensary',
        category: 'urgent',
        prompt: 'Competitor just launched a flash sale, I need to respond now',
        expectedBehavior: 'Fast competitive response workflow',
        idealResponsePattern: `⏰ **Flash Sale Response - Act Fast!**

**Competitor Intel:**
• Sunnyside: 30% off all flower (ends 6pm today)
• Estimated impact: -15% of your afternoon traffic

**Immediate Counter-Actions:**

**Option 1: Match (Recommended)**
• Match 30% off top 5 flower SKUs only
• Preserves margin on other products
• Estimated margin impact: -4%

**Option 2: Bundle Counter**
• "Buy any flower, get 20% off a vape"
• Drives basket size, protects margin

**Option 3: Loyalty Bonus**
• Double points for next 4 hours
• No margin impact, builds retention

---

**Ready to deploy:**

📱 SMS Blast (1,850 customers)
> "🔥 Flash Sale! Get [DEAL] for the next 4 hours only. Show this text at checkout."

[Send Option 1 + SMS] [Send Option 2 + SMS] [Preview All Options]

*Time-sensitive: I can deploy in under 5 minutes.*`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Deadline Reminder ---
    {
        id: 'time-003',
        role: 'brand',
        category: 'deadline',
        prompt: 'When are my license renewals due?',
        expectedBehavior: 'Check deadlines and alert if soon',
        idealResponsePattern: `📅 **License Renewal Schedule**

**Illinois Licenses:**
| License | Expires | Days Left | Status |
|---------|---------|-----------|--------|
| Cultivator #12345 | Mar 15, 2026 | 71 | ✅ OK |
| Processor #67890 | Feb 1, 2026 | 29 | ⚠️ Coming up |
| Transporter #11111 | Jan 15, 2026 | **12** | 🚨 **URGENT** |

**🚨 Immediate Action Required:**
Your Transporter license expires in 12 days!

**Renewal Checklist:**
- [ ] Submit renewal application (due 30 days before)
- [ ] Pay renewal fee ($5,000)
- [ ] Update liability insurance
- [ ] Background check status (valid)

**I can help:**
• Draft renewal application
• Set reminders for future renewals
• Track submission status

[Start Renewal] [Set Reminder] [View All Licenses]`,
        shouldAskClarification: false,
        targetAgent: 'deebo'
    },
];

// =============================================================================
// FOLLOW-UP AND CLARIFICATION FLOWS
// =============================================================================

export const FOLLOWUP_PROMPTS: PromptScenario[] = [
    // --- Follow-up on Previous Action ---
    {
        id: 'follow-001',
        role: 'dispensary',
        category: 'followup',
        prompt: 'Did that email campaign I sent last week work?',
        expectedBehavior: 'Retrieve and analyze campaign results',
        idealResponsePattern: `📧 **Email Campaign Results: "New Year Deals"**

**Sent:** Dec 28, 2025
**Recipients:** 2,340

**Performance Metrics:**
| Metric | Result | Benchmark | Rating |
|--------|--------|-----------|--------|
| Open Rate | 28.5% | 22% | ⭐ Above avg |
| Click Rate | 4.2% | 3.1% | ⭐ Above avg |
| Conversions | 38 | — | 1.6% CVR |
| Revenue | $3,420 | — | $90 AOV |

**Revenue Attribution:**
• Direct from email clicks: $3,420
• Estimated halo effect: +$1,200
• **Total attributed:** ~$4,620

**Comparison to Previous:**
• Your last campaign: 24% open, 3.5% click
• This one performed +15% better

**Top Performers:**
1. "20% Off Flower" CTA - 45% of clicks
2. "New Arrivals" section - 30% of clicks

**Verdict: ✅ Successful campaign!**

Recommendations for next time:
• Keep the "% off" CTAs prominent
• Send on Friday afternoon (your best day)

[See Detailed Report] [Create Similar Campaign]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
    // --- Clarify Previous Output ---
    {
        id: 'follow-002',
        role: 'brand',
        category: 'clarification',
        prompt: 'Can you explain what that market share number means?',
        context: 'User just received a market share report',
        expectedBehavior: 'Provide deeper explanation of previous output',
        idealResponsePattern: `📊 **Market Share Explained**

**Your Number:** 8.2% market share in Illinois

**What this means:**

For every $100 spent on cannabis in Illinois, $8.20 goes to products from your brand.

**How it's calculated:**
\`\`\`
Your wholesale revenue ÷ Total wholesale market revenue × 100
= $45.2M ÷ $551M × 100 = 8.2%
\`\`\`

**Context:**
• Illinois total wholesale market: ~$551M/year
• Your estimated revenue: ~$45.2M/year
• You're the #4 brand in Illinois

**Comparison:**
| Rank | Brand | Share |
|------|-------|-------|
| 1 | Cresco | 22% |
| 2 | GTI | 18% |
| 3 | Verano | 15% |
| **4** | **You** | **8.2%** |
| 5 | Columbia Care | 7% |

**What moves this number:**
↑ More retail distribution
↑ Better shelf placement
↑ Successful product launches
↓ Competitor price wars
↓ Stockouts at retail

Would you like strategies to grow your share?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// COMPLEX MULTI-STEP SCENARIOS
// =============================================================================

export const COMPLEX_PROMPTS: PromptScenario[] = [
    // --- Full Day Planning ---
    {
        id: 'complex-001',
        role: 'super_admin',
        category: 'planning',
        prompt: 'Plan my day focused on revenue growth',
        expectedBehavior: 'Create structured daily plan',
        idealResponsePattern: `📅 **Today's Revenue Focus Plan**

**Morning (9am-12pm)**

9:00 AM - **Revenue Check**
• Review MRR dashboard
• Check for at-risk accounts
• Action: Call top 2 at-risk accounts

10:30 AM - **Sales Pipeline**
• Review pending upgrades
• Push 3 "Growth" plan upsells
• Draft personal follow-up emails

**Afternoon (12pm-5pm)**

12:00 PM - Lunch break

1:00 PM - **New Revenue**
• Review new signup requests (3 pending)
• Prioritize high-value leads
• Schedule demo calls

3:00 PM - **Churn Prevention**
• Analyze accounts inactive 7+ days
• Trigger win-back campaigns
• Assign to success team

4:00 PM - **Metrics Review**
• Update revenue tracking doc
• Prepare EOD summary

**Tasks I've Scheduled:**
✅ Pops will send MRR report at 9am
✅ Mrs. Parker will flag at-risk accounts
✅ Craig will prepare upsell email templates

**KPIs to Hit Today:**
• 2 upgrade conversations
• 3 new leads contacted
• 0 churn

[Add to Calendar] [Modify Plan] [Start First Task]`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },
    // --- End-to-End Campaign ---
    {
        id: 'complex-002',
        role: 'dispensary',
        category: 'campaign',
        prompt: 'Create a complete 420 marketing campaign',
        expectedBehavior: 'Multi-channel campaign with all assets',
        idealResponsePattern: `🎉 **420 Campaign: Complete Package**

**Campaign Name:** "420 Blaze Days"
**Duration:** April 15-20, 2026

---

## 📧 Email Sequence

**Email 1 (Apr 15): Teaser**
Subject: "Something big is coming 4/20..."
[Preview] [Edit]

**Email 2 (Apr 18): Reveal**
Subject: "🔥 420 Deals Revealed - Up to 42% Off"
[Preview] [Edit]

**Email 3 (Apr 20): Day-Of**
Subject: "It's HERE! 420 Deals Now Live"
[Preview] [Edit]

---

## 📱 SMS Sequence

**SMS 1 (Apr 19):** "420 starts TOMORROW! Be first - show this for early access."
**SMS 2 (Apr 20):** "🔥 Happy 420! 42% off store-wide. Today only."

---

## 🖼️ Creative Assets

![420 Email Banner](file:///assets/420-email-banner.png)
![420 Instagram Post](file:///assets/420-ig-post.png)
![420 Story Template](file:///assets/420-story.png)

---

## 📊 Projected Impact

| Metric | Estimate |
|--------|----------|
| Email open rate | 35%+ |
| SMS response | 12%+ |
| Revenue lift | +45% vs normal week |
| New customers | +120 |

---

## ✅ Compliance Check

- [x] No health claims
- [x] Age-gated on all platforms
- [x] Legal in your state
- [x] Disclaimers included

**Total Cost:** $125 (SMS fees only)

[Approve & Schedule All] [Edit Individual Pieces] [Preview Calendar]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_ADVANCED_PROMPTS: PromptScenario[] = [
    ...FAILURE_RECOVERY_PROMPTS,
    ...TIME_SENSITIVE_PROMPTS,
    ...FOLLOWUP_PROMPTS,
    ...COMPLEX_PROMPTS,
];

export const ADVANCED_PROMPT_STATS = {
    total: ALL_ADVANCED_PROMPTS.length,
    byCategory: {
        failureRecovery: FAILURE_RECOVERY_PROMPTS.length,
        timeSensitive: TIME_SENSITIVE_PROMPTS.length,
        followup: FOLLOWUP_PROMPTS.length,
        complex: COMPLEX_PROMPTS.length,
    }
};

console.log('Advanced Prompt Stats:', ADVANCED_PROMPT_STATS);
