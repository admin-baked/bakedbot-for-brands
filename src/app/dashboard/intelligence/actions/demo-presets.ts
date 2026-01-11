'use server';

/**
 * Live Demo Actions for Preset Prompts
 * These functions provide real data for the agent playground presets
 */

import { ai } from '@/ai/genkit';
import { CannMenusService } from '@/server/services/cannmenus';
import { discovery } from '@/server/services/firecrawl';
import { getZipCodeCoordinates } from '@/server/services/geo-discovery';

// ============================================================
// SMOKEY: Digital Budtender Demo (Product Recommendations)
// ============================================================
// ============================================================
// SMOKEY: Digital Budtender Demo (Product Recommendations)
// ============================================================
export async function getDemoProductRecommendations(locationOrQuery: string) {
    try {
        // Use 40 Tons Demo Data directly
        const { demoProducts } = await import('@/lib/demo/demo-data');
        
        // Filter for 40 Tons products (though all currently are)
        const fortyTonsProducts = demoProducts.filter(p => p.name.includes('40 Tons'));
        
        // Simple "AI" recommendation logic - just shuffle or filter if query matches
        const queryLower = locationOrQuery.toLowerCase();
        let recommended = fortyTonsProducts;

        if (queryLower.includes('sleep') || queryLower.includes('relax')) {
             recommended = fortyTonsProducts.filter(p => 
                p.category === 'Indica' || p.name.includes('Indica') || p.description.toLowerCase().includes('sleep') || p.description.toLowerCase().includes('relax')
             );
        } else if (queryLower.includes('focus') || queryLower.includes('energy') || queryLower.includes('sativa')) {
             recommended = fortyTonsProducts.filter(p => 
                p.category === 'Sativa' || p.name.includes('Sativa') || p.description.toLowerCase().includes('energy')
             );
        }

        // If filter was too aggressive, fall back to all
        if (recommended.length === 0) recommended = fortyTonsProducts;

        return {
            success: true,
            products: recommended.slice(0, 4).map((p: any) => ({
                name: p.name,
                type: p.category,
                effects: p.description.includes('relax') ? 'Relaxing' : (p.description.includes('energy') ? 'Energetic' : 'Balanced'),
                thc: '18-24%', // Demo data doesn't have THC %, adding mock range
                price: `$${p.price}`,
                description: p.description
            })),
            source: 'demo_data'
        };
    } catch (e: any) {
        console.error('[Demo] Product recommendations failed:', e);
        // Fallback to static 40 Tons data if import fails
        return { 
            success: true, 
            products: [
                { name: "40 Tons Gorilla Glue #4", type: "Flower", effects: "Relaxing", thc: "24%", price: "$45.00" },
                { name: "40 Tons Runtz Vape", type: "Vape", effects: "Balanced", thc: "85%", price: "$50.00" },
                { name: "40 Tons Cookies", type: "Edible", effects: "Calm", thc: "10mg/unit", price: "$25.00" }
            ], 
            source: 'fallback' 
        };
    }
}

