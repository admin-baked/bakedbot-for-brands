import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function POST(request: NextRequest) {
  try {
    const { prompt, tone = 'casual', platform, orgId } = await request.json();

    if (!prompt || !orgId) {
      return NextResponse.json(
        { error: 'Prompt and organization ID are required' },
        { status: 400 }
      );
    }

    // Platform-specific optimization guidelines
    const platformGuidelines = {
      instagram: {
        style: 'Visual-first, lifestyle-focused. Use emojis naturally. Keep it authentic and engaging.',
        hashtagCount: '8-15 hashtags',
        length: 'Short to medium captions (150-500 chars ideal, max 2200)',
        tone: 'Casual, visual, authentic',
      },
      tiktok: {
        style: 'Short, punchy, trend-aware. Hook in first 3 words. Use trending sounds/topics.',
        hashtagCount: '3-5 hashtags',
        length: 'Very short and engaging (100-300 chars ideal, max 2200)',
        tone: 'Energetic, fun, authentic, casual',
      },
      linkedin: {
        style: 'Professional but conversational. Focus on value, education, industry insights.',
        hashtagCount: '3-5 relevant hashtags',
        length: 'Longer form content (300-1000 chars ideal, max 3000)',
        tone: 'Professional, educational, value-driven',
      },
    };

    // Tone guidance
    const toneGuidance = {
      casual: 'Friendly, approachable, conversational. Like talking to a friend.',
      professional: 'Polished, credible, industry-expert. Authoritative but not stiff.',
      hype: 'Exciting, energetic, enthusiasm! Build excitement and urgency.',
      educational: 'Informative, helpful, teaching. Share knowledge and insights.',
      storytelling: 'Narrative-driven, emotional connection. Tell a compelling story.',
    };

    // Generate system prompt
    const systemPrompt = `You are a cannabis industry social media expert specializing in creating platform-optimized content.

User's Content Request: "${prompt}"
Tone: ${toneGuidance[tone as keyof typeof toneGuidance] || toneGuidance.casual}

${platform ? `
Generate ONLY for ${platform.toUpperCase()}:
${platformGuidelines[platform as keyof typeof platformGuidelines].style}
- Hashtags: ${platformGuidelines[platform as keyof typeof platformGuidelines].hashtagCount}
- Length: ${platformGuidelines[platform as keyof typeof platformGuidelines].length}
- Tone: ${platformGuidelines[platform as keyof typeof platformGuidelines].tone}
` : `
Generate 3 platform-optimized posts simultaneously:

INSTAGRAM:
${platformGuidelines.instagram.style}
- ${platformGuidelines.instagram.hashtagCount}
- ${platformGuidelines.instagram.length}

TIKTOK:
${platformGuidelines.tiktok.style}
- ${platformGuidelines.tiktok.hashtagCount}
- ${platformGuidelines.tiktok.length}

LINKEDIN:
${platformGuidelines.linkedin.style}
- ${platformGuidelines.linkedin.hashtagCount}
- ${platformGuidelines.linkedin.length}
`}

IMPORTANT GUIDELINES:
- Make each post UNIQUE and optimized for its platform
- Don't just rewrite the same post 3 times - adapt strategy, length, and style
- Include relevant emojis naturally (more for Instagram/TikTok, minimal for LinkedIn)
- Use cannabis industry best practices (education, compliance-friendly)
- Include hashtags inline at the end of each post
- Make content engaging, authentic, and valuable

Respond in JSON format:
${platform ? `
{
  "${platform}": {
    "content": "the full post including hashtags",
    "hashtags": ["#tag1", "#tag2"],
    "characterCount": 0,
    "platform": "${platform}"
  }
}
` : `
{
  "instagram": {
    "content": "Instagram post with hashtags",
    "hashtags": ["#tag1", "#tag2"],
    "characterCount": 0,
    "platform": "instagram"
  },
  "tiktok": {
    "content": "TikTok post with hashtags",
    "hashtags": ["#tag1", "#tag2"],
    "characterCount": 0,
    "platform": "tiktok"
  },
  "linkedin": {
    "content": "LinkedIn post with hashtags",
    "hashtags": ["#tag1", "#tag2"],
    "characterCount": 0,
    "platform": "linkedin"
  },
  "prompt": "${prompt}",
  "tone": "${tone}"
}
`}`;

    const response = await ai.generate({
      system: systemPrompt,
      prompt: `Create ${platform ? 'a' : '3'} compelling social media post${platform ? '' : 's'} based on this: ${prompt}`,
    });

    // Parse AI response
    let posts;
    try {
      const textResponse = typeof response.output === 'string' ? response.output : JSON.stringify(response.output);
      // Extract JSON from response (AI might wrap it in markdown code blocks)
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Calculate character counts for each post
        if (platform) {
          // Single platform regeneration
          const post = parsed[platform];
          if (post) {
            post.characterCount = post.content.length;
            posts = { [platform]: post };
          }
        } else {
          // All platforms
          ['instagram', 'tiktok', 'linkedin'].forEach((p) => {
            if (parsed[p]) {
              parsed[p].characterCount = parsed[p].content.length;
            }
          });
          posts = parsed;
        }
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
      posts,
    });
  } catch (error) {
    console.error('Error generating social media posts:', error);
    return NextResponse.json(
      { error: 'Failed to generate posts' },
      { status: 500 }
    );
  }
}
