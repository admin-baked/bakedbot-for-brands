import { NextRequest, NextResponse } from 'next/server';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { generateVideoFromPrompt } from '@/ai/flows/generate-video';
import { analyzeQuery } from '@/ai/chat-query-handler';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { TalkTrack } from '@/types/talk-track';
import { findTalkTrackByTrigger } from '@/server/repos/talkTrackRepo';

// Force dynamic rendering - prevents build-time evaluation of Genkit imports
export const dynamic = 'force-dynamic';

// ============================================================================
// SMART QUESTION HANDLER - Contextual responses for custom questions
// ============================================================================

type Persona = 'brand' | 'dispensary';

interface SmartResponse {
    items: { title: string; description: string; meta?: string }[];
    agent: string;
}

/**
 * Pattern-based question handler for custom questions.
 * Returns contextual responses based on persona (Brand vs Dispensary).
 */
function getSmartResponse(prompt: string, persona: Persona): SmartResponse | null {
    const lower = prompt.toLowerCase();

    // ===== SPY ON COMPETITORS / COMPETITOR PRICING (Dispensary preset) =====
    if (lower.includes('spy on competitor') || lower.includes('competitor pricing') ||
        (lower.includes('spy') && lower.includes('near me'))
    ) {
        return {
            agent: 'ezal',
            items: [
                {
                    title: '👁️ Competitor Pricing Intel',
                    description: "I'll scan your local market to reveal:\n\n" +
                        "**Pricing Strategies** - Who's undercutting, who's premium\n\n" +
                        "**Menu Sizes** - SKU counts and category depth\n\n" +
                        "**Promo Tactics** - Current deals and loyalty programs\n\n" +
                        "**Risk Assessment** - Competitive threat levels",
                    meta: '⏱️ Manual research: 4-6 hrs → BakedBot: 2 min'
                },
                {
                    title: '🎯 Start Scanning',
                    description: "Enter your **ZIP code** and I'll show you what your competitors are doing right now.",
                    meta: '📊 1,200+ markets analyzed'
                }
            ]
        };
    }

    // ===== SCAN SITE FOR COMPLIANCE (Dispensary preset) =====
    if (lower.includes('scan my site') || lower.includes('compliance risk') ||
        lower.includes('check my compliance') || lower.includes('compliance scan')
    ) {
        return {
            agent: 'deebo',
            items: [
                {
                    title: '🛡️ Compliance Risk Scanner',
                    description: "Deebo will scan your website for:\n\n" +
                        "**Health Claims** - FDA/FTC violation risks\n\n" +
                        "**Age-Gating** - Proper verification on all pages\n\n" +
                        "**THC Display** - Correct mg/% formatting per state\n\n" +
                        "**Appeals to Minors** - Imagery, language, branding flags",
                    meta: '⚠️ Avg fine avoided: $25,000+'
                },
                {
                    title: '🔍 Scan Now',
                    description: "Paste your **website URL** and I'll identify compliance risks in seconds.",
                    meta: '📊 150+ violations caught this month'
                }
            ]
        };
    }

    // ===== SMOKEY DEMO (Dispensary preset) =====
    if (lower.includes('how smokey sells') || lower.includes('smokey in action') ||
        lower.includes('digital budtender') || lower.includes('budtender demo')
    ) {
        return {
            agent: 'smokey',
            items: [
                {
                    title: '🐻 Meet Smokey',
                    description: "I'm your AI budtender. Here's what I do:\n\n" +
                        "**Product Matching** - Terpene profiles, effects, and use cases\n\n" +
                        "**Inventory Awareness** - Only recommend what's in stock\n\n" +
                        "**Upsell Intelligence** - Suggest bundles and pairings\n\n" +
                        "**24/7 Availability** - Handle questions when staff is busy",
                    meta: '⏱️ Saves 2-3 min per customer'
                },
                {
                    title: '🎯 Try Me',
                    description: "Ask me something like: **'I need something for sleep'** or **'What's good for focus?'**",
                    meta: '📊 45+ dispensaries using Smokey'
                }
            ]
        };
    }

    // ===== PRICING & ROI (Both personas) =====
    if (lower.includes('pricing') || lower.includes('roi breakdown') ||
        lower.includes('cost') || lower.includes('subscription') ||
        lower.includes('how much')
    ) {
        return {
            agent: 'moneymike',
            items: [
                {
                    title: '💰 Pricing Tiers',
                    description: "**Free Scout** - $0/mo: 1 playbook, 3 daily tasks, lite budtender\n\n" +
                        "**Claim Pro** - $99/mo: Verified badge, lead capture, full analytics\n\n" +
                        "**Founders Deal** - $79/mo: All Pro features, price locked forever (first 250)",
                    meta: '🎁 14-day free trial on all paid plans'
                },
                {
                    title: '📈 ROI Calculator',
                    description: "**Break-even:** 1 wholesale lead OR 3 loyal customers covers monthly cost\n\n" +
                        "**Avg dispensary result:** $2,400/mo in captured leads within 60 days",
                    meta: '📊 Based on 25+ Claim Pro users'
                }
            ]
        };
    }

    // ===== FIND DISPENSARIES TO CARRY PRODUCTS (Brand preset) =====
    if (persona === 'brand' && (
        lower.includes('find dispensaries') ||
        lower.includes('carry my products') ||
        lower.includes('get my products into') ||
        lower.includes('more dispensaries') ||
        lower.includes('retail partners') ||
        lower.includes('distribution') ||
        lower.includes('wholesale') ||
        (lower.includes('expand') && lower.includes('dispensar'))
    )) {
        return {
            agent: 'ezal',
            items: [
                {
                    title: '🎯 Retail Partner Strategy',
                    description: "Great question! Here's how BakedBot helps brands expand distribution:\n\n" +
                        "**1. Market Scout Tool** - Scan any city/ZIP to find dispensaries actively looking for new brands.\n\n" +
                        "**2. Retailer Matching** - Filter by store type (rec/med), size, and product categories.\n\n" +
                        "**3. Outreach Automation** - Craig drafts personalized intro emails to buyers.",
                    meta: '⏱️ Manual research: 4-6 hrs → BakedBot: 2 min'
                },
                {
                    title: 'Try It Now',
                    description: "Enter a **City or ZIP code** and I'll find dispensaries open to carrying new brands in that market.",
                    meta: '📊 15+ brands using Market Scout'
                }
            ]
        };
    }

    // ===== SEO / ONLINE VISIBILITY =====
    if (lower.includes('seo') || lower.includes('search engine') ||
        (lower.includes('online') && lower.includes('visib')) ||
        (lower.includes('google') && (lower.includes('rank') || lower.includes('find'))) ||
        lower.includes('menu seo')
    ) {
        const seoItems = persona === 'dispensary' ? [
            {
                title: '📈 Dispensary SEO Strategy',
                description: "Here's how to improve your menu's search visibility:\n\n" +
                    "**1. Product Descriptions** - Add strain effects, terpene profiles, and use cases.\n\n" +
                    "**2. Local Keywords** - City/neighborhood in page titles and meta descriptions.\n\n" +
                    "**3. Schema Markup** - BakedBot includes Product schema for rich snippets.\n\n" +
                    "**4. Page Speed** - Our menu loads in <1s vs 3-5s for competitors.",
                meta: '📊 Avg +40% organic traffic in 90 days'
            },
            {
                title: '🔍 Free SEO Audit',
                description: "Want me to analyze your current menu? Paste your **menu URL** and I'll identify quick wins.",
                meta: '⏱️ Manual SEO audit: 2-3 hrs → Instant'
            }
        ] : [
            {
                title: '📈 Brand SEO Strategy',
                description: "Here's how BakedBot boosts your brand's visibility:\n\n" +
                    "**1. Dispensary Pages** - SEO-optimized pages showing where you're stocked.\n\n" +
                    "**2. Product Schema** - Rich snippets across all partner menus.\n\n" +
                    "**3. Local Landing Pages** - Auto-generated for every market.\n\n" +
                    "**4. Backlink Network** - Links from verified dispensary pages.",
                meta: '📊 500+ brand pages live | Avg +35% visibility'
            }
        ];
        return { agent: 'smokey', items: seoItems };
    }

    // ===== COMPETITION / COMPETITORS =====
    if (lower.includes('compet') || lower.includes('other dispensar') ||
        lower.includes('beat') && (lower.includes('chain') || lower.includes('compet')) ||
        lower.includes('stand out') || lower.includes('differentiate')
    ) {
        return {
            agent: 'ezal',
            items: [
                {
                    title: '👁️ Competitive Intelligence',
                    description: persona === 'dispensary'
                        ? "Here's how to compete with larger chains:\n\n" +
                          "**1. Price Monitoring** - Track competitor pricing daily, get undercut alerts.\n\n" +
                          "**2. Promo Analysis** - See competitor deals before they expire.\n\n" +
                          "**3. Local Advantage** - Chains can't match your community knowledge.\n\n" +
                          "**4. Loyalty Programs** - Loyalty members spend 3.2x more per visit."
                        : "Here's how to make your brand stand out:\n\n" +
                          "**1. Shelf Positioning** - See which dispensaries give premium placement.\n\n" +
                          "**2. Price Gaps** - Find markets where competitors are overpriced.\n\n" +
                          "**3. Category Gaps** - Identify underserved product categories.",
                    meta: '📊 1,200+ markets analyzed | 150+ active trackers'
                },
                {
                    title: 'Start Tracking',
                    description: "Enter a **City or ZIP** to scan the competitive landscape.",
                    meta: '⏱️ Manual intel: 4-6 hrs → BakedBot: 2 min'
                }
            ]
        };
    }

    // ===== DRAFT A CAMPAIGN (Quick action preset) =====
    if (lower.includes('draft a campaign') || lower.includes('campaign in 30') ||
        lower.includes('new drop campaign') || lower.includes('draft campaign')
    ) {
        return {
            agent: 'craig',
            items: [
                {
                    title: '📱 SMS Campaign Draft',
                    description: "🌿 NEW DROP ALERT! Fresh batch just landed. First 50 customers get 15% off. Show this text at checkout. Reply STOP to opt out.",
                    meta: '✅ TCPA Compliant | 147 chars | Ready to send'
                },
                {
                    title: '📧 Email Subject',
                    description: "\"Something Special Just Arrived 🌿\"",
                    meta: 'Open rate benchmark: 24%'
                },
                {
                    title: '📸 Social Post',
                    description: "New arrival alert! Stop by this weekend to check out our latest drop. Quality you can trust, from growers who care. 🌿 #NewDrop #LocalDispensary",
                    meta: '✅ Platform-safe | No health claims'
                },
                {
                    title: '⏱️ Time Saved',
                    description: "This would take **45-60 min** to draft, compliance-check, and schedule manually. Craig did it in **under 30 seconds**.",
                    meta: '📊 2,400+ campaigns sent via Craig'
                },
                {
                    title: '📬 What\'s Next?',
                    description: "• **Enter your email** to receive this campaign draft\n" +
                        "• **Enter your phone** to test-send the SMS version\n" +
                        "• **Draft another** for a different occasion (420, holidays, flash sale)",
                    meta: '💡 Ready to send when you are'
                }
            ]
        };
    }

    // ===== MARKETING / CAMPAIGNS (General) =====
    if (lower.includes('market') && !lower.includes('market scout') ||
        lower.includes('campaign') || lower.includes('promote') ||
        lower.includes('advertis') || lower.includes('social media') ||
        (lower.includes('email') && lower.includes('custom'))
    ) {
        return {
            agent: 'craig',
            items: [
                {
                    title: '📱 Marketing Automation',
                    description: "Craig handles multi-channel campaigns:\n\n" +
                        "**SMS Campaigns** - TCPA-compliant texts with 98% open rates.\n\n" +
                        "**Email Flows** - Welcome series, birthday rewards, re-engagement.\n\n" +
                        "**Social Content** - AI-generated posts that pass platform guidelines.\n\n" +
                        "**Compliance Built-in** - Deebo reviews every message before send.",
                    meta: '📊 2,400+ campaigns sent | 98% deliverability'
                },
                {
                    title: 'Try It',
                    description: "Ask me to **draft a campaign** for any occasion (420, Memorial Day, new product drop).",
                    meta: '⏱️ Manual draft: 45-60 min → Craig: 30 sec'
                }
            ]
        };
    }

    // ===== COMPLIANCE =====
    if (lower.includes('complian') || lower.includes('regulat') ||
        lower.includes('legal') || lower.includes('violation') ||
        lower.includes('fine') || lower.includes('audit')
    ) {
        return {
            agent: 'deebo',
            items: [
                {
                    title: '🛡️ Compliance Protection',
                    description: "Deebo monitors for violations 24/7:\n\n" +
                        "**Health Claims** - Catches FDA/FTC-triggering medical claims.\n\n" +
                        "**Age-Gating** - Ensures proper verification on all touchpoints.\n\n" +
                        "**THC Display** - Validates proper mg/% formatting per state.\n\n" +
                        "**Appeals to Minors** - Flags cartoon imagery, candy refs, youth slang.",
                    meta: '📊 150+ violations caught this month | Avg fine avoided: $25K+'
                },
                {
                    title: 'Free Audit',
                    description: "Paste your **website URL** and I'll scan for compliance risks.",
                    meta: '⏱️ Manual compliance review: 2-4 hrs → Instant'
                }
            ]
        };
    }

    // ===== ANALYTICS / REPORTING =====
    if (lower.includes('analytic') || lower.includes('report') ||
        lower.includes('data') || lower.includes('insight') ||
        lower.includes('metric') || lower.includes('performance')
    ) {
        return {
            agent: 'pops',
            items: [
                {
                    title: '📊 Analytics & Insights',
                    description: "Pops tracks your key metrics:\n\n" +
                        "**Sales Trends** - Daily, weekly, monthly revenue with forecasting.\n\n" +
                        "**Category Performance** - Which products move (and which don't).\n\n" +
                        "**Customer Cohorts** - New vs returning, loyalty impact, LTV.\n\n" +
                        "**Competitive Benchmarks** - How you compare to market averages.",
                    meta: '📊 Avg +18% repeat purchases in 90 days'
                },
                {
                    title: '⏱️ Time Savings',
                    description: "Building these reports manually takes **3-4 hours weekly**. Pops updates them in **real-time**.",
                    meta: '📊 30+ dispensaries using Pops'
                }
            ]
        };
    }

    // ===== GROWTH / SCALE =====
    if (lower.includes('grow') || lower.includes('scale') ||
        lower.includes('expand') || lower.includes('more customer') ||
        lower.includes('increase sale')
    ) {
        return {
            agent: 'hq',
            items: [
                {
                    title: '🚀 Growth Playbook',
                    description: persona === 'dispensary'
                        ? "Here's the BakedBot growth formula:\n\n" +
                          "**1. Capture** - SEO-optimized menu brings organic traffic.\n\n" +
                          "**2. Convert** - Smokey guides customers to the right products.\n\n" +
                          "**3. Retain** - Craig's automated campaigns bring them back.\n\n" +
                          "**4. Protect** - Deebo prevents costly compliance mistakes."
                        : "Here's how brands scale with BakedBot:\n\n" +
                          "**1. Discovery** - Get found in new markets via our dispensary network.\n\n" +
                          "**2. Distribution** - Ezal identifies retailers open to new brands.\n\n" +
                          "**3. Visibility** - SEO pages in every market you enter.\n\n" +
                          "**4. Intelligence** - Track sell-through and competitor pricing.",
                    meta: '📊 Avg +40% organic traffic | +18% repeat purchases'
                }
            ]
        };
    }

    // ===== BRAND FOOTPRINT / AUDIT (Brand-specific) =====
    if (lower.includes('brand footprint') || lower.includes('audit my brand') ||
        lower.includes('brand presence') || lower.includes('brand visibility') ||
        lower.includes('where my brand appears') || lower.includes('brand appears online') ||
        (lower.includes('footprint') && persona === 'brand') ||
        (lower.includes('where') && lower.includes('my brand') && lower.includes('appear'))
    ) {
        return {
            agent: 'ezal',
            items: [
                {
                    title: '🔍 Brand Footprint Audit',
                    description: "I'll analyze your brand's digital presence across the cannabis ecosystem:\n\n" +
                        "**What I'll Find:**\n" +
                        "• Dispensary menus currently carrying your products\n" +
                        "• Markets where you're strong vs. coverage gaps\n" +
                        "• How competitors position against you\n" +
                        "• SEO keyword opportunities for your brand\n\n" +
                        "**What's your brand name?** (e.g., 'Cookies', '40 Tons', 'Select')",
                    meta: '⏱️ Manual research: 3-4 hours → BakedBot: 30 seconds'
                },
                {
                    title: '📊 Sample Insight Preview',
                    description: "Here's what a typical audit reveals:\n\n" +
                        "• **Retail Partners:** 24 dispensaries carrying brand\n" +
                        "• **Top Markets:** Los Angeles, Chicago, Denver\n" +
                        "• **Coverage Gaps:** Phoenix, Miami (high demand, low presence)\n" +
                        "• **Competitor Overlap:** Cookies (67%), STIIIZY (45%)",
                    meta: '📈 Avg insight: 15 actionable opportunities found'
                }
            ]
        };
    }

    // No match - return null to fall through to default behavior
    return null;
}

