import {genkit, Transport} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {sendgrid} from 'genkitx-sendgrid';

export const emailRequest: Transport = {
  id: 'notification-email',
  __config: {
    sender: 'BakedBot Order System <noreply@bakedbot.ai>',
  },
};

export const ai = genkit({
  plugins: [
    googleAI(),
    sendgrid({
      apiKey: process.env.SENDGRID_API_KEY || 'YOUR_SENDGRID_API_KEY',
      from: 'BakedBot Order System <noreply@bakedbot.ai>',
      transports: [emailRequest],
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
