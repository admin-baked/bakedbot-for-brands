/**
 * Creative Chat API Route
 *
 * Streaming chat endpoint for the Creative Studio's inline Craig chat panel.
 * Accepts a conversation history + brand/platform context, streams back a response.
 * When the AI generates actual post content it wraps it in a ---CONTENT_JSON--- block
 * so the client can parse it and offer a "Load to Canvas" action.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORM_CONTEXT: Record<string, string> = {
  instagram: 'Instagram (max 2200 chars, visual-first, 3-5 hashtags inline, casual tone)',
  tiktok: 'TikTok (max 2200 chars, trending hooks, energy, 3-5 niche hashtags)',
  linkedin: 'LinkedIn (max 3000 chars, professional, thought leadership, minimal hashtags)',
  facebook: 'Facebook (max 63206 chars, community-focused, conversational, links encouraged)',
};

const CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  tiktok: 2200,
  linkedin: 3000,
  facebook: 1000, // practical limit for engagement
};

function buildSystemPrompt(platform: string, brandVoice?: string): string {
  const platformCtx = PLATFORM_CONTEXT[platform] ?? platform;
  const limit = CHAR_LIMITS[platform] ?? 2200;

  return `You are Craig, BakedBot's creative marketing agent — sharp, brand-aware, and NY OCM-compliant.
You're embedded in the Creative Studio as an inline design tool. Help the user craft social media content.

PLATFORM: ${platformCtx}
CHARACTER LIMIT: ${limit} characters for caption

${brandVoice ? `BRAND VOICE GUIDELINES:\n${brandVoice}\n` : ''}

NY OCM COMPLIANCE (mandatory):
- No health/medical claims ("cures", "treats", "heals")
- No appeals to minors — no youth language, cartoon imagery references
- Must include implicit or explicit 21+ acknowledgment where relevant
- No unsubstantiated potency claims

CONVERSATION MODE:
- For strategy questions, brainstorming, or copy advice → respond naturally in conversation
- For actual post generation requests → produce the content AND wrap it in a structured block:

  ---CONTENT_JSON---
  {
    "caption": "The full post caption here...",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
    "mediaPrompt": "Optional: describe the ideal image/video for this post",
    "platform": "${platform}"
  }
  ---END_CONTENT_JSON---

The user's dashboard will detect this block and offer a "Load to Canvas" button.
Keep responses concise. One structured block per response when generating content.`;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    // Auth check
    await requireUser();

    const body = await request.json() as {
      messages: ChatMessage[];
      platform: string;
      brandVoice?: string;
    };

    const { messages, platform, brandVoice } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(platform ?? 'instagram', brandVoice);

    // Stream from Anthropic
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001', // Haiku for fast streaming chat responses
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Create a ReadableStream that pipes Anthropic's stream as SSE
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          logger.error('[CreativeChat] Stream error', { error: String(err) });
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    logger.error('[CreativeChat] Request failed', { error: String(err) });
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 });
  }
}
