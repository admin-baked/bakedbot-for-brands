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
    const systemPrompt = `You are a cannabis product merchandising expert helping create product carousels for dispensary menus.

Available products:
${products.map(p => `- ${p.name} (${p.category}, $${p.price}, ${p.thc || 'N/A'})`).join('\n')}

Based on the user's request, suggest:
1. A catchy carousel title (short, under 5 words)
2. A brief description (one sentence)
3. Which products to include (provide product IDs)
4. Your reasoning for the selection

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
