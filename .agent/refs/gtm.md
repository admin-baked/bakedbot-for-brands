# BakedBot AI — Go-To-Market Strategy

> **Canonical GTM reference.** Read by humans and agents. All outreach, positioning, pricing, and growth decisions should align with this document. Update when strategy shifts — don't let it drift.

**Last updated:** 2026-04-16  
**Stage:** Seed → $1M ARR  
**Current proof point:** Thrive Syracuse (live, Alleaves POS integrated, daily automation running)

---

## North Star

**$1M ARR.** That requires ~21-24 Operator accounts ($3,500/mo avg), or a blend: 10 Operator Core + 20 Access Complete ($750) + remaining Access Retention ≈ $83K/mo. Access Complete meaningfully contributes to ARR while building proof for Operator upsell.

The path: **NY dispensaries → national expansion.** NY is the proving ground. Every deal won here funds the playbook we replicate in IL, CA, CO, FL.

---

## Who We Sell To

### Primary ICP: The Dispensary Operator
Single-location or small chain (1-5 stores) in a legal adult-use state.

**They feel:**
- Behind on data — competitors are pricing dynamically, they're guessing
- Overwhelmed — owner is doing marketing, ops, compliance, and budtending
- Skeptical — they've bought software that promised results and delivered a dashboard nobody opened

**They care about:**
- Revenue they can attribute (not "impressions")
- Compliance they don't have to think about
- Not adding another tool to manage — they want managed execution

**They don't care about:**
- AI as a concept
- Feature lists
- Integrations they have to configure themselves

### Secondary ICP: CAURD Operators (NY-specific)
Conditional Adult-Use Retail Dispensaries — first movers in NY, often under-resourced, OCM grant-eligible ($30K available). Higher urgency, lower price sensitivity on compliance tools.

### Tertiary: Multi-Location Chains (Operator Growth tier)
3-10 stores. They need a COO-in-a-box, not a tool. Longer sales cycle, higher ACV.

---

## Positioning

**One sentence:** BakedBot is the AI operating layer for cannabis dispensaries — it runs your retention, competitive intel, and weekly reporting automatically so you can focus on the floor.

**What makes us different:**
- **Managed, not SaaS.** We don't sell software you configure. We deliver outcomes.
- **Cannabis-native.** Compliance baked in. 280E-aware. OCM-aligned. No generic AI junk.
- **Proof-first.** We start with a free competitive snapshot before asking for a dollar.
- **Founder credibility.** Martez signs the emails. Jack closes the deals. Operators know they're talking to the people building it.

