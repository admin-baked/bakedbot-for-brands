# BakedBot AI — Canonical GTM v2.2

> **Canonical GTM reference.** Read by humans and agents. All outreach, positioning, pricing, and growth decisions should align with this document. Update when strategy shifts — don't let it drift.

**Last updated:** 2026-04-16
**Stage:** Seed → $1M ARR
**Current proof point:** Thrive Syracuse (live, Alleaves POS integrated, daily automation running)

---

## 1. Objective

BakedBot is driving toward **$1M ARR**, but the immediate goal is not scale for its own sake. The immediate goal is to create a repeatable, founder-led GTM system that:

1. gets the company above the minimum revenue floor,
2. proves the core offer with live operators,
3. converts pilot proof into a repeatable sales motion, and
4. builds the missing GTM infrastructure while revenue is being generated.

---

## 2. Revenue Ladder

### Revenue thresholds

| Threshold | Meaning |
|-----------|---------|
| **$3.5K MRR** | Minimum stabilization floor |
| **$4K MRR** | First clean operating target |
| **$5K MRR** | Build threshold |
| **$10K MRR** | Proof that GTM is working |

### Preferred deal ladder

1. **1 Operator Core + 2 Access Complete = $4,000 MRR**
2. **Add 1 more Operator Core = $6,500 MRR**
3. **Add 1 Operator Growth = $10,000 MRR**

This creates one real Operator anchor, proof beyond wedge accounts, manageable service load, better case study material, and a cleaner path to the next close.

### Current pricing stack

| Plan | Price |
|------|-------|
| **Access Intel** | $149/mo |
| **Access Retention** | $499/mo + $500 setup |
| **Access Complete** ⭐ | $750/mo + $500 setup |
| **Operator Core** | $2,500/mo + $1,500 setup |
| **Operator Growth** | $3,500/mo + $3,000 setup |
| **Enterprise** | Custom |

---

## 3. Commercial Thesis

**Access builds trust. Operator builds the company.**

Access offers help the market say yes. Operator offers create the revenue base that makes the business durable.

BakedBot does not win by selling generic cannabis software. BakedBot wins by helping dispensaries turn first-time visitors into repeat customers through managed execution around:

- check-in,
- welcome,
- retention,
- follow-up,
- and operator accountability.

The strongest use cases are not abstract AI automation — they are execution layers tied to real store behavior:

- the **Check-In Flow**,
- the **Welcome Playbook**,
- follow-up after the first visit,
- staff adoption,
- and management drag removal.

---

## 4. Positioning

### Primary positioning statement

**BakedBot helps cannabis dispensaries turn first-time visitors into repeat customers through managed check-in, welcome, and retention automation.**

### Supporting positioning truths

- Managed, not just software
- Cannabis-native and compliance-aware
- Built to work with existing store systems and workflows
- Focused on revenue, retention, and operational follow-through
- Founder-led, proof-led, operator-facing

### Anti-positioning — do NOT lead with

- generic AI language
- broad "all-in-one dispensary OS" language without proof
- feature sprawl
- consumer-facing cannabis content as the core brand message

---

## 5. ICP

### Primary ICP

Dispensary operators in legal adult-use markets who need execution help more than dashboards.

**Best-fit accounts now:**
- independent dispensaries,
- 1–5 location groups,
- under-resourced operator teams,
- founder-led or owner-led businesses,
- stores where retention and process consistency matter more than enterprise software complexity.

**They feel:**
- Behind on data — competitors are pricing dynamically, they're guessing
- Overwhelmed — owner is doing marketing, ops, compliance, and budtending
- Skeptical — they've bought software that promised results and delivered a dashboard nobody opened

**They care about:** revenue they can attribute, compliance they don't have to think about, managed execution (not another tool to manage).

### Secondary ICP: CAURD Operators (NY-specific)
First movers in NY, often under-resourced, OCM grant-eligible ($30K available). Higher urgency, lower price sensitivity on compliance tools.

### Tertiary: Multi-Location Chains (Operator Growth tier)
3-10 stores. They need a COO-in-a-box. Longer sales cycle, higher ACV.

### Priority geography now

**New York** is the immediate operating market. Outbound, proof, ecosystem relationships, and partnerships concentrate here first.

---

## 6. Offer Architecture

### Public GTM ladder (keep simple)

#### 1. Free Competitive Report
- Trust builder, first conversation starter, outbound CTA, partnership CTA, content CTA.

#### 2. Access Complete Pilot ($750/mo + $500 setup)
- Proof-first entry offer, easier close for smaller operators, wedge into live workflow deployment, bridge into Operator Core.
- Thrive Syracuse is on this tier. Most complete entry point: tablet setup + managed onboarding + full welcome playbook.

#### 3. Operator Core ($2,500/mo + $1,500 setup)
- Main recurring offer, company-building retainer, proof-backed managed operating layer.

