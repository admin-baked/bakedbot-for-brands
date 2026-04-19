/**
 * BakedBot Explore Blog Seed — SEO posts for /explore pages
 * Seeds 8 new education/compliance/case-study posts.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed-explore-blog.mjs
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
    id: 'martez_knox',
    name: 'Martez Knox',
    role: 'CEO & Co-Founder, BakedBot AI',
    avatar: 'https://bakedbot.ai/images/martez.png',
};

// ---------------------------------------------------------------------------
// POST DEFINITIONS
// ---------------------------------------------------------------------------

const POSTS = [

    // -------------------------------------------------------------------------
    // 1. TERPENES GUIDE
    // -------------------------------------------------------------------------
    {
        id: 'post_terpenes_guide_2026',
        slug: 'what-are-terpenes-cannabis',
        title: 'What Are Terpenes in Cannabis? The Complete Guide',
        excerpt: 'Terpenes are the aromatic compounds that give cannabis its distinctive smell and shape its effects. This guide covers the top 8 cannabis terpenes — myrcene, limonene, caryophyllene, and more — and how to use terpene profiles to choose the right strain.',
        category: 'education',
        tags: ['terpenes', 'cannabis-science', 'strain-selection', 'entourage-effect', 'myrcene', 'limonene'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'What Are Terpenes in Cannabis? Complete Guide — BakedBot AI',
            metaDescription: 'Terpenes give cannabis its unique aroma and effects. Learn how myrcene, limonene, caryophyllene, and 20+ cannabis terpenes work — and how to choose strains by terpene profile.',
            slug: 'what-are-terpenes-cannabis',
            keywords: ['cannabis terpenes', 'what are terpenes', 'myrcene cannabis', 'limonene terpene', 'cannabis aroma guide'],
        },
        readingTime: 7,
        content: `# What Are Terpenes in Cannabis? The Complete Guide

If you've ever walked into a dispensary and been hit by the scent of a particularly earthy jar of flower, you've already met terpenes. They're the reason one strain smells like fresh pine and another smells like ripe mangoes — and they're increasingly understood to be a major factor in how cannabis affects you.

## What Are Terpenes?

Terpenes are aromatic compounds produced in the resin glands (trichomes) of the cannabis plant. They're not unique to cannabis — terpenes are found throughout the plant kingdom, from lavender to black pepper to citrus fruits. In cannabis, they serve an evolutionary function: attracting pollinators and repelling predators.

In legal markets, terpene percentages are now routinely reported on Certificates of Analysis (COAs). The highest-quality flower typically shows a total terpene content of 2–4% by weight, with premium craft cannabis sometimes exceeding that range.

## The Entourage Effect

The entourage effect is the theory — increasingly supported by research — that cannabis compounds work synergistically rather than in isolation. Cannabinoids like THC and CBD interact with terpenes to produce effects that are more nuanced than any single compound would deliver alone.

This is why two strains with identical THC percentages can feel completely different. The terpene profile is doing significant work.

## Top 8 Cannabis Terpenes

### 1. Myrcene
**Aroma:** Earthy, musky, herbal — reminiscent of ripe mangoes
**Effects:** Relaxing, sedating; the most common terpene in commercial cannabis
**Found in:** OG Kush, Blue Dream, Granddaddy Purple, most "indica-leaning" cultivars
**Key point:** Myrcene may enhance THC uptake across the blood-brain barrier, potentially amplifying psychoactive effects

### 2. Limonene
**Aroma:** Citrus, lemon, orange peel
**Effects:** Mood elevation, stress relief, uplifting
**Found in:** Lemon Haze, Super Lemon OG, Zkittlez, Banana OG
**Key point:** Also found in citrus rinds and used in aromatherapy for anxiety relief

### 3. Caryophyllene
**Aroma:** Peppery, spicy, woody
**Effects:** Anti-inflammatory; uniquely binds to CB2 receptors (unlike most terpenes)
**Found in:** Girl Scout Cookies, Sour Diesel, Chemdog, many OG varieties
**Key point:** The only terpene known to interact directly with the endocannabinoid system

### 4. Linalool
**Aroma:** Floral, lavender, slightly spicy
**Effects:** Calming, anxiolytic, potentially sleep-promoting
**Found in:** Lavender Kush, LA Confidential, Amnesia Haze
**Key point:** Same compound responsible for lavender's therapeutic aromatherapy effects

### 5. Pinene
**Aroma:** Fresh pine, forest air
**Effects:** Alertness, memory retention, potential bronchodilator
**Found in:** Jack Herer, Blue Dream, Romulan, Dutch Treat
**Key point:** May counteract THC-induced short-term memory impairment

### 6. Terpinolene
**Aroma:** Fresh, floral, herbal, slightly citrus
**Effects:** Uplifting, energetic — rare in high concentrations
**Found in:** Jack Herer, Ghost Train Haze, XJ-13, Durban Poison
**Key point:** One of the less common dominant terpenes; its presence often signals a particularly energetic cultivar

### 7. Ocimene
**Aroma:** Sweet, herbal, woody with citrus notes
**Effects:** Energetic, uplifting, potentially antiviral
**Found in:** Strawberry Cough, Space Queen, Golden Goat
**Key point:** More common in tropical cultivars; often contributes to "sweet" scent profiles

### 8. Humulene
**Aroma:** Earthy, hoppy, woody — the same compound that gives beer its characteristic hop aroma
**Effects:** Anti-inflammatory, appetite-suppressing (unusual in cannabis)
**Found in:** White Widow, Headband, Thin Mint GSC, many OG varieties
**Key point:** The appetite-suppressing effect is the opposite of typical cannabis munchies — worth noting for medical patients managing weight

## How to Read Terpene Percentages on a COA

A Certificate of Analysis will list terpenes as percentages by dry weight. When reading a COA:

- **Total terpene content** of 1–2% is typical for mid-tier flower
- **2–3%** indicates well-grown, terpene-rich flower
- **Above 3%** is premium craft territory
- Individual terpenes are listed separately — look at the top two or three dominant terpenes to understand the profile
- **Fresh matter vs. dry weight** matters: some labs report on dry weight basis, some on fresh. Make sure you're comparing apples to apples

## Why Smokey Recommends by Terpene Profile

BakedBot's AI budtender Smokey doesn't just ask "indica, sativa, or hybrid?" — a question that's been largely debunked as a scientific predictor of effects. Instead, Smokey builds recommendations based on a customer's terpene preferences derived from their actual purchase history.

If a customer consistently buys Lemon Haze, Super Lemon OG, and Zkittlez, Smokey infers a limonene preference and recommends new arrivals with similar profiles — even if they've never tried that specific strain. That's personalization that goes beyond strain names.

Understanding terpenes is the first step toward getting consistently better cannabis experiences. The next time you're at a dispensary, ask your budtender what the dominant terpene is — and see if it matches what you're looking for.`,
    },

    // -------------------------------------------------------------------------
    // 2. INDICA VS SATIVA VS HYBRID
    // -------------------------------------------------------------------------
    {
        id: 'post_indica_sativa_hybrid_2026',
        slug: 'indica-sativa-hybrid-guide',
        title: 'Indica vs Sativa vs Hybrid — What Science Actually Says',
        excerpt: 'The indica/sativa/hybrid distinction is one of the most persistent myths in cannabis retail. Here\'s what the science says about cannabis effects — and how terpene profiles predict your experience better than plant taxonomy.',
        category: 'education',
        tags: ['indica', 'sativa', 'hybrid', 'cannabis-science', 'strain-effects', 'terpenes'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Indica vs Sativa vs Hybrid — What\'s the Real Difference? | BakedBot',
            metaDescription: 'The indica/sativa/hybrid distinction is mostly a marketing myth. Here\'s what science actually says about cannabis effects — and how terpene profiles predict your experience better than plant taxonomy.',
            slug: 'indica-sativa-hybrid-guide',
            keywords: ['indica vs sativa', 'indica sativa hybrid difference', 'cannabis effects guide', 'sativa effects', 'indica effects'],
        },
        readingTime: 6,
        content: `# Indica vs Sativa vs Hybrid — What Science Actually Says

Walk into almost any dispensary in America and someone will ask you: "Are you looking for indica, sativa, or hybrid?" It's the cannabis industry's most universal customer interaction. It's also, according to most cannabis scientists, not a particularly useful question.

Here's why — and what actually predicts your cannabis experience.

## A 238-Year-Old Taxonomy

The indica/sativa distinction traces to 1785, when French naturalist Jean-Baptiste Lamarck classified a new species of cannabis from India — *Cannabis indica* — noting it was distinct from the European hemp plants (*Cannabis sativa*) already known to Western science.

Lamarck was describing the plant's morphology and geographic origin, not its psychoactive effects. *Cannabis indica* plants tend to be shorter, bushier, and faster-flowering than *sativa* varieties. *Cannabis sativa* plants grow taller, with longer flowering cycles and narrower leaves. That's a botanical distinction — not a pharmacological one.

## The Gap Between Label and Experience

Somewhere in the last half-century of underground cannabis culture, indica came to mean "body high, couch-lock, sleep" and sativa came to mean "head high, energetic, creative." This shorthand spread because it was useful — a way to communicate across markets where actual chemical data wasn't available.

The problem is that modern cannabis genetics have blurred any meaningful morphological distinction between the two. A 2019 study in *PLOS One* by Dr. Ethan Russo and colleagues analyzed 494 cannabis samples and found that:

- The chemical profiles of samples labeled "indica" and "sativa" overlapped substantially
- You could not reliably predict a sample's terpene or cannabinoid profile from its indica/sativa label
- The label told you more about the plant's physical appearance and geographic origin than about its likely effects

Russo has been direct about this: "The idea that indica is physically sedating and sativa is energizing is an oversimplification that isn't supported by the data."

## What Actually Predicts Effects

Two factors have strong evidence behind them as predictors of the cannabis experience:

**1. Cannabinoid ratio (THC:CBD)**

High-THC, low-CBD products tend to produce more intense psychoactive effects. Products with meaningful CBD content (4:1 CBD:THC or higher) tend to produce more relaxed, less anxious experiences with reduced intoxication intensity. This is well-documented and consistent across studies.

**2. Terpene profile**

This is where the real variation in experience comes from. A high-myrcene strain (earthy, musky) is more likely to produce sedating effects regardless of whether it's labeled indica or sativa. A high-limonene strain (citrusy) is more likely to produce uplifting, mood-elevating effects. A high-caryophyllene strain (peppery) may have more anti-inflammatory character.

The terpene profile is the pharmacological fingerprint that dispensaries used to communicate with the indica/sativa shorthand. Now that lab data is routinely available, there's no need for the shorthand.

## Why Dispensaries Still Use the Labels

If the science is settled, why does every dispensary still sort products into indica/sativa/hybrid categories?

Two reasons: **customer communication** and **expectation management**.

Most cannabis consumers — especially newer ones — learned the indica/sativa framework first. When a customer says "I want something to help me sleep," a budtender saying "you want a high-myrcene, low-limonene product with a 20:1 THC:CBD ratio" is accurate but unhelpful. Translating that to "you want an indica-leaning product" gets them to the right shelf.

The labels also serve as a rough filter. Because most "indica" products are selectively bred from high-myrcene lineages, and most "sativa" products from more energetic terpene profiles, the correlation is real even if the mechanism is terpene-driven, not taxonomy-driven.

## What to Tell Your Budtender Instead

Rather than asking "what's your best sativa?", try:

- "I want something energetic and mood-lifting for daytime — do you have anything high in limonene or terpinolene?"
- "I'm looking for something to help me relax at night without heavy sedation — what has high myrcene but not too much THC?"
- "I get anxious with high-THC products — can you show me something with more CBD in the ratio?"

Or ask about effects directly: "I want to feel creative and focused, not couch-locked or paranoid." A knowledgeable budtender can translate that into a terpene profile recommendation.

## The Bottom Line

Indica, sativa, and hybrid are marketing categories, not pharmacological predictions. The real predictors of your cannabis experience are the terpene profile and the cannabinoid ratio — both of which are now available on any lab-tested product's COA.

BakedBot's Smokey budtender is built around this science from the ground up. When Smokey recommends a product, it's reasoning from actual terpene and cannabinoid data — not from whether a plant grew tall or short in a field in 1785.`,
    },

    // -------------------------------------------------------------------------
    // 3. HOW TO READ A COA
    // -------------------------------------------------------------------------
    {
        id: 'post_coa_lab_results_2026',
        slug: 'how-to-read-a-coa-lab-results',
        title: 'How to Read a Cannabis COA (Lab Results) — Dispensary Guide',
        excerpt: 'A Certificate of Analysis tells you exactly what\'s in your cannabis. This guide teaches you to decode potency panels, terpene profiles, pesticide screens, and microbial tests — and what red flags to avoid.',
        category: 'education',
        tags: ['coa', 'lab-results', 'cannabis-testing', 'potency', 'dispensary-guide'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'How to Read Cannabis Lab Results (COA) — Complete Guide | BakedBot',
            metaDescription: 'A Certificate of Analysis (COA) tells you exactly what\'s in your cannabis. Learn to decode potency panels, terpene profiles, pesticide screens, and microbial tests — and what to avoid.',
            slug: 'how-to-read-a-coa-lab-results',
            keywords: ['how to read cannabis lab results', 'COA cannabis', 'certificate of analysis dispensary', 'cannabis potency test', 'cannabis testing guide'],
        },
        readingTime: 7,
        content: `# How to Read a Cannabis COA (Lab Results) — Dispensary Guide

Every legal cannabis product sold at a licensed dispensary in the United States has been through third-party laboratory testing. The results of that testing are captured in a document called a Certificate of Analysis — commonly abbreviated COA.

Most consumers never look at a COA. That's a missed opportunity. The COA is the most objective piece of information available about a cannabis product, and knowing how to read one can meaningfully improve your buying decisions.

This guide walks through every major section.

## What Is a COA?

A Certificate of Analysis is a document issued by an independent, accredited cannabis testing laboratory. It reports the results of chemical analysis conducted on a specific batch of cannabis product.

Key things to know before you read one:

- **Accredited lab requirement:** In all legal cannabis states, COAs must be issued by a state-licensed, third-party laboratory. The dispensary cannot use its own lab — this protects against manipulation.
- **Batch-specific:** A COA applies to a specific production batch, identified by a lot or batch number. When products are retested, a new COA is issued.
- **Scan the QR code:** Most modern product labels include a QR code that links directly to the COA. This is the fastest way to verify authenticity.

## Section 1: Potency Panel

The potency panel is usually the first (and for most consumers, most important) section of a COA. It reports the concentration of major cannabinoids as a percentage of dry weight.

**Key cannabinoids to understand:**

**THCA (Tetrahydrocannabinolic Acid)**
The raw, acidic form of THC before heating (decarboxylation). Flower products will have high THCA and low THC — the THCA converts to THC when you smoke or vaporize. For flower, THCA percentage is the most meaningful potency indicator.

**THC (Delta-9-Tetrahydrocannabinol)**
The active psychoactive compound after decarboxylation. In flower, this number is naturally low — most THC in unheated flower exists as THCA. In edibles and tinctures, the conversion has already happened, so this number reflects the active dose.

**Total THC calculation:** Total THC = THC + (THCA × 0.877)
The 0.877 factor accounts for the molecular weight loss during decarboxylation. This is the number to compare when evaluating potency across products.

**CBDA and CBD**
The raw (CBDA) and active (CBD) forms of cannabidiol. Same relationship as THCA/THC. CBD-forward products will have high CBDA for flower, high CBD for extracts.

**CBG (Cannabigerol)**
A minor cannabinoid increasingly found in significant concentrations in some cultivars. Emerging research suggests potential anti-inflammatory and antibacterial properties.

**CBN (Cannabinol)**
Cannabinol forms when THC degrades over time, typically due to heat, light, or oxygen exposure. High CBN in a product can indicate old or improperly stored material.

**Red flag:** High CBN in fresh flower may indicate poor storage conditions or older harvest.

## Section 2: Terpene Panel

The terpene panel lists aromatic compounds by concentration (percentage by weight). Not all COAs include terpene panels — it's an add-on test, and some budget testing packages omit it.

When present, look for:

- **Total terpene content:** 1–2% is typical, 2–3% is good, 3%+ is exceptional
- **Dominant terpenes:** The top two or three terpenes drive the aroma and experience profile
- **Cross-reference with your preferences:** If you know you respond well to limonene, look for products where it appears in the top three

## Section 3: Pesticide Screen

Pesticide screens test for the presence of dozens of regulated pesticides that cannot be used in cannabis cultivation. Results are reported as Pass or Fail, with specific compounds listed if any exceed action limits.

**What to look for:** A clean "PASS" with no detected pesticides is the target. Any "FAIL" means the product should not be on legal dispensary shelves.

**Common pesticides screened:** Imidacloprid, bifenazate, spinosad, myclobutanil (notorious for producing hydrogen cyanide when combusted), and dozens of others depending on the state's testing requirements.

## Section 4: Microbial Screen

Microbial testing checks for the presence of pathogenic microorganisms that could pose health risks, particularly for immunocompromised patients.

**Key pathogens screened:**

- **E. coli (STEC):** Must be absent or below action limits in all products
- **Salmonella:** Must be absent in all products
- **Total yeast and mold (TYMC):** Threshold varies by product type; flower typically has higher allowable limits than extracts
- **Aspergillus species:** Particularly important for medical cannabis — some Aspergillus strains can cause serious lung infections

**Important:** Vaporized cannabis bypasses most of the lung's natural defenses for catching particles. Mold in vaporized products can reach the lungs in ways that smoked products may partially filter.

## Section 5: Heavy Metals

Heavy metals testing checks for lead, cadmium, arsenic, and mercury. Cannabis is a known bioaccumulator — it absorbs heavy metals readily from soil, which is why soil quality and grow medium testing matters.

**Action limits** are state-specific but are set to protect consumers from chronic heavy metal exposure. A clean PASS is standard for any reputable product.

## Section 6: Residual Solvents (Concentrates Only)

For concentrates, extracts, vape cartridges, and edibles, residual solvent testing checks that extraction solvents have been purged to safe levels. Common solvents tested: butane, propane, ethanol, CO2-derived residuals, and others.

**What to look for:** All solvents should be below action limits. Heavy solvent residuals in a concentrate indicate incomplete purging — which affects both safety and flavor.

## Batch Numbers and Traceability

Every COA includes the batch or lot number that links the test results to a specific production run. In state seed-to-sale tracking systems (Metrc is the most common), this batch number creates an unbroken chain from cultivation through dispensary sale.

If you ever have a question about a product you bought, the batch number on the label should match the batch number on the COA. If they don't match, that's a significant red flag.

## How BakedBot Surfaces COA Data

For every product in a BakedBot-connected dispensary's menu, BakedBot surfaces potency and terpene data directly in the product recommendation flow. Smokey doesn't recommend products blind — it reasons from the actual chemical data.

If you're ever buying cannabis and can't find a COA, ask the budtender for it. A dispensary that can't produce one for any product on its shelves is operating below the standard you should expect.`,
    },

    // -------------------------------------------------------------------------
    // 4. BEST DISPENSARIES NEW YORK
    // -------------------------------------------------------------------------
    {
        id: 'post_best_dispensaries_new_york_2026',
        slug: 'best-dispensaries-new-york',
        title: 'Best Dispensaries in New York — What to Look For in 2025',
        excerpt: 'New York has over 280 licensed cannabis dispensaries. Here\'s a guide to finding the best dispensary near you — what to look for in inventory quality, staff expertise, compliance, and technology.',
        category: 'case_study',
        tags: ['new-york', 'dispensary-guide', 'cannabis-retail', 'caurd', 'ocm'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Best Dispensaries in New York — Licensed Cannabis Retailers 2025 | BakedBot',
            metaDescription: 'New York has over 280 licensed cannabis dispensaries. Here\'s how to find the best dispensary near you — what to look for in inventory quality, service, and compliance.',
            slug: 'best-dispensaries-new-york',
            keywords: ['best dispensaries New York', 'NY cannabis dispensary', 'licensed dispensary NYC', 'CAURD dispensary', 'New York weed dispensary'],
        },
        readingTime: 6,
        content: `# Best Dispensaries in New York — What to Look For in 2025

New York's adult-use cannabis market has grown substantially since the Marihuana Regulation and Taxation Act (MRTA) was signed in 2021. With over 280 licensed dispensaries operating across the state as of 2025, New York consumers now have real choices — and the quality gap between operators is significant.

This guide won't rank specific dispensaries (the market moves too fast, and rankings age poorly). Instead, it gives you the criteria to evaluate any dispensary for yourself — plus what to know about New York's unique regulatory context.

## Understanding New York's Cannabis Market

**The MRTA and OCM**

New York's adult-use cannabis program is overseen by the Office of Cannabis Management (OCM), which was established under the MRTA. The OCM handles licensing, enforcement, product standards, and consumer protection across the state's cannabis market.

All legal dispensaries in New York must be licensed by the OCM. You can verify any dispensary's license status at the OCM's public registry at cannabis.ny.gov.

**The CAURD Program**

New York's Conditional Adult Use Retail Dispensary (CAURD) program was designed with social equity as a central principle. CAURD licenses were specifically reserved for:

- Justice-impacted individuals (those with prior cannabis convictions)
- Minority-owned businesses
- Women-owned businesses
- Distressed farmers

The CAURD program has produced some of the most interesting and community-connected dispensaries in the state — often run by operators who have deep personal stakes in the cannabis reform that made their businesses possible. Simply Pure Trenton (in neighboring New Jersey, operated by MCBA President Tahir Johnson) is a model for what this kind of operator can build when supported by the right technology.

## What Makes a Great Dispensary

### 1. COA Transparency

The best dispensaries make Certificates of Analysis easily accessible — either through a QR code on every product, a digital menu that links to lab results, or staff who can pull them on request. If a dispensary can't show you a COA for any product on its shelves, that's a significant gap.

Lab-tested, compliant product is a legal requirement, but the accessibility of that data varies enormously between operators.

### 2. Staff Knowledge

A well-trained staff can explain:
- What the dominant terpenes in a product are
- How to read a COA potency panel
- What differentiated a product with similar THC percentage from another

Staff training varies widely. The best operators invest in ongoing education — some through formal programs like the National Cannabis Industry Association (NCIA), others through their own internal training systems.

### 3. Inventory Diversity and Freshness

Look for:
- **Multiple product categories:** flower, pre-rolls, vape, edibles, tinctures, concentrates, topicals
- **Multiple price tiers:** budget, mid, premium — good operators serve multiple customer segments
- **Freshness:** batch dates on products; nothing older than 6 months on the flower shelf
- **Local and craft options:** New York has a growing craft cannabis sector; dispensaries that carry local cultivators are often better-connected to the supply chain

### 4. Loyalty Programs and Personalization

The best dispensaries know who their customers are and treat returning customers differently than first-time visitors. Effective loyalty programs:

- Recognize returning customers at check-in
- Track purchase history to make relevant recommendations
- Offer genuine rewards (not just points that expire before anyone uses them)
- Send re-engagement offers when customers haven't visited in a while

BakedBot-connected dispensaries run AI-powered loyalty programs that pull from actual purchase history — not just visit counts.

### 5. Compliance and Professionalism

Any licensed dispensary must comply with OCM requirements. Signs of strong compliance culture:
- Age verification protocols that are consistent and thorough
- Clear signage about consumption restrictions
- No medical claims in product descriptions or staff recommendations
- Packaging that meets state child-resistant and plain-packaging requirements

### 6. Technology and Convenience

The operational gap between well-resourced dispensaries and smaller operators often shows up in technology:
- Online ordering or menu browsing
- Digital check-in
- Text or email updates on orders and specials
- AI-assisted product recommendations (like BakedBot's Smokey)

## How BakedBot Tracks the New York Market

BakedBot's competitive intelligence engine monitors 694 active cannabis retailers across New York State via CannMenus. For BakedBot-connected dispensaries like Thrive Syracuse, this means weekly reports on competitor pricing, inventory moves, and promotional activity.

That same data set is what allows BakedBot to help its dispensary partners position competitively — adjusting pricing, timing promotions, and identifying product category gaps before competitors do.

The best New York dispensaries are increasingly AI-native operations. The gap between operators running on gut instinct and those running on live data is growing every month.`,
    },

    // -------------------------------------------------------------------------
    // 5. NY COMPLIANCE 2025
    // -------------------------------------------------------------------------
    {
        id: 'post_ny_compliance_2025_2026',
        slug: 'cannabis-compliance-new-york-2025',
        title: 'New York Cannabis Compliance Guide for Dispensaries — 2025',
        excerpt: 'A complete guide to New York cannabis regulations for licensed dispensaries in 2025, covering advertising rules, packaging requirements, delivery laws, and possession limits under the MRTA.',
        category: 'compliance',
        tags: ['new-york', 'compliance', 'mrta', 'ocm', 'cannabis-regulations', 'dispensary-law'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'New York Cannabis Compliance Guide 2025 — Dispensary Regulations | BakedBot',
            metaDescription: 'Complete guide to New York cannabis regulations for licensed dispensaries in 2025 — advertising rules, packaging requirements, delivery laws, and possession limits under the Marihuana Regulation and Taxation Act.',
            slug: 'cannabis-compliance-new-york-2025',
            keywords: ['New York cannabis compliance 2025', 'NY dispensary regulations', 'MRTA cannabis rules', 'OCM cannabis guidelines', 'New York cannabis advertising rules'],
        },
        readingTime: 8,
        content: `# New York Cannabis Compliance Guide for Dispensaries — 2025

New York's cannabis regulatory framework is one of the most comprehensive in the country, built around the Marihuana Regulation and Taxation Act (MRTA) signed by Governor Cuomo in March 2021. For licensed dispensaries, understanding and maintaining compliance is not optional — the Office of Cannabis Management (OCM) has enforcement authority and has been actively applying it.

This guide covers the major compliance requirements for adult-use retail dispensaries operating in New York as of 2025.

**Note:** Cannabis regulations change frequently. This guide reflects requirements as of early 2025. Always verify current requirements directly with the OCM at cannabis.ny.gov.

## The MRTA Framework

The Marihuana Regulation and Taxation Act established the OCM as New York's primary cannabis regulatory body and created the structure for legal adult-use, medical, and hemp markets. Key elements:

- Adults 21+ may purchase cannabis from licensed retailers
- The OCM issues licenses for cultivation, processing, distribution, and retail
- Social equity is a statutory priority — the CAURD program was created under MRTA authority
- Local municipalities retain some authority over whether dispensaries can operate in their jurisdiction

## Advertising and Marketing Rules

New York's cannabis advertising rules are among the most restrictive in the country. The OCM has issued detailed advertising guidance that all dispensaries must follow.

**Prohibited in advertising:**
- Any imagery or content that could appeal to minors (no cartoon characters, no imagery targeting under-21 audience)
- Health or medical claims of any kind ("cures anxiety," "treats insomnia" — all prohibited)
- Price advertising in certain formats (discount claims in most outdoor and broadcast formats are restricted)
- False or misleading statements about products or competitors
- Any suggestion that cannabis is safe for all populations

**Platform restrictions:**
- Google and Meta prohibit cannabis advertising entirely — this is a platform policy, not just a state rule
- Programmatic cannabis-specific ad networks are permitted but must target only 21+ verified audiences
- Social media organic content is permitted but must not be targeted at under-21 users and must not include health claims

**What this means for dispensaries:** Nearly every form of traditional advertising is either prohibited or heavily restricted. Cannabis marketing has largely moved to owned channels (email, SMS, loyalty programs), in-store, and cannabis-specific platforms. This is precisely why AI-powered customer retention — which operates on a first-party customer relationship rather than advertising — is so valuable in this market.

## Packaging Requirements

New York requires cannabis products to comply with detailed packaging standards:

- **Child-resistant:** All cannabis products must be in child-resistant packaging that meets federal consumer safety standards
- **Opaque:** Packaging must conceal the product from view — clear packaging showing the product is not permitted
- **Plain packaging:** Minimal design requirements; packaging should not be attractive to minors and must not include any imagery of people or animals
- **Required labeling:** Product name, producer name, batch number, cannabinoid content (THC, CBD in mg), serving size, total servings, net weight, required warnings, QR code linking to COA
- **Universal symbol:** New York's required cannabis warning symbol must appear on all packaging

## Possession Limits

**For consumers:**
- Up to 3 ounces (85 grams) of cannabis flower in public
- Up to 24 grams of concentrated cannabis (extracts, oils)
- Home possession: up to 5 pounds (personal cultivation is legal for adults — up to 6 plants)

**For dispensaries:** Licensed retailers must comply with inventory limits set under their license type. Purchasing above authorized quantities is a compliance violation.

## Delivery Regulations

Cannabis delivery in New York is permitted but subject to specific requirements:

- Only licensed delivery operators may conduct cannabis deliveries
- Delivery personnel must be at least 21 years old
- Age verification at delivery is required (government ID check on receipt)
- Delivery vehicles may not display cannabis branding on exteriors
- Delivery routes and records must be maintained for regulatory review
- Cash transactions for delivery are subject to specific recordkeeping requirements

## Laboratory Testing Requirements

All cannabis products sold in New York must be tested by an OCM-licensed, independent testing laboratory before sale. Required tests include:

- Cannabinoid potency panel
- Pesticide residue screen
- Heavy metals screen
- Microbial contaminants (E. coli, Salmonella, yeast, mold, Aspergillus)
- Residual solvents (for concentrates and extracts)
- Foreign matter visual inspection

Batch records and COAs must be retained and available for OCM inspection.

## Employee Requirements: Handler Permits

All employees who directly handle cannabis — including dispensary staff, budtenders, and backroom inventory employees — must obtain a Cannabis Handler Permit from the OCM. Requirements include:

- State-approved training program completion
- Background check
- Application through the OCM licensing portal

Dispensaries that allow unlicensed employees to handle cannabis products risk license suspension.

## Social Equity Provisions

The MRTA includes extensive social equity provisions that affect dispensary operations:

- Priority licensing for justice-impacted individuals and minority-owned businesses (CAURD program)
- 40% of adult-use tax revenue directed to community reinvestment
- OCM social equity staff and programs
- Mentorship requirements for some license categories

For dispensaries serving communities disproportionately impacted by cannabis prohibition, these provisions represent both compliance obligations and potential partnership opportunities.

## Common Compliance Violations

OCM enforcement actions have focused on several common violations:

1. **Unlicensed sales:** Operating without a valid license or allowing license to lapse
2. **Youth-targeted marketing:** Advertising with imagery or channels that reach under-21 audiences
3. **Medical claims:** Staff making health or medical claims about products
4. **Testing failures:** Selling products that failed required testing or without COAs
5. **Record-keeping failures:** Inability to produce required documentation during inspection
6. **Employee violations:** Staff without required Handler Permits handling products

## How BakedBot's Deebo Handles Compliance

BakedBot's compliance agent, Deebo, monitors all customer communications — SMS campaigns, email sequences, automated messages — against New York and other state compliance requirements before they send. Every message is reviewed for:

- Health claims (zero tolerance)
- Prohibited pricing language
- Youth-appeal risk
- Appropriate disclosure language

For dispensaries operating in multiple states, Deebo applies state-specific rule sets to ensure every message meets the requirements for its delivery jurisdiction.

Compliance in cannabis is not a one-time setup — it's an ongoing operational requirement. The best operators treat it as infrastructure, not as overhead.`,
    },

    // -------------------------------------------------------------------------
    // 6. STRAIN GUIDE FOR BEGINNERS
    // -------------------------------------------------------------------------
    {
        id: 'post_strain_guide_beginners_2026',
        slug: 'cannabis-strain-guide-beginners',
        title: 'Cannabis Strain Guide for Beginners — How to Choose What\'s Right for You',
        excerpt: 'New to cannabis? This guide explains strains, potency, terpenes, and consumption methods — so you can make confident choices at any dispensary without feeling overwhelmed.',
        category: 'education',
        tags: ['beginners', 'cannabis-guide', 'strain-selection', 'first-time', 'dispensary-guide'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Cannabis Strain Guide for Beginners — How to Choose Your First Strain | BakedBot',
            metaDescription: 'New to cannabis? This beginner\'s guide explains cannabis strains, potency, terpenes, and consumption methods — so you can make confident choices at any New York dispensary.',
            slug: 'cannabis-strain-guide-beginners',
            keywords: ['cannabis strain guide beginners', 'first time cannabis', 'how to choose cannabis strain', 'beginner dispensary guide', 'cannabis for beginners'],
        },
        readingTime: 6,
        content: `# Cannabis Strain Guide for Beginners — How to Choose What's Right for You

Walking into a dispensary for the first time can feel overwhelming. Hundreds of products, dozens of strains, multiple consumption formats, varying potency levels — and a budtender who's used to working with experienced customers.

This guide gives you the foundation to walk in with confidence, make good decisions, and avoid the most common beginner mistakes.

## The Most Important Rule: Start Low, Go Slow

Before anything else: **5mg THC is a full beginner dose.** Not 10mg. Not 25mg. 5mg.

The cannabis industry's standard edible "serving size" is 10mg THC in most states, but this is a regulatory artifact — not a dosing recommendation for beginners. Many experienced cannabis consumers find 10mg to be a strong dose. For beginners, 5mg is the right starting point.

The same principle applies to inhalation. If you're smoking or vaporizing flower, one inhale, wait 15 minutes, and assess how you feel before continuing.

The most common bad first experiences with cannabis come from consuming too much too quickly — particularly with edibles, where the onset can take 45–90 minutes and beginners often consume more because they don't feel effects yet.

## The Three Things That Matter

Once you're past the start-low rule, three factors determine your experience:

### 1. Cannabinoid Ratio (THC:CBD)

**High THC, low CBD** products will produce stronger psychoactive effects. For beginners, this means more potential for anxiety, paranoia, or feeling "too high." Start with lower-THC products (under 15% for flower, under 10mg for edibles).

**CBD-forward or balanced** (roughly equal THC:CBD or higher CBD) products tend to produce milder, more relaxed experiences with reduced intoxication intensity. CBD appears to modulate some of THC's more anxiety-provoking effects.

For beginners, a 1:1 THC:CBD product or a CBD-dominant product with just a small amount of THC is often a better starting point than high-THC flower.

### 2. Terpene Profile

As discussed in our terpenes guide, the aromatic compounds in cannabis significantly influence the character of the experience. For beginners:

- **High myrcene** (earthy, musky): relaxing, potentially sedating — better for evening
- **High limonene** (citrusy): mood-lifting, uplifting — better for daytime
- **High linalool** (floral, lavender): calming, anxiolytic — good for anxiety-prone beginners
- **High caryophyllene** (peppery): anti-inflammatory, generally mild on the psychoactive spectrum

### 3. Consumption Method

Different consumption methods have very different onset times and effect durations:

**Inhalation (smoking, vaping):**
- Onset: 5–15 minutes
- Duration: 1–3 hours
- Easier to control — you can stop after one inhale and wait

**Edibles:**
- Onset: 45–90 minutes (sometimes longer, especially after a meal)
- Duration: 4–8 hours
- Harder to control — once consumed, you wait
- Common beginner mistake: taking more because "I don't feel anything yet"

**Tinctures (sublingual):**
- Onset: 15–45 minutes
- Duration: 3–6 hours
- Precise dosing (drops have known THC content)
- Good beginner option for controlled, measurable dosing

**Topicals:**
- No psychoactive effect
- Localized, targeted relief
- Safe starting point for those nervous about intoxication

## What to Tell Your Budtender

You don't need to know all of this before your first dispensary visit. A good budtender will guide you. But the more specific you can be about what you want, the better recommendation you'll get.

**Useful things to communicate:**
- Your experience level (first time, or limited experience)
- What effect you're looking for (relaxation, creativity, sleep, pain relief, social anxiety)
- Time of day you'll be using (daytime vs. evening)
- How important it is to avoid feeling too intoxicated
- Your preference for consumption method

**Less useful (but fine to say):**
- "I want an indica/sativa" — the budtender can translate this, but giving them your desired effect is more precise

## Common Beginner Mistakes

**1. Starting with the highest THC percentage**
High THC does not mean better experience, especially for beginners. It often means overwhelming experience.

**2. Ignoring the terpene profile**
Two products at the same THC level can feel completely different. The terpene profile is doing significant work — ask what's dominant.

**3. Not checking the COA**
Any legal dispensary can pull a Certificate of Analysis for any product. If you're curious about exactly what's in what you're buying, ask.

**4. Wrong setting for the experience**
Being in an uncomfortable environment can amplify anxiety responses. Your first experience should be in a calm, familiar setting — ideally with a person you trust nearby.

**5. Mixing with alcohol**
Even small amounts of alcohol significantly intensify THC effects. Avoid combination for your first several experiences.

## How BakedBot's Smokey Helps Beginners

Smokey, BakedBot's AI budtender, was built specifically to give beginners the same quality of personalized guidance that an experienced budtender would. When you interact with Smokey, it:

- Asks about your experience level before making any recommendation
- Defaults to lower-potency, terpene-first suggestions for beginners
- Explains why it's recommending what it's recommending (which terpenes, which cannabinoid ratio)
- Learns from your purchase history and feedback to refine recommendations over time

The goal isn't to upsell you to the most expensive or highest-potency product on the shelf. It's to help you find something that works for you — so you come back.`,
    },

    // -------------------------------------------------------------------------
    // 7. DISPENSARY LOYALTY PROGRAMS
    // -------------------------------------------------------------------------
    {
        id: 'post_dispensary_loyalty_programs_2026',
        slug: 'dispensary-loyalty-programs-work',
        title: 'How Dispensary Loyalty Programs Work — And How AI Makes Them Smarter',
        excerpt: 'Cannabis dispensary loyalty programs reward repeat customers with points, discounts, and exclusive access. Here\'s how they work, why most fail, and how AI-powered loyalty is changing the game.',
        category: 'education',
        tags: ['loyalty-programs', 'dispensary-retention', 'cannabis-marketing', 'customer-retention', 'ai-loyalty'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'How Dispensary Loyalty Programs Work — Points, Perks & AI | BakedBot',
            metaDescription: 'Cannabis dispensary loyalty programs reward repeat customers with points, discounts, and exclusive deals. Here\'s how they work — and how AI is making them smarter.',
            slug: 'dispensary-loyalty-programs-work',
            keywords: ['dispensary loyalty program', 'cannabis rewards program', 'dispensary points', 'cannabis customer retention', 'best dispensary rewards'],
        },
        readingTime: 6,
        content: `# How Dispensary Loyalty Programs Work — And How AI Makes Them Smarter

Every dispensary wants loyal customers. Most have some version of a loyalty program. Very few have loyalty programs that actually drive measurable repeat purchase behavior.

This guide explains how cannabis loyalty programs work, why the traditional model often underperforms, and what AI-powered loyalty looks like in practice.

## How Traditional Cannabis Loyalty Programs Work

The standard dispensary loyalty program structure is straightforward:

**Points accumulation:**
- Earn 1 point per dollar spent (typical baseline)
- Points accumulate in a customer profile tied to phone number or loyalty card
- Periodic bonus point events (double points Tuesdays, birthday months, etc.)

**Redemption:**
- Thresholds like "$5 off for every 100 points"
- Sometimes tiered — spend more, earn at a higher rate
- Occasional "exclusive" products or early access for top-tier members

**Communication:**
- SMS or email blasts announcing sales, new products, or bonus point events
- Birthday messages (usually with a discount offer)
- Reactivation messages for customers who haven't visited

This structure works reasonably well at keeping engaged customers engaged. Where it falls apart is with the 60–70% of customers who enroll in a loyalty program and then gradually reduce their visit frequency anyway.

## Why Most Dispensary Loyalty Programs Underperform

**Generic offers don't create relevance.** A blast SMS saying "20% off concentrates this weekend" is relevant to customers who buy concentrates. For the flower-only customer, it's noise. Send enough irrelevant messages and customers opt out of communication entirely.

**No purchase history analysis.** Most basic loyalty systems track points but don't analyze what a customer actually buys. Without that analysis, personalization is impossible — and impersonalized loyalty programs are just discount vending machines.

**The wrong timing.** A win-back message sent to a customer who lapsed 90 days ago is less effective than one sent at 30 days. By 90 days, the new habit has formed. But most loyalty platforms don't trigger automatically at the right behavioral signal — they require manual campaign management that most small operators don't have time for.

**Points that expire before use.** This is the trust-destroying design choice. A customer accumulates 400 points over six months, never reaches the redemption threshold, and then sees their points expire. They feel deceived — correctly — and you've created negative sentiment instead of positive loyalty.

## What AI-Powered Loyalty Looks Like

BakedBot's loyalty system is built on a fundamentally different model: behavioral segmentation driven by actual purchase history.

**Purchase pattern analysis:**
Every transaction is analyzed across product category, brand, price point, time of day, and visit frequency. Over time, each customer profile builds a rich behavioral fingerprint.

**Trigger-based automation:**
Instead of manual campaign scheduling, BakedBot triggers loyalty communications based on behavioral events:
- Day 1 after first purchase: welcome sequence with product recommendations based on first purchase
- Day 7: educational content matched to product category bought
- Day 30 without return: early win-back sequence with personalized offer
- Day 60 without return: stronger win-back with higher-value offer
- Post-purchase follow-up: "How was [product they bought]? Based on your history, you might also like..."

**Personalized offers, not generic discounts:**
If a customer consistently buys vape cartridges, they get an offer on vape cartridges — not a storewide 15% off. The offer is relevant because it's based on what that specific customer actually buys.

**Result:** BakedBot-connected dispensaries see 3x better retention rates compared to blast SMS campaigns — because the message is relevant, the timing is right, and the offer matches what the customer actually wants.

## What to Look For as a Customer

As a cannabis consumer evaluating dispensaries, a strong loyalty program looks like:

**They know what you buy.** When a recommendation feels like it's based on your actual history ("we got a new batch of the Lemon Haze you got last time, you should check it out"), that's a good sign.

**Offers are relevant.** If you only buy flower, you shouldn't be getting edibles promotions every week. Irrelevant offers signal that the dispensary is blasting everyone the same message.

**Points don't expire on you.** A loyalty program that expires your points before you can redeem them is a red flag about how the business thinks about the customer relationship.

**Easy to redeem.** Redemption at point of sale, not through a separate app with a complicated process. The easier it is, the more likely you'll actually use it.

**They reach out at the right time.** A win-back offer that arrives right when you're thinking about restocking — not 90 days after your last visit — shows a program that's actually paying attention.

## The Business Case for AI Loyalty

For dispensaries, the math is straightforward. Customer acquisition in a regulated, advertising-restricted market is expensive. Retaining an existing customer costs a fraction of acquiring a new one.

A BakedBot-powered dispensary that retains 10% more of its existing customer base — through timely, personalized, relevant communication — generates substantially more revenue without adding a dollar of advertising spend.

That's what smart loyalty looks like. And it's what separates the dispensaries that survive the next phase of market consolidation from the ones that don't.`,
    },

    // -------------------------------------------------------------------------
    // 8. SOCIAL EQUITY CANNABIS NY
    // -------------------------------------------------------------------------
    {
        id: 'post_social_equity_cannabis_ny_2026',
        slug: 'social-equity-cannabis-new-york',
        title: 'Social Equity Cannabis in New York — How CAURD Is Reshaping the Industry',
        excerpt: 'New York\'s CAURD program prioritizes cannabis licenses for communities most impacted by the War on Drugs. BakedBot AI partners with MCBA and BIPOCANN to support social equity operators with affordable, enterprise-grade technology.',
        category: 'company_update',
        tags: ['social-equity', 'caurd', 'new-york', 'mcba', 'bipocann', 'minority-cannabis', 'justice-equity'],
        contentType: 'standard',
        parentPostId: null,
        author: MARTEZ,
        seo: {
            title: 'Social Equity Cannabis in New York — CAURD Program & BakedBot\'s Mission | BakedBot',
            metaDescription: 'New York\'s CAURD program prioritizes cannabis licenses for communities most impacted by the War on Drugs. BakedBot AI partners with MCBA and BIPOCANN to support social equity operators with affordable technology.',
            slug: 'social-equity-cannabis-new-york',
            keywords: ['social equity cannabis New York', 'CAURD program', 'minority cannabis dispensary', 'MCBA cannabis', 'Black cannabis operators'],
        },
        readingTime: 7,
        content: `# Social Equity Cannabis in New York — How CAURD Is Reshaping the Industry

When New York legalized adult-use cannabis in 2021, lawmakers made an explicit commitment: the communities most harmed by cannabis prohibition should be at the front of the line when legal industry opportunity arrived.

That commitment became the Conditional Adult Use Retail Dispensary program — CAURD — and it's produced some of the most interesting, community-connected dispensary operators in the country.

Here's what the program actually is, where it's succeeded and struggled, and why BakedBot has made social equity operators a central part of our mission.

## What Social Equity Means in Cannabis

The United States enforced cannabis prohibition unequally for decades. Black and Brown communities were arrested at far higher rates than white communities for equivalent cannabis activity, even in markets where enforcement was ostensibly applied uniformly.

The result: millions of cannabis convictions, disproportionately concentrated in communities of color, that carried ongoing consequences for housing, employment, and education long after sentences were served.

When states began legalizing adult-use cannabis, the operators best positioned to enter the market were those with capital, legal resources, and connections — generally white-owned multistate operators (MSOs) that could scale quickly and secure the most favorable licenses.

Social equity licensing programs were designed to push back against that pattern. The theory: people and communities harmed by prohibition enforcement should have priority access to the legal market that was built on the foundation of that enforcement.

New York's MRTA made this explicit in statute.

## New York's CAURD Program

The Conditional Adult Use Retail Dispensary program created a new license category with priority access for:

- **Justice-impacted individuals:** People with prior cannabis convictions, or immediate family members of people with cannabis convictions
- **Minority Business Enterprises (MBEs)**
- **Women Business Enterprises (WBEs)**
- **Distressed farmers**

CAURD applicants were required to demonstrate they qualified under one of these categories and meet standard financial and operational requirements. In exchange, they received priority processing and, in the early rollout, access to the first legal dispensary locations in the state.

The New York Supreme Court ordered the OCM to pause CAURD license issuance for several months in 2023 following a legal challenge from a Michigan-based MSO that argued the program disadvantaged them. The program eventually resumed, but the delay was a setback for many operators who had planned their launches around the original timeline.

## The Gap Between License and Success

Getting a CAURD license is significant. Building a successful dispensary from that license is a different challenge entirely.

Many CAURD licensees are first-time business owners entering an industry with:
- Complex regulatory compliance requirements
- Advertising restrictions that make traditional customer acquisition impossible
- Well-capitalized competitors (MSOs) that can absorb startup losses
- Technology needs (POS systems, loyalty programs, marketing automation) that are expensive and fragmented

The promise of CAURD is meaningful equity in the license application process. What it doesn't automatically provide is equity in the operational capabilities that determine whether a dispensary survives past year two.

This is where BakedBot operates.

## The MCBA Partnership

The Minority Cannabis Business Association (MCBA) is the largest national trade association for minority cannabis entrepreneurs, representing hundreds of dispensaries, cultivators, and brands across the country.

BakedBot has a formal partnership with the MCBA that gives MCBA member businesses discounted access to the full BakedBot platform — the same AI-powered retention automation, competitive intelligence, and compliance monitoring that larger operators use, at a price point accessible to early-stage social equity operators.

**Tahir Johnson,** the MCBA's President and founder of Simply Pure Trenton (a New Jersey dispensary operated by an MCBA member), is a BakedBot Company Advisor. Simply Pure is an active BakedBot customer — meaning the MCBA's own president is betting his business on the tools we've built to serve his community.

The formal partnership announcement is live at [minoritycannabis.org/exciting-partnership/](https://minoritycannabis.org/exciting-partnership/).

## The BIPOCANN Partnership

BakedBot has also partnered with BIPOCANN — the national network of Black, Indigenous, and People of Color cannabis founders, founded by Ernest Toney in 2020. BIPOCANN has grown to 300+ founders across 24 states.

BIPOCANN members receive discounted access to BakedBot's platform under the partnership. The same capabilities available to well-resourced operators — personalized customer retention, AI budtending, competitive intelligence — at pricing that reflects the economic realities of early-stage social equity operators.

## The Simply Pure Trenton Story

Simply Pure Trenton opened at 1531 N. Olden Ave. in Ewing Township, New Jersey in July 2023. It's run by Tahir Johnson — simultaneously the MCBA President, a BakedBot Company Advisor, and an independent dispensary operator who built his business from the ground up.

What makes Simply Pure notable isn't just who runs it — it's what it represents. Tahir is betting his own business on the same tools he advocates for other minority operators. There's no gap between what he recommends to MCBA members and what he's deploying at his own location.

When Simply Pure came onto BakedBot, they received the same onboarding as any operator — welcome flow setup, customer retention automation, competitive intelligence for the Trenton/Ewing market, and Deebo-cleared communications compliance.

## BakedBot's Equity Pricing Model

BakedBot's MCBA and BIPOCANN partnership pricing is not a lite tier or a restricted feature set. Social equity partner operators get access to the full platform — the same tools that power Thrive Syracuse and every other BakedBot-connected dispensary.

What changes is the price. We believe the technology gap between well-funded MSOs and independent social equity operators is not inevitable. It's a choice. We're choosing to close it.

## Why Cannabis Tech Equity Matters

The long-term health of the cannabis industry depends on what happens in the next five years. If independent social equity operators are systematically outcompeted by MSOs — not because of product quality or service, but because of technology and operational efficiency — the industry will consolidate rapidly in ways that undermine the social equity commitments written into law in New York, New Jersey, and elsewhere.

The dispensaries built by justice-impacted founders, minority entrepreneurs, and community-connected operators are doing something MSOs fundamentally cannot: demonstrating that cannabis legalization can be a genuine economic empowerment tool for the communities most harmed by prohibition.

BakedBot's mission is to make sure those operators have the tools to compete and win.

If you're a social equity operator in New York or anywhere in the country, reach out at [sales@bakedbot.ai](mailto:sales@bakedbot.ai). Mention MCBA or BIPOCANN membership for partner pricing.`,
    },

]; // END POSTS

// ---------------------------------------------------------------------------
// SEED
// ---------------------------------------------------------------------------

const collectionRef = db.collection(COLLECTION);

// Pre-fetch all existing doc IDs and slugs in one query
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
        createdBy: 'agent:craig',
        viewCount: 0,
        contentImages: [],
        version: 1,
        versionHistory: [],
        deebo: { status: 'passed', checkedAt: NOW },
    };

    writes.push(
        collectionRef.doc(id).set(doc).then(() => {
            console.log(`[seeded] ${id} — "${fields.title.substring(0, 60)}..."`);
            return true;
        })
    );
}

let results;
try {
    results = await Promise.all(writes);
} catch (err) {
    console.error('[error] Firestore write failed:', err.message);
    process.exit(1);
}

seeded = results.filter(Boolean).length;
console.log(`\nDone: ${seeded} seeded, ${skipped} skipped`);
process.exit(0);