**What we are NOT:**
- A loyalty app (we build on top of your existing POS)
- A chatbot (Smokey is a tool, not the product)
- An agency (we don't write your Instagram posts)
- Enterprise software (no 6-month onboarding, no IT required)

---

## The Offer Stack

### Access Track — Wedge into proof
| Plan | Price | What it delivers |
|------|-------|-----------------|
| **Free Check-In** | $0 | Tablet/QR capture, basic welcome email, loyalty starter |
| **Access Intel** | $149/mo | Weekly competitor tracking + market intel digest |
| **Access Retention** | $499/mo + $500 setup | Welcome playbook, QR capture, basic segmentation, campaigns |
| **Access Complete** ⭐ Sweet Spot | **$750/mo + $500 setup** | Everything in Retention + **Tablet Check-In hardware setup + fully managed Welcome Playbook** |

**Access Complete is the sweet spot for the Access Track.** It's what Thrive Syracuse is on (invoiced). It's the most complete entry point before Operator pricing — includes the physical tablet setup, managed onboarding, and the full welcome playbook executed by BakedBot. Target: social equity operators and single-location stores who want managed execution without Operator pricing.

Access is the trust-builder. It's not the business. It's the door.

### Operator Track — The actual business
| Plan | Price | What it delivers |
|------|-------|-----------------|
| **Operator Core** | $2,500/mo + $1,500 setup | Full welcome + retention loop, 2-4 managed playbooks, weekly KPI reporting, named CSM |
| **Operator Growth** | $3,500/mo + $3,000 setup | Everything in Core + exec KPI reviews, pricing intelligence, 90-day roadmap, priority support |
| **Enterprise** | Custom | MSOs, white-label, multi-market, API access |

**Commercial thesis:** Access builds trust. Operator builds the company.

### The Founding Partner Offer (NY Launch Promo)
- 50% off for the first 60 days
- 30% off for 6 months
- Locked-in pricing before list price increases
- Direct access to Martez + Jack during onboarding
- **Scarcity:** 10 founding partner slots. First-come, not first-asked.

---

## The Sales Motion

### Channel 1: Direct Outbound (Primary — NY Now)
**Pipeline:** Firestore `ny_dispensary_leads` → auto-enrich → confidence score → auto-send or flag

**Daily execution (automated):**
- 9AM EST: `ny-outreach-runner` sends up to 25 emails/day
- 10AM EST: `ny-lead-followup` sends T2/T3 touches
- 11AM EST: `ny-form-outreach` submits 10 contact forms for no-email leads
- 3x/day: `ny-outreach-reply-check` polls inbox, creates Jack task on reply

**3-touch sequence:**
- **T1 (Day 0):** One of 6 rotating angles (competitive report, founding partner, direct personal, social proof, behind-glass demo, POS integration)
- **T2 (Day 4):** Light check-in — "just checking in, here's what Thrive saw this week"
- **T3 (Day 9):** Urgency/last touch — founding partner scarcity + 30-day guarantee

**Reply → Jack task created automatically. Follow up within 2 hours.**

**Lead pool:** 604 NY dispensary leads total. 198 with verified emails ready to send. 406 need Apollo enrichment.

**Weekly KPI:** ≥4% reply rate, 1+ demo booked per week.

### Channel 2: Inbound — Lead Magnets (NY-Specific)
Five active landing pages targeting NY dispensary operators via Google/organic:
- `/ny/competitive-report` — free competitive analysis
- `/ny/founding-partner` — early access offer
- `/ny/caurd-grant` — $30K OCM grant guide
- `/ny/roi-calculator` — 4-8x ROI calculator
- `/ny/price-war` — NY cannabis price war report

**Status:** Pages live. UTM tracking needed. SEO/paid traffic not yet active.

### Channel 3: Content / SEO (Building)
- Blog at `/blog` — auto-generated, compliance-checked cannabis content
- Day Day agent runs SEO discovery and keyword analysis
- **Gap:** Content engine sets `status: 'draft'` — not auto-publishing. Needs publishing cron or manual approval workflow.

### Channel 4: Referrals + Social Proof
- Thrive Syracuse is the anchor case study
- Every operator we sign becomes a reference for the next market
- Structure: every Operator contract includes a 30-day money-back guarantee as risk removal for the close

### Channel 5: Partnerships (Future)
- POS vendors: Alleaves, Dutchie, Treez — integration story is built, pitch is ready
- OCM / CAURD programs — compliance positioning + grant angle
- Cannabis media / newsletters — sponsored content once proof is documented

---

## The Funnel

```
Awareness    →  Landing page / cold email / social
Interest     →  Free competitive report (zero friction)
Consideration →  Demo / founder call (/book)
Decision     →  Founding Partner offer + 30-day guarantee
Activation   →  30-day onboarding, KPI baseline set
Retention    →  45-60 day proof review, Operator renewal
Expansion    →  Upsell to Growth tier / additional locations
```

**Key conversion points:**
1. **Free report → demo booked** (Jack follows up on all report requests within 2 hours)
2. **Demo → founding partner close** (scarcity + guarantee removes objection)
3. **30 days → proof review** (mandatory — if we can't show ROI in 30 days, we don't deserve the renewal)

---

## Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have a loyalty app" | "We don't replace it — we make it actually work. Most loyalty apps have <15% active use. We fix that." |
| "Cannabis AI sounds risky for compliance" | "Compliance is baked in. Deebo (our compliance agent) reviews every campaign before send. We're OCM-aligned." |
| "I don't have time to manage another tool" | "You don't manage it. We manage it. You get a weekly report." |
| "What's the ROI?" | "Thrive sees 4-8x on the retention loop alone. We can run your numbers in 10 minutes." |
| "We're not sure yet" | "30-day money-back guarantee. If you don't see clear lift in 30 days, full refund. Zero risk." |
| "Too expensive" | "What's your monthly revenue? We typically recover our fee in the first 2 weeks of the welcome flow." |

---

## Proof Points (Current)

- **Thrive Syracuse** — live on **Access Complete ($750/mo, invoiced)**. Daily competitive tracking across 5+ NY markets. Automated welcome + retention campaigns. Alleaves POS integrated. AI budtender active at tablet. Check-In tablet deployed in-store.
- **604 NY leads** in pipeline with enriched data
- **13 email templates** tested and rotating
- **Agent squad of 20+** running daily: briefings, competitive intel, compliance review, outreach automation

**We need:** 3 more Operator accounts to have enough data for a proper case study battery.

---

## Geographic Expansion Sequence

1. **New York** (now) — 604 leads, Thrive live, CAURD grant angle, OCM alignment
2. **Illinois** (Q3 2026) — Mature market, price competition intense, high operator density
3. **California** (Q3 2026) — Scale play, largest market, crowded but data-hungry
4. **Florida** (Q4 2026) — Medical transitioning to adult-use, early mover advantage
5. **Colorado / Michigan** (2027) — Saturation markets, need differentiation story

**Trigger for expansion:** 5+ paying Operator accounts in NY with documented ROI.

---

## The Competitor Landscape

| Competitor | Category | Weakness |
|------------|----------|----------|
| Springbig | Loyalty/SMS | Tool, not managed. Operators don't use 80% of features. |
| Alpine IQ | CRM | Enterprise-focused, expensive, no AI |
| Headset | Data/Analytics | Reporting only, no execution layer |
| Dutchie | POS/ecomm | Infrastructure, not retention |
| In-house agency | Service | Slow, expensive, not cannabis-native AI |

**Our wedge:** None of them offer managed AI execution at SMB price points. We do.

---

## Agent Responsibilities (GTM-Relevant)

| Agent | GTM Role |
|-------|----------|
| **Marty** | AI CEO — morning briefing, outreach oversight, operator weekly reviews |
| **Jack** | CRO — reply follow-up within 2hrs, demo booking, pipeline tracking |
| **Glenda** | CMO — campaign strategy, content calendar, launch sequencing |
| **Craig** | Marketing execution — SMS/email campaigns, Blackleaf/Mailjet sends |
| **Day Day** | SEO & content — blog generation, keyword discovery, landing pages |
| **Pops** | Analytics — weekly KPI reports, revenue attribution, retention metrics |
| **Ezal** | Competitive intel — daily pricing/menu tracking across competitor dispensaries |
| **Deebo** | Compliance — reviews all campaigns before send, OCM alignment |

---

## Weekly GTM Rhythm

| Day | Activity |
|-----|----------|
| **Monday** | Marty reviews outreach KPIs: reply rate, demos booked, pipeline velocity |
| **Tuesday** | Jack follows up on all week-old demos. Craig prepares campaign queue. |
| **Wednesday** | Glenda reviews content performance. Day Day flags new keywords. |
| **Thursday** | Pops delivers operator KPI reports. Proof reviews for active accounts. |
| **Friday** | Marty weekly memo: wins, losses, what changed, next week's priorities |
| **Daily** | Outreach crons fire 9-11AM EST. Reply check 3x/day. Ezal competitive scan. |

---

## $1M ARR Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| First Operator account (NY) | $2,500/mo | 🔴 Not yet |
| 3 Operator accounts | $7,500/mo | 🔴 Not yet |
| Thrive proof documented | Case study | 🟡 In progress |
| 10 Operator accounts | $25K/mo | 🔴 Q3 2026 |
| NY market saturated (20+ accounts) | $50K/mo | 🔴 Q4 2026 |
| IL + CA expansion | +$30K/mo | 🔴 Q1 2027 |
| **$1M ARR** | $83K/mo | 🔴 Target: Q2 2027 |

---

## What Agents Should Know

When making any recommendation or taking any action:

1. **Access before Operator.** Never pitch the $2,500 plan cold. Lead with the free competitive report or the $149 intel plan. Trust first, revenue second.
2. **Martez is the face.** All cold outreach comes from martez@bakedbot.ai. All replies go to Jack for follow-up. Don't confuse the two.
3. **Thrive is the only proof we have.** Reference it specifically — metrics, not vibes. "Thrive Syracuse saw X" beats "our clients see X."
4. **Scarcity is real.** The founding partner offer has 10 slots. Don't promise it to everyone. If it's full, move to standard pricing.
5. **Compliance is non-negotiable.** Deebo reviews every campaign. No exceptions. A compliance violation kills an operator's license.
6. **Reply = high priority.** Any dispensary reply triggers a Jack task with 2-hour SLA. This is the most important moment in the funnel.
7. **Weekly KPI targets:** ≥4% reply rate on cold outreach. 1+ demo booked per week minimum. If under target, escalate to Marty.