### Internal pricing (not front-door)
Access Intel, Access Retention, Operator Growth, and Enterprise exist as internal options or second-step expansions. Don't lead with them.

### Founding Partner Offer (NY Launch Promo)
- 50% off for the first 60 days
- 30% off for 6 months
- Locked-in pricing before list price increases
- Direct access to Martez + Jack during onboarding
- **Scarcity:** 10 founding partner slots. First-come, not first-asked.

---

## 7. Channel Model

BakedBot operates through **three primary GTM engines**.

### Channel 1 — Founder-Led Outbound

The fastest near-term path to revenue. Role: pipeline generation, founder trust transfer, early proof conversations, fast feedback loops, landing the first Operator accounts.

**Immediate execution rule: Week 1 starts live NY outreach immediately.**

- Send to verified NY emails immediately from **martez@bakedbot.ai**
- Run contact-us / contact-form outreach in parallel
- Prioritize current verified NY lead pool first
- Route responses into rapid Jack follow-up

**Inbox rule:** All initial outreach comes from `martez@bakedbot.ai` — verified NY email, follow-ups, warm partner/referral follow-up, reply handling.

**Outreach-domain rule:** By Week 3, a separate outreach domain is ready as infrastructure (deliverability isolation, future scale). But `martez@bakedbot.ai` remains the active sending inbox unless scale or inbox health requires shifting volume.

**Automated daily execution:**
- 9AM EST: `ny-outreach-runner` sends up to 25 emails/day
- 10AM EST: `ny-lead-followup` sends T2/T3 touches
- 11AM EST: `ny-form-outreach` submits 10 contact forms for no-email leads
- 3x/day: `ny-outreach-reply-check` polls inbox, creates Jack task on reply

**3-touch sequence:**
- **T1 (Day 0):** One of 6 rotating angles (competitive report, founding partner, direct personal, social proof, behind-glass demo, POS integration)
- **T2 (Day 4):** Light check-in — "just checking in, here's what Thrive saw this week"
- **T3 (Day 9):** Urgency/last touch — founding partner scarcity + 30-day guarantee

**Lead pool:** 604 NY dispensary leads total. 198 with verified emails ready to send. 406 need Apollo enrichment.

### Channel 2 — Content / SEO

Not a side project — a primary GTM engine. Job: capture and convert operator demand.

**Content priorities:**
- Dispensary operators (primary), brands (strategic)
- Retention / operations / CRM / POS / marketing / check-in / AI workflow terms
- Proof-led topics, NY-specific relevance, partner distribution usefulness

**Do not optimize for:** broad consumer cannabis content, high-volume low-intent consumer topics, strain content as the main revenue engine.

**Required immediate build:**
- UTM tracking across landing pages
- Live publishing workflow for Day Day
- Proof-led editorial calendar
- Internal linking to one primary conversion CTA
- Page-level attribution
- Case study and proof pages
- Founder and operator landing pages
- Partner-supporting pages and assets

**Active landing pages (NY-specific):**
- `/ny/competitive-report` — free competitive analysis
- `/ny/founding-partner` — early access offer
- `/ny/caurd-grant` — $30K OCM grant guide
- `/ny/roi-calculator` — 4-8x ROI calculator
- `/ny/price-war` — NY cannabis price war report

### Channel 3 — Partnerships

Primary trust-transfer engine. Partnerships shorten trust cycles that pure cold outbound cannot solve alone.

**Priority partnership lanes:**
- **MCBA** — board-member credibility as active GTM asset (use in outreach, partner pages, warm intros, operator conversations)
- NY cannabis ecosystem and operator relationships
- CAURD-related ecosystem relationships
- Media / newsletters / community groups
- POS and adjacent ecosystem (Alleaves, Dutchie, Treez — integration story is built)

**Immediate partnership assets required:**
- MCBA landing page
- Partner one-pager
- Co-branded resource kit
- Referral source tracking
- Warm-intro follow-up sequence
- Partner-specific CTA flow into founder calls and pilots

---

## 8. Funnel Design

```
Outbound / referral / content / partner distribution
→ Free Competitive Report or relevant landing page
→ Founder call
→ Access Complete pilot or Founding Partner close
→ 30-day proof review
→ Operator Core conversion
→ Expansion
```

**Funnel rule:** Maximize movement into live proof, retained accounts, and Operator Core conversion — not vanity demos.

**Key conversion points:**
1. Free report → demo booked (Jack follows up within 2 hours)
2. Demo → founding partner close (scarcity + guarantee removes objection)
3. 30 days → proof review (mandatory — if we can't show ROI in 30 days, we don't deserve the renewal)

---

## 9. Proof System

Thrive Syracuse is the most important live proof asset. Treat it as a reusable sales system, not a one-off story.