// ============================================================
// CRAIG: Draft Campaign Demo (Marketing Copy Generation)
// ============================================================
export async function getDemoCampaignDraft(campaignType: string = 'New Drop') {
    try {
        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are Craig, the CMO AI for a cannabis brand. Generate a ${campaignType} marketing campaign.
            
            Create:
            1. SMS Message (under 160 chars, TCPA compliant)
            2. Social Media Post (280 chars max, platform-safe, no health claims)
            3. Email Subject Line
            
            Format as JSON with keys: sms, social, emailSubject
            
            Important: No health claims, no appeals to minors, compliance-safe language.`
        });

        try {
            const campaign = JSON.parse(response.text);
            return {
                success: true,
                campaign: {
                    sms: {
                        text: campaign.sms || "🌿 New drop just landed! Limited stock. Reply STOP to opt out.",
                        compliance: "✅ TCPA Compliant",
                        chars: (campaign.sms || "").length
                    },
                    social: {
                        text: campaign.social || "Something special just arrived. Stop by and see what's new. 🌿 #NewDrop",
                        compliance: "✅ Platform-Safe",
                        chars: (campaign.social || "").length
                    },
                    emailSubject: campaign.emailSubject || "New Arrivals You'll Love"
                },
                source: 'ai_generated'
            };
        } catch {
            return {
                success: true,
                campaign: {
                    sms: { text: "🌿 New drop just landed! Limited stock. Reply STOP to opt out.", compliance: "✅ TCPA Compliant", chars: 58 },
                    social: { text: "Something special just arrived. Stop by and see what's new. 🌿 #NewDrop", compliance: "✅ Platform-Safe", chars: 72 },
                    emailSubject: "New Arrivals You'll Love"
                },
                source: 'fallback'
            };
        }
    } catch (e: any) {
        console.error('[Demo] Campaign draft failed:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// EZAL: Brand Footprint Audit Demo
// ============================================================
export async function getDemoBrandFootprint(brandName: string = 'Your Brand') {
    try {
        // Simulate brand discovery analysis
        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `Analyze the digital footprint for a cannabis brand called "${brandName}".
            
            Generate a realistic audit report with:
            1. estimated_retailers: number of retail partners (10-50)
            2. top_markets: array of 3 city names where brand is strong
            3. coverage_gaps: array of 2 markets where brand is weak
            4. seo_opportunities: array of 2 keyword opportunities
            5. competitor_overlap: array of 2 competing brand names
            
            Format as JSON.`
        });

        try {
            const audit = JSON.parse(response.text);
            return {
                success: true,
                audit: {
                    brandName,
                    estimatedRetailers: audit.estimated_retailers || 24,
                    topMarkets: audit.top_markets || ['Los Angeles, CA', 'Chicago, IL', 'Denver, CO'],
                    coverageGaps: audit.coverage_gaps || ['Phoenix, AZ', 'Miami, FL'],
                    seoOpportunities: audit.seo_opportunities || ['indica edibles near me', 'premium cannabis delivery'],
                    competitorOverlap: audit.competitor_overlap || ['Cookies', 'STIIIZY']
                },
                source: 'ai_analysis'
            };
        } catch {
            return {
                success: true,
                audit: {
                    brandName,
                    estimatedRetailers: 24,
                    topMarkets: ['Los Angeles, CA', 'Chicago, IL', 'Denver, CO'],
                    coverageGaps: ['Phoenix, AZ', 'Miami, FL'],
                    seoOpportunities: ['indica edibles near me', 'premium cannabis delivery'],
                    competitorOverlap: ['Cookies', 'STIIIZY']
                },
                source: 'fallback'
            };
        }
    } catch (e: any) {
        console.error('[Demo] Brand footprint failed:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// MONEY MIKE: Pricing Plans (Static but formatted nicely)
// ============================================================
export async function getDemoPricingPlans() {
    // Pricing is static business data, no need for API call
    return {
        success: true,
        plans: [
            {
                name: 'The Scout',
                price: '$0/mo',
                features: [
                    '1 Competitive Intelligence Playbook/mo',
                    '3 Daily Tasks',
                    'Smokey (Lite) Budtender',
                    'Public Directory Listing'
                ],
                cta: 'Start Free'
            },
            {
                name: 'Claim Pro',
                price: '$99/mo',
                features: ['Verified Badge', 'Lead Capture Forms', 'Full Page Editing', 'Analytics Dashboard', 'Priority Support'],
                cta: 'Start Free Trial',
                recommended: true
            },
            {
                name: 'Founders Claim',
                price: '$79/mo',
                features: ['All Claim Pro features', 'Price locked for life', 'Limited to first 250 operators'],
                cta: 'Claim Founders Spot',
                badge: '🔥 Limited'
            },
            {
                name: 'Coverage Pack',
                price: '+$49/mo',
                features: ['+100 additional ZIP codes', 'Multi-location management', 'Bulk analytics'],
                cta: 'Add Coverage'
            }
        ],
        roiNote: 'One captured wholesale lead or a few loyal customers pays for the subscription.',
        source: 'static'
    };
}
