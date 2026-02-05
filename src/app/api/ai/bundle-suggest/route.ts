import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { prompt, orgId } = await request.json();

    if (!prompt || !orgId) {
      return NextResponse.json(
        { error: 'Prompt and organization ID are required' },
        { status: 400 }
      );
    }

    // Fetch products to provide context to AI
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
      thc: doc.data().thc,
    }));

    // Generate AI suggestion
    const systemPrompt = `You are a cannabis retail promotions expert helping create bundle deals for dispensary menus.

Available products:
${products.map(p => `- ${p.name} (${p.category}, $${p.price}, ${p.thc || 'N/A'})`).join('\n')}

Based on the user's request, suggest a bundle deal:
1. A catchy bundle name (short, under 6 words)
2. A brief description (one sentence)
3. Bundle type: "bogo" (Buy One Get One), "mix_match" (Mix & Match), "percentage" (% Off), "fixed_price" (Fixed Price), or "tiered" (Tiered Discount)
4. Which products to include (provide product IDs)
5. Discount percentage (if percentage type) or suggested fixed price
6. Your reasoning for the bundle

Common bundle strategies:
- BOGO: Buy one product, get another free or discounted
- Mix & Match: Buy X items from a category, get Y% off
- Percentage: Simple % discount on selected products
- Fixed Price: Bundle products at a set price
- Tiered: Increasing discounts for buying more (e.g., buy 2 get 10% off, buy 3 get 20% off)

Respond in JSON format:
{
  "name": "bundle name",
  "description": "brief description",
  "type": "mix_match" | "bogo" | "percentage" | "fixed_price" | "tiered",
  "productIds": ["id1", "id2", "id3"],
  "discountPercent": 20,
  "reasoning": "why this bundle makes sense"
}`;

    const response = await ai.generate({
      system: systemPrompt,
      prompt,
    });

    // Parse AI response
    let suggestion;
    try {
      const textResponse = typeof response.output === 'string' ? response.output : JSON.stringify(response.output);
      // Extract JSON from response (AI might wrap it in markdown code blocks)
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
    console.error('Error generating bundle suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
