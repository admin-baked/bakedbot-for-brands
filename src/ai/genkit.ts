import {genkit, Transport} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const emailRequest: Transport = {
  id: 'notification-email',
  __config: {
    sender: 'BakedBot Order System <noreply@bakedbot.ai>',
  },
};

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-2.5-flash',
});
