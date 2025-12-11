import 'server-only';

import { config } from 'dotenv';
config({ path: '.env.local' });

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export { googleAI };

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash',
});
