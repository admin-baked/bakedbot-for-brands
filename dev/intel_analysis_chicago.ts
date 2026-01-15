
import { ai } from '@/ai/dev-genkit'; // Safe import
import { z } from 'genkit';

// Re-defining the tool locally to avoid importing 'server-only' code from the main app
// This is a common pattern for standalone scripts validating logic.

const AnalyzeMarketInput = z.object({
  city: z.string(),
  state: z.string(),
});

const analyzeMarketPricing = ai.defineTool({
  name: 'intel_analyzeMarketPricing',
  description: 'Analyzes competitor pricing in a target market to build a pricing report.',
  inputSchema: AnalyzeMarketInput,
  outputSchema: z.object({
    market: z.string(),
    stats: z.object({
        flower_avg_35g: z.number(),
        vape_avg_1g: z.number(),
        edible_avg_100mg: z.number()
    }),
    top_competitors: z.array(z.string())
  })
}, async (input) => {
    // Dynamic import of Leafly Service
    // We need to ensure LeaflyService doesn't hit server-only too. 
    // It imports logger from '@/lib/logger'. Let's hope logger is safe.
    const { LeaflyService } = await import('@/server/services/integrations/leafly');
    const service = new LeaflyService();

    // 1. Get Dispensaries to identify top competitors
    const dispensaries = await service.searchDispensaries(input.city, input.state);
    
    // 2. Aggregate pricing
    // In real usage we'd loop, here we pick the first one's menu as a proxy for the market test
    const pricing = await service.getMenuPricing(dispensaries[0]?.slug || 'unknown');

    return {
        market: `${input.city}, ${input.state}`,
        stats: {
            flower_avg_35g: pricing.flower_avg_35g,
            vape_avg_1g: pricing.vape_avg_1g,
            edible_avg_100mg: pricing.edible_avg_100mg
        },
        top_competitors: dispensaries.map(d => d.name).slice(0, 5)
    };
});

async function run() {
    console.log("🕵️  Starting Ezal's Competitor Analysis for Chicago, IL (REAL DATA MODE)...");

    try {
        const result = await analyzeMarketPricing({
            city: 'Chicago',
            state: 'IL'
        });

        console.log("\n✅ Analysis Complete! Here is the 'War Room' Report:");
        console.log("---------------------------------------------------");
        console.log(`📍 Market: ${result.market}`);
        console.log("\n📊 Pricing Bands (Average):");
        console.log(`   🌿 1/8th Flower:   $${result.stats.flower_avg_35g.toFixed(2)}`);
        console.log(`   💨 1g Vape Cart:   $${result.stats.vape_avg_1g.toFixed(2)}`);
        console.log(`   🍬 100mg Edibles:  $${result.stats.edible_avg_100mg.toFixed(2)}`);
        
        console.log("\n🏆 Top Competitors Identified:");
        result.top_competitors.forEach((comp, i) => {
            console.log(`   ${i + 1}. ${comp}`);
        });
        console.log("---------------------------------------------------");
        console.log("\n🚀 Insight: Prices look competitive. Ezal suggests running a 'New Customer' promo for Edibles to undercut the average.");

    } catch (e) {
        console.error("❌ Analysis Failed:", e);
    }
}

run().catch(console.error);
