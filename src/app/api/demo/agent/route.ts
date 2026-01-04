import { NextRequest, NextResponse } from 'next/server';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { generateVideoFromPrompt } from '@/ai/flows/generate-video';
import { analyzeQuery } from '@/ai/chat-query-handler';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { sendGenericEmail } from '@/lib/email/dispatcher';

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
                title: "Market Scout Report: Ready",
                description: "I've analyzed 50 local competitors. 3 are undercutting you on Edibles. I have the full pricing breakdown ready.",
                meta: "Status: Analysis Complete"
            },
            {
                title: "Competitor Alert",
                description: "Green Leaf Dispensary just dropped prices on Stiiizy pods by 15%. This is 5% below your current floor price.",
                meta: "Impact: High Risk"
            },
            {
                title: "Want this Report?",
                description: "Reply with your email address (e.g. 'send to name@example.com') and I'll send you the full PDF report instantly.",
                meta: "Action: Awaiting Email"
            }
        ],
        totalCount: 3
    },
    deebo: {
        items: [
            {
                title: "Compliance Shield: Active",
                description: "Monitoring all marketing channels. I can alert your team via SMS the second I detect a violation (e.g., health claims, appeals to minors).",
                meta: "Status: 24/7 Watch"
            },
            {
                title: "Test My Reaction Time",
                description: "Reply with your phone number (e.g. 'alert 555-0199') and I'll send you a sample compliance alert via SMS.",
                meta: "Action: Awaiting Phone Number"
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
        
        // --- INTENTION OS (V2) ---
        // Demo Chat Integration
        try {
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
        } catch (e) {
            console.warn('[Demo/Chat] Intention Analyzer failed (Shadow Mode)', e);
        }
        // -------------------------

        const analysis = await analyzeQuery(prompt);
        let targetAgent = requestedAgent || 'smokey'; // Use requested agent as default

        // 2. Intelligent Routing based on Analysis (override if specific intent detected)
        // Check platform/HQ questions FIRST (before product search fallback)
        if (requestedAgent === 'moneymike') {
             targetAgent = 'moneymike';
        } else if (prompt.toLowerCase().includes('pricing') || prompt.toLowerCase().includes('cost') || prompt.toLowerCase().includes('subscription') || prompt.toLowerCase().includes('price')) {
             targetAgent = 'moneymike';
        } else if (requestedAgent === 'hq' || prompt.toLowerCase().includes('bakedbot') || prompt.toLowerCase().includes('how does') || (prompt.toLowerCase().includes('work') && prompt.toLowerCase().includes('bakedbot'))) {
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
        
        // IF ACTION TAKEN (Email/SMS sent), override the response
        let items = actionTakenResponse ? actionTakenResponse : [...demoResponse.items];

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
            
            // 1. Live BakedBot Discovery Demo (if URL present)
            if (urlMatch) {
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