### Proof block (Pops maintains weekly)
- Check-ins captured
- Welcome-flow activation
- Repeat behavior
- Attributed revenue where possible
- Staff time saved
- Operational consistency
- Compliance-safe deployment context

### Case study structure
Every proof asset must answer:
1. What was broken before?
2. What did BakedBot deploy?
3. What changed in 30 days?
4. What revenue / retention / behavior shifted?
5. Why should the operator keep paying?

### Proof distribution
Repackage into: sales collateral, landing pages, outbound follow-up, partnership pages, content pieces, founder narrative.

---

## 10. KPI System

### Revenue scoreboard (weekly)
- Current MRR
- Distance to $3.5K floor
- Distance to $4K operating target
- Distance to $5K build threshold
- Distance to $10K proof threshold

### Funnel metrics
- Verified contact coverage
- Email deliverability / inbox health
- Reply rate (target: ≥4%)
- Positive reply rate
- Founder-call booked rate (target: 1+ demo/week minimum)
- Show rate
- Pilot close rate
- Time to go live
- Proof review completion
- Pilot → Operator conversion rate

### Channel metrics
- Founder-email outreach contribution
- Outreach-domain contribution
- Contact-form outreach contribution
- Content-sourced leads
- Partnership-sourced intros
- Source-to-close conversion
- Source-to-pilot conversion

**KPI rule:** Measure progress by revenue-stage movement, not just activity.

---

## 11. Team & Agent Responsibilities

| Role | Owns |
|------|------|
| **Marty** | Weekly revenue scoreboard, GTM decisions, resource allocation, weekly executive memo, threshold management |
| **Jack** | Reply speed, founder-call flow, proposal handling, close process, pilot → Operator conversion |
| **Glenda** | Positioning discipline, narrative consistency, campaign hierarchy, proof packaging, partner messaging |
| **Craig** | Campaign execution, workflow launch readiness, live deployment coordination |
| **Day Day** | Operator-acquisition content, NY SEO pages, landing pages, publishing cadence, organic demand capture |
| **Pops** | Proof metrics, attribution support, case-study numbers, performance summaries |
| **Ezal** | Competitive triggers, market intel for sales and content, operator-specific research hooks |
| **Deebo** | Compliance guardrails, campaign review, risk screening |

---

## 12. 30-Day Execution Plan

### Week 1 — Live Pipeline Week

**Rule:** Week 1 is not a prep week. It is a live pipeline week.

**Actions:**
- Launch NY verified-email outreach immediately from **martez@bakedbot.ai**
- Launch NY contact-us / contact-form outreach immediately for leads without verified email
- Keep all initial outreach and follow-up on **martez@bakedbot.ai**
- Prioritize current verified NY lead pool first
- Route replies into rapid Jack follow-up
- Monitor inbox health, deliverability, and early response quality
- Build in parallel: UTM tracking, Thrive proof block, MCBA landing page, partner one-pager, content publishing workflow

**Outcome goal:** Create immediate conversations while foundational GTM assets are tightened in parallel.

### Week 2 — Tighten and Expand

**Actions:**
- Continue founder-led NY outreach from **martez@bakedbot.ai**
- Continue contact-form outreach
- Expand verified lead coverage
- Improve subject lines, opening angles, and follow-up copy using real reply data
- Publish proof-led and operator-intent content
- Begin dedicated outreach-domain setup in the background (domain selection, mailbox architecture, sending setup, deliverability, migration plan)

**Outcome goal:** Improve response quality while preparing outbound infrastructure for scale.

### Week 3 — Outreach Infrastructure Ready

**Actions:**
- Separate outreach domain fully ready
- Keep **martez@bakedbot.ai** as the active sending inbox unless scale or inbox health requires shifting volume
- Continue founder-led outreach from **martez@bakedbot.ai**
- Continue contact-form outreach
- Continue partner / MCBA distribution
- Evaluate inbox health, response quality, and timing for any later sending split

**Outcome goal:** Preserve founder trust, keep momentum on main inbox, make sure scale infrastructure is ready before it's needed.

### Week 4 — Cut, Focus, Push

**Actions:**
- Review source contribution across: founder email, contact-form, content/SEO, partnerships, outreach-domain readiness
- Cut weak angles
- Keep the best founder-led sequence
- Decide whether the outreach domain stays in reserve or begins handling segmented cold volume
- Push toward the next revenue threshold
- Identify the fastest path to the next Operator close

**Outcome goal:** Concentrate effort on the channel mix that moves revenue, not just attention.

---

## 13. Immediate Build Priorities

### Outbound / sales infrastructure
- Verified NY lead segmentation
- Founder-email sequence refinement
- Contact-form outreach workflow
- Separate outreach domain setup
- Inbox routing and reply workflow
- Source tracking by outreach path

