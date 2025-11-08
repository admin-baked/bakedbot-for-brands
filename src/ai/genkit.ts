
import { config } from 'dotenv';
config();

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'zod';
import * as sgMail from '@sendgrid/mail';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-2.5-flash',
});

// Define the schema for the email sending tool
const EmailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
  bcc: z.array(z.string().email()).optional(),
});

/**
 * A Genkit tool that sends an email using SendGrid.
 */
export const emailRequest = ai.defineTool(
  {
    name: 'emailRequest',
    description: 'Sends an email to a specified recipient.',
    inputSchema: EmailRequestSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    // Set the SendGrid API key from environment variables just before use.
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

    const { to, subject, html, bcc } = input;

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME;

    if (!fromEmail || !fromName) {
      throw new Error('SENDGRID_FROM_EMAIL and SENDGRID_FROM_NAME must be set in environment variables.');
    }
    
    const msg = {
      to,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject,
      html,
      bcc,
    };

    try {
      await sgMail.send(msg);
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      // In a production scenario, you might want to throw the error
      // or handle it in a way that the flow can retry.
      // For now, we'll log it.
    }
  }
);
