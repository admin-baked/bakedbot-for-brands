import 'server-only';

import { config } from 'dotenv';
config({ path: '.env.local' });

import { genkit, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export { googleAI };

// Lazy initialization to prevent build-time errors when GEMINI_API_KEY is runtime-only
let _ai: Genkit | null = null;

function getAiInstance(): Genkit {
  if (_ai) return _ai;

  // Get API key from environment - GEMINI_API_KEY takes priority, fallback to GOOGLE_API_KEY
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('[Genkit] GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required. Please set it in your .env.local file.');
  }

  _ai = genkit({
    plugins: [
      googleAI({ apiKey }),
    ],
    // Default to most cost-effective model (free tier)
    model: 'googleai/gemini-2.5-flash-lite',
  });

  return _ai;
}

// Export a proxy that lazily initializes on first use
export const ai = new Proxy({} as Genkit, {
  get(target, prop) {
    const instance = getAiInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});
