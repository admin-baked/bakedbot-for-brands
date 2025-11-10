
import { config } from 'dotenv';
config();

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'zod';
import * as sgMail from '@sendgrid/mail';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-2.5-flash',
});

// Define the schema for the email sending function
const EmailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
  bcc: z.array(z.string().email()).optional(),
});

/**
 * Sends an email using SendGrid.
 * IMPORTANT: This is a regular server function, NOT a Genkit tool.
 * This prevents the AI model from being able to call it directly, which is a critical security measure.
 * Only trusted server-side flows (like sendOrderEmail) should be able to call this function.
 */
export async function emailRequest(input: z.infer<typeof EmailRequestSchema>): Promise<void> {
    // Set the SendGrid API key from environment variables just before use.
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: SENDGRID_API_KEY is not set. Email will not be sent.');
      // Do not throw an error in production, but log it.
      // In a real app, you would have more robust monitoring here.
      return;
    }
    sgMail.setApiKey(apiKey);

    const { to, subject, html, bcc } = input;

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME;

    if (!fromEmail || !fromName) {
      console.error('CRITICAL: SENDGRID_FROM_EMAIL and SENDGRID_FROM_NAME are not set. Email will not be sent.');
      return;
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
      console.error('Error sending email via SendGrid:', error);
      // In a production scenario, you might want to have a retry mechanism
      // or log to a dedicated monitoring service.
    }
}
