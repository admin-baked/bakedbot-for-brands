/**
 * Patch new blog posts to match BlogPost/BlogSEO schema exactly.
 * Fixes: seo.slug, seo.metaDescription, keywords[], author.id, valid category, missing fields.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const col = db.collection('tenants/org_bakedbot_platform/blog_posts');

const PATCHES = [
    {
        id: 'post_thrive_syracuse_case_study_2026',
        slug: 'thrive-syracuse-case-study',
        category: 'case_study',
        seoTitle: 'Thrive Syracuse Case Study — BakedBot AI-Powered Dispensary',
        metaDescription: 'How Thrive Syracuse connected Alleaves POS, activated AI-powered competitive intelligence, and launched an AI budtender — powered by BakedBot.',
        keywords: ['thrive syracuse dispensary', 'cannabis AI', 'alleaves POS', 'dispensary case study', 'BakedBot'],
    },
    {
        id: 'post_simply_pure_trenton_launch_2026',
        slug: 'simply-pure-trenton-launch-bakedbot',
        category: 'company_update',
        seoTitle: 'Simply Pure Trenton Launches on BakedBot — Social Equity Cannabis Tech',
        metaDescription: 'MCBA President and Simply Pure Trenton founder Tahir Johnson joins BakedBot as a Company Advisor and early customer. Why this partnership matters for social equity cannabis.',
        keywords: ['simply pure trenton', 'Tahir Johnson', 'MCBA', 'social equity cannabis', 'New Jersey dispensary', 'BakedBot'],
    },
    {
        id: 'post_alleaves_pos_integration_2026',
        slug: 'alleaves-pos-integration-cannabis-dispensary',
        category: 'education',
        seoTitle: 'Alleaves POS Integration — BakedBot AI Cannabis Dispensary Platform',
        metaDescription: 'BakedBot built the first direct Alleaves POS integration, unlocking real-time customer data, historical order backfill, and automated retention for cannabis dispensaries.',
        keywords: ['Alleaves POS integration', 'cannabis POS', 'dispensary data', 'BakedBot', 'cannabis customer data'],
    },
    {
        id: 'post_cannmenus_competitive_intelligence_2026',
        slug: 'cannmenus-competitive-intelligence-dispensary',
        category: 'education',
        seoTitle: 'Cannabis Competitive Intelligence — BakedBot Tracks 694 NY Dispensaries',
        metaDescription: "BakedBot's Ezal agent monitors CannMenus data across all active New York dispensaries — pricing, inventory signals, and promotions — delivered as a weekly intelligence report.",
        keywords: ['cannabis competitive intelligence', 'CannMenus', 'dispensary analytics', 'New York cannabis market', 'BakedBot Ezal'],
    },
    {
        id: 'post_mcba_partnership_2026',
        slug: 'bakedbot-mcba-partnership-minority-cannabis',
        category: 'company_update',
        seoTitle: 'BakedBot x MCBA Partnership — AI Tools for Minority Cannabis Businesses',
        metaDescription: 'BakedBot AI has officially partnered with the Minority Cannabis Business Association to provide member dispensaries with discounted access to our AI-powered platform.',
        keywords: ['MCBA partnership', 'minority cannabis business association', 'social equity cannabis tech', 'BakedBot', 'cannabis dispensary AI'],
    },
    {
        id: 'post_bipocann_partnership_2026',
        slug: 'bakedbot-bipocann-partnership',
        category: 'company_update',
        seoTitle: 'BakedBot x BIPOCANN Partnership — AI for Black and Brown Cannabis Operators',
        metaDescription: 'BakedBot AI partners with BIPOCANN, the national network of Black and Brown cannabis founders, to provide discounted platform access to their 300+ member community.',
        keywords: ['BIPOCANN partnership', 'Black cannabis entrepreneurs', 'social equity cannabis', 'BakedBot AI', 'minority dispensary'],
    },
    {
        id: 'post_influencer_podcast_158_2026',
        slug: 'martez-knox-influencer-podcast-bakedbot-ai',
        category: 'industry_news',
        seoTitle: 'Martez Knox on Influencer Podcast — BakedBot AI Cannabis Personalization',
        metaDescription: 'BakedBot CEO Martez Knox explains how AI brings Netflix-style personalization to cannabis dispensaries, discusses autonomous agents, and shares the company vision with Dr. Bill Williams.',
        keywords: ['Martez Knox interview', 'BakedBot AI podcast', 'cannabis AI personalization', 'influencer podcast cannabis', 'cannabis machine learning'],
    },
    {
        id: 'post_coo_wisdom_pods_2026',
        slug: 'ai-cannabis-martez-knox-coo-wisdom-pods',
        category: 'industry_news',
        seoTitle: 'AI and Cannabis with Martez Knox — COO Wisdom Pods Interview',
        metaDescription: 'BakedBot CEO Martez Knox on COO Wisdom Pods: full-funnel dispensary growth, the $400K opportunity, terpene matching, and LinkedIn outreach for cannabis operators.',
        keywords: ['Martez Knox cannabis AI interview', 'dispensary growth strategy', 'cannabis full funnel marketing', 'BakedBot AI', 'COO Wisdom Pods'],
    },
    {
        id: 'post_benzinga_cannabis_capital_2023_2026',
        slug: 'benzinga-cannabis-capital-conference-2023-bakedbot',
        category: 'industry_news',
        seoTitle: 'BakedBot at Benzinga Cannabis Capital 2023 — Chicago Conference',
        metaDescription: 'BakedBot CEO Martez Knox at Benzinga Cannabis Capital Conference 2023, discussing dispensary personalization, shelf life algorithms, and cross-market data sharing.',
        keywords: ['Benzinga Cannabis Capital 2023', 'cannabis conference Chicago', 'BakedBot', 'Martez Knox', 'cannabis dispensary AI'],
    },
    {
        id: 'post_revolutionizing_cannabis_ai_2026',
        slug: 'revolutionizing-cannabis-with-ai-bakedbot',
        category: 'industry_news',
        seoTitle: 'Revolutionizing Cannabis with AI — Martez Knox on the Future of the Industry',
        metaDescription: 'BakedBot CEO Martez Knox traces the parallel histories of cannabis and AI from the 1600s to 2024, and maps where autonomous agents and personalization technology are taking the industry.',
        keywords: ['cannabis AI revolution', 'future of cannabis technology', 'autonomous agents cannabis', 'BakedBot', 'cannabis personalization AI'],
    },
];

for (const { id, slug, category, seoTitle, metaDescription, keywords } of PATCHES) {
    await col.doc(id).update({
        seo: {
            title: seoTitle,
            metaDescription,
            slug,
            keywords,
            twitterCard: 'summary_large_image',
            canonicalUrl: `https://bakedbot.ai/blog/${slug}`,
        },
        category,
        'author.id': 'martez_knox',
        'author.role': 'CEO & Co-Founder, BakedBot AI',
        contentImages: [],
        version: 1,
        versionHistory: [],
        createdBy: 'seed:research_pipeline',
        subtitle: null,
        scheduledAt: null,
        authorSlug: null,
    });
    console.log(`[patched] ${id}`);
}

console.log('\nAll 10 posts patched — schema now matches BlogPost type.');
process.exit(0);
