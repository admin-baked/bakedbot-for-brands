/**
 * Autoresponder Email Templates
 * Role-specific welcome emails for Brand, Dispensary, and Customer signups
 */

export type SignupRole = 'brand' | 'dispensary' | 'customer';

export interface WelcomeEmailData {
    recipientEmail: string;
    recipientName: string;
    role: SignupRole;
    brandName?: string;
    dispensaryName?: string;
}

export interface EmailTemplate {
    subject: string;
    preheader: string;
    htmlContent: string;
}

/**
 * Generate welcome email template based on user role
 */
export function getWelcomeEmailTemplate(data: WelcomeEmailData): EmailTemplate {
    const templates: Record<SignupRole, () => EmailTemplate> = {
        brand: () => getBrandWelcomeTemplate(data),
        dispensary: () => getDispensaryWelcomeTemplate(data),
        customer: () => getCustomerWelcomeTemplate(data),
    };

    return templates[data.role]();
}

// ============================================
// BRAND WELCOME TEMPLATE
// ============================================

function getBrandWelcomeTemplate(data: WelcomeEmailData): EmailTemplate {
    const name = data.recipientName || 'there';
    const brandName = data.brandName || 'your brand';

    return {
        subject: `Welcome to BakedBot – Your AI Commerce Team is Ready 🚀`,
        preheader: `${brandName} is now connected to the Agentic Commerce OS`,
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BakedBot</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to BakedBot! 🎉</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your AI Commerce Team is Ready</p>
    </div>
    
    <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 12px 12px;">
        <p>Hey ${name}!</p>
        
        <p>Welcome to BakedBot – the <strong>Agentic Commerce OS</strong> for cannabis brands. You've just unlocked an entire AI squad ready to help ${brandName} dominate retail.</p>
        
        <h3 style="color: #10b981; margin-top: 25px;">🤖 Meet Your Agent Squad:</h3>
        <ul style="padding-left: 20px;">
            <li><strong>Smokey</strong> – Your AI Budtender for product recommendations</li>
            <li><strong>Craig</strong> – Marketing automation & campaigns</li>
            <li><strong>Pops</strong> – Analytics & business intelligence</li>
            <li><strong>Ezal</strong> – Competitive intel & market pricing</li>
            <li><strong>Money Mike</strong> – Pricing strategy & margins</li>
            <li><strong>Mrs. Parker</strong> – Customer loyalty & retention</li>
        </ul>
        
        <h3 style="color: #10b981; margin-top: 25px;">🚀 Quick Start:</h3>
        <ol style="padding-left: 20px;">
            <li>Set up your brand profile in Settings</li>
            <li>Connect your product catalog</li>
            <li>Run your first competitive intel scan</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://bakedbot.ai/dashboard" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Open Your Dashboard →</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Questions? Just reply to this email – we're here to help!</p>
        
        <p>Let's get baked (the good kind) 🌿</p>
        <p><strong>– The BakedBot Team</strong></p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>BakedBot AI · Agentic Commerce OS</p>
        <p><a href="https://bakedbot.ai" style="color: #10b981;">bakedbot.ai</a></p>
    </div>
</body>
</html>
        `.trim()
    };
}

// ============================================
// DISPENSARY WELCOME TEMPLATE
// ============================================

function getDispensaryWelcomeTemplate(data: WelcomeEmailData): EmailTemplate {
    const name = data.recipientName || 'there';
    const dispensaryName = data.dispensaryName || 'your dispensary';

    return {
        subject: `Welcome to BakedBot – Let's Power Your Menu 🌿`,
        preheader: `${dispensaryName} is now connected to AI-powered commerce`,
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BakedBot</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to BakedBot! 🎉</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Let's Power Your Menu</p>
    </div>
    
    <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 12px 12px;">
        <p>Hey ${name}!</p>
        
        <p>Welcome to BakedBot – we're excited to help <strong>${dispensaryName}</strong> deliver the best customer experience in cannabis retail.</p>
        
        <h3 style="color: #8b5cf6; margin-top: 25px;">✨ What You Can Do Now:</h3>
        <ul style="padding-left: 20px;">
            <li><strong>AI-Powered Menu</strong> – Smart product recommendations for every customer</li>
            <li><strong>Automated Marketing</strong> – SMS & email campaigns that actually convert</li>
            <li><strong>Compliance Built-In</strong> – Deebo keeps every message legal</li>
            <li><strong>Customer Insights</strong> – Understand what your customers really want</li>
        </ul>
        
        <h3 style="color: #8b5cf6; margin-top: 25px;">🚀 Get Started in 3 Steps:</h3>
        <ol style="padding-left: 20px;">
            <li>Connect your menu (we support CannMenus, Dutchie, and more)</li>
            <li>Set your service areas and hours</li>
            <li>Launch your first customer campaign</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://bakedbot.ai/dashboard" style="background: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Open Your Dashboard →</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Need help getting set up? Reply to this email and we'll walk you through it.</p>
        
        <p>Let's grow together 🌿</p>
        <p><strong>– The BakedBot Team</strong></p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>BakedBot AI · Agentic Commerce OS</p>
        <p><a href="https://bakedbot.ai" style="color: #8b5cf6;">bakedbot.ai</a></p>
    </div>
</body>
</html>
        `.trim()
    };
}

// ============================================
// CUSTOMER WELCOME TEMPLATE
// ============================================

function getCustomerWelcomeTemplate(data: WelcomeEmailData): EmailTemplate {
    const name = data.recipientName || 'there';

    return {
        subject: `Welcome! Your Cannabis Journey Starts Here 🌿`,
        preheader: `Personalized recommendations and local deals await`,
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BakedBot</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome! 🎉</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your Cannabis Journey Starts Here</p>
    </div>
    
    <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 12px 12px;">
        <p>Hey ${name}!</p>
        
        <p>Welcome to BakedBot – your personal AI-powered guide to finding the perfect products at dispensaries near you.</p>
        
        <h3 style="color: #f59e0b; margin-top: 25px;">🌿 What's Waiting for You:</h3>
        <ul style="padding-left: 20px;">
            <li><strong>Personalized Recommendations</strong> – Tell us what you're looking for, we'll find it</li>
            <li><strong>Local Menus</strong> – Browse real-time inventory from nearby dispensaries</li>
            <li><strong>Deals & Specials</strong> – Never miss a sale at your favorite shops</li>
            <li><strong>Easy Ordering</strong> – Reserve products for pickup in just a few taps</li>
        </ul>
        
        <h3 style="color: #f59e0b; margin-top: 25px;">💡 Pro Tips:</h3>
        <ul style="padding-left: 20px;">
            <li>Ask Smokey anything – "What's good for relaxation?"</li>
            <li>Save your favorites for quick reorders</li>
            <li>Turn on notifications for flash deals</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://bakedbot.ai" style="background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Start Exploring →</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Got questions? Just ask Smokey in the app – he's always ready to help!</p>
        
        <p>Happy exploring 🌿</p>
        <p><strong>– The BakedBot Team</strong></p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>BakedBot AI · Find What You're Looking For</p>
        <p><a href="https://bakedbot.ai" style="color: #f59e0b;">bakedbot.ai</a></p>
    </div>
</body>
</html>
        `.trim()
    };
}
