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

    // Extract price constraints from prompt
    const priceMatch = prompt.toLowerCase().match(/under\s*\$?(\d+)|below\s*\$?(\d+)|less than\s*\$?(\d+)/);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1] || priceMatch[2] || priceMatch[3]) : null;

    // Filter products by price constraint if specified
    let availableProducts = products;
    if (maxPrice !== null) {
      availableProducts = products.filter(p => p.price <= maxPrice);

      if (availableProducts.length === 0) {
        return NextResponse.json({
          success: false,
          error: `No products found under $${maxPrice}. Please adjust your price filter.`,
        });
      }
    }

    // Generate AI suggestion
    const systemPrompt = `You are a cannabis product merchandising expert helping create product carousels for dispensary menus.

${maxPrice !== null ? `**IMPORTANT: The user has requested products UNDER $${maxPrice}. ALL products in the available list are already filtered to meet this constraint. You MUST ONLY select from the available products list below.**\n` : ''}
Available products${maxPrice !== null ? ` (all under $${maxPrice})` : ''}:
${availableProducts.map(p => `- ID: ${p.id} | ${p.name} (${p.category}, $${p.price}, ${p.thc || 'N/A'})`).join('\n')}

Based on the user's request, suggest:
1. A catchy carousel title (short, under 5 words)
2. A brief description (one sentence)
3. Which products to include (provide product IDs from the list above)
4. Your reasoning for the selection

**CRITICAL: You MUST only select product IDs from the available products list above. Do not select any product IDs that are not in the list.**

Respond in JSON format:
{
  "title": "carousel title",
  "description": "brief description",
  "productIds": ["id1", "id2", "id3"],
  "reasoning": "why these products were selected"
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

    // Post-processing: Filter out any invalid product IDs
    const availableProductIds = new Set(availableProducts.map(p => p.id));
    suggestion.productIds = suggestion.productIds.filter((id: string) => availableProductIds.has(id));

    // If no valid products after filtering, return error
    if (suggestion.productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'AI suggested invalid products. Please try again with a different prompt.',
      });
    }

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (error) {
    console.error('Error generating carousel suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