// Demo responses per agent - pre-generated for speed
// Includes social proof and value props per user testing feedback
const DEMO_RESPONSES: Record<string, {
    items: { title: string; description: string; meta?: string }[];
    totalCount: number;

}> = {
    smokey: {
        items: [
            {
                title: "Blue Dream (Hybrid)",
                description: "High limonene terpene profile for uplifting effects. Great for daytime creativity without overwhelming anxiety.",
                meta: "Match confidence: 94% | In stock: Yes"
            },
            {
                title: "Granddaddy Purple (Indica)",
                description: "Myrcene-dominant for relaxation. Popular for evening wind-down and stress relief.",
                meta: "Match confidence: 89% | In stock: Yes"
            },
            {
                title: "Jack Herer (Sativa)",
                description: "Terpinolene-rich profile. Known for clear-headed focus and creative energy.",
                meta: "Match confidence: 87% | In stock: Yes"
            },
            {
                title: "💡 Why Smokey Works",
                description: "Budtenders report **saving 2-3 minutes per customer** with AI-assisted recommendations. Smokey handles 78% of product questions without human intervention.",
                meta: "📊 45+ dispensaries using Smokey"
            }
        ],
        totalCount: 13
    },
    craig: {
        items: [
            {
                title: "SMS Campaign Draft",
                description: "🎉 Memorial Day at [YOUR DISPENSARY] | Save 20% on flower all weekend! Flash sale ends Monday at midnight. Reply STOP to opt out.",
                meta: "✅ TCPA compliant | ✅ IL regulations | Character count: 147"
            },
            {
                title: "Social Media Post",
                description: "This Memorial Day, we're honoring traditions with 20% off our top-shelf flower selection. 🌿 Stop by this weekend and let us help you find the perfect product for your celebration. #MemorialDay #CannabisDeals",
                meta: "✅ Platform-safe | No health claims | 280 characters"
            },
            {
                title: "⏱️ Time Saved",
                description: "This would typically take **45-60 minutes** to draft, compliance-check, and schedule manually. Craig does it in **under 30 seconds**.",
                meta: "📊 2,400+ campaigns sent via Craig"
            }
        ],
        totalCount: 13
    },
    pops: {
        items: [
            {
                title: "Top Category: Edibles (+34% MoM)",
                description: "Gummies driving 67% of edibles revenue. Chocolate bars underperforming (-12%). Recommend expanding gummy SKUs by 2-3 new products.",
                meta: "Data from: Last 30 days | Confidence: High"
            },
            {
                title: "Customer Cohort: Repeat Buyers",
                description: "42% of customers made 2+ purchases this month. Average days between purchases: 18. Loyalty program members spend 3.2x more per visit.",
                meta: "Cohort size: 1,247 customers"
            },
            {
                title: "📈 Real Results",
                description: "Dispensaries using Pops' insights see an average **18% increase in repeat purchases** within 90 days.",
                meta: "📊 Based on 30+ active users"
            }
        ],
        totalCount: 13
    },
    ezal: {
        items: [
            {
                title: "🎯 Market Scout Ready",
                description: "Give me a **City or ZIP code** and I'll scan the local market for competitors, pricing intelligence, and retail opportunities.",
                meta: "Action: Enter location to start"
            },
            {
                title: "What I Can Find",
                description: "• Live competitor pricing & menu sizes\n• Promotional strategies being used\n• Gaps in the market for your products\n• Potential retail partners (Brand Mode)",
                meta: "Powered by: BakedBot Discovery"
            },
            {
                title: "⏱️ Why This Matters",
                description: "Manual competitive research takes **4-6 hours per market**. Ezal delivers the same intel in **under 2 minutes**.",
                meta: "📊 1,200+ markets scanned"
            }
        ],
        totalCount: 3
    },
    deebo: {
        items: [
            {
                title: "🛡️ Compliance Shield: Active",
                description: "Monitoring all marketing channels. I can alert your team via SMS the second I detect a violation (e.g., health claims, appeals to minors).",
                meta: "Status: 24/7 Watch"
            },
            {
                title: "Common Issues I Catch",
                description: "• Medical/health claims (FDA/FTC risk)\n• Missing age-gate verification\n• Incorrect THC formatting\n• Appeals to minors (imagery/language)",
                meta: "⚠️ Avg fine avoided: $25,000+"
            },
            {
                title: "Test My Reaction Time",
                description: "Reply with your phone number (e.g. 'alert 555-0199') and I'll send you a sample compliance alert via SMS.",
                meta: "📊 150+ violations caught this month"
            }
        ],
        totalCount: 5
    },
    moneymike: {
        items: [
            {
                title: "💰 Pricing Tiers",
                description: "**Claim Pro** ($99/mo): Verified Badge, Lead Capture, Full Editing.\n**Growth** ($350/mo): Multi-location, Advanced Analytics.\n**Scale** ($700/mo): Enterprise features, Priority Support.",
                meta: "🎁 Founders: $79/mo locked (First 250)"
            },
            {
                title: "ROI Calculator",
                description: "**Break-even:** 1 wholesale lead OR 3 loyal customers covers the monthly cost.\n\nAverage dispensary sees **$2,400/mo in captured leads** within 60 days.",
                meta: "📊 Based on 25+ Claim Pro users"
            }
        ],
        totalCount: 4
    },
    hq: {
        items: [
            {
                title: "🤖 Agentic Commerce OS",
                description: "BakedBot is not just a chatbot—it's a team of specialized AI employees. Core Philosophy: 'Chat is the Interface. Tools are the Muscles.' You talk, they execute tasks safely.",
                meta: "Philosophy: Employees-as-Software"
            },
            {
                title: "Meet Your Squad",
                description: "🐻 Smokey (Budtender): Product search & menus.\n📱 Craig (Marketer): Campaigns & automation.\n👁️ Ezal (Lookout): Competitor intel & discovery.\n🧠 Pops (Analyst): Revenue & KPIs.\n🔒 Deebo (Compliance): Regulation safety.\n💸 Money Mike (Banker): Pricing & margins.",
                meta: "6 Specialized Agents | 24/7 Ops"
            },
            {
                title: "Current Mission: National Discovery",
                description: "We are rolling out SEO-ready pages for every legal ZIP code to drive traffic. Our goal is to convert operators to 'Claim Pro' for verified control and lead capture.",
                meta: "Strategy: Land & Expand"
            }
        ],
        totalCount: 3
    }
};

