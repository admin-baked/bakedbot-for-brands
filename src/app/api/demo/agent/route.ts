import { NextRequest, NextResponse } from 'next/server';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { generateVideoFromPrompt } from '@/ai/flows/generate-video';
import { analyzeQuery } from '@/ai/chat-query-handler';

// Demo responses per agent - pre-generated for speed
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
            }
        ],
        totalCount: 13
    },
    ezal: {
        items: [
            {
                title: "Competitor #1: Green Leaf Dispensary",
                description: "Running 25% off flower sale this week. Avg prices 8% below yours on concentrates. Strong Google presence (4.7 stars, 423 reviews).",
                meta: "Threat level: Medium | Distance: 2.3 miles"
            },
            {
                title: "Market Gap Identified",
                description: "No local competitors offer subscription/membership programs. First-mover advantage opportunity for loyalty differentiation.",
                meta: "Opportunity score: 8.5/10"
            }
        ],
        totalCount: 13
    },
    deebo: {
        items: [
            {
                title: "Compliance Check: Passed ✓",
                description: "Your content complies with state regulations. No prohibited health claims detected. Age-gating requirements met.",
                meta: "Jurisdiction: Illinois | Last checked: Just now"
            },
            {
                title: "Label Audit Ready",
                description: "Product labels meet THC/CBD disclosure requirements. Batch tracking IDs verified. Child-resistant packaging confirmed.",
                meta: "Compliance Score: 98%"
            }
        ],
        totalCount: 5
    },
    moneymike: {
        items: [
            {
                title: "National Discovery Pricing",
                description: "1. Unclaimed Listing ($0/mo): Basic SEO presence.\n2. Claim Pro ($99/mo): Verified Badge, Lead Capture, Full Editing.\n3. Founders Claim ($79/mo): Locked for life (First 250).\n4. Coverage Packs: +$49/mo for +100 ZIPs.",
                meta: "Strategy: Land & Expand | Focus: MRR Volume"
            },
            {
                title: "ROI Calculation",
                description: "One captured wholesale lead or a few loyal customers pays for the Claim Pro subscription. Upsell path to Growth ($350/mo) and Scale ($700/mo) tiers available.",
                meta: "Break-even: < 1 month"
            }
        ],
        totalCount: 4
    },
    hq: {
        items: [
            {
                title: "Agentic Commerce OS",
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

        // 1. Analyze Intent using Real Logic
        const analysis = await analyzeQuery(prompt);
        let targetAgent = requestedAgent || 'smokey'; // Use requested agent as default

        // 2. Intelligent Routing based on Analysis (override if specific intent detected)
        // Check platform/HQ questions FIRST (before product search fallback)
        if (requestedAgent === 'moneymike' || prompt.toLowerCase().includes('pricing model') || prompt.toLowerCase().includes('cost') || prompt.toLowerCase().includes('price')) {
             targetAgent = 'moneymike';
        } else if (requestedAgent === 'hq' || prompt.toLowerCase().includes('bakedbot') || prompt.toLowerCase().includes('how does') || prompt.toLowerCase().includes('work')) {
            // General questions about the platform
            targetAgent = 'hq';
        } else if (analysis.searchType === 'marketing') {
            targetAgent = 'craig';
        } else if (analysis.searchType === 'competitive') {
            targetAgent = 'ezal';
        } else if (analysis.searchType === 'analytics') {
            targetAgent = 'pops';
        } else if (analysis.searchType === 'compliance') {
            targetAgent = 'deebo'; 
        } else {
            // Default to Smokey for product-related queries
            targetAgent = 'smokey';
        }

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
        // Use pre-canned items for stability in demo, but select based on routed agent
        const demoResponse = DEMO_RESPONSES[targetAgent as keyof typeof DEMO_RESPONSES] || FALLBACK_RESPONSE;
        let items = [...demoResponse.items];

        // If we generated media, make it the primary focus
        if (generatedMediaResult) {
            items = [{
                title: generatedMediaResult.type === 'image' ? 'Generated Image' : 'Generated Video',
                description: `Created based on: "${prompt}"`,
                meta: 'Generated by BakedBot Content AI', // Brand-safe label
            }];
        }

        // Inject Real Data context if applicable (e.g. Ezal)
        if (targetAgent === 'ezal') {
            const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
            
            // 1. Live Firecrawl Demo (if URL present)
            if (urlMatch) {
                try {
                    const { firecrawl } = await import('@/server/services/firecrawl');
                    if (firecrawl.isConfigured()) {
                         const scrapeResult = await firecrawl.scrapeUrl(urlMatch[0], ['markdown']);
                         const resultData = (scrapeResult as any);
                         if (resultData.success) {
                             items = [{
                                 title: resultData.metadata?.title || 'Scraped Content',
                                 description: (resultData.markdown || '').substring(0, 300) + '...',
                                 meta: '🔥 Live Firecrawl Extraction'
                             }];
                             // Add a second item for stats if available
                             items.push({
                                 title: 'Extraction Stats',
                                 description: `Status: ${resultData.success ? 'Success' : 'Failed'} | Format: Markdown`,
                                 meta: 'CONFIDENTIAL INTEL'
                             });
                         }
                    }
                } catch (e) {
                    console.error('Demo scrape failed', e);
                }
            } 
            // 2. Mock Context Injection (fallback)
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
