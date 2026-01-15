
import { config } from 'dotenv';
config({ path: '.env.local' });

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Get API key from environment - GEMINI_API_KEY takes priority, fallback to GOOGLE_API_KEY
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('[Genkit] WARNING: No API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
}

export { googleAI };

export const ai = genkit({
  plugins: [
    googleAI({ apiKey }),
  ],
  // Default to most cost-effective model (free tier)
  model: 'googleai/gemini-2.5-flash-lite',
});
