'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Output schema for the generated campaign
const CampaignContentSchema = z.object({
    subjectLines: z.array(z.string()).describe('3 catchy subject line options'),
    emailBody: z.string().describe('The full HTML email body content'),
    previewText: z.string().describe('Short preview text for the email client'),
    suggestedSegment: z.string().describe('Recommended audience segment description'),
});

export type CampaignContent = z.infer<typeof CampaignContentSchema>;

// Prompt definition
const generateCampaignPrompt = ai.definePrompt({
    name: 'generateCampaignPrompt',
    input: {
        schema: z.object({
            goal: z.string(),
            audience: z.string().optional(),
            tone: z.string().optional(),
            productContext: z.string().optional(), // e.g., list of products to feature
        }),
    },
    output: { schema: CampaignContentSchema },
    prompt: `You are Craig, an expert AI Marketing Specialist for a cannabis dispensary.
  
  Your goal is to create a high-converting email campaign.
  
  Campaign Goal: {{{goal}}}
  Target Audience: {{#if audience}}{{{audience}}}{{else}}General Customers{{/if}}
  Tone: {{#if tone}}{{{tone}}}{{else}}Professional and inviting{{/if}}
  
  {{#if productContext}}
  Context/Products to feature:
  {{{productContext}}}
  {{/if}}
  
  Generate the following:
  1. **Subject Lines**: 3 options. Ranging from direct to curious.
  2. **Preview Text**: A short hook (pre-header).
  3. **Email Body**: A complete HTML email. 
     - Use simple, clean HTML (no complex layouts).
     - Include a placeholder [CTA_BUTTON] for the call to action.
     - Focus on benefits and compliance (avoid making medical claims).
     - Use a warm, budtender-like voice.
  
  4. **Suggested Segment**: Briefly describe who this should be sent to if the audience wasn't specific.
  `,
    model: 'googleai/gemini-3-pro-preview',
});

/**
 * Generates email campaign content based on user input
 */
export async function generateCampaignContent(
    goal: string,
    audience?: string,
    tone?: string,
    productContext?: string
): Promise<CampaignContent> {
    const { output } = await generateCampaignPrompt({
        goal,
        audience,
        tone,
        productContext
    });

    return output!;
}
