/**
 * Demo Agent API - Public-facing demo execution
 * 
 * Rate limiting: 5 demos/day per session (tracked client-side)
 * Returns partial results (3 shown, 10 locked)
 */

import { NextRequest, NextResponse } from 'next/server';

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
            },
            { title: "Green Crack (Sativa)", description: "Energizing daytime strain...", meta: "Match: 85%" },
            { title: "OG Kush (Hybrid)", description: "Classic relaxation strain...", meta: "Match: 82%" },
            { title: "Girl Scout Cookies (Hybrid)", description: "Balanced euphoria and body...", meta: "Match: 80%" },
            { title: "Durban Poison (Sativa)", description: "Pure sativa energy...", meta: "Match: 78%" },
            { title: "Northern Lights (Indica)", description: "Deep relaxation...", meta: "Match: 75%" },
            { title: "Sour Diesel (Sativa)", description: "Fuel-forward energy...", meta: "Match: 73%" },
            { title: "Wedding Cake (Hybrid)", description: "Rich flavor, balanced...", meta: "Match: 70%" },
            { title: "Gelato (Hybrid)", description: "Dessert flavor, chill vibes...", meta: "Match: 68%" },
            { title: "Pineapple Express (Hybrid)", description: "Tropical energy...", meta: "Match: 65%" },
            { title: "Purple Punch (Indica)", description: "Evening relaxation...", meta: "Match: 62%" }
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
                title: "Email Subject Lines (A/B Test)",
                description: "A: \"Your Memorial Day weekend just got better 🎉\" | B: \"20% OFF flower - this weekend only\" | C: \"Limited time: Memorial Day savings inside\"",
                meta: "Open rate prediction: A (32%) B (28%) C (25%)"
            },
            { title: "Instagram Story", description: "Swipe-up story template...", meta: "Engagement: High" },
            { title: "Push Notification", description: "Flash sale alert copy...", meta: "CTR estimate: 8%" },
            { title: "Loyalty Email", description: "VIP member exclusive...", meta: "Loyalty segment" },
            { title: "Google Business Post", description: "Local SEO post...", meta: "GMB optimized" },
            { title: "Text Reminder (Day-of)", description: "Last chance copy...", meta: "Urgency: High" },
            { title: "Thank You Follow-up", description: "Post-purchase email...", meta: "Retention" },
            { title: "Referral Campaign", description: "Share with friends...", meta: "Viral potential" },
            { title: "Review Request", description: "Rate your experience...", meta: "5-star boost" },
            { title: "Win-back Email", description: "We miss you copy...", meta: "Re-engagement" },
            { title: "Birthday Offer", description: "Special day discount...", meta: "Personalization" }
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
                title: "Inventory Alert: Low Stock",
                description: "5 SKUs projected to stockout within 7 days based on current velocity: Blue Dream 3.5g, Gummy Bears 10pk, Pre-roll 5pk, Cart 1g, Tincture 500mg",
                meta: "Reorder recommended: $4,200 estimated"
            },
            { title: "Revenue Trend", description: "Weekly revenue chart...", meta: "+12% week-over-week" },
            { title: "Peak Hours", description: "Traffic by hour analysis...", meta: "4-7pm highest" },
            { title: "Basket Analysis", description: "Cross-sell opportunities...", meta: "Flower + Pre-rolls" },
            { title: "New vs Returning", description: "Customer acquisition...", meta: "38% new this month" },
            { title: "Margin Analysis", description: "Profit by category...", meta: "Concentrates: 45%" },
            { title: "Discount Impact", description: "Promo effectiveness...", meta: "15% cannibalization" },
            { title: "Staff Performance", description: "Sales by budtender...", meta: "Top: Sarah $12k" },
            { title: "Weather Correlation", description: "Sales vs weather...", meta: "Rain = +18% online" },
            { title: "Product Velocity", description: "Days on shelf...", meta: "Slow movers flagged" },
            { title: "Forecast: Next 30", description: "Revenue prediction...", meta: "$145k projected" }
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
                title: "Competitor #2: Canna Corner",
                description: "Just launched delivery service (free over $50). Social media following grew 15% last month. Weak on edibles selection.",
                meta: "Threat level: High | Distance: 1.1 miles"
            },
            {
                title: "Market Gap Identified",
                description: "No local competitors offer subscription/membership programs. First-mover advantage opportunity for loyalty differentiation.",
                meta: "Opportunity score: 8.5/10"
            },
            { title: "Competitor #3", description: "Herbal Solutions...", meta: "Threat: Low" },
            { title: "Competitor #4", description: "Mary Jane's...", meta: "Threat: Medium" },
            { title: "Price Comparison", description: "Category breakdown...", meta: "You: +5% avg" },
            { title: "SEO Rankings", description: "Keyword positions...", meta: "Rank #3 local" },
            { title: "Social Engagement", description: "Follower comparison...", meta: "You: 2nd place" },
            { title: "Menu Size", description: "SKU count comparison...", meta: "You: Largest" },
            { title: "Review Velocity", description: "New reviews/week...", meta: "You: 4/week" },
            { title: "Promotion Calendar", description: "Competitor sales...", meta: "Busy in April" },
            { title: "Delivery Coverage", description: "Service area map...", meta: "Gap: North side" },
            { title: "New Products", description: "Recent launches...", meta: "Competitor: 12 new" }
        ],
        totalCount: 13
    }
};

export async function POST(request: NextRequest) {
    try {
        // Context injection (Live Data)
        const { context } = await request.json();
        let items = [...demoResponse.items]; // Clone items to modify

        // Inject Real Dispensaries for Ezal (Competitor Output)
        if (agent === 'ezal' && context?.retailers?.length > 0) {
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

        // Inject Real Brands for Smokey (Product Output)
        if (agent === 'smokey' && context?.brands?.length > 0) {
            // Add a "Local Brand Spotlight" item at the top
            const topBrand = context.brands[0];
            if (topBrand) {
                items.unshift({
                    title: `🔥 Trending Local: ${topBrand.name}`,
                    description: `Popular in ${context.location?.city || 'your area'}. Found in ${topBrand.productCount} nearby menus. High engagement this week.`,
                    meta: "Velocity: High | In stock: Yes"
                });
                // Remove last item to keep count consistent
                items.pop();
            }
        }

        return NextResponse.json({
            agent,
            prompt,
            items: items,
            totalCount: demoResponse.totalCount,
            hasImage: true,
            hasVideo: true
        });

    } catch (error) {
        console.error('[Demo API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process demo' },
            { status: 500 }
        );
    }
}
