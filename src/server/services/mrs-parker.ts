/**
 * Mrs. Parker - Customer Success Agent
 * 
 * Handles new customer onboarding and welcome sequences.
 * Triggered on signup to send personalized welcome emails.
 */

import { lettaBlockManager, BLOCK_LABELS } from '@/server/services/letta/block-manager';
import { lettaClient } from '@/server/services/letta/client';
import { logger } from '@/lib/logger';

export interface NewSignupData {
    userId: string;
    email: string;
    displayName: string;
    accountType: 'brand' | 'dispensary' | 'customer';
    plan?: string;
    orgName?: string;
}

/**
 * Mrs. Parker's Welcome Flow - triggered when new user signs up.
 * 1. Updates her memory block with the new signup
 * 2. Generates personalized welcome email content
 * 3. Sends welcome email via Mailjet
 */
export async function mrsParkerWelcomeFlow(signup: NewSignupData): Promise<{
    success: boolean;
    message: string;
    emailSent?: boolean;
}> {
    try {
        logger.info(`[Mrs. Parker] Processing new signup: ${signup.email} (${signup.accountType})`);
        
        // 1. Update Mrs. Parker's memory with new signup
        const tenantId = 'boardroom_shared';
        await lettaBlockManager.appendToBlock(
            tenantId,
            BLOCK_LABELS.AGENT_MRS_PARKER as any,
            `New ${signup.accountType} signup: ${signup.displayName} (${signup.email})${signup.orgName ? ` - ${signup.orgName}` : ''}`,
            'Mrs. Parker'
        );

        // 2. Generate personalized welcome message using Letta
        const welcomeContent = await generateWelcomeContent(signup);

        // 3. Send welcome email
        const emailSent = await sendWelcomeEmail(signup, welcomeContent);

        // 4. Log to customer insights shared block
        await lettaBlockManager.appendToBlock(
            tenantId,
            BLOCK_LABELS.CUSTOMER_INSIGHTS as any,
            `New signup: ${signup.displayName} (${signup.accountType}) - Welcome email ${emailSent ? 'sent' : 'failed'}`,
            'Mrs. Parker'
        );

        return {
            success: true,
            message: `Welcome flow completed for ${signup.email}`,
            emailSent
        };
    } catch (error: any) {
        logger.error(`[Mrs. Parker] Welcome flow failed: ${error.message}`);
        return {
            success: false,
            message: error.message
        };
    }
}

async function generateWelcomeContent(signup: NewSignupData): Promise<{
    subject: string;
    body: string;
}> {
    // Use Mrs. Parker's Letta agent to generate personalized content
    try {
        const agents = await lettaClient.listAgents();
        const mrsParker = agents.find(a => a.name.toLowerCase().includes('parker'));
        
        if (mrsParker) {
            // Let Mrs. Parker generate the welcome message
            const prompt = `Generate a warm, personalized welcome email for a new ${signup.accountType} customer named ${signup.displayName}${signup.orgName ? ` from ${signup.orgName}` : ''}. 
Keep it brief (3-4 sentences max), friendly, and highlight:
1. Thank them for joining BakedBot
2. One key feature relevant to their account type
3. Offer to help them get started

Return JSON: { "subject": "...", "body": "..." }`;

            const response: any = await lettaClient.sendMessage(mrsParker.id, prompt);
            
            // Try to parse JSON from response
            if (response.messages) {
                const lastMsg = response.messages
                    .filter((m: any) => m.role === 'assistant')
                    .pop();
                if (lastMsg?.content) {
                    try {
                        const jsonMatch = lastMsg.content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            return JSON.parse(jsonMatch[0]);
                        }
                    } catch (e) {
                        // Fall through to default
                    }
                }
            }
        }
    } catch (e) {
        logger.warn(`[Mrs. Parker] Letta generation failed, using default: ${e}`);
    }

    // Default welcome content by account type
    const templates: Record<string, { subject: string; body: string }> = {
        brand: {
            subject: `Welcome to BakedBot, ${signup.displayName}! 🌿`,
            body: `Hi ${signup.displayName},\n\nWelcome to BakedBot! We're thrilled to have ${signup.orgName || 'your brand'} on board.\n\nYour AI-powered marketing squad is ready to help you connect with dispensaries across the nation. Start by exploring your Brand Dashboard where you can set up your first campaign.\n\nNeed help getting started? Just reply to this email or chat with any of our agents!\n\n- Mrs. Parker\nCustomer Success, BakedBot AI`
        },
        dispensary: {
            subject: `Welcome to BakedBot, ${signup.displayName}! 🏪`,
            body: `Hi ${signup.displayName},\n\nWelcome to BakedBot! Your dispensary is now connected to our platform.\n\nYour Digital Budtender (Smokey) is ready to help engage your customers with AI-powered product recommendations. Head to your Dispensary Dashboard to sync your menu and configure your chatbot.\n\nQuestions? Just reply or ask Smokey anytime!\n\n- Mrs. Parker\nCustomer Success, BakedBot AI`
        },
        customer: {
            subject: `Welcome to BakedBot! 🌿`,
            body: `Hi ${signup.displayName},\n\nWelcome to BakedBot! We're excited to help you discover amazing cannabis products.\n\nChat with Smokey anytime to get personalized recommendations, find dispensaries near you, or learn about different strains and effects.\n\nEnjoy exploring!\n\n- Mrs. Parker\nBakedBot AI`
        }
    };

    return templates[signup.accountType] || templates.customer;
}

async function sendWelcomeEmail(signup: NewSignupData, content: { subject: string; body: string }): Promise<boolean> {
    try {
        const { sendEmail } = await import('@/server/services/email-service');
        
        await sendEmail({
            to: signup.email,
            subject: content.subject,
            text: content.body,
            html: content.body.replace(/\n/g, '<br>')
        });
        
        logger.info(`[Mrs. Parker] Welcome email sent to ${signup.email}`);
        return true;
    } catch (error: any) {
        logger.error(`[Mrs. Parker] Email failed: ${error.message}`);
        return false;
    }
}

/**
 * Hook to call on new user creation in Firebase Auth or signup flow
 */
export async function onNewUserSignup(
    userId: string,
    email: string,
    displayName: string,
    accountType: 'brand' | 'dispensary' | 'customer',
    orgName?: string,
    plan?: string
): Promise<void> {
    // Fire and forget - don't block signup
    mrsParkerWelcomeFlow({
        userId,
        email,
        displayName,
        accountType,
        orgName,
        plan
    }).catch(err => {
        logger.error(`[Mrs. Parker] Background welcome flow error: ${err.message}`);
    });
}
