import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { prompt, strategy = 'dynamic', orgId } = await request.json();

    if (!prompt || !orgId) {
      return NextResponse.json(
        { error: 'Prompt and organization ID are required' },
        { status: 400 }
      );
    }

    // Fetch products to provide context
    const db = getAdminFirestore();
    const productsSnapshot = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .limit(100)
      .get();

    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      category: doc.data().category,
      price: doc.data().price,
      stock: doc.data().stock || 0,
    }));

    // Strategy-specific guidance
    const strategyGuidance = {
      competitive: 'Match or beat competitor prices while maintaining profitability. Focus on high-demand products.',
      clearance: 'Aggressively discount old inventory to free up shelf space and capital. Prioritize slow-moving products.',
      premium: 'Maintain high margins on premium products. Focus on quality and brand value.',
      value: 'Attract price-sensitive customers with compelling discounts. Volume over margin.',
      dynamic: 'Optimize prices based on all available factors: competition, inventory age, demand, and customer segments.',
    };

    // Generate AI suggestion
    const systemPrompt = `You are a cannabis retail pricing strategist with expertise in dynamic pricing optimization.

User's Goal: "${prompt}"
Strategy: ${strategy.toUpperCase()}
Strategy Guidance: ${strategyGuidance[strategy as keyof typeof strategyGuidance]}

Available Products:
${products.map(p => `- ${p.name} (${p.category}, $${p.price}, ${p.stock} units)`).join('\n')}

Based on the user's goal and selected strategy, recommend a pricing rule:

1. **Rule Name**: Short, descriptive name (e.g., "Weekend Flash Sale", "Clear 30+ Day Inventory")
2. **Discount Percentage**: Recommended discount (5-40%)
3. **Target Products**: Which products or categories to apply this to
4. **Conditions**: When this rule should apply:
   - Inventory age threshold (if clearing old stock)
   - Time windows (if time-based pricing)
   - Customer tiers (if loyalty pricing)
   - Traffic level (if demand-based)
5. **Reasoning**: Clear explanation of why this pricing strategy will work

Consider:
- Cannabis retail best practices
- Competitive dynamics
- Inventory management
- Customer psychology
- Legal/compliance (transparent, non-discriminatory)

Respond in JSON format:
{
  "ruleName": "descriptive name",
  "strategy": "${strategy}",
  "discountPercent": 15,
  "targetCategories": ["category1", "category2"],
  "targetProductIds": ["id1", "id2"],
  "conditions": {
    "useInventoryAge": true,
    "inventoryAgeMin": 30,
    "useTimeBasedPricing": false,
    "useCompetitorPricing": true,
    "useCustomerTiers": false
  },
  "reasoning": "Detailed explanation of why this pricing strategy will achieve the goal",
  "expectedImpact": "Brief summary of expected results (revenue, inventory turnover, etc.)"
}`;

    const response = await ai.generate({
      system: systemPrompt,
      prompt: `Create a pricing strategy for: ${prompt}`,
    });

    // Parse AI response
    let suggestion;
    try {
      const textResponse = typeof response.output === 'string' ? response.output : JSON.stringify(response.output);
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (error) {
    console.error('Error generating pricing suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate pricing suggestion' },
      { status: 500 }
    );
  }
}
