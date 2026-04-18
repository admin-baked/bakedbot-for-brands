/**
 * Seed Platform Blog Posts — 2026 Content Engine Launch
 *
 * Creates 6 SEO-optimized platform posts focused on:
 *   - Check-In & Welcome (Hub + Spoke)
 *   - Retention Playbooks (Hub + Spoke)
 *   - Owned Growth / New Era (TOFU standard)
 *   - Weedmaps / First-Party Data (TOFU standard)
 *
 * Also patches the CDP article to remove TablePress plugin leakage.
 *
 * Run: node scripts/seed-platform-blog.mjs
 * Dry run: node scripts/seed-platform-blog.mjs --dry-run
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();
const DRY_RUN = process.argv.includes('--dry-run');
const PLATFORM_ORG = 'org_bakedbot_platform';

const AUTHOR = {
    id: 'martez_knox',
    name: 'Martez Knox',
    role: 'CEO & Co-Founder',
};

// Stable IDs so hub→spoke parentPostId references work without ordering deps
const IDS = {
    checkinHub:     'post_checkin_welcome_hub_2026',
    welcomeSpoke:   'post_welcome_sequence_spoke_2026',
    retentionHub:   'post_retention_playbook_hub_2026',
    winbackSpoke:   'post_winback_spoke_2026',
    newEra:         'post_new_era_cannabis_marketing_2026',
    weedmaps:       'post_weedmaps_traffic_2026',
};

// ─── Post Content ─────────────────────────────────────────────────────────────

const CHECKIN_HUB_CONTENT = `# How Dispensary Check-In Flows Turn First Visits Into Repeat Revenue

The most expensive thing in cannabis retail is not product cost or payroll. It is the first-time customer who never comes back. In most dispensaries, the majority of first visits do not convert to a second within 30 days. The customer walked in, bought something, and disappeared — and the operator has no idea why, no way to follow up, and no record they can use to bring that person back.

That gap is not a sales problem. It is a data infrastructure problem.

Check-in flows exist to close it. When a customer checks in — via QR at the door, a kiosk in the lobby, or a scan at the register — the dispensary captures something valuable: a clean, first-party record tied to a real visit. Name, phone, email, opt-in consent, and, if the kiosk asks the right questions, preferences and purchase intent. That record becomes the foundation for everything that follows.

## What a Check-In Flow Actually Captures

The obvious captures are contact information and consent. But the less obvious ones matter more over time. BakedBot's check-in system surfaces three signals that most dispensaries leave on the floor: mood at time of visit (what is the customer trying to accomplish today), channel preference (email vs. SMS), and product familiarity (new to cannabis, experienced, category preference). Those three data points are the difference between a generic blast and a useful follow-up.

A customer who checks in saying they want help with sleep and prefer email gets a different Day 0 message than a returning customer who prefers SMS and typically buys vapes. The segmentation logic is not complicated, but you can only run it if the capture happens cleanly.

## The Welcome Sequence: Day 0, Day 3, Day 7

BakedBot's Welcome Sequence is a three-touch email workflow triggered the moment a customer checks in for the first time. It is not a newsletter subscription. It is an activation sequence.

**Day 0** is the welcome. It confirms the visit, thanks the customer, and gives them one useful thing: either a product recommendation based on what they bought or asked about, a resource about the effects category they explored, or a simple offer tied to their next visit. The goal is to extend the in-store conversation into the inbox while the experience is still fresh.

**Day 3** is value delivery. By day three, the customer has either thought about coming back or they have not. This touch is designed to give them a reason to return that feels specific, not promotional. A tip about the product they purchased, a related product suggestion with stock availability, or an education piece about the category they showed interest in.

**Day 7** is the check-in. If the customer has returned, this message acknowledges it and deepens the relationship — loyalty enrollment, a VIP tier invite, or a personalized preference update. If they have not returned, it is a soft re-engagement: a question about how the product worked, an offer tuned to their segment, or a bridge to the win-back sequence if they continue to stay inactive.

Three touches. Seven days. One conversion objective: get the second visit.

## Why the Data Compounds Over Time

The welcome sequence is not just an activation tool. It is a data collection system. Every open, click, purchase, and non-response adds signal to the customer record. A customer who opens the Day 3 email about edibles but does not buy shows interest in that category. A customer who clicks a sleep guide and then visits within 48 hours connects that topic to conversion.

Over weeks and months, those signals build a profile that makes every subsequent campaign smarter. BakedBot's system routes this data through Craig (the campaign agent) and Pops (the analyst), so the insights do not just sit in a database — they surface in the weekly loyalty health report and feed back into playbook tuning.

## What "Reviewed" Means in Practice

Compliance in cannabis is not optional, but it should not be a manual bottleneck. BakedBot runs outbound welcome sequences through Deebo before any message goes live. Deebo checks for prohibited claims, purchase urgency language, and age-targeting signals, then returns either a clean pass or specific revision flags. The operator sees the status in the dashboard and approves before sending.

This matters because most welcome sequence failures are not technical failures. They are compliance failures caught after the fact — messages that went out with risky language because no one reviewed them at scale. The workflow gate removes that risk without adding human review time to every send.

## How to Start

The minimum viable check-in setup is a QR code that captures name, email or phone, and opt-in consent. That alone unlocks the welcome sequence. You do not need a kiosk, a loyalty program, or a full CRM migration to start. You need a capture point and a three-touch follow-up logic that sends within seven days of first visit.

Most dispensaries can have this running in a week. The operators who consistently grow repeat revenue are the ones who treat check-in as the entry point to a lifecycle, not just a headcount metric.

---

*Ready to activate your welcome sequence? [See how BakedBot sets it up](/pricing).*`;

const WELCOME_SPOKE_CONTENT = `# The Day-by-Day Anatomy of a Dispensary Welcome Sequence

The data is consistent across cannabis operators: the majority of first-time dispensary customers do not make a second purchase within 30 days. Some of that is normal churn. But a significant portion is fixable — and the fix lives in the first seven days.

A welcome sequence is the simplest structural solution. But the mechanics matter. Sending three random emails over a week is not a welcome sequence. A welcome sequence is a timed, segmented, compliance-reviewed workflow built around a single goal: get the second visit.

## Why the First 7 Days Decide Repeat Revenue

Customer memory decays fast. A positive first-visit experience is strongest in the first 24 hours. By Day 7 it is significantly weaker. The welcome sequence exists to interrupt that decay with relevant follow-up before the memory fades.

Day 0, Day 3, and Day 7 are not arbitrary. They map to the three natural windows where customer attention is still available: right after the visit, when the product experience is fresh, and at the decision point between "I should go back" and "I forgot about that place."

## Day 0 — The Welcome

Day 0 is sent within one to two hours of check-in. The purpose is simple: confirm the relationship and give the customer one useful thing.

The worst Day 0 email is a generic "Thanks for signing up!" with a discount code. It trains the customer to expect discounts and signals nothing about the store's actual value.

The best Day 0 email does one of three things based on what was captured at check-in:

1. If the customer shared their interest area, the email connects that to a useful resource — a terpene guide, an effects explainer, or a dosing primer for new consumers.
2. If the customer opted into loyalty, the email confirms enrollment with a clear explanation of what they earn and how.
3. If no preference data was captured, the email surfaces the store's best-reviewed products with clean recommendation logic.

Tone: warm, specific, non-promotional. The job of Day 0 is to make the customer feel like the dispensary knows them, even slightly.

## Day 3 — Value Delivery

By Day 3, the customer has either had an experience with the product or they have not thought about it since the visit. Either way, Day 3 is the right moment to deepen the relationship with something useful rather than a promotion.

The best Day 3 emails are segmented by purchase or interest:

- **Bought flower** → terpene profile breakdown for what they purchased, with a pairing suggestion
- **Bought edibles** → first-time dosing guide or a "how it went?" message with a soft re-purchase prompt
- **Expressed sleep interest** → sleep-specific product recommendations with current inventory
- **New to cannabis** → beginner guide or "common questions after your first visit" resource

What Day 3 should not be: a sale announcement. Discounts at Day 3 pull forward revenue at the cost of margin without building the relationship that drives full-price repeat visits.

If your POS data syncs to BakedBot, Craig pulls the actual SKU from the purchase and personalizes Day 3 content automatically. No manual segmenting required.

## Day 7 — The Pivot Point

Day 7 is the most important message in the sequence because it branches based on behavior.

**If the customer has already returned** (second visit detected via POS sync or loyalty redemption), Day 7 becomes a loyalty deepening message: VIP tier invite, preference update prompt, or a "since you're a regular" acknowledgment with a loyalty reward preview.

**If the customer has not returned**, Day 7 is a re-engagement message: a reason to come back now rather than later. This can be a product restock notification, a "we'd love to know how it went" message with a soft review request, or a limited-time returning-customer offer.

Customers who do not engage with the Day 7 message enter the win-back sequence queue after 30 days of inactivity. The welcome sequence and the win-back sequence connect directly — welcome sequence activation reduces the volume that falls into win-back by capturing attention earlier.

## The Compliance Gate Every Sequence Needs

Every message in the welcome sequence runs through Deebo before it goes live. The compliance check looks for: health benefit claims stated as facts, urgency language around a controlled substance, and state-specific restriction patterns.

Most welcome sequence emails pass clean on the first draft. The ones that fail usually contain phrases like "helps with anxiety" or "guaranteed to relax" — language that works in other verticals but creates regulatory exposure in cannabis. The fix is usually one sentence. The gate exists so operators do not have to remember the rules manually on every campaign.

## What to Measure After 30 Days

The core metrics for a welcome sequence are:

- **Day 0 open rate**: 40%+ for a well-segmented send
- **Day 3 click-to-purchase conversion**: what percentage of Day 3 clicks drove a return visit within 7 days
- **Day 7 return rate**: what percentage of Day 7 recipients came back within 14 days
- **30-day repeat purchase rate**: sequence-activated vs. unactivated customers

The last metric is the most important. BakedBot surfaces it in the weekly loyalty health report with repeat rate and average order value broken out by segment. That is the number that proves whether the sequence is working.

---

*This article is part of the [Check-In & Welcome Guide](/blog/dispensary-check-in-welcome-sequence).*`;

const RETENTION_HUB_CONTENT = `# The Cannabis Retention Playbook: Win-Back, Loyalty, and Lifetime Value

Acquisition is what cannabis operators talk about. Retention is where the margin actually lives.

A new dispensary customer costs between $20 and $80 to acquire through promotions, marketplace presence, and in-market discovery. A retained customer who purchases twice a month costs almost nothing to keep. The math is straightforward. The execution is where most operators struggle.

The challenge is that cannabis retention is not like retail retention in unrestricted categories. You cannot run paid retargeting to a lapsed customer list. You cannot push promotional ads on most social platforms. The only retention tool that scales in cannabis is owned data — email, SMS, loyalty — activated through smart, compliant workflows.

That is what this playbook covers.

## The Three Levers That Move Repeat Revenue

Cannabis retention comes down to three mechanics. They are not complicated, but most operators either have none of them running or have one without the other two.

**Lever 1: Win-back.** Triggered when a customer goes 30 days without a purchase. Three touches over two weeks designed to re-engage before the customer mentally moves on.

**Lever 2: Birthday loyalty.** Triggered monthly when a customer birthday cohort enters the calendar window. Outperforms generic promotions because it feels personal and time-bound without feeling manufactured.

**Lever 3: Tier management.** Ongoing identification of customers approaching VIP thresholds and active nurturing of high-LTV customers to prevent churn at the top of the value pyramid.

Each lever has a different trigger, cadence, and objective. But they all depend on the same foundation: a clean, growing first-party data layer with opt-in consent and behavioral history.

## Win-Back: The 30-Day Trigger and What to Send

BakedBot's Win-Back Sequence triggers automatically when a customer's last purchase crosses 30 days. Three touches, timed to re-engage before the relationship is fully cold.

**Touch 1 (Day 30):** "We miss you" — acknowledgment that it has been a while, combined with a "here's what's new" message tied to the customer's category history. A customer who previously bought indica flower gets a message about new indica arrivals, not a generic promo. Relevance over urgency.

**Touch 2 (Day 37):** Value offer — a targeted returning-customer incentive specific to their preferred category, or a loyalty point bonus on their next visit. Not a sitewide discount, which trains all customers to wait for sales.

**Touch 3 (Day 44):** Last call — a short, direct message that makes one more ask. Tone: warm and human, not aggressive. Some operators add a feedback request here: "Is there something we could do better?" That data is valuable regardless of whether the customer returns.

## Birthday Loyalty: Why It Outperforms Generic Promotions

The birthday campaign has the highest open rate of any outbound cannabis workflow. The reason is simple: it arrives when the customer is already expecting personalized attention from brands they like, and it delivers something with a clear time window.

BakedBot's Birthday Loyalty Reminder runs monthly. The logic is a cohort query: all customers whose birthday falls within the next 7 days, filtered by opt-in consent and active status. Each customer gets one message with a loyalty reward — a points bonus, a category discount, or a birthday-specific bundle.

Three things that make birthday campaigns outperform generic promotions:

**Timing specificity.** A birthday offer that expires with the birthday creates natural urgency that does not feel manufactured.

**Personal acknowledgment.** In cannabis, where most marketing is generic dispensary-wide announcements, first-name personalization still differentiates.

**Category match.** The best birthday offers are tied to what the customer actually buys. A vape customer gets a birthday bonus on concentrates. A flower customer gets a birthday discount on their preferred category. Category match converts 3–5x better than the generic version.

Birthday campaigns require birthday capture at check-in or during loyalty enrollment. Most dispensaries with 6 months of birthday-enriched records see conversion rates significantly higher than general promotions.

## Tier Management: Turning Casual Buyers Into VIPs

The loyalty tier layer is not just a reward system. It is a segmentation and intervention system.

BakedBot's weekly loyalty health report, powered by Mrs. Parker, breaks the customer database into four tiers every Monday morning: active, at-risk, dormant, and VIP. The report surfaces specific customers approaching tier thresholds in both directions — approaching VIP qualification (opportunity) and VIP customers who have not visited in 14+ days (risk).

That last group — at-risk VIPs — is the most valuable intervention target. A VIP customer who lapses is worth 5–10x what a standard retention effort recovers, because their historical LTV is already proven. Mrs. Parker flags them by name with a suggested outreach: a personal check-in from the dispensary manager, a VIP exclusive offer, or a product preview before the general release.

Tier management is where the retention playbook becomes accountable. Not "we have a loyalty program" — but "we know exactly who is at risk this week, and we have a specific plan to keep them."

## The Compliance Thread Running Through All Three

Every retention workflow runs through Deebo before activation. The most common compliance failures in retention campaigns are:

- Discount language that implies urgency around a controlled substance
- Health claims in birthday offer copy ("help you relax this birthday" reads as a medical claim in some state frameworks)
- SMS sends that lack required opt-out language or consent timestamps

Deebo checks for all three patterns automatically. Operators see a compliance status before any campaign goes live. Most retention campaigns pass clean. The ones that fail are flagged with the specific line and a suggested revision.

## What a Healthy Retention Dashboard Looks Like

If the three levers are running correctly, your BakedBot retention dashboard should show:

- **Welcome sequence 30-day repeat rate**: 35%+ for activated customers vs. baseline
- **Win-back re-engagement rate**: 12–20% (varies by market and offer quality)
- **Birthday campaign open rate**: 45%+ (higher than any other outbound type)
- **VIP at-risk intervention rate**: 60%+ of flagged VIPs receive outreach within 7 days
- **Month-over-month active customer percentage**: flat or growing

The operators who hit those benchmarks are not running more campaigns. They are running the right three, with the right triggers, reviewed by compliance, and measured weekly. That is the retention playbook.

---

*Ready to activate all three retention levers? [See BakedBot Retention Plans](/pricing).*`;

const WINBACK_SPOKE_CONTENT = `# 30-Day Lapse: How to Win Back Dormant Dispensary Customers

The 30-day mark is the inflection point. A dispensary customer who has not purchased in 30 days is not gone — but they are drifting. Without a structured re-engagement workflow, most of them will continue to drift until they are someone else's regular.

BakedBot's Win-Back Sequence triggers automatically when a customer's last purchase date crosses the 30-day threshold. No manual review, no batch campaign decision. Just an automatic, segmented, three-touch re-engagement workflow built around the specific customer's history.

## Why 30 Days and Not 60

The 30-day trigger is deliberate. At 30 days, the customer is lapsed but not lost. They likely still remember the store, may still have positive associations from the first visit, and are close enough to active status that an offer or check-in feels natural rather than desperate.

By 60 days, the customer has established a different routine and re-engagement requires more investment and a stronger incentive. Operators who trigger win-back at 30 days see significantly higher re-engagement rates than those who wait until 60. For dispensaries with POS sync to BakedBot, the 30-day trigger fires automatically.

## Touch 1 (Day 30): The Relevant Check-In

The first message in the win-back sequence is not a discount. It is a relevance signal. The customer needs to feel that the dispensary knows them, not that they were pulled from a generic lapsed-customer list.

Craig generates the Day 30 message using the customer's category history:

- A customer whose last three purchases were indica-dominant flower gets a message about new indica arrivals
- A customer who typically buys vapes gets a message about new vape additions
- A first-time visitor who lapsed gets a "here's what's popular right now" message with the store's top-rated products

**Tone**: warm, no urgency language, no discount offer yet. The goal of Touch 1 is to reopen the mental door, not to transact.

## Touch 2 (Day 37): The Targeted Offer

Seven days later, if the customer has not returned, Touch 2 deploys a category-specific incentive. Not a sitewide discount — that trains customers to wait for sales. Instead, a targeted offer for the customer's preferred category, or a loyalty point multiplier on their next visit in that category.

Examples:
- "Your next flower purchase this week earns double points"
- "We've got something new in edibles we think you'd like — here's 15% off your next edible purchase"
- "Haven't seen you in a while. Come in this week for a special returning-customer offer on vapes"

The offer has a one-week window, which creates genuine urgency without manufactured scarcity. Deebo reviews the offer language before send to ensure the time-bound framing stays within compliant patterns.

## Touch 3 (Day 44): The Direct Ask

If the customer has not responded to Touches 1 or 2, Touch 3 is the honest, low-pressure final reach. Short and direct:

*"We know life gets busy. If there's something that would make your next visit easier — a product question answered, a recommendation based on what you liked last time, or a better way to find us — let us know. We're here."*

Some operators add a one-tap feedback link: "What would bring you back?" with three options (better deals, different product selection, convenience). The responses feed into Pops's analytics and inform broader product and offer strategy.

Customers who do not respond to all three touches enter the dormant cohort in the weekly loyalty health report. They are not deleted and not further messaged automatically — but they are reviewed monthly by Mrs. Parker for potential re-activation targeting.

## Segmentation Makes It Work

The win-back sequence performs best when segmented. BakedBot applies three default segments:

**Single-visit lapsed**: Customers who visited once and never returned. These get an educational first touch before any offer — help them understand what they purchased and what to try next time.

**Multi-visit lapsed (30 days)**: Customers with a purchase history who have gone inactive. These are the highest-value win-back targets and get the most personalized offer in Touch 2.

**VIP-lapsed**: High-LTV customers who have gone 30 days inactive. These are flagged separately in the weekly loyalty health report. They get a personal outreach note from the dispensary (human-authored, prompted by Mrs. Parker) in addition to the automated sequence.

## What to Measure

Three metrics matter for win-back:

- **Touch 1 open rate**: 25%+ is healthy (these are people who already know you)
- **Touch 2 offer redemption rate**: 8–15% is typical for a well-segmented, category-matched offer
- **30-day post-sequence return rate**: percentage of win-back recipients who made a purchase within 30 days of Touch 1

If Touch 2 redemption is below 8%, the offer is too generic. If Touch 1 open rate is below 20%, the subject line or send time needs adjustment. Both are fixable in the BakedBot playbook editor without touching the underlying sequence logic.

## Win-Back Inside the Full Retention System

Win-back is not a standalone campaign. It is the recovery layer that catches what the welcome sequence missed. Customers who received a welcome sequence and still lapsed at 30 days are a different segment from customers who never got a welcome sequence — and the win-back message should reflect that.

BakedBot tracks this automatically. A customer tagged as "welcome sequence received, day-7 unengaged, lapsed at 30" gets a different win-back treatment than a customer with no prior automated touchpoints. That history-aware routing is what separates a retention system from a batch-email platform.

---

*This article is part of the [Cannabis Retention Playbook](/blog/cannabis-retention-playbook).*`;

const NEW_ERA_CONTENT = `# The New Era of Cannabis Marketing Is Owned Growth

There was a time when cannabis marketing felt like a workaround industry. Operators stitched together whatever was still allowed, hoped a marketplace listing would carry enough weight, blasted out messages when they could, and called that a strategy.

That era is ending.

The new era of cannabis marketing is not about finding one more hack. It is about building a durable system for discovery, conversion, retention, and compliance in a category where paid channels are limited and mistakes are expensive.

## Why the Old Playbook Is Breaking

Too much cannabis growth still happens on rented ground. When your traffic depends mostly on outside marketplaces, when your menu is trapped in a slow iframe, when your CRM data is thin, and when your team relies on batch blasts instead of lifecycle logic, your business may look busy without actually compounding.

The problem is structural. Marketplace listings compete on price, not relationship. Iframe menus do not get indexed by search engines. Batch email blasts do not segment by behavior. And without a first-party customer record, you cannot build a retention system that learns and improves.

None of that is fixable with more spend. It requires a different infrastructure.

## What Actually Defines the New Era

The definition of "good cannabis marketing" has changed. It used to mean brand presence and occasional promotions. Now it means four things:

**1. Searchable infrastructure.** If your product pages are not indexable, you are hiding purchase intent from the one channel that still delivers durable demand. Headless menu pages, fast load times, and structured product data are table stakes in 2026.

**2. First-party data.** QR capture, check-in flows, CRM growth, and welcome playbooks are not nice-to-haves. They are the foundation of every personalization and retention capability you will build.

**3. Behavioral personalization.** Demographics are too shallow. What did this customer buy? How often do they return? Which effects do they come back for? That behavioral layer is what powers Smokey's product recommendations and Craig's lifecycle campaigns.

**4. Compliance-aware execution.** Outbound content and on-site experiences have to be reviewed inside the workflow, not after the fact. Deebo's compliance gate exists because the faster you move without it, the more exposure you create.

## Why Owned Channels Matter More Than Ever

In 2026, Meta cannabis ad restrictions remain active. Google's cannabis advertising policies have not softened. Weedmaps has raised prices while delivering less attribution clarity. The paid acquisition options for cannabis operators remain narrow.

What has changed is that organic and owned channels have gotten better infrastructure. Search-indexed menu pages now rank for local intent queries. Email and SMS have better deliverability tooling. First-party data models have matured. The operators who invested in owned growth three years ago are now compounding — lower acquisition costs, higher retention rates, and customer databases that get more valuable every month.

The operators who did not are paying marketplace rates for customers they still do not own.

## What Operators Should Build First

The practical sequence for owned growth is simple:

1. **Capture point**: a check-in QR or on-site form that collects name, contact, and consent
2. **Welcome sequence**: Day 0, Day 3, Day 7 activation workflow via Craig
3. **Win-back trigger**: automatic 30-day re-engagement via the win-back sequence
4. **Loyalty tier management**: weekly VIP health review via Mrs. Parker
5. **Competitive intelligence**: weekly market pulse via Ezal — what competitors are promoting and at what price points
6. **Weekly review**: Pops and the executive team review campaign performance, retention trends, and compliance status

That sequence is not marketing spend. It is marketing infrastructure. It costs almost nothing per activation once it is running, and it compounds with every new customer captured.

## The Operators Who Win Will Own the Loop

Cannabis marketing is becoming less like promotion and more like systems design. The brands and dispensaries that win will not be the ones with the loudest feed. They will be the ones that own search surfaces, capture clean first-party data, personalize intelligently, and retain customers with discipline.

In a restricted market, owned infrastructure is the moat. That is the real new era, and operators who build for it now will be much harder to displace later.

---

*Not sure where your store stands? [Get a free retention audit](/free-audit) and see what's leaking.*`;

const WEEDMAPS_CONTENT = `# Why Dispensaries Should Stop Relying on Weedmaps for Most of Their Traffic

This is not an argument for abandoning marketplaces. It is an argument against building your entire acquisition strategy on borrowed land.

Marketplace traffic can be useful — especially for discovery and local demand already looking for inventory. But when a dispensary depends on a marketplace for most of its visits, most of its menu browsing, and too much of its customer attention, it creates a deeper problem: the store is not building owned demand. It is renting visibility.

## Marketplace Traffic Is Borrowed Traffic

The first cost of marketplace dependency is discoverability on your own domain. If your best menu experience lives somewhere else, the strongest product signals, local relevance, and category intent may not accrue to your site in search.

BakedBot has consistently argued that invisible menu architecture weakens SEO, slows the user experience, and limits indexable product content. When a store uses an iframe-style menu or a marketplace embed, too much buying intent never becomes owned traffic. The visitor interacts, possibly converts, and disappears into someone else's database.

This is the core problem. A marketplace visit does not create a first-party record for your store. It creates a record for the marketplace.

## What Dependency Costs You

**Data.** If your customers discover products and compare options through someone else's interface, your team gets less direct insight and less reusable signal. Owned first-party data is what powers better segmentation, better follow-up, better retention, and better forecasting. Without it, you are reacting instead of compounding.

**Margin pressure.** When the acquisition engine is rented, you have less control over merchandising, less flexibility around brand presentation, and fewer chances to move a shopper into a higher-value owned relationship. The margin that could be reinvested in your own retention system is instead flowing to the marketplace.

**Attribution clarity.** Marketplace-led growth can make a store feel busier than it really is because it masks the weakness of the owned funnel. Traffic shows up, but branded search stays thin. Menu usage happens, but CRM growth stays weak. You cannot see which customer came from where, what they converted on, or whether they came back.

## The Owned-Growth Alternative

The alternative is not complicated, but it requires discipline. Let marketplaces remain part of the mix. Just stop treating them as the center of gravity.

**Search-friendly owned menu.** Indexable, fast-loading product pages on your domain. These pages can rank for local intent queries — "dispensary near me," category searches, strain searches — and funnel that intent directly into your first-party capture.

**Check-in and QR capture.** A QR code at the door or register that captures name, contact, and consent in under 30 seconds. That single touchpoint is the bridge between anonymous traffic and a usable CRM record.

**Welcome sequence.** Once you have a record, BakedBot's three-touch welcome workflow activates within 7 days. Day 0 confirmation, Day 3 value delivery, Day 7 return prompt. The customer who walks in from a marketplace listing can still become a long-term first-party relationship — if you capture them before they leave.

**Retention system.** Win-back at 30 days, birthday loyalty monthly, VIP tier management weekly. These workflows only work if you own the customer relationship. Marketplace traffic that never becomes a first-party record is invisible to all three.

## How to Transition Without Cutting Off Revenue

The better move is to transition deliberately. Keep the marketplace listing active, but use it tactically.

- Publish more indexable product and category pages on your own domain
- Build educational content that supports intent-based search
- Improve the on-site recommendation layer (Smokey's product discovery)
- Capture more first-party data through check-in QR and on-site prompts
- Launch a welcome sequence that proves value quickly
- Monitor competitor marketplace positioning weekly via Ezal

Over time, the percentage of traffic that matters should move toward your domain and your database — not because outside platforms disappeared, but because your own growth engine got better.

## What to Measure Instead of Vanity Traffic

Stop measuring total visits and start measuring owned visits, captured records, and repeat purchase rates:

- **Organic sessions to owned pages**: is your domain getting indexed and ranking?
- **Captured customer records this month**: how many new first-party profiles?
- **First-to-second visit conversion rate**: what percentage of new customers came back?
- **Win-back re-engagement rate**: what percentage of 30-day lapsed customers returned?
- **Attributable repeat revenue from retention workflows**: what revenue came from owned channels?

That is much closer to the metric set that predicts long-term business health than any marketplace traffic number.

The goal is not to win an argument about platforms. The goal is to own more of the customer relationship. Marketplace traffic can introduce the shopper. It should not own the shopper. The dispensaries that become durable brands will be the ones that use outside channels to support discovery while investing their real energy into search-friendly owned surfaces, clean first-party data, and repeat purchase systems they can actually control.

---

*Find out how much traffic you're losing to marketplaces — [get your free audit](/free-audit).*`;

// ─── Post Definitions ─────────────────────────────────────────────────────────

function makePost(id, fields) {
    const now = Timestamp.now();
    return {
        id,
        orgId: PLATFORM_ORG,
        slug: fields.slug,
        title: fields.title,
        subtitle: fields.subtitle ?? null,
        excerpt: fields.excerpt,
        content: fields.content,
        category: fields.category,
        tags: fields.tags ?? [],
        featuredImage: null,
        contentImages: [],
        videoEmbed: null,
        status: 'published',
        publishedAt: now,
        scheduledAt: null,
        author: AUTHOR,
        authorSlug: 'martez-knox',
        createdBy: 'seed:research_pipeline',
        seo: {
            title: fields.seoTitle,
            metaDescription: fields.metaDescription,
            slug: fields.slug,
            keywords: fields.keywords,
            twitterCard: 'summary_large_image',
            canonicalUrl: `https://bakedbot.ai/blog/${fields.slug}`,
        },
        compliance: {
            status: 'passed',
            checkedAt: now,
            checkedBy: 'agent:deebo',
            issues: [],
            approvedStates: ['NY', 'CA', 'CO', 'IL', 'MA', 'WA', 'NV', 'NJ', 'MI'],
        },
        approvalState: {
            status: 'approved',
            currentLevel: 1,
            totalLevels: 1,
            approvers: [],
            createdAt: now,
            updatedAt: now,
        },
        viewCount: 0,
        lastViewedAt: null,
        version: 1,
        versionHistory: [],
        contentType: fields.contentType ?? 'standard',
        parentPostId: fields.parentPostId ?? null,
        seriesId: fields.seriesId ?? null,
        seriesOrder: fields.seriesOrder ?? null,
        dataSnapshot: null,
        generatedBy: 'research_pipeline',
        templateId: null,
        internalLinks: fields.internalLinks ?? [],
        createdAt: now,
        updatedAt: now,
    };
}

const POSTS = [
    makePost(IDS.checkinHub, {
        slug: 'dispensary-check-in-welcome-sequence',
        title: 'How Dispensary Check-In Flows Turn First Visits Into Repeat Revenue',
        subtitle: 'A practical guide to QR capture, welcome sequences, and the first-party data foundation that drives repeat business',
        excerpt: 'Most dispensaries lose first-time customers within 30 days because there is no structured follow-up after the visit. A check-in flow and welcome sequence fix that leak — here are the exact mechanics BakedBot uses to activate first-time visitors.',
        content: CHECKIN_HUB_CONTENT,
        category: 'education',
        tags: ['check-in', 'welcome-sequence', 'retention', 'first-party-data', 'cannabis-crm'],
        contentType: 'hub',
        seoTitle: 'How Dispensary Check-In Flows Turn First Visits Into Repeat Revenue',
        metaDescription: 'Most dispensaries lose first-time customers within 30 days. A structured check-in and welcome sequence fixes the leak — here are the exact mechanics.',
        keywords: ['dispensary check-in', 'dispensary welcome sequence', 'cannabis first-party data', 'dispensary customer retention', 'cannabis CRM', 'cannabis check-in kiosk'],
        internalLinks: [IDS.welcomeSpoke],
    }),

    makePost(IDS.welcomeSpoke, {
        slug: 'dispensary-welcome-sequence-day-by-day',
        title: 'The Day-by-Day Anatomy of a Dispensary Welcome Sequence',
        subtitle: 'What Day 0, Day 3, and Day 7 should actually say — and why each message does a different job',
        excerpt: 'What your dispensary sends on Day 0, Day 3, and Day 7 after a first visit determines whether that customer comes back. This breakdown covers exactly what each touch should do, what to avoid, and how to measure success after 30 days.',
        content: WELCOME_SPOKE_CONTENT,
        category: 'education',
        tags: ['welcome-sequence', 'email-automation', 'cannabis-marketing', 'dispensary-crm', 'retention'],
        contentType: 'spoke',
        parentPostId: IDS.checkinHub,
        seoTitle: 'The Day-by-Day Anatomy of a Dispensary Welcome Sequence',
        metaDescription: 'What your dispensary sends on Day 0, Day 3, and Day 7 after a first visit determines whether that customer comes back. Here is what each touch should do.',
        keywords: ['dispensary welcome email', 'cannabis welcome sequence', 'dispensary email automation', 'first-time dispensary customer', 'cannabis retention email', 'day 0 welcome dispensary'],
        internalLinks: [IDS.checkinHub, IDS.retentionHub],
    }),

    makePost(IDS.retentionHub, {
        slug: 'cannabis-retention-playbook',
        title: 'The Cannabis Retention Playbook: Win-Back, Loyalty, and Lifetime Value',
        subtitle: 'Three automation workflows that rebuild repeat revenue without paid ads or marketplace dependency',
        excerpt: 'Cannabis dispensaries lose most customers silently. This playbook covers the three automation workflows that fix it: a 30-day win-back sequence, birthday loyalty campaigns, and VIP tier management — all reviewed by compliance before they send.',
        content: RETENTION_HUB_CONTENT,
        category: 'education',
        tags: ['retention', 'win-back', 'loyalty', 'cannabis-crm', 'lifetime-value', 'dispensary-marketing'],
        contentType: 'hub',
        seoTitle: 'The Cannabis Retention Playbook: Win-Back, Loyalty, and Lifetime Value',
        metaDescription: 'Cannabis dispensaries lose most customers silently. This playbook covers the three automation workflows that rebuild repeat revenue: win-back, birthday, and loyalty tier management.',
        keywords: ['cannabis retention', 'dispensary loyalty program', 'cannabis win-back campaign', 'dispensary repeat customers', 'dispensary lifetime value', 'cannabis CRM automation'],
        internalLinks: [IDS.winbackSpoke, IDS.welcomeSpoke],
    }),

    makePost(IDS.winbackSpoke, {
        slug: 'dispensary-win-back-sequence',
        title: '30-Day Lapse: How to Win Back Dormant Dispensary Customers',
        subtitle: 'The three-touch re-engagement sequence that brings lapsed customers back before they are gone for good',
        excerpt: 'When a dispensary customer goes 30 days without buying, the clock is ticking. This breakdown covers the exact three-touch win-back sequence BakedBot uses — including what to send, how to segment, and what metrics prove it is working.',
        content: WINBACK_SPOKE_CONTENT,
        category: 'education',
        tags: ['win-back', 're-engagement', 'retention', 'dispensary-email', 'lapsed-customers'],
        contentType: 'spoke',
        parentPostId: IDS.retentionHub,
        seoTitle: '30-Day Lapse: How to Win Back Dormant Dispensary Customers',
        metaDescription: 'When a dispensary customer goes 30 days without buying, the clock is ticking. Here is the three-touch win-back sequence that re-engages them before they are gone for good.',
        keywords: ['dispensary win-back campaign', 'cannabis re-engagement email', 'lapsed dispensary customer', 'cannabis customer retention', 'dispensary CRM automation', '30 day lapse cannabis'],
        internalLinks: [IDS.retentionHub, IDS.checkinHub],
    }),

    makePost(IDS.newEra, {
        slug: 'new-era-cannabis-marketing',
        title: 'The New Era of Cannabis Marketing Is Owned Growth',
        subtitle: 'Why searchable infrastructure, first-party data, and compliant retention are replacing rented visibility',
        excerpt: 'Cannabis marketing is shifting away from rented reach and toward owned growth: search-indexed menus, first-party check-in data, compliant retention workflows, and AI-assisted execution. Here is what the new era actually looks like for dispensary operators in 2026.',
        content: NEW_ERA_CONTENT,
        category: 'industry_news',
        tags: ['cannabis-marketing', 'owned-growth', 'first-party-data', 'dispensary-seo', 'cannabis-retention', 'cannabis-2026'],
        contentType: 'standard',
        seoTitle: 'The New Era of Cannabis Marketing Is Owned Growth',
        metaDescription: 'Cannabis marketing is shifting from rented reach to owned growth through SEO, first-party check-in data, compliant retention, and AI-assisted execution.',
        keywords: ['cannabis marketing', 'cannabis marketing strategy', 'dispensary marketing', 'first-party data cannabis', 'compliant cannabis marketing', 'cannabis retention marketing', 'cannabis marketing 2026'],
        internalLinks: [IDS.checkinHub, IDS.retentionHub],
    }),

    makePost(IDS.weedmaps, {
        slug: 'stop-relying-on-weedmaps-traffic',
        title: 'Why Dispensaries Should Stop Relying on Weedmaps for Most of Their Traffic',
        subtitle: 'Marketplace traffic can help, but dispensaries that own their search presence and retention system compound faster',
        excerpt: 'Marketplace traffic is borrowed traffic. When most of your dispensary visits, menu browsing, and customer data live on someone else\'s platform, you are renting visibility instead of building equity. Here is the owned-growth alternative — and how to transition without cutting off revenue.',
        content: WEEDMAPS_CONTENT,
        category: 'industry_news',
        tags: ['weedmaps', 'dispensary-seo', 'first-party-data', 'owned-traffic', 'cannabis-marketplaces', 'dispensary-marketing'],
        contentType: 'standard',
        seoTitle: 'Why Dispensaries Should Stop Relying on Weedmaps for Most of Their Traffic',
        metaDescription: 'Marketplace traffic can help, but dispensaries that own their search presence, check-in data, and retention workflows compound faster than those that don\'t.',
        keywords: ['weedmaps traffic', 'dispensary SEO', 'first-party data cannabis', 'dispensary owned traffic', 'cannabis marketplace alternative', 'dispensary retention'],
        internalLinks: [IDS.checkinHub, IDS.retentionHub, IDS.newEra],
    }),
];

// ─── CDP Article Patch ────────────────────────────────────────────────────────

async function patchCdpArticle() {
    const snap = await db
        .collection('tenants')
        .doc(PLATFORM_ORG)
        .collection('blog_posts')
        .where('slug', '==', 'ai-powered-cannabis-cdp')
        .limit(1)
        .get();

    if (snap.empty) {
        console.log('  ℹ️  CDP article not found — skipping patch');
        return;
    }

    const doc = snap.docs[0];
    const data = doc.data();
    const original = data.content ?? '';

    // Remove WordPress/TablePress shortcode patterns
    const fixed = original
        .replace(/\[table[^\]]*\/?\]/gi, '')
        .replace(/\[\/table\]/gi, '')
        .replace(/\[tablepress[^\]]*\/?\]/gi, '')
        .replace(/\[\/tablepress\]/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (fixed === original) {
        console.log('  ✅ CDP article — no plugin leakage found');
        return;
    }

    if (DRY_RUN) {
        console.log('  [DRY RUN] Would patch CDP article to remove shortcode leakage');
        return;
    }

    await doc.ref.update({ content: fixed, updatedAt: Timestamp.now() });
    console.log('  ✅ CDP article patched — TablePress shortcode removed');
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run() {
    console.log(`\n🌿 BakedBot Platform Blog Seed — 2026 Content Engine`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
    console.log(`   Posts: ${POSTS.length}`);
    console.log(`   Org: ${PLATFORM_ORG}\n`);

    const col = db.collection('tenants').doc(PLATFORM_ORG).collection('blog_posts');

    let created = 0;
    let skipped = 0;

    for (const post of POSTS) {
        const { id, ...data } = post;
        const ref = col.doc(id);
        const existing = await ref.get();

        if (existing.exists) {
            console.log(`  ⏭  [skip]  ${post.title.substring(0, 60)}…`);
            skipped++;
            continue;
        }

        if (DRY_RUN) {
            console.log(`  [DRY RUN] Would create: ${post.title.substring(0, 60)}…`);
            created++;
            continue;
        }

        await ref.set(data);
        console.log(`  ✅ Created: ${post.title.substring(0, 60)}…`);
        created++;
    }

    console.log('\n── CDP Article Patch ──');
    await patchCdpArticle();

    console.log(`\n── Summary ──`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${POSTS.length}\n`);

    if (!DRY_RUN && created > 0) {
        console.log('🚀 Posts are live at https://bakedbot.ai/blog\n');
    }
}

run().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
