/**
 * Color Palette Extraction API Route
 *
 * Uses Claude Vision to analyze logo images and extract brand colors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/ai/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Use Claude Vision to analyze the image
    const systemPrompt = `You are a brand color expert. Analyze the provided logo image and extract a color palette.

Respond with a JSON object containing:
{
  "primaryColor": "#hex code - main brand color",
  "secondaryColors": ["#hex", "#hex", "#hex"] - up to 3 additional colors,
  "reasoning": "Brief explanation of color choices",
  "brandPersonality": "modern|professional|natural|luxury|energetic"
}

Guidelines:
- Primary color should be the most prominent or important brand color
- Extract actual colors from the logo, don't invent new ones
- For cannabis brands, green tones are common but not always present
- Consider the brand's personality when selecting colors`;

    const userPrompt = `Please analyze this logo and extract the brand color palette: ${imageUrl}`;

    const response = await callClaude({
      systemPrompt,
      userMessage: userPrompt,
      temperature: 0.3,
      imageUrl, // Pass image to Claude Vision
    });

    // Parse the AI response
    let colorPalette;
    try {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      colorPalette = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse color extraction response' },
        { status: 500 }
      );
    }

    // Validate hex colors
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(colorPalette.primaryColor)) {
      colorPalette.primaryColor = '#16a34a'; // Fallback to green
    }

    return NextResponse.json({
      success: true,
      colorPalette,
    });
  } catch (error) {
    console.error('Error extracting colors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extract colors' },
      { status: 500 }
    );
  }
}
