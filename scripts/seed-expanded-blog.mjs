/**
 * Expanded BakedBot Platform Blog Seed
 * Seeds 10 new posts:
 *   - Thrive Syracuse case study (hub)
 *   - Simply Pure Trenton + Tahir Johnson launch
 *   - Alleaves POS integration story
 *   - CannMenus + competitive intelligence
 *   - MCBA partnership announcement
 *   - BIPOCANN partnership feature
 *   - YouTube: Influencer Podcast #158 (Dr. Bill Williams)
 *   - YouTube: COO Wisdom Pods (ai & cannabis)
 *   - YouTube: Benzinga Cannabis Capital 2023
 *   - YouTube: Revolutionizing Cannabis with AI
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed-expanded-blog.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Init Firebase Admin
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json';
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf-8'));
} catch {
    console.error('Could not read service account from', SA_PATH);
    process.exit(1);
}

if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const ORG_ID = 'org_bakedbot_platform';
const COLLECTION = `tenants/${ORG_ID}/blog_posts`;

const NOW = Timestamp.now();
const MARTEZ = {
    name: 'Martez Knox',
    title: 'CEO & Co-Founder, BakedBot AI',
    avatar: 'https://bakedbot.ai/images/martez.png',
};

// ---------------------------------------------------------------------------
// POST DEFINITIONS
// ---------------------------------------------------------------------------

const POSTS = [

    // -------------------------------------------------------------------------
    // 1. THRIVE SYRACUSE CASE STUDY (hub)
    // -------------------------------------------------------------------------
    {
        id: 'post_thrive_syracuse_case_study_2026',
        slug: 'thrive-syracuse-case-study',
        title: 'How Thrive Syracuse Became the Most Data-Driven Dispensary in Central New York',
        excerpt: 'From connecting their Alleaves POS to tracking five competitors with CannMenus, Thrive Syracuse runs on live data. Here\'s the full story.',
        featuredImage: {
            url: 'https://bakedbot.ai/blog/thrive-syracuse-og.jpg',
            alt: 'Thrive Cannabis dispensary in Syracuse NY powered by BakedBot AI',
        },
        category: 'customer-stories',
        tags: ['thrive-syracuse', 'case-study', 'pos-integration', 'alleaves', 'competitive-intelligence', 'new-york'],
        contentType: 'hub',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Thrive Syracuse Case Study — BakedBot AI-Powered Dispensary',
            description: 'How Thrive Syracuse connected Alleaves POS, activated AI-powered competitive intelligence, and launched an AI budtender — powered by BakedBot.',
            keywords: 'thrive syracuse dispensary, cannabis AI, alleaves POS, dispensary case study, BakedBot',
        },
        readingTime: 7,
        content: `# How Thrive Syracuse Became the Most Data-Driven Dispensary in Central New York

When Thrive Cannabis opened its doors in Syracuse, New York, they made a decision that would set them apart from every competitor in the market: they would run entirely on data.

Not gut instinct. Not industry gossip. Not a hunch about what strains sell on Fridays. Data.

That decision brought them to BakedBot — and the story of what happened next is one we're proud to tell.

## The Problem Every Dispensary Faces

Walk into any dispensary in New York and ask the manager: "How are you tracking your customers after they leave?" Most will pause. A few will mention a paper sign-up sheet. Some will tell you about a loyalty app they've been meaning to set up.

The uncomfortable truth is that most cannabis dispensaries in New York have no reliable way to identify returning customers, understand purchase patterns, or reach out to someone who hasn't been back in 30 days. The data exists — it's sitting in their POS system — but it's trapped there, invisible and unactionable.

That's exactly what Thrive came to us to solve.

## Step One: Connect the Source of Truth

Every customer transaction at Thrive flows through **Alleaves**, a cannabis-focused point-of-sale platform. BakedBot built the first direct Alleaves integration in the industry — connecting Thrive's real-time transaction data to BakedBot's customer profiles.

Here's what that meant in practice: within 90 days of going live, Thrive had **2,999 historical orders** fully synced, normalized, and mapped to individual customer profiles. Every strain purchased. Every product category. Every visit frequency pattern. All of it live in BakedBot.

From that data, BakedBot's retention engine does something no spreadsheet can: it automatically segments customers by behavior, identifies who's at risk of churning, and triggers personalized win-back sequences before those customers ever walk out for the last time.

## Step Two: Know Your Competitors Cold

You can't compete with what you can't see. BakedBot uses **CannMenus** — a live database tracking 694 New York cannabis retailers — as the primary data source for competitive intelligence. Thrive's account monitors five direct competitors in Syracuse:

- Diamond Tree (CannMenus)
- RISE Cannabis (CannMenus)
- Dazed (CannMenus)
- The Higher Company (CannMenus)
- Verilife (Jina + web)

Every week, Ezal — BakedBot's competitive intelligence agent — pulls pricing, inventory moves, and promotional signals from these competitors and generates a summary report. Thrive's team wakes up Monday morning knowing exactly what Diamond Tree is charging for live rosin concentrates and whether RISE had a 420 flash sale.

This is the kind of intelligence that used to require a full-time employee doing manual research. BakedBot automates it entirely.

## Step Three: Give Every Customer a Personal Budtender

The check-in kiosk at Thrive isn't just for capturing emails. It captures **mood** — a simple 1–5 scale that asks customers how they're feeling when they walk in. This signal, combined with their purchase history, powers **Smokey** — BakedBot's AI budtender.

Smokey is available on Thrive's website and in-store and can answer questions like:

- "What do you have for daytime focus that isn't too heavy?"
- "I bought Wedding Cake last time — what's similar but with less couch-lock?"
- "I want something for sleep that won't make me groggy in the morning."

Smokey doesn't guess. It reasons from actual product data, terpene and cannabinoid profiles, and that customer's specific purchase history.

## The Results

Thrive Syracuse became BakedBot's first production pilot — and the foundation for everything we've built since. Their integration proved that the combination of **first-party POS data + real-time competitive intelligence + AI personalization** is the playbook every serious dispensary in New York needs.

If your dispensary is still operating on gut instinct, Thrive's story is a preview of what you're missing.

Ready to see how your store stacks up? [Book a demo →](/contact)`,
    },

    // -------------------------------------------------------------------------
    // 2. SIMPLY PURE TRENTON + TAHIR JOHNSON
    // -------------------------------------------------------------------------
    {
        id: 'post_simply_pure_trenton_launch_2026',
        slug: 'simply-pure-trenton-launch-bakedbot',
        title: 'Simply Pure Trenton Is Going Live on BakedBot — and Tahir Johnson\'s Story Is Why It Matters',
        excerpt: 'The President of the Minority Cannabis Business Association is also the founder of Simply Pure Trenton. His decision to partner with BakedBot says everything about where this industry is going.',
        featuredImage: {
            url: 'https://bakedbot.ai/blog/simply-pure-trenton-og.jpg',
            alt: 'Simply Pure Trenton dispensary New Jersey powered by BakedBot AI',
        },
        category: 'announcements',
        tags: ['simply-pure-trenton', 'new-jersey', 'tahir-johnson', 'mcba', 'social-equity', 'launch'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Simply Pure Trenton Launches on BakedBot — Social Equity Cannabis Tech',
            description: 'MCBA President and Simply Pure Trenton founder Tahir Johnson joins BakedBot as a Company Advisor and early customer. Why this partnership matters for social equity cannabis.',
            keywords: 'simply pure trenton, Tahir Johnson, MCBA, social equity cannabis, New Jersey dispensary, BakedBot',
        },
        readingTime: 5,
        content: `# Simply Pure Trenton Is Going Live on BakedBot — and Tahir Johnson's Story Is Why It Matters

There's a version of "cannabis technology" that serves only the big operators. The MSOs. The companies with eight-figure budgets and rooms full of engineers. Tools that promise everything but require a dedicated IT team to run them.

BakedBot was built to be the opposite of that.

Which is why the announcement we're making today matters more than any press release: **Simply Pure Trenton is going live on BakedBot**, and the person behind it is someone who has spent years fighting for exactly the kind of dispensary we were built to serve.

## Meet Tahir Johnson

Tahir Johnson is the President of the **Minority Cannabis Business Association (MCBA)** and the founder of **Simply Pure Trenton** — a licensed dispensary at 1531 N. Olden Ave. in Ewing Township, New Jersey, that opened in July 2023.

He's also a BakedBot Company Advisor.

That last part is significant. Tahir didn't just sign up as a customer — he joined our team in an advisory capacity because he believes what we're building is exactly what independent and social equity operators need to compete.

"The technology gap between well-funded operators and independent dispensaries is real," Tahir has said. "Tools like BakedBot level that playing field. That's not a nice-to-have. It's an existential need."

## Why New Jersey

New Jersey's adult-use market is one of the most dynamic in the country — and one of the most competitive. The state has made a deliberate commitment to social equity licensing, with programs designed to get impacted communities into the industry. Simply Pure is part of that wave.

But having a license is only the beginning. Once the doors open, dispensaries face the same retention, marketing, and competitive intelligence challenges as everyone else — without the corporate parent company resources that MSOs can draw on.

BakedBot gives Simply Pure the same capabilities a well-funded operator gets, without the price tag that locks independent operators out.

## The Full Circle Moment

Here's what makes this story remarkable: Tahir Johnson is simultaneously:

1. A **BakedBot Company Advisor** — helping shape how we build for independent operators
2. The **MCBA President** — representing hundreds of minority cannabis business owners across the country
3. An **incoming BakedBot customer** — going live with Simply Pure Trenton

This isn't a sponsorship arrangement. This is what genuine alignment looks like. Tahir is betting his own business on the product he helped shape, and bringing the credibility of the MCBA's network with him.

For BakedBot, that means our tools will be shaped by the operators who need them most — not just the operators with the biggest budgets.

## What Simply Pure Trenton Gets on Day One

When Simply Pure goes live on BakedBot, they get:

- **Check-in & welcome flow** — every new customer automatically enters a compliant onboarding sequence
- **Win-back campaigns** — customers who haven't visited in 45 days get personalized re-engagement
- **New Jersey compliance** — all messaging pre-approved for NJ regulations by Deebo, our compliance AI
- **Competitive intelligence** — weekly reports on competing dispensaries in the Trenton/Ewing market
- **AI budtender** — strain and product recommendations powered by Smokey

If you're a social equity operator in New Jersey or anywhere in the Northeast, Simply Pure's launch is the proof of concept you've been waiting for.

[Contact us to learn more about our social equity pricing →](/contact)`,
    },

    // -------------------------------------------------------------------------
    // 3. ALLEAVES POS INTEGRATION
    // -------------------------------------------------------------------------
    {
        id: 'post_alleaves_pos_integration_2026',
        slug: 'alleaves-pos-integration-cannabis-dispensary',
        title: 'Why We Built the First Alleaves POS Integration — and What It Unlocks for Your Dispensary',
        excerpt: 'Your POS system knows everything about your customers. BakedBot\'s Alleaves integration finally makes that data work for you.',
        featuredImage: {
            url: 'https://bakedbot.ai/blog/alleaves-pos-integration-og.jpg',
            alt: 'Alleaves POS integration with BakedBot AI for cannabis dispensaries',
        },
        category: 'product',
        tags: ['alleaves', 'pos-integration', 'cannabis-data', 'dispensary-tech', 'first-party-data'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Alleaves POS Integration — BakedBot AI Cannabis Dispensary Platform',
            description: 'BakedBot built the first direct Alleaves POS integration, unlocking real-time customer data, historical order backfill, and automated retention for cannabis dispensaries.',
            keywords: 'Alleaves POS integration, cannabis POS, dispensary data, BakedBot, cannabis customer data',
        },
        readingTime: 5,
        content: `# Why We Built the First Alleaves POS Integration — and What It Unlocks for Your Dispensary

Every cannabis dispensary is sitting on a gold mine of customer data.

It lives in your POS system. Every transaction. Every customer. Every strain purchased on every visit for the past three years. It knows who your top 20% of customers are, who hasn't been back in 90 days, and exactly which products drive repeat visits.

And for most dispensaries, it's completely inaccessible.

## The Locked Data Problem

Point-of-sale systems in cannabis are built to process transactions and stay compliant with state seed-to-sale tracking. They're not built to power marketing automation, competitive analysis, or personalized customer engagement. The data is there — it's just locked inside a system that doesn't do anything with it.

BakedBot was founded on a simple premise: unlock that data and put it to work.

## Why Alleaves

**Alleaves** is one of the fastest-growing cannabis POS platforms in the country, used by dispensaries across New York, New Jersey, and beyond. It handles compliance, inventory, and transactions seamlessly — which is exactly why it made sense as BakedBot's first native POS integration.

When we went live with our first partner, Thrive Syracuse, we needed their Alleaves data to flow directly into BakedBot in real time. We built that connection from scratch.

## What the Integration Does

The Alleaves ↔ BakedBot integration works in two modes:

**Historical backfill:** On initial connection, BakedBot imports your complete order history — up to 90 days of transactions mapped to individual customer profiles. For Thrive, that was **2,999 historical orders** fully processed and normalized on day one. Existing customers were immediately eligible for win-back sequences, loyalty tiers, and personalized recommendations.

**Real-time sync:** Every new transaction syncs to BakedBot automatically. When a customer buys a concentrate and leaves the store, their profile is updated within minutes — triggering appropriate follow-up sequences, loyalty point accruals, and updated recommendation models.

## What You Can Actually Do With It

Once your Alleaves data is in BakedBot, the possibilities open up fast:

**Retention automation.** Customers who hit a 30-day lapse automatically enter a win-back sequence. No manual exports. No spreadsheets. No forgetting about someone because your team had a busy weekend.

**Segmentation.** Want to run a flash sale specifically for customers who've bought tinctures but never tried edibles? Your Alleaves history makes that segment trivially easy to build.

**Loyalty tiers.** BakedBot uses purchase frequency and lifetime value from your Alleaves history to automatically tier customers — making sure your VIPs feel like VIPs from their first visit back.

**AI recommendations.** Smokey, our AI budtender, uses your customers' actual purchase history from Alleaves to personalize every recommendation. "Something like what I got last time" becomes a real answer.

## The Bigger Picture

POS data is the most valuable first-party data a dispensary has. Banks, brands, and third-party platforms can't access it. Your customers gave it to you, transaction by transaction, visit by visit.

BakedBot's Alleaves integration is how you finally turn that data into revenue.

If you're on Alleaves — or evaluating a POS switch — [talk to us about getting connected →](/contact)`,
    },

    // -------------------------------------------------------------------------
    // 4. CANNMENUS + COMPETITIVE INTELLIGENCE
    // -------------------------------------------------------------------------
    {
        id: 'post_cannmenus_competitive_intelligence_2026',
        slug: 'cannmenus-competitive-intelligence-dispensary',
        title: 'How BakedBot Tracks 694 New York Dispensaries So You Don\'t Have To',
        excerpt: 'Our competitive intelligence engine monitors CannMenus data across every active cannabis retailer in New York. Here\'s what that looks like in practice.',
        featuredImage: {
            url: 'https://bakedbot.ai/blog/cannmenus-competitive-intelligence-og.jpg',
            alt: 'CannMenus competitive intelligence for cannabis dispensaries powered by BakedBot Ezal agent',
        },
        category: 'product',
        tags: ['competitive-intelligence', 'cannmenus', 'cannabis-data', 'ezal', 'new-york', 'dispensary-analytics'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Cannabis Competitive Intelligence — BakedBot Tracks 694 NY Dispensaries',
            description: 'BakedBot\'s Ezal agent monitors CannMenus data across all active New York dispensaries — pricing, inventory signals, and promotions — delivered as a weekly intelligence report.',
            keywords: 'cannabis competitive intelligence, CannMenus, dispensary analytics, New York cannabis market, BakedBot Ezal',
        },
        readingTime: 5,
        content: `# How BakedBot Tracks 694 New York Dispensaries So You Don't Have To

Your competitors changed their concentrate pricing last Thursday. One of them ran a BOGO on edibles over the weekend. Another just added a house brand flower that's priced below your margin floor.

Do you know about any of this? If not — you should.

## The Competitive Blind Spot

Most dispensary operators have no structured way to monitor competitor pricing, inventory moves, or promotional activity. They hear things through the grapevine, occasionally send a staff member to check menus manually, or simply assume they already know the market.

That assumption gets more expensive every week.

New York's legal cannabis market is moving fast. With hundreds of CAURD and adult-use licenses coming online across the state, the competitive landscape in every major market — Syracuse, Rochester, Albany, Buffalo, and the boroughs — is changing continuously.

## CannMenus: The Backbone of New York Cannabis Data

BakedBot's competitive intelligence engine is built on **CannMenus** — a real-time database tracking **694 active cannabis retailers across New York State**. CannMenus aggregates live menu data, pricing, inventory levels, and promotional signals across the market, updated continuously.

This is Tier 1 data for BakedBot. When Ezal — our competitive intelligence agent — runs its weekly analysis for a client, CannMenus is the primary source of truth for what competitors are doing right now.

## How Ezal Works

Ezal isn't a dashboard you log into. It's an agent that does the work and delivers the answer.

Every week, Ezal runs a market scan for each BakedBot client. For a dispensary in Syracuse, that means:

1. **Identify active competitors** — all dispensaries within the relevant market radius
2. **Pull live menu and pricing data** from CannMenus for each competitor
3. **Detect signals** — price changes, new product categories, out-of-stock patterns, promotional timing
4. **Synthesize insights** — what does this mean for your positioning this week?
5. **Deliver the report** — to your team's inbox, your agent board, and a Slack notification

Thrive Syracuse currently tracks five competitors this way: Diamond Tree, RISE Cannabis, Dazed, The Higher Company, and Verilife. Every Monday, their team knows exactly what the market looks like before their week begins.

## What This Data Actually Reveals

The most actionable competitive intelligence isn't always about price. It's about timing and pattern recognition:

**Promotional timing.** If a competitor runs a 420 sale, does their pricing normalize immediately after or do they hold discounts to drive repeat traffic? This tells you whether they're playing for volume or trying to switch customers.

**Inventory signals.** When a competitor goes consistently out-of-stock on a product category, that's a signal — either they can't source it reliably, or it's selling so fast they can't keep it stocked. Either is useful information.

**Product category moves.** If two competitors in your market both add new concentrate SKUs in the same month, something is driving that — supplier outreach, customer demand signals, or a trend they've spotted before you did.

**Pricing floors.** What's the cheapest eighth of flower in your market right now? What's the premium ceiling? Where are you positioned relative to those anchors?

## Beyond New York

CannMenus powers our New York intelligence layer, and BakedBot's Jina-powered web research extends coverage to markets where CannMenus doesn't have direct data. If you're in New Jersey, Illinois, California, or anywhere else — Ezal adapts.

The point isn't which data source. The point is that you should never be flying blind in your own market.

[See a sample competitive intelligence report →](/contact)`,
    },

    // -------------------------------------------------------------------------
    // 5. MCBA PARTNERSHIP
    // -------------------------------------------------------------------------
    {
        id: 'post_mcba_partnership_2026',
        slug: 'bakedbot-mcba-partnership-minority-cannabis',
        title: 'BakedBot Partners with the Minority Cannabis Business Association',
        excerpt: 'The MCBA is the largest national trade association for minority cannabis entrepreneurs. Our partnership makes BakedBot\'s platform available to their members at a significant discount.',
        featuredImage: {
            url: 'https://bakedbot.ai/blog/mcba-partnership-og.jpg',
            alt: 'BakedBot AI partners with Minority Cannabis Business Association MCBA',
        },
        category: 'announcements',
        tags: ['mcba', 'partnership', 'social-equity', 'minority-cannabis', 'dispensary-tech'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'BakedBot × MCBA Partnership — AI Tools for Minority Cannabis Businesses',
            description: 'BakedBot AI has officially partnered with the Minority Cannabis Business Association to provide member dispensaries with discounted access to our AI-powered platform.',
            keywords: 'MCBA partnership, minority cannabis business association, social equity cannabis tech, BakedBot, cannabis dispensary AI',
        },
        readingTime: 4,
        content: `# BakedBot Partners with the Minority Cannabis Business Association

We're proud to announce an official partnership between **BakedBot AI** and the **Minority Cannabis Business Association (MCBA)**.

The MCBA is the largest national trade association dedicated to creating a cannabis industry that is diverse, equitable, and inclusive. They represent hundreds of minority cannabis entrepreneurs across the country — dispensary owners, cultivators, brands, and operators — and they've been on the front lines of the fight for social equity licensing in state after state.

The full partnership announcement is live at [minoritycannabis.org/exciting-partnership/](https://minoritycannabis.org/exciting-partnership/).

## Why This Partnership Matters

Here's the honest truth about cannabis technology: most of it was built for operators who already had resources. The pricing structures, the implementation requirements, the onboarding processes — they were designed for MSOs and enterprise accounts, not for an independent operator who just got their CAURD license approved and is trying to figure out how to market their business in a state that doesn't let them use Google Ads.

BakedBot was built differently. We come from the same communities that are fighting for equitable access to this industry — and we believe the technology that powers enterprise cannabis operators should be accessible to the independent operators who need it just as much.

The MCBA partnership puts action behind that belief.

## What MCBA Members Get

Through this partnership, **MCBA member businesses receive discounted access to BakedBot's platform** — including:

- AI-powered customer retention automation
- Welcome flow and check-in sequence setup
- Compliance-gated SMS and email campaigns
- Competitive intelligence via Ezal
- AI budtender (Smokey) for website and in-store
- Direct engineering access during onboarding

This isn't a lite tier or a restricted feature set. MCBA members get the same platform that powers our production dispensaries — at a rate that reflects the economic realities of early-stage social equity operators.

## The Tahir Johnson Connection

Our deepest tie to the MCBA runs through **Tahir Johnson** — the MCBA's President since 2024 and a BakedBot Company Advisor. Tahir is also the founder of Simply Pure Trenton, one of BakedBot's upcoming launch partners.

Having an MCBA board leader as a company advisor isn't a branding move. It's a commitment to accountability. Tahir helps ensure that BakedBot's roadmap serves the operators MCBA represents — and that our pricing, onboarding, and support structures are genuinely accessible, not just theoretically accessible.

## If You're an MCBA Member

If you're an MCBA member and want to explore what BakedBot can do for your operation, reach out directly at [sales@bakedbot.ai](mailto:sales@bakedbot.ai) and mention your MCBA membership. We'll fast-track your access to a demo and make sure you're connected with the right team.

If you're not yet an MCBA member — [minoritycannabis.org](https://minoritycannabis.org) is where to start. They are the most important advocacy organization in the industry for operators who look like us.

This partnership is one we're proud of. More to come.`,
    },

    // -------------------------------------------------------------------------
    // 6. BIPOCANN PARTNERSHIP
    // -------------------------------------------------------------------------
    {
        id: 'post_bipocann_partnership_2026',
        slug: 'bakedbot-bipocann-partnership',
        title: 'BakedBot Joins Forces with BIPOCANN to Support Black and Brown Cannabis Entrepreneurs',
        excerpt: 'BIPOCANN is 300+ founders across 24 states fighting for equitable access in cannabis. BakedBot is proud to offer their members discounted access to our platform.',
        featuredImage: {
            url: 'https://bakedbot.ai/blog/bipocann-partnership-og.jpg',
            alt: 'BakedBot AI BIPOCANN partnership for Black and Brown cannabis entrepreneurs',
        },
        category: 'announcements',
        tags: ['bipocann', 'partnership', 'social-equity', 'black-cannabis', 'dispensary-tech'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'BakedBot × BIPOCANN Partnership — AI for Black & Brown Cannabis Operators',
            description: 'BakedBot AI partners with BIPOCANN, the national network of Black and Brown cannabis founders, to provide discounted platform access to their 300+ member community.',
            keywords: 'BIPOCANN partnership, Black cannabis entrepreneurs, social equity cannabis, BakedBot AI, minority dispensary',
        },
        readingTime: 3,
        content: `# BakedBot Joins Forces with BIPOCANN to Support Black and Brown Cannabis Entrepreneurs

BakedBot has partnered with **BIPOCANN** — the national network of Black, Indigenous, and People of Color cannabis founders — to provide discounted platform access to their member community.

Founded in 2020 by **Ernest Toney**, BIPOCANN has grown to **300+ founders across 24 states**. Their mission is direct: ensure that the people and communities most harmed by cannabis prohibition are meaningfully included in the legal industry's economic opportunity.

## Who BIPOCANN Is

BIPOCANN is not a trade association that lobbies from a distance. They're a network of operators, advocates, and entrepreneurs who are in the markets, in the dispensaries, in the licensing processes — doing the daily work of building Black and Brown-owned cannabis businesses in a regulatory environment that was not designed to make that easy.

Ernest Toney built BIPOCANN from the ground up because he saw what was happening in state after state: social equity provisions written into law but not into practice, licensing programs that created barriers almost as high as the ones they claimed to remove, and capital structures that locked out the operators they were meant to support.

BakedBot exists in the same territory. We're technology built for operators — not for venture capital portfolios.

## The Partnership

BIPOCANN members receive **discounted access to BakedBot's full platform**. That includes:

- **Compliant customer capture** — TCPA-compliant check-in flows with age verification
- **Automated welcome sequences** — day 1, day 3, and day 7 onboarding messages
- **Win-back campaigns** — reactivation flows for lapsed customers
- **Competitive intelligence** — weekly market reports via Ezal
- **AI budtender** — Smokey for website and in-store personalization

For an early-stage operator focused on capital efficiency, the math matters: you shouldn't have to choose between marketing automation and inventory. BIPOCANN pricing makes both possible.

## Why We Partner This Way

Both MCBA and BIPOCANN partnerships reflect the same belief: the technology gap between well-resourced operators and independent social equity operators is not inevitable. It's a choice — and we're choosing to close it.

If you're a BIPOCANN member and want to talk, email [sales@bakedbot.ai](mailto:sales@bakedbot.ai) with "BIPOCANN member" in the subject line.`,
    },

    // -------------------------------------------------------------------------
    // 7. YOUTUBE: INFLUENCER PODCAST #158 (Dr. Bill Williams)
    // -------------------------------------------------------------------------
    {
        id: 'post_influencer_podcast_158_2026',
        slug: 'martez-knox-influencer-podcast-bakedbot-ai',
        title: 'Martez Knox on the Influencer Podcast: How BakedBot Brings Netflix-Level Personalization to Cannabis',
        excerpt: 'In this interview with Dr. Bill Williams, BakedBot CEO Martez Knox breaks down the AI vision behind the company, the Netflix analogy, and where autonomous agents are taking the cannabis industry.',
        featuredImage: {
            url: 'https://img.youtube.com/vi/_JekbpOSAiA/maxresdefault.jpg',
            alt: 'Martez Knox BakedBot AI on Influencer Podcast with Dr. Bill Williams',
        },
        category: 'media',
        tags: ['video', 'interview', 'martez-knox', 'ai-cannabis', 'personalization', 'influencer-podcast'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Martez Knox on Influencer Podcast — BakedBot AI Cannabis Personalization',
            description: 'BakedBot CEO Martez Knox explains how AI brings Netflix-style personalization to cannabis dispensaries, discusses autonomous agents, and shares the company vision with Dr. Bill Williams.',
            keywords: 'Martez Knox interview, BakedBot AI podcast, cannabis AI personalization, influencer podcast cannabis, cannabis machine learning',
        },
        readingTime: 6,
        content: `# Martez Knox on the Influencer Podcast: How BakedBot Brings Netflix-Level Personalization to Cannabis

<iframe width="100%" height="400" src="https://www.youtube.com/embed/_JekbpOSAiA" frameborder="0" allowfullscreen title="Martez Knox, CEO BakedBot AI — Influencer Podcast #158"></iframe>

**[Watch on YouTube →](https://www.youtube.com/watch?v=_JekbpOSAiA)**

In episode #158 of the Influencer Podcast, Dr. Bill Williams sat down with Martez Knox — CEO and co-founder of BakedBot AI — for a wide-ranging conversation about artificial intelligence, the cannabis industry, and the future of personalized retail.

The interview covers BakedBot's founding story, the Netflix analogy that drives the company's product philosophy, and where Martez sees autonomous AI agents taking the dispensary experience over the next few years.

Here are the key themes from the conversation.

## The Cannabis Industry Needed a Netflix Moment

Martez opens with the analogy that has defined BakedBot's pitch since day one:

> "When you look out at the cannabis industry, it's kind of like how the movie industry was 20 years ago. You had all these different titles and all these different genres, but there was no real way of it being organized or for you to find out: is this something I would like? You might tune in and watch five movies before you actually find a good one. The innovation Netflix brought was using machine learning to discover what movies you'd actually be likely to like. That's what we're bringing to cannabis retail."

With hundreds of strains and products on the shelf, a customer who walks in and gets the wrong product — one that doesn't match their tolerance, their mood, or their medical needs — is a customer who doesn't come back. The cost of a bad experience in cannabis is a lost customer. The opportunity cost is every purchase they would have made over the next five years.

## Co-Founding BakedBot with Greg Jack Allen

Martez describes BakedBot as "one half of a duo" — he and co-founder **Greg Jack Allen** built the company together. Martez brings the marketing and lead generation background, having worked in chatbots and automation since 2018 and 2019. Greg brings the technical architecture.

Together they focused on building AI solutions at the intersection of two complex challenges: **cannabis regulation compliance** and **personalized marketing** at scale.

## BakedBot's AI Stack

When Dr. Williams asks which AI tools Martez works with, he's candid:

> "We use ChatGPT as well as — I'll say I'm a fan of Claude 3. We also have our own GPT — it's called BakedBot GPT — a cannabis-focused GPT that's trained on all sorts of neat cannabis data."

On Claude specifically: *"If there is anybody out there looking at large language models and wondering where to start, Claude is absolutely a great model. They're crushing it, particularly the ones they recently introduced."*

That practical multi-model approach — using the right model for the right task — reflects how BakedBot's internal agent architecture is built. Different agents (compliance, competitive intelligence, customer retention) use different underlying models depending on what each task demands.

## The Most Exciting Feature: Autonomous Agents

Martez describes autonomous agents as the feature he's most excited to ship:

> "These are AI software programs that are able to act independently of you regardless of what you have going on. The vision is a dispensary where your AI is handling customer reactivation, competitive monitoring, and marketing — without your team having to think about it on a Tuesday night."

For a dispensary operator who's also managing compliance, staffing, purchasing, and regulatory reporting, the promise of autonomous agents isn't a futuristic dream — it's relief. The work happens whether or not someone is in the back office watching it happen.

## The Pace of AI Progress

One of the most memorable moments in the interview is Martez's description of how fast the AI landscape moves:

> "What used to take six months now takes a month or less. Yesterday's AI is not today's AI — it's like a grown-up Ninja Warrior compared to a Kindergarten Cop."

That pace is both opportunity and pressure. For BakedBot, it means shipping faster and committing to continuous updates rather than annual release cycles. For dispensary operators, it means the gap between what's possible and what they're currently doing is closing fast — and the operators who adopt AI-native tools now will have a structural advantage over those who wait.

---

*Transcript sourced from [Influencer Podcast #158](https://www.youtube.com/watch?v=_JekbpOSAiA). Subscribe to Dr. Bill Williams on YouTube.*`,
    },

    // -------------------------------------------------------------------------
    // 8. YOUTUBE: COO WISDOM PODS
    // -------------------------------------------------------------------------
    {
        id: 'post_coo_wisdom_pods_2026',
        slug: 'ai-cannabis-martez-knox-coo-wisdom-pods',
        title: 'AI & Cannabis with Martez Knox: The Full-Funnel Approach to Dispensary Growth',
        excerpt: 'On the COO Wisdom Pods, Martez Knox explains how BakedBot attacks the full dispensary funnel — from programmatic ads to AI budtending — and why the average dispensary is leaving $400K on the table.',
        featuredImage: {
            url: 'https://img.youtube.com/vi/ITBU-GJvmBs/maxresdefault.jpg',
            alt: 'Martez Knox BakedBot AI on COO Wisdom Pods cannabis podcast',
        },
        category: 'media',
        tags: ['video', 'interview', 'martez-knox', 'ai-cannabis', 'dispensary-growth', 'full-funnel'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'AI & Cannabis with Martez Knox — COO Wisdom Pods Interview',
            description: 'BakedBot CEO Martez Knox on COO Wisdom Pods: full-funnel dispensary growth, the $400K opportunity, terpene matching, and LinkedIn outreach for cannabis operators.',
            keywords: 'Martez Knox cannabis AI interview, dispensary growth strategy, cannabis full funnel marketing, BakedBot AI, COO Wisdom Pods',
        },
        readingTime: 5,
        content: `# AI & Cannabis with Martez Knox: The Full-Funnel Approach to Dispensary Growth

<iframe width="100%" height="400" src="https://www.youtube.com/embed/ITBU-GJvmBs" frameborder="0" allowfullscreen title="AI & Cannabis with Martez Knox — COO Wisdom Pods"></iframe>

**[Watch on YouTube →](https://www.youtube.com/watch?v=ITBU-GJvmBs)**

The COO Wisdom Pods interview with Martez Knox gets into the commercial mechanics of BakedBot in a way that's unusually direct: how does AI actually move numbers for a dispensary, and what does the math look like?

The answer Martez gives is the one that tends to make dispensary operators sit up straight.

## The $400,000 Opportunity

Martez opens with a benchmark that frames everything:

> "The average dispensary is doing like two million a year. Our tool delivers a 20–25% increase in per-transaction checkout. We're talking about an extra $400,000 here."

Twenty to twenty-five percent. On a per-transaction basis. That's not a loyalty point accumulation — that's a customer who would have bought one product walking out with two, because the recommendation was right.

This is what personalization at the transaction level actually does. When a customer knows what to add to their cart — because the recommendation is based on their actual purchase history and preference profile — the average order value goes up without any promotion or discount required.

## Why BakedBot Attacked Cannabis

The host asks the obvious question: why cannabis? Why not retail broadly, or another vertical?

Martez's answer reflects the founding thesis:

> "We wanted to start where we could actually disrupt. The way people buy cannabis — we believe that experience is completely broken. People go to a dispensary and speak to a bud tender they've never met before, and the bud tender is expected to know them based on whatever brief conversation they had."

The cannabis industry in 2023 had a knowledge gap that no other retail category had. Over 700 active strains. Complex terpene and cannabinoid profiles that interact differently with different individuals. A customer base that ranges from first-time medical patients to daily recreational users. And a budtender workforce with no systematic way to match any of it.

BakedBot's AI solves that problem by replacing the guesswork with data.

## The Terpene and Cannabinoid Model

In this interview, Martez goes deeper on the science behind Smokey, BakedBot's AI budtender:

> "When you look at a strain or any cannabis product, you have terpenes, you have cannabinoids — tons of ingredients inside this magnificent plant. What we've done is look at how do the cannabinoids affect certain psychographic things — particularly like: how do you feel after you smoke this? How do you feel after you smoke a Wedding Cake?"

The model doesn't just look at strain reviews. It looks at the actual molecular composition of products and maps those compositions to reported effects, customer preference data, and purchase history. Over time, the model gets more accurate for each individual customer — the more they buy, the better the recommendations get.

This is the flywheel that makes BakedBot's data advantage compound over time. An MSO with a million transactions has a better model than a two-location operator with ten thousand transactions — unless that smaller operator is using BakedBot, which pools learning across the platform.

## The Full Funnel in Practice

Martez describes BakedBot's three-layer product architecture:

**Attract** — Programmatic advertising. Dispensaries can't run ads on Google or Facebook. BakedBot's programmatic layer puts compliant cannabis ads in front of qualified audiences in markets where advertising is permitted.

**Nurture** — Marketing dashboard with email and social campaigns. Once a customer is in the system, they get compliant sequences that keep them engaged between visits.

**Convert** — AI budtender. When the customer arrives — online or in-store — Smokey closes the gap between their intent and the right product.

Each layer feeds the next. Better advertising brings in better-matched customers. Better nurturing keeps them engaged longer. Better conversion means higher per-transaction value. The math compounds.

---

*Full interview at [COO Wisdom Pods](https://www.youtube.com/watch?v=ITBU-GJvmBs).*`,
    },

    // -------------------------------------------------------------------------
    // 9. YOUTUBE: BENZINGA CANNABIS CAPITAL 2023
    // -------------------------------------------------------------------------
    {
        id: 'post_benzinga_cannabis_capital_2023_2026',
        slug: 'benzinga-cannabis-capital-conference-2023-bakedbot',
        title: 'BakedBot at Benzinga Cannabis Capital 2023: Live from Chicago\'s Cannabis Conference of the Year',
        excerpt: 'We hit the floor of Benzinga\'s Cannabis Capital Conference at the Chicago Marriott to talk personalization, product freshness algorithms, and why the dispensary data problem is bigger than most people realize.',
        featuredImage: {
            url: 'https://img.youtube.com/vi/0DyKmwckdGg/maxresdefault.jpg',
            alt: 'BakedBot at Benzinga Cannabis Capital Conference Chicago 2023',
        },
        category: 'media',
        tags: ['video', 'conference', 'benzinga', 'chicago', 'cannabis-capital', 'martez-knox'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'BakedBot at Benzinga Cannabis Capital 2023 — Chicago Conference',
            description: 'BakedBot CEO Martez Knox at Benzinga Cannabis Capital Conference 2023, discussing dispensary personalization, shelf life algorithms, and cross-market data sharing.',
            keywords: 'Benzinga Cannabis Capital 2023, cannabis conference Chicago, BakedBot, Martez Knox, cannabis dispensary AI',
        },
        readingTime: 4,
        content: `# BakedBot at Benzinga Cannabis Capital 2023: Live from Chicago's Cannabis Conference of the Year

<iframe width="100%" height="400" src="https://www.youtube.com/embed/0DyKmwckdGg" frameborder="0" allowfullscreen title="BakedBot at Benzinga Cannabis Capital Conference 2023 Chicago"></iframe>

**[Watch on YouTube →](https://www.youtube.com/watch?v=0DyKmwckdGg)**

Benzinga's Cannabis Capital Conference brings together investors, operators, and founders from across the cannabis industry for a few days in Chicago every year. In 2023, BakedBot hit the floor at the Marriott near Michigan Avenue to talk with the team from Mea Unshackled and share what we were building.

The conversation that followed touched on some of the most underappreciated challenges in cannabis retail.

## The Shelf Life Signal

One of the most specific product details Martez shared at the conference is how BakedBot's recommendation engine weights **product freshness**:

> "Shelf life is just one of many signals, but it is weighted a little more heavily toward the longer the product's been on the shelf. If it's been there for three months, the dispensary is probably preparing to destroy it or get rid of it. What we want to do is give the consumer insight into what they're buying — I don't want to buy something that you're preparing to destroy, and frankly it's going to not be very potent relative to what it says on the label."

This is a transparency signal that most dispensary software ignores entirely. Most POS systems track inventory age for compliance purposes — to flag products approaching expiration. BakedBot uses that same data as a consumer signal: surface fresher products more prominently, deprioritize aging inventory in recommendations, and give customers the context they need to make good decisions.

The result is better customer experience and a nudge toward faster inventory turn.

## The Cross-Market Data Opportunity

The conversation touched on a question that surfaces at every cannabis conference: what would happen if the industry got serious about shared data?

> "Especially when we're talking about high quality flow — there are programs that exist like GANO for example. There is a need to share information, share data, and actually better focus on customer interaction, customer engagement — how to better streamline operations but also streamline the sales process."

This is the longer arc of where cannabis data is headed. Individual dispensary data is valuable. Aggregated, anonymized patterns across hundreds of dispensaries — what strains drive repeat visits, what categories have the highest churn, what pricing elasticity looks like by market — is transformational.

BakedBot is building toward that aggregation layer while preserving the privacy and competitive boundaries individual operators need.

## What the Conference Conversations Revealed

The Benzinga conference room conversations confirmed something BakedBot's early market research had already suggested: the operators who were most excited about AI weren't the big MSOs. They were the independent operators who saw clearly that they were operating at a structural disadvantage and were looking for technology that could close the gap.

Those operators don't need another enterprise software contract with a six-month onboarding process. They need tools that work from day one, get smarter over time, and don't require a dedicated IT team to maintain.

That's the product we came to Chicago to describe. And based on the conversations on that conference floor, it's exactly what the market was ready for.

---

*Full interview recorded live at Benzinga Cannabis Capital Conference, Chicago 2023. Watch at [youtube.com/watch?v=0DyKmwckdGg](https://www.youtube.com/watch?v=0DyKmwckdGg).*`,
    },

    // -------------------------------------------------------------------------
    // 10. YOUTUBE: REVOLUTIONIZING CANNABIS WITH AI
    // -------------------------------------------------------------------------
    {
        id: 'post_revolutionizing_cannabis_ai_2026',
        slug: 'revolutionizing-cannabis-with-ai-bakedbot',
        title: 'Revolutionizing Cannabis with AI: From Hemp\'s Colonial Roots to Autonomous Agents',
        excerpt: 'Cannabis and artificial intelligence have been on a collision course for decades. Here\'s the full story — and where BakedBot sits in that arc.',
        featuredImage: {
            url: 'https://img.youtube.com/vi/YnzXXrcb8oo/maxresdefault.jpg',
            alt: 'Martez Knox on Revolutionizing Cannabis with AI — BakedBot future of cannabis',
        },
        category: 'industry',
        tags: ['video', 'cannabis-ai', 'future-of-cannabis', 'autonomous-agents', 'martez-knox', 'cannabis-history'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Revolutionizing Cannabis with AI — Martez Knox on the Future of the Industry',
            description: 'BakedBot CEO Martez Knox traces the parallel histories of cannabis and AI from the 1600s to 2024, and maps where autonomous agents and personalization technology are taking the industry.',
            keywords: 'cannabis AI revolution, future of cannabis technology, autonomous agents cannabis, BakedBot, cannabis personalization AI',
        },
        readingTime: 5,
        content: `# Revolutionizing Cannabis with AI: From Hemp's Colonial Roots to Autonomous Agents

<iframe width="100%" height="400" src="https://www.youtube.com/embed/YnzXXrcb8oo" frameborder="0" allowfullscreen title="Martez Knox — Revolutionizing Cannabis with AI"></iframe>

**[Watch on YouTube →](https://www.youtube.com/watch?v=YnzXXrcb8oo)**

This video is unlike most startup pitch content. Instead of opening with a slide deck or a product demo, Martez Knox starts in 1981 — with the War on Drugs — and traces the parallel histories of cannabis prohibition and artificial intelligence forward to 2024.

It's the philosophical underpinning of why BakedBot exists. And it's worth understanding.

## Two Histories Converging

Cannabis and AI were born in approximately the same era. The perceptron — the first machine learning algorithm — was developed in 1958. The modern prohibition era for cannabis was codified in the 1950s and 1960s through the Boggs Act and the Controlled Substances Act.

Both were defining forces in American life for the second half of the 20th century. Both have been radically transformed in the 21st century — AI through deep learning and large language models, cannabis through legalization and the $30 billion adult-use market.

In 2024, they converge.

> "Together with pioneers like Batch Finder and Sky Tray, we're at the forefront of a new era in the cannabis industry. Our mission: to personalize your cannabis experience. With BakedBot AI's technology, we're turning every cannabis encounter into a custom-tailored journey."

## The Personalization Thesis

The video articulates BakedBot's core thesis with precision:

> "This approach not only caters to your specific desires but also elevates the overall enjoyment and satisfaction derived from cannabis — setting a new standard for personalization in the industry."

Mass-market cannabis assumed that strain recommendations were approximately one-size-fits-all. What worked for one customer would work for most customers. The experience of dozens of millions of cannabis consumers has proven this wrong.

People respond to cannabinoids and terpenes differently. Their tolerance, their body chemistry, their use context — evening vs. morning, recreational vs. medical, high-stress vs. relaxed — all affect how a product lands. The only way to account for this variation is individual data and adaptive modeling.

That's what BakedBot's AI does.

## Beyond the Budtender: Autonomous Agents

The video describes the progression from chatbots to autonomous agents — and why that progression matters for dispensary operators:

> "Moving beyond chatbots, we have autonomous agents embedded in our daily lives and providing bespoke cannabis experiences. These agents are more than just digital assistants — they're your gateway to tailored wellness. Analyzing your habits, they identify and recommend the ideal strains and dosages for your lifestyle."

An autonomous agent doesn't wait for a customer to ask a question. It monitors purchase patterns, detects behavioral signals, and takes action — sending a recommendation, triggering a reactivation sequence, flagging a competitive pricing move — without a human operator having to initiate each action manually.

This is where BakedBot's platform is headed. Not a dashboard you log into to run campaigns. An operating system that runs itself, surfaces insights, and takes action on your behalf.

## The Future: Precision and Personalization at Scale

The video closes with a vision of what personalized cannabis looks like at scale:

> "Imagine companies like the Jam Up crafting personalized cannabinoid-infused meal plans. Your day might start with a THCV-enriched coffee for an energy kick, a lunch salad drizzled with CBD oil for calm..."

This isn't science fiction for 2030. The data infrastructure to make it possible — individual purchase histories, cannabinoid preference models, daily routine integration — is being built right now. BakedBot is building the layer that connects consumer behavior data to product intelligence, so that personalization isn't a premium feature for high-spend customers, but the default experience for every cannabis consumer.

The industry is 10 years into legal cannabis. The first decade was about access — getting products to market, getting licenses approved, getting dispensaries open. The second decade is about experience — giving every customer the cannabis journey that's right for them.

That's the revolution. And it's already underway.

---

*Watch the full presentation at [youtube.com/watch?v=YnzXXrcb8oo](https://www.youtube.com/watch?v=YnzXXrcb8oo).*`,
    },

]; // END POSTS

// ---------------------------------------------------------------------------
// SEED
// ---------------------------------------------------------------------------

const collectionRef = db.collection(COLLECTION);

// Pre-fetch all existing slugs in one query to avoid N+1 per post
const existingSnapshots = await collectionRef.select('slug').get();
const existingSlugs = new Set(existingSnapshots.docs.map(d => d.get('slug')));
const existingIds = new Set(existingSnapshots.docs.map(d => d.id));

let seeded = 0;
let skipped = 0;

const writes = [];
for (const post of POSTS) {
    const { id, ...fields } = post;

    if (existingIds.has(id)) {
        console.log(`[skip] ${id} — already exists`);
        skipped++;
        continue;
    }
    if (existingSlugs.has(fields.slug)) {
        console.log(`[skip] slug "${fields.slug}" already in use`);
        skipped++;
        continue;
    }

    const doc = {
        id,
        ...fields,
        status: 'published',
        orgId: ORG_ID,
        publishedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
        deebo: { status: 'passed', checkedAt: NOW },
    };

    writes.push(
        collectionRef.doc(id).set(doc).then(() => {
            console.log(`[seeded] ${id} — "${fields.title.substring(0, 60)}..."`);
            seeded++;
        })
    );
}

try {
    await Promise.all(writes);
} catch (err) {
    console.error('[error] Firestore write failed:', err.message);
    process.exit(1);
}

console.log(`\nDone: ${seeded} seeded, ${skipped} skipped`);
process.exit(0);