### Content / SEO infrastructure
- Day Day publishing workflow
- Page-level UTM structure
- Proof-led content cluster
- Landing-page CTA standardization
- Internal linking and attribution

### Partnership infrastructure
- MCBA page
- Partner one-pager
- Co-branded resource kit
- Source tracking
- Partner intro follow-up path

### Proof infrastructure
- Thrive proof block
- Case study format
- Reusable sales proof assets
- Quantified operator story

---

## 14. Operating Principles

1. **Do not add random channels.**
2. **Do not add random offers.**
3. **Do not add random markets.**
4. **Run outbound, content, and partnerships together — but measure them against revenue movement.**
5. **Use founder trust now, then create infrastructure for scale by Week 3.**
6. **Proof is not optional. Proof is the sales system.**
7. **The GTM is not complete when it is written. It is complete when it repeatedly produces Operator revenue.**

---

## 15. Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have a loyalty app" | "We don't replace it — we make it actually work. Most loyalty apps have <15% active use. We fix that." |
| "Cannabis AI sounds risky for compliance" | "Compliance is baked in. Deebo reviews every campaign before send. We're OCM-aligned." |
| "I don't have time to manage another tool" | "You don't manage it. We manage it. You get a weekly report." |
| "What's the ROI?" | "Thrive sees 4-8x on the retention loop alone. We can run your numbers in 10 minutes." |
| "We're not sure yet" | "30-day money-back guarantee. If you don't see clear lift in 30 days, full refund. Zero risk." |
| "Too expensive" | "What's your monthly revenue? We typically recover our fee in the first 2 weeks of the welcome flow." |

---

## 16. Competitor Landscape

| Competitor | Category | Weakness |
|------------|----------|----------|
| Springbig | Loyalty/SMS | Tool, not managed. Operators don't use 80% of features. |
| Alpine IQ | CRM | Enterprise-focused, expensive, no AI |
| Headset | Data/Analytics | Reporting only, no execution layer |
| Dutchie | POS/ecomm | Infrastructure, not retention |
| In-house agency | Service | Slow, expensive, not cannabis-native AI |

**Our wedge:** None of them offer managed AI execution at SMB price points. We do.

---

## 17. $1M ARR Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| First Operator account (NY) | $2,500/mo | 🔴 Not yet |
| 3 Operator accounts | $7,500/mo | 🔴 Not yet |
| Thrive proof documented | Case study | 🟡 In progress |
| 10 Operator accounts | $25K/mo | 🔴 Q3 2026 |
| NY market saturated (20+ accounts) | $50K/mo | 🔴 Q4 2026 |
| IL + CA expansion | +$30K/mo | 🔴 Q1 2027 |
| **$1M ARR** | $83K/mo | 🔴 Target: Q2 2027 |

**Trigger for expansion:** 5+ paying Operator accounts in NY with documented ROI.

**Geographic sequence:** NY (now) → IL (Q3 2026) → CA (Q3 2026) → FL (Q4 2026) → CO/MI (2027)

---

## 18. What Agents Should Know

When making any recommendation or taking any action:

1. **Access before Operator.** Never pitch the $2,500 plan cold. Lead with the free competitive report. Trust first, revenue second.
2. **Martez is the face.** All cold outreach comes from `martez@bakedbot.ai`. All replies go to Jack for follow-up.
3. **Thrive is the only proof we have.** Reference it specifically — metrics, not vibes. "Thrive Syracuse saw X" beats "our clients see X."
4. **Scarcity is real.** The founding partner offer has 10 slots. Don't promise it to everyone. If it's full, move to standard pricing.
5. **Compliance is non-negotiable.** Deebo reviews every campaign. No exceptions. A compliance violation kills an operator's license.
6. **Reply = high priority.** Any dispensary reply triggers a Jack task with 2-hour SLA. This is the most important moment in the funnel.
7. **Weekly KPI targets:** ≥4% reply rate on cold outreach. 1+ demo booked per week minimum. If under target, escalate to Marty.
8. **Revenue-stage thinking.** Every agent action should be evaluated against: does this move us toward $3.5K → $4K → $5K → $10K MRR?

---

## 19. Weekly GTM Rhythm

| Day | Activity |
|-----|----------|
| **Monday** | Marty reviews outreach KPIs: reply rate, demos booked, pipeline velocity |
| **Tuesday** | Jack follows up on all week-old demos. Craig prepares campaign queue. |
| **Wednesday** | Glenda reviews content performance. Day Day flags new keywords. |
| **Thursday** | Pops delivers operator KPI reports. Proof reviews for active accounts. |
| **Friday** | Marty weekly memo: wins, losses, what changed, next week's priorities |
| **Daily** | Outreach crons fire 9-11AM EST. Reply check 3x/day. Ezal competitive scan. |
