
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
 * @throws {Error} If SendGrid environment variables are not configured.
 */
export async function emailRequest(input: z.infer<typeof EmailRequestSchema>): Promise<void> {
    // Set the SendGrid API key from environment variables just before use.
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: SENDGRID_API_KEY is not set. Email will not be sent.');
      // THROW an error to ensure the calling flow is aware of the configuration issue.
      throw new Error('Email service is not configured. Missing API Key.');
    }
    sgMail.setApiKey(apiKey);

    const { to, subject, html, bcc } = input;

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME;

    if (!fromEmail || !fromName) {
      console.error('CRITICAL: SENDGRID_FROM_EMAIL and SENDGRID_FROM_NAME are not set. Email will not be sent.');
      // THROW an error for missing sender details.
      throw new Error('Email service is not configured. Missing sender details.');
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
      // Re-throw the SendGrid-specific error to be caught by the calling flow.
      throw error;
    }
}
