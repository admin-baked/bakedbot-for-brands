#!/usr/bin/env node
/**
 * Seed GTM v2.2 Agent Tasks — Revenue Sprint
 *
 * Creates all GTM v2.2 tasks in Firestore `agent_tasks` collection.
 * Leo owns the board. Each agent gets their 14-day sprint assignments.
 *
 * Usage: node scripts/seed-gtm-agent-tasks.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Firebase Admin Init ---
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
}

const serviceAccountKey = envVars.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const now = new Date().toISOString();

// --- Task Definitions ---
// GTM v2.2 — 14-day revenue sprint. Leo owns the board.

const tasks = [

  // =========================================================
  // LEO — COO / Revenue operations captain
  // =========================================================
  {
    title: '[Leo] Activate Revenue Task Board',
    body: `**GTM v2.2 — Sprint Week 1**

Leo owns the live revenue task board. Assign owners and due dates for every GTM build item across outbound, content, partnerships, and proof.

**Deliverables:**
- Assign every GTM build item to an owner with a due date
- Daily open-loop review — confirm tasks are moving
- Wednesday blocker report to Marty
- Friday completion report

**KPIs to track:**
- Overdue tasks count
- Blocker count
- Time-to-owner-assignment
- Time-to-launch for revenue-critical initiatives

**Command rule:** Every task must answer — does it help close the next deal, launch the next account, prove value faster, or create repeatable demand?`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'leo',
    triggeredBy: 'user',
  },

  {
    title: '[Leo] Daily Blocker Escalation — GTM Sprint',
    body: `**GTM v2.2 — Ongoing**

Every day Leo reviews open GTM tasks for blockers. Same-day escalation required — no blocker sits overnight without a resolution path.

**Daily checklist:**
- Scan all open/in-progress tasks across Jack, Glenda, Day Day, Craig, Pops, Ezal
- Flag anything stalled > 24 hours
- Escalate to Marty with recommended unblock path
- Update task status + stoplight accordingly`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'leo',
    triggeredBy: 'user',
  },

  // =========================================================
  // MARTY — CEO / Revenue commander
  // =========================================================
  {
    title: '[Marty] Monday Revenue Command Memo',
    body: `**GTM v2.2 — Weekly, every Monday**

Weekly CEO memo covering:
- Current MRR
- Distance to $3.5K (floor) / $4K (operating target) / $5K (build) / $10K (proof)
- Number of live qualified opportunities
- Number of deals at proposal stage
- Number of accounts at proof-review stage
- Top 3 company priorities for the week
- Channel allocation decision: outbound vs content vs partnerships

**Deal ladder to track:**
1. 1 Operator Core + 2 Access Complete = $4K MRR
2. Add 1 Operator Core = $6.5K MRR
3. Add 1 Operator Growth = $10K MRR

Post to #revenue-command in Slack.`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'marty',
    triggeredBy: 'user',
  },

  {
    title: '[Marty] 48hr Pipeline Review Cadence',
    body: `**GTM v2.2 — Ongoing**

Every 48 hours Marty reviews pipeline and channel contribution. Keep the company focused on the next 4 deals only.

**Review checklist:**
- Outreach reply rate (target: ≥4%)
- Demos booked this week (target: 1+ minimum)
- Pipeline stage movement
- Channel contribution: founder email vs contact-form vs content vs partnerships
- Any deals stalled? What's the unblock?`,
    priority: 'high',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'marty',
    triggeredBy: 'user',
  },

  // =========================================================
  // JACK — CRO / Pipeline and close owner
  // =========================================================
  {
    title: '[Jack] Launch NY Verified-Email Outreach — T1 Sequence',
    body: `**GTM v2.2 — IMMEDIATE, Week 1**

Work the 198 verified NY email leads immediately. All outreach from martez@bakedbot.ai.

**T1 sequence (Day 0):**
- Rotate across 6 angles: competitive report, founding partner, direct personal, social proof, behind-glass demo, POS integration
- Cron fires at 9AM EST, up to 25 emails/day

**Follow-up:**
- T2 (Day 4): light check-in — "here's what Thrive saw this week"
- T3 (Day 9): urgency — founding partner scarcity + 30-day guarantee

**Reply rule:** ANY dispensary reply = Jack task, 2-hour SLA. Push every serious conversation toward founder call or proposal.

**KPIs:**
- Reply rate (target: ≥4%)
- Positive reply rate
- Founder calls booked (target: 1+/week)`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'jack',
    triggeredBy: 'user',
  },

  {
    title: '[Jack] Launch NY Contact-Form Outreach — No-Email Leads',
    body: `**GTM v2.2 — IMMEDIATE, Week 1**

For NY leads without verified email addresses: submit contact-form / contact-us outreach immediately.

**Execution:**
- Cron fires at 11AM EST, 10 contact forms/day
- All outreach and follow-up from martez@bakedbot.ai
- Route any form replies into Jack's rapid follow-up queue

**Continuing throughout all 4 weeks** — contact-form outreach runs in parallel with email regardless of outreach domain status.`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'jack',
    triggeredBy: 'user',
  },

  {
    title: '[Jack] Daily Reply Queue Review — 2hr SLA',
    body: `**GTM v2.2 — Daily**

Monitor inbox 3x/day via \`ny-outreach-reply-check\` cron. Respond to all dispensary replies within 2 hours.

**Daily deliverables:**
- Review reply queue
- Push every serious conversation toward founder call or proposal
- Update deal-stage tracker
- Friday close forecast to Marty

**Conversion goal:** reply → founder call → Access Complete pilot or founding partner close → 30-day proof review → Operator Core.`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'jack',
    triggeredBy: 'user',
  },

  // =========================================================
  // GLENDA — CMO / Demand and narrative owner
  // =========================================================
  {
    title: '[Glenda] Finalize Proof-Led Messaging Hierarchy',
    body: `**GTM v2.2 — Week 1**

Finalize the positioning and messaging stack across all outreach, landing pages, and partner assets.

**Primary positioning statement:**
"BakedBot helps cannabis dispensaries turn first-time visitors into repeat customers through managed check-in, welcome, and retention automation."

**Tasks:**
- Tighten founder-call narrative (2-3 sentences max, outcome-first)
- Audit all landing pages for anti-positioning violations (no generic AI language, no feature sprawl)
- Ensure every asset leads with operator outcomes, not product features
- Produce one outbound messaging refinement per week based on reply data

**Anti-positioning to eliminate:**
- Generic AI language
- "All-in-one dispensary OS" without proof
- Consumer-facing cannabis content as the core message`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'glenda',
    triggeredBy: 'user',
  },

  {
    title: '[Glenda] MCBA Credibility — Active GTM Asset',
    body: `**GTM v2.2 — Week 1**

The MCBA board-member credibility is NOT passive brand lift. Convert it into an active GTM asset immediately.

**Deliverables:**
- MCBA landing page (coordinate with Linus/Day Day for build)
- Partner one-pager with MCBA positioning
- Warm-intro context language for founder outreach emails
- Co-branded resource kit for partner distribution

**Use it in:**
- Founder outreach (T1/T2 angles)
- Partner pages and MCBA landing page
- Warm intro follow-up sequences
- Trust transfer during operator conversations`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'glenda',
    triggeredBy: 'user',
  },

  // =========================================================
  // LINUS — CTO / Revenue-enabling technical owner
  // =========================================================
  {
    title: '[Linus] Revenue-Critical Systems Audit + Blocker Fix',
    body: `**GTM v2.2 — Week 1**

Audit and fix all technical blockers affecting pipeline or customer proof delivery.

**Audit checklist:**
- All 5 NY landing pages render correctly + have working CTAs
- Contact forms submit and route to reply queue
- UTM params pass through correctly (coordinate with Day Day)
- Outreach crons fire on schedule (9AM, 10AM, 11AM, 3x/day reply check)
- Thrive welcome flow + retention campaigns still live and firing
- Proof delivery systems (Pops scorecards) working

**KPIs:**
- Critical revenue blockers open: target 0
- Form uptime: 100%
- Page uptime: 100%
- Workflow reliability: 100%`,
    priority: 'critical',
    category: 'infra',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'linus',
    triggeredBy: 'user',
  },

  {
    title: '[Linus] Outreach Domain Infrastructure — Week 3 Ready',
    body: `**GTM v2.2 — Background, ready by Week 3**

Prepare separate outreach domain infrastructure as background work. martez@bakedbot.ai stays primary for all sending during the initial phase.

**Tasks:**
- Domain selection (separate from bakedbot.ai)
- Mailbox architecture setup
- Email sending configuration
- Deliverability setup (SPF, DKIM, DMARC)
- Migration plan for when/if volume requires shifting

**Rule:** Do NOT switch active sending to the outreach domain without explicit Marty approval. This is infrastructure readiness, not a sending switch.

**Timeline:** Fully ready by end of Week 3.`,
    priority: 'high',
    category: 'infra',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'linus',
    triggeredBy: 'user',
  },

  {
    title: '[Linus] Build MCBA Landing Page',
    body: `**GTM v2.2 — Week 1**

Build the MCBA-specific landing page. Coordinate with Glenda for copy and positioning.

**Page requirements:**
- MCBA board-member credibility prominently featured
- Primary CTA: free competitive report request
- Secondary CTA: book founder call
- Partner-specific trust signals
- UTM tracking on all CTAs
- Mobile responsive

**Route:** /partners/mcba or /mcba

Glenda owns copy. Linus owns build + UTM wiring.`,
    priority: 'critical',
    category: 'feature',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'linus',
    triggeredBy: 'user',
  },

  // =========================================================
  // DAY DAY — SEO / Organic demand owner
  // =========================================================
  {
    title: '[Day Day] Publish 2+ NY Operator-Intent Assets/Week',
    body: `**GTM v2.2 — Weekly cadence**

Publish at least 2 operator-intent pages or posts per week targeting NY dispensary operators.

**Content priorities:**
- Retention / operations / CRM / POS / marketing / check-in / AI workflow terms
- NY-specific relevance
- Proof-led topics (Thrive data, operator outcomes)
- MCBA / partner distribution usefulness

**Every page must have:**
- One primary CTA: free competitive report or founder call booking
- Internal links to core landing pages
- UTM-tracked links
- No generic cannabis consumer content

**Do NOT optimize for:** strain content, high-volume consumer topics, broad cannabis traffic`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'dayday',
    triggeredBy: 'user',
  },

  {
    title: '[Day Day] UTM Tracking Across All Landing Pages',
    body: `**GTM v2.2 — Week 1, IMMEDIATE**

Implement UTM tracking across all 5 NY landing pages and any new pages launched.

**Pages to tag:**
- /ny/competitive-report
- /ny/founding-partner
- /ny/caurd-grant
- /ny/roi-calculator
- /ny/price-war
- Any new pages from this sprint

**UTM structure:**
- utm_source: email | contact-form | mcba | organic | partner
- utm_medium: outbound | seo | referral
- utm_campaign: gtm-v2-week1 (increment per week)
- utm_content: [angle or page variant]

Coordinate with Linus for page-level attribution and Pops for source reporting.`,
    priority: 'critical',
    category: 'infra',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'dayday',
    triggeredBy: 'user',
  },

  {
    title: '[Day Day] Live Publishing Workflow — Proof-Led Editorial',
    body: `**GTM v2.2 — Week 1**

Activate the live Day Day publishing workflow. Content must auto-publish, not sit in draft.

**Fix:**
- Content engine currently sets status: 'draft' — needs publishing cron or approval workflow
- Stand up proof-led editorial calendar
- Prioritize operator-acquisition content that supports outreach and partnerships

**Weekly deliverables:**
- 2+ operator-intent pages published
- 1 proof-led post (Thrive data, operator outcomes)
- Track page-level rankings and conversion`,
    priority: 'high',
    category: 'infra',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'dayday',
    triggeredBy: 'user',
  },

  // =========================================================
  // CRAIG — Campaign activation owner
  // =========================================================
  {
    title: '[Craig] Access Complete Pilot — Launch-Ready',
    body: `**GTM v2.2 — Week 1**

Access Complete must be deployable the moment a deal closes. Zero delay from close to first live workflow.

**Launch checklist:**
- Tablet check-in hardware setup process documented
- Welcome playbook template ready-to-activate
- Check-in flow configured and testable
- Retention campaigns queue ready
- Onboarding checklist for new pilot accounts
- Time from close to first live workflow: target < 48 hours

**Reference:** Thrive Syracuse is the model — use their setup as the playbook.`,
    priority: 'critical',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'craig',
    triggeredBy: 'user',
  },

  {
    title: '[Craig] Welcome/Check-In/Retention Assets Deployable',
    body: `**GTM v2.2 — Ongoing**

Maintain ready-to-launch campaign templates for all live accounts and new pilots.

**Assets to keep live:**
- Welcome playbook (SMS + email variants)
- Check-in flow confirmation message
- Retention sequence (Days 7, 14, 30)
- Re-engagement campaign template
- VIP/loyalty trigger template (Mrs. Parker coordinates)

**Support:** Active accounts (Thrive Syracuse) first. New pilots second.

**KPIs:**
- Days from close to launch
- Live workflows per account
- Campaign delivery rate`,
    priority: 'high',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'craig',
    triggeredBy: 'user',
  },

  // =========================================================
  // POPS — Proof and analytics owner
  // =========================================================
  {
    title: '[Pops] Weekly Thrive Proof Block',
    body: `**GTM v2.2 — Weekly, every Thursday**

Publish the weekly Thrive Syracuse proof block. This is the core sales asset — treat it as such.

**Proof block must cover:**
- Check-ins captured (total + week-over-week)
- Welcome-flow activation rate
- Repeat visit rate / repeat behavior
- Attributed revenue where trackable
- Staff time saved estimate
- Operational consistency notes
- Compliance-safe deployment context

**Distribution:** Jack (for close conversations), Glenda (for messaging), Marty (for CEO memo), content (for Day Day).

**Case study format:**
1. What was broken before
2. What BakedBot deployed
3. What changed in 30 days
4. What revenue/retention/behavior shifted
5. Why the operator keeps paying`,
    priority: 'critical',
    category: 'data',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'pops',
    triggeredBy: 'user',
  },

  {
    title: '[Pops] Weekly Revenue Scoreboard',
    body: `**GTM v2.2 — Weekly, every Monday**

Publish the weekly revenue scoreboard before Marty's Monday command memo.

**Scoreboard must include:**
- Current MRR (exact)
- Distance to $3.5K floor
- Distance to $4K operating target
- Distance to $5K build threshold
- Distance to $10K proof threshold

**Channel contribution report:**
- Founder-email outreach: leads generated
- Contact-form outreach: leads generated
- Content/SEO: leads sourced
- Partnerships: intros sourced
- Source-to-pilot conversion by channel

**Funnel metrics:**
- Reply rate vs 4% target
- Demos booked vs 1/week floor
- Pilot close rate
- Pilot → Operator conversion rate`,
    priority: 'critical',
    category: 'data',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'pops',
    triggeredBy: 'user',
  },

  // =========================================================
  // EZAL — Competitive trigger owner
  // =========================================================
  {
    title: '[Ezal] NY Outreach Personalization Hooks — Weekly',
    body: `**GTM v2.2 — Weekly**

Surface 3-5 store-specific and market-specific personalization hooks for Jack's NY outreach each week.

**Weekly deliverables:**
- 3-5 usable outbound trigger ideas (store-specific pricing moves, promo changes, competitor gaps)
- 2 content hooks for Day Day and Glenda
- Account-specific intel for any high-value prospects Jack is actively working

**Format:** Brief Slack post to #outreach-intel with hook + suggested usage in T1/T2 email copy.

**Sources:** Competitor menu tracking, pricing band monitoring, promo alerts across NY market.`,
    priority: 'high',
    category: 'agent_quality',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'ezal',
    triggeredBy: 'user',
  },

  {
    title: '[Ezal] Weekly Competitive Memo — NY Market',
    body: `**GTM v2.2 — Weekly, every Friday**

One weekly competitive memo covering the NY cannabis market for the Friday Truth memo.

**Memo must cover:**
- Price moves across key competitors (Springbig, Alpine IQ operators)
- Promo strategies active this week
- Assortment gaps vs BakedBot's positioning
- Any market-level signals that affect our outreach angles or positioning

Route to Marty, Glenda, Jack.`,
    priority: 'normal',
    category: 'agent_quality',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'ezal',
    triggeredBy: 'user',
  },

  // =========================================================
  // MRS. PARKER — Retention and expansion owner
  // =========================================================
  {
    title: '[Mrs. Parker] Package Retention Logic as Sellable Proof Story',
    body: `**GTM v2.2 — Week 1**

Convert Thrive's retention data into a sellable proof narrative for Jack's close conversations and Glenda's messaging.

**Deliverables:**
- Repeat-visit lift (% change from baseline)
- Active list growth numbers
- Re-engagement campaign performance
- Estimated revenue attribution from retention layer

**Format:** 3-5 bullet proof block that Jack can drop into proposals and Glenda can use in landing page copy.

**Expansion flags:** Identify any signals from Thrive that suggest they're ready for Operator Core upgrade.`,
    priority: 'high',
    category: 'agent_quality',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'mrs_parker',
    triggeredBy: 'user',
  },

  // =========================================================
  // DEEBO — Compliance gatekeeper
  // =========================================================
  {
    title: '[Deebo] Fast Compliance Review Path — No Revenue Send Blocked',
    body: `**GTM v2.2 — Ongoing**

Maintain a fast compliance review path. No revenue-critical send should wait unnecessarily for compliance review.

**Operating rule:**
- Turnaround on outbound / campaign review: < 24 hours
- For urgent sends (reply follow-ups, pilot launches): same-day review
- If a send is borderline: flag with recommended fix, not a hard block

**Weekly deliverables:**
- Review all campaign and proof assets touching regulated claims
- Maintain approved language library for Jack and Craig
- Report blocked sends + risk prevented to Marty on Fridays

**KPIs:**
- Avg review turnaround
- Blocked risky sends
- Compliance incidents prevented`,
    priority: 'normal',
    category: 'compliance',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'deebo',
    triggeredBy: 'user',
  },

  // =========================================================
  // MIKE — CFO / Offer quality and economics
  // =========================================================
  {
    title: '[Mike] Deal Floor Enforcement + Offer Sanity Check',
    body: `**GTM v2.2 — Weekly**

Protect the company from low-quality deals and pricing drift.

**Non-negotiable deal floors:**
- Access Complete: $750/mo + $500 setup (no exceptions without approval)
- Operator Core: $2,500/mo + $1,500 setup (no exceptions without approval)
- Founding partner discount: max 50% for first 60 days, then 30% for 6 months — 10 slots total

**Weekly deliverables:**
- Offer sanity check (any discount requests from Jack)
- Revenue-mix review: Operator vs Access share of MRR
- Package recommendation by lead type
- Approve or reject any pricing exceptions

**KPIs:**
- Avg deal quality (MRR per account)
- Avg setup revenue collected
- Gross margin by offer type
- Operator MRR % of total`,
    priority: 'normal',
    category: 'other',
    reportedBy: 'gtm-v2.2',
    assignedTo: 'mike',
    triggeredBy: 'user',
  },

];

// --- Seed ---
async function seedGtmTasks() {
  console.log(`\n🚀 Seeding ${tasks.length} GTM v2.2 agent tasks...\n`);

  let created = 0;
  let failed = 0;

  for (const task of tasks) {
    try {
      const doc = {
        title: task.title,
        body: task.body,
        status: 'open',
        stoplight: 'gray',
        priority: task.priority,
        category: task.category,
        reportedBy: task.reportedBy,
        assignedTo: task.assignedTo,
        triggeredBy: task.triggeredBy,
        steps: [],
        createdAt: now,
        updatedAt: now,
      };

      const ref = await db.collection('agent_tasks').add(doc);
      console.log(`  ✅ ${ref.id} — ${task.title}`);
      created++;
    } catch (err) {
      console.error(`  ❌ FAILED — ${task.title}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📋 Done. ${created} created, ${failed} failed.\n`);

  if (created > 0) {
    console.log('View board: https://bakedbot.ai/dashboard/admin/agent-board\n');
  }
}

seedGtmTasks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