// Fallback response if agent not found
const FALLBACK_RESPONSE = DEMO_RESPONSES.hq;


export async function POST(request: NextRequest) {
    try {
        const { agent: requestedAgent, prompt, context } = await request.json();

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // --- CONTACT EXTRACTION LOGIC ---
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
        const phoneRegex = /(\+?1?[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/;

        const emailMatch = prompt.match(emailRegex);
        const phoneMatch = prompt.match(phoneRegex);

        let actionTakenResponse = null;

        // HANDLE EMAIL ACTION
        if (emailMatch) {
            const email = emailMatch[0];
            try {
                await sendGenericEmail({
                    to: email,
                    subject: 'Your BakedBot Market Scout Report',
                    htmlBody: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h1>🔍 Market Scout Report</h1>
                            <p>Here is the competitive intelligence snapshot you requested from the Agent Playground.</p>
                            <hr />
                            <h3>Executive Summary</h3>
                            <ul>
                                <li><strong>Analyzed:</strong> 5 Local Competitors</li>
                                <li><strong>Pricing Alert:</strong> 3 competitors are undercutting you on Edibles category.</li>
                                <li><strong>Opportunity:</strong> "Blue Dream" search volume is up 200% in your area, but stock is low nearby.</li>
                            </ul>
                            <p><a href="https://bakedbot.ai/join" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Claim Your Dispensary Page to See Full Data</a></p>
                        </div>
                    `,
                    textBody: 'Your Market Scout Report is ready. Sign up at https://bakedbot.ai/join to view full competitor data.'
                });
                
                actionTakenResponse = [{
                    title: 'Report Sent! 📧',
                    description: `I've sent the Market Scout Report to ${email}. Check your inbox (and spam folder) in a moment.`,
                    meta: 'Status: Delivered'
                }];
            } catch (error) {
                console.error('Failed to send demo email:', error);
                actionTakenResponse = [{
                    title: 'Delivery Failed',
                    description: 'I tried to email the report but hit a snag. Please ensure the email address is valid.',
                    meta: 'Status: Error'
                }];
            }
        }

        // HANDLE SMS ACTION
        else if (phoneMatch) {
            const phone = phoneMatch[0];
            try {
                await blackleafService.sendCustomMessage(
                    phone,
                    '🛡️ BakedBot Alert (Deebo): Detected a potential compliance risk in your latest draft post. "Best Buds" might appeal to minors. Reply STOP to opt out.'
                );

                actionTakenResponse = [{
                    title: 'Alert Sent! 📱',
                    description: `I've sent a sample compliance alert to ${phone}. That's how fast I catch risks before they go live.`,
                    meta: 'Status: Delivered'
                }];
            } catch (error) {
                console.error('Failed to send demo SMS:', error);
                 actionTakenResponse = [{
                    title: 'Delivery Failed',
                    description: 'I tried to send the SMS alert but hit a snag. Please ensure the number is valid.',
                    meta: 'Status: Error'
                }];
            }
        }
        // -------------------------------

        // 1. Analyze Intent using Real Logic
        
        // 1. Analyze Intent using Real Logic
        
        // --- INTENTION OS (V2) ---
        // DISABLED globally per user request.
        /*
        // Optimization: Only check for complex queries to speed up simple interactions and bypass preset prompts
        const PRESET_PROMPTS = [
            "hire a market scout",
            "audit my local competition",
            "show me my sales report",
            "audit my inventory",
            "who are my top competitors",
            "find dispensaries near me",
            "start a campaign"
        ];

        const isComplexQuery = (p: string) => {
            const lowP = p.toLowerCase();
            // Bypass if it matches a known preset prompt (even if it contains complex keywords like 'audit')
            if (PRESET_PROMPTS.some(preset => lowP.includes(preset))) return false;
            
            const words = p.split(/\s+/).length;
            const complexKeywords = ['plan', 'strategy', 'breakdown', 'compare', 'analyze', 'report', 'audit', 'why', 'how'];
            // Trigger if long enough OR contains deep-dive keywords
            return words > 8 || complexKeywords.some(k => lowP.includes(k));
        };

        const userRole = context?.brandId ? 'brand' : 'dispensary';
        const isComplex = isComplexQuery(prompt);

        // Demo Chat Integration
        try {
            if (isComplex) {
                const { analyzeIntent } = await import('@/server/agents/intention/analyzer');
                // Simplified context for demo
                const intentAnalysis = await analyzeIntent(prompt, '');

                if (intentAnalysis.isAmbiguous && intentAnalysis.clarification?.clarificationQuestion) {
                    return NextResponse.json({
                        agent: 'hq', // System level clarification
                        prompt,
                        items: [{
                            title: 'Clarification Needed',
                            description: intentAnalysis.clarification.clarificationQuestion + '\n\n' + intentAnalysis.clarification.possibleIntents.map(i => '- ' + i).join('\n'),
                            meta: 'Intention OS: Ambiguity Detected'
                        }],
                        totalCount: 1,
                        generatedMedia: null
                    });
                }
            }
        } catch (e) {
            console.warn('[Demo/Chat] Intention Analyzer failed (Shadow Mode)', e);
        }
        */
        const isComplex = false; // Forced off
        // -------------------------

        const analysis = await analyzeQuery(prompt);
        let targetAgent = requestedAgent || 'smokey'; // Use requested agent as default

        // 2. Intelligent Routing based on Analysis
        // If the user explicitly requested a specialized agent, we try to stick with it 
        // unless the analysis strongly suggests another specialized tool.
        const isSpecializedRequested = requestedAgent && !['hq', 'puff', 'smokey'].includes(requestedAgent);

        if (isSpecializedRequested) {
            // Keep specialized agent unless a DIFFERENT specialized intent is detected
            if (analysis.searchType === 'marketing' && requestedAgent !== 'craig') targetAgent = 'craig';
            else if (analysis.searchType === 'competitive' && requestedAgent !== 'ezal') targetAgent = 'ezal';
            else if (analysis.searchType === 'analytics' && requestedAgent !== 'pops') targetAgent = 'pops';
            else if (analysis.searchType === 'compliance' && requestedAgent !== 'deebo') targetAgent = 'deebo';
            else targetAgent = requestedAgent; // Stick with requested
        } else {
            // Standard routing for general/hq/smokey requests
            if (requestedAgent === 'moneymike') {
                 targetAgent = 'moneymike';
            } else if (prompt.toLowerCase().includes('pricing') || prompt.toLowerCase().includes('cost') || prompt.toLowerCase().includes('subscription') || prompt.toLowerCase().includes('price')) {
                 targetAgent = 'moneymike';
            } else if (requestedAgent === 'hq' || prompt.toLowerCase().includes('bakedbot') || prompt.toLowerCase().includes('how does') || (prompt.toLowerCase().includes('work') && prompt.toLowerCase().includes('bakedbot'))) {
                targetAgent = 'hq';
            } else if (analysis.searchType === 'marketing') {
                targetAgent = 'craig';
            } else if (analysis.searchType === 'competitive') {
                targetAgent = 'ezal';
            } else if (analysis.searchType === 'analytics') {
                targetAgent = 'pops';
            } else if (analysis.searchType === 'compliance') {
                targetAgent = 'deebo'; 
            } else if ((analysis.searchType as string) === 'products' || (analysis.searchType as string) === 'brands') {
                targetAgent = 'smokey';
            } else {
                targetAgent = requestedAgent || 'smokey';
            }
        }
        
        try {
            // Only engage "Intention OS" (Episodic Thinking) for complex queries or specific triggers
            // This prevents "Thinking..." overhead for simple "Hi" or "Price check" queries
            const userRole = (context?.brandId ? 'brand' : 'dispensary') as TalkTrack['role'];
            let talkTrack: TalkTrack | null = null;
            
            if (isComplex) {
                talkTrack = await findTalkTrackByTrigger(prompt, userRole);
            }
            
            if (talkTrack) {
                // Found a matching talk track (or step match)! 
                const firstStep = talkTrack.steps[0];
                
                // Map string steps to ToolCallStep format for UI
                const thinkingSteps = firstStep.steps?.map((stepStr, idx) => ({
                    id: `tt-step-${firstStep.id}-${idx}`,
                    toolName: stepStr, // Use the string as the tool/action name
                    description: stepStr,
                    status: 'completed',
                    durationMs: 2000 + (Math.random() * 1000) // Fake duration
                }));

                return NextResponse.json({
                    agent: targetAgent, 
                    items: [{
                        id: `tt-${talkTrack.id}-${firstStep.id}`,
                        title: `Process: ${talkTrack.name}`,
                        description: firstStep.message,
                        type: 'text',
                        steps: thinkingSteps, // Pass steps for ThinkingWindow
                        meta: {
                            thoughtProcess: firstStep.thought,
                            isTalkTrack: true
                        }
                    }]
                });
            }
        } catch (e) {
            console.warn('Talk Track lookup failed', e);
        }
        
        // ---------------------------------------------------------

        // 3. Generate Agent Response (Standard Fallback)

        // 3. Executing Creative Actions (Real Tools)
        // If the user explicitly asks for creation, we run the generators regardless of agent
        let generatedMediaResult = null;
        
        // PRIORITIZE IMAGE GENERATION if explicitly requested
        if (prompt.toLowerCase().includes('image') || (analysis.marketingParams?.action === 'create_campaign' && !prompt.toLowerCase().includes('video'))) {
             try {
                const brandName = context?.brands?.[0]?.name || 'BakedBot';
                const location = context?.location?.city ? ` in ${context.location.city}` : '';
                const enhancedPrompt = `${prompt}${location}`;

                const imageUrl = await generateImageFromPrompt(enhancedPrompt, {
                    brandName
                });
                 generatedMediaResult = { type: 'image', url: imageUrl };
            } catch (error) {
                console.error('Image generation failed:', error);
            }
        } 
        // THEN CHECK FOR VIDEO
        else if (analysis.marketingParams?.action === 'create_video' || prompt.toLowerCase().includes('video')) {
             try {
                const brandName = context?.brands?.[0]?.name || 'BakedBot';
                const videoUrl = await generateVideoFromPrompt(prompt, {
                    brandName,
                    duration: '5'
                });
                generatedMediaResult = { type: 'video', url: videoUrl };
            } catch (error) {
                console.error('Video generation failed:', error);
            }
        }

        // 4. Construct Response
        // Determine persona from context
        const persona: Persona = context?.brandId ? 'brand' : 'dispensary';

        // 4a. Try smart question handler first for custom questions
        const smartResponse = getSmartResponse(prompt, persona);

        let items: { title: string; description: string; meta?: string }[];

        if (actionTakenResponse) {
            // IF ACTION TAKEN (Email/SMS sent), use that response
            items = actionTakenResponse;
        } else if (smartResponse) {
            // Smart response matched - use contextual answer
            items = smartResponse.items;
            targetAgent = smartResponse.agent; // Update agent for UI
        } else {
            // Fall back to pre-canned demo responses
            const demoResponse = DEMO_RESPONSES[targetAgent as keyof typeof DEMO_RESPONSES] || FALLBACK_RESPONSE;
            items = [...demoResponse.items];

            // 4b. For truly unrecognized questions, add helpful fallback
            const isQuestion = prompt.includes('?') ||
                prompt.toLowerCase().startsWith('how') ||
                prompt.toLowerCase().startsWith('what') ||
                prompt.toLowerCase().startsWith('why') ||
                prompt.toLowerCase().startsWith('can') ||
                prompt.toLowerCase().startsWith('do');

            const isNotPreset = !prompt.toLowerCase().includes('market scout') &&
                !prompt.toLowerCase().includes('compliance') &&
                !prompt.toLowerCase().includes('budtender') &&
                !prompt.toLowerCase().includes('pricing');

            if (isQuestion && isNotPreset && prompt.length > 20) {
                // This looks like a real question that didn't match any pattern
                items = [
                    {
                        title: "🤔 Let Me Connect You",
                        description: `That's a great question about "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}".\n\n` +
                            "For detailed answers, I'd recommend:\n\n" +
                            "**1. Book a Demo** - Our team can walk through your specific use case.\n\n" +
                            "**2. Try Our Tools** - Use the preset buttons above to see BakedBot in action.\n\n" +
                            "**3. Start Free** - Claim your dispensary/brand page and explore the dashboard.",
                        meta: "No signup required to explore"
                    },
                    {
                        title: "Quick Actions",
                        description: persona === 'dispensary'
                            ? "Try: **'Check my compliance'** or **'Spy on competitors'** to see real results."
                            : "Try: **'Find retail partners'** or **'Draft a campaign'** to see real results.",
                        meta: "Recommended for you"
                    }
                ];
                targetAgent = 'hq';
            }
        }

        // If we generated media, make it the primary focus (unless action taken)
        if (generatedMediaResult && !actionTakenResponse) {
            items = [{
                title: generatedMediaResult.type === 'image' ? 'Generated Image' : 'Generated Video',
                description: `Created based on: "${prompt}"`,
                meta: 'Generated by BakedBot Content AI', // Brand-safe label
            }];
        }

        // Inject Real Data context if applicable (e.g. Ezal)
        if (targetAgent === 'ezal' && !actionTakenResponse) {
            const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
            // Match: ZIP code, "City, ST", or plain city name (letters/spaces, 3-30 chars)
            const locationMatch = prompt.match(/^(\d{5}|[a-zA-Z\s]+,\s?[a-zA-Z]{2})$/);

            // Brand name pattern: 1-3 words, often with numbers or special casing
            // Examples: "Cookies", "40 Tons", "STIIIZY", "Select", "Raw Garden"
            const isBrandName = (text: string): boolean => {
                const words = text.trim().split(/\s+/);
                if (words.length > 4 || words.length === 0) return false;
                // Not a ZIP code
                if (/^\d{5}$/.test(text)) return false;
                // Not "City, ST" format
                if (/,\s?[A-Z]{2}$/i.test(text)) return false;
                // Has numbers mixed with letters (like "40 Tons") - likely brand
                if (/\d/.test(text) && /[a-zA-Z]/.test(text)) return true;
                // All caps (like "STIIIZY") - likely brand
                if (text === text.toUpperCase() && text.length > 2) return true;
                // Capitalized 1-2 word proper noun (like "Cookies", "Raw Garden")
                if (words.length <= 3 && /^[A-Z]/.test(text)) return true;
                return false;
            };

            // 0. Brand Footprint Audit (if brand persona and looks like brand name)
            if (persona === 'brand' && isBrandName(prompt) && !urlMatch && !locationMatch) {
                try {
                    const { getDemoBrandFootprint } = await import('@/server/services/demo-presets');
                    const result = await getDemoBrandFootprint(prompt.trim());

                    if (result.success && result.audit) {
                        const audit = result.audit;
                        items = [
                            {
                                title: `🔍 Brand Footprint: ${audit.brandName}`,
                                description: `**Retail Presence:** Found on ${audit.estimatedRetailers} dispensary menus\n\n` +
                                    `**Top Markets:** ${audit.topMarkets.join(', ')}\n\n` +
                                    `**Coverage Gaps:** ${audit.coverageGaps.join(', ')} - high search demand, low brand presence`,
                                meta: '📊 Live Brand Intel'
                            },
                            {
                                title: '📈 Growth Opportunities',
                                description: `**SEO Keywords:** "${audit.seoOpportunities[0]}", "${audit.seoOpportunities[1]}"\n\n` +
                                    `**Competitor Overlap:** ${audit.competitorOverlap.join(', ')} - customers also browse these brands`,
                                meta: '💡 Actionable Insights'
                            },
                            {
                                title: '🚀 Next Steps',
                                description: "**1. Expand to Gap Markets** - I found retailers in Phoenix & Miami actively seeking new brands.\n\n" +
                                    "**2. Claim Your Brand Page** - Get a verified SEO presence across our dispensary network.\n\n" +
                                    "**3. Set Up Competitor Tracking** - Get alerts when competitors change pricing.",
                                meta: '⏱️ Manual research: 3-4 hrs → Done in 30 sec'
                            }
                        ];
                    }
                } catch (e) {
                    console.error('Brand footprint audit failed', e);
                }
            }
            // 1. Live BakedBot Discovery Demo (if URL present)
            else if (urlMatch) {
                try {
                    const { discovery } = await import('@/server/services/firecrawl');
                    if (discovery.isConfigured()) {
                         const discoveryResult = await discovery.discoverUrl(urlMatch[0], ['markdown']);
                         const resultData = (discoveryResult as any);
                         if (resultData.success) {
                             items = [{
                                 title: resultData.metadata?.title || 'Discovered Content',
                                 description: (resultData.markdown || '').substring(0, 300) + '...',
                                 meta: '🔥 Live BakedBot Discovery'
                             }];
                             // Add a second item for stats if available
                             items.push({
                                 title: 'Discovery Stats',
                                 description: `Status: ${resultData.success ? 'Success' : 'Failed'} | Format: Markdown`,
                                 meta: 'CONFIDENTIAL INTEL'
                             });
                         }
                    }
                } catch (e) {
                    console.error('Demo discovery failed', e);
                }
            } 
            // 2. LIVE Location Search (Market Scout)
            else if (locationMatch) {
                try {
                    const { searchDemoRetailers } = await import('@/server/services/demo-setup');
                    const location = locationMatch[0];
                    const result = await searchDemoRetailers(location);

                    if (result.success && result.daa) {
                        const competitors = result.daa.slice(0, 3);
                        const enriched = result.daa.find((c: any) => c.isEnriched);

                        items = competitors.map((c: any, idx: number) => ({
                            title: `Competitor #${idx+1}: ${c.name}`,
                            description: `Pricing: ${c.pricingStrategy} | Menu: ${c.skuCount} SKUs. ${c.isEnriched ? 'Verified via BakedBot Discovery.' : ''}`,
                            meta: `Distance: ${c.distance.toFixed(1)} miles | Risk: ${c.riskScore}`
                        }));

                        if (enriched) {
                            items.unshift({
                                title: `Deep Dive: ${enriched.name}`,
                                description: enriched.enrichmentSummary,
                                meta: '🔥 LIVE INTEL'
                            });
                        }

                        // Add smart follow-up suggestions
                        items.push({
                            title: '📬 What\'s Next?',
                            description: persona === 'dispensary'
                                ? "• **Enter your email** to receive this full report\n" +
                                  "• **Try another ZIP** to scout a different market\n" +
                                  "• **Set up tracking** to get alerts when competitors change pricing"
                                : "• **Enter your email** to receive retailer contact info\n" +
                                  "• **Try another city** to find more retail partners\n" +
                                  "• **Draft an intro email** to pitch these dispensaries",
                            meta: '💡 Keep the intel flowing'
                        });
                    }
                } catch (e) {
                    console.error('Demo location search failed', e);
                }
            }
            // 3. Mock Context Injection (fallback)
            else if (context?.retailers?.length > 0) {
                 items = items.map((item, idx) => {
                    const retailer = context.retailers[idx];
                    if (retailer && item.title.includes('Competitor #')) {
                        return {
                            ...item,
                            title: `Competitor #${idx+1}: ${retailer.name}`,
                            description: item.description.replace('Green Leaf Dispensary', retailer.name),
                            meta: item.meta?.replace('2.3 miles', `${retailer.distance.toFixed(1)} miles`)
                        };
                    }
                    return item;
                });
            }
        }
        // Handle Deebo URL Compliance Check
        else if (targetAgent === 'deebo' && !actionTakenResponse) {
             const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
             if (urlMatch) {
                 const url = urlMatch[0];
                 const domain = new URL(url).hostname;
                 items = [
                     {
                         title: `Compliance Audit: ${domain}`,
                         description: `Scanning ${url} for regulatory risks...\n\n✅ Age Gate: Detected\n✅ Health Claims: Clean\n⚠️ Missing FDA Disclosure footer detected on product page.`,
                         meta: 'Risk Level: Low | Status: Passable'
                     },
                     {
                         title: 'Action Item',
                         description: 'Add standard FDA disclaimer text to footer to ensure 100% compliance with local state regulations.',
                         meta: 'Priority: Medium'
                     },
                     {
                         title: '📬 What\'s Next?',
                         description: "• **Enter your phone** to get real-time compliance alerts\n" +
                             "• **Scan another URL** to check more pages\n" +
                             "• **Set up monitoring** for automated daily scans",
                         meta: '💡 Stay compliant, avoid fines'
                     }
                 ];
             }
        }

        return NextResponse.json({
            agent: targetAgent,
            prompt,
            items: items,
            totalCount: items.length > 3 ? 13 : items.length,
            generatedMedia: generatedMediaResult
        });

    } catch (error) {
        console.error('[Demo API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process demo' },
            { status: 500 }
        );
    }
}
