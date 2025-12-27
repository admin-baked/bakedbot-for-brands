/**
 * Lead Capture API - Store email leads from Agent Playground
 * 
 * Also triggers welcome email via Craig autoresponder
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        const { email, company } = await request.json();

        if (!email || !company) {
            return NextResponse.json(
                { error: 'Email and company are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        const firestore = getAdminFirestore();
        const timestamp = new Date();

        // Check if lead already exists
        const existingLead = await firestore
            .collection('leads')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        if (!existingLead.empty) {
            // Lead exists, just return success (don't reveal this)
            return NextResponse.json({ success: true, message: 'Welcome back!' });
        }

        // Create new lead
        const leadRef = firestore.collection('leads').doc();
        await leadRef.set({
            id: leadRef.id,
            email: email.toLowerCase(),
            company,
            source: 'agent_playground',
            status: 'new',
            createdAt: timestamp,
            updatedAt: timestamp,
            demoCount: 0,
            metadata: {
                userAgent: request.headers.get('user-agent') || 'unknown',
                referrer: request.headers.get('referer') || 'direct'
            }
        });

        // TODO: Trigger welcome email via Craig autoresponder
        // For now, we'll just log it. In production, this would call
        // the email service to send a welcome email.
        console.log(`[Lead API] New lead captured: ${email} from ${company}`);

        // Trigger welcome email (async, don't await)
        triggerWelcomeEmail(email, company).catch(err => {
            console.error('[Lead API] Welcome email failed:', err);
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Welcome to BakedBot!' 
        });

    } catch (error) {
        console.error('[Lead API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to capture lead' },
            { status: 500 }
        );
    }
}

/**
 * Trigger welcome email via Craig autoresponder
 * This is fire-and-forget
 */
async function triggerWelcomeEmail(email: string, company: string) {
    // In production, this would:
    // 1. Use SendGrid/Mailjet to send welcome email
    // 2. Or trigger a Craig playbook for onboarding sequence
    
    // For now, we'll use Mailjet if available
    try {
        const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
        const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY;
        
        if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
            console.log('[Lead API] Email credentials not configured, skipping welcome email');
            return;
        }

        const Mailjet = (await import('node-mailjet')).default;
        const mailjet = new Mailjet({
            apiKey: MAILJET_API_KEY,
            apiSecret: MAILJET_SECRET_KEY
        });

        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [{
                From: {
                    Email: "hello@bakedbot.ai",
                    Name: "BakedBot"
                },
                To: [{
                    Email: email,
                    Name: company
                }],
                Subject: `Welcome to BakedBot, ${company}! 🚀`,
                HTMLPart: `
                    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #22c55e;">Welcome to BakedBot! 🌿</h1>
                        <p>Hey there!</p>
                        <p>Thanks for trying out our AI agents. You're now part of a growing community of cannabis operators using AI to automate their business.</p>
                        
                        <h2>What's Next?</h2>
                        <ul>
                            <li>🤖 <strong>Unlimited demos</strong> - Keep exploring all our agents</li>
                            <li>📊 <strong>Book a demo</strong> - See how BakedBot works with your actual data</li>
                            <li>🚀 <strong>Start free</strong> - Deploy your own AI agents today</li>
                        </ul>

                        <p style="margin-top: 24px;">
                            <a href="https://bakedbot.ai/brand-login" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Start Your Free Trial
                            </a>
                        </p>

                        <p style="color: #666; margin-top: 32px; font-size: 14px;">
                            Questions? Just reply to this email - we read everything.
                        </p>

                        <p style="color: #666;">
                            - The BakedBot Team
                        </p>
                    </div>
                `
            }]
        });

        console.log(`[Lead API] Welcome email sent to ${email}`);
    } catch (err) {
        // Email dispatch might fail if not configured, that's okay
        console.warn('[Lead API] Could not send welcome email:', err);
    }
}
