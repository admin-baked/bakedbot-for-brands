import { sendGenericEmail } from '../src/lib/email/dispatcher';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: '.env.local' });

// Recipient Lists
const MANAGEMENT_LIST = [
    { email: 'adeyemideta@gmail.com', name: 'Ade' },
    { email: 'adggiles@aol.com', name: 'Archie' },
    { email: 'jack@bakedbot.ai', name: 'Jack' },
    { email: 'martez@bakedbot.ai', name: 'Martez' }
];

const THRIVE_ORG_ID = 'org_thrive_syracuse';

async function run() {
    console.log('[Script] Initializing Thrive Resend v3 (Finalized Strategy)...');

    for (const recipient of MANAGEMENT_LIST) {
        console.log(`\n--- Processing: ${recipient.name} (${recipient.email}) ---`);

        // 1. Consumer Preview A (Infused @ $9.99)
        console.log(`Sending Consumer Preview A ($9.99)...`);
        const resultA = await sendGenericEmail({
            to: recipient.email,
            name: recipient.name,
            orgId: THRIVE_ORG_ID,
            subject: `[PREVIEW A] Welcome back, ${recipient.name}! An infused treat for $9.99 awaits... 🌿`,
            htmlBody: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #2e7d32;">Welcome back to Thrive Syracuse!</h2>
                    <p>Hi ${recipient.name},</p>
                    <p>It's been a while since we've seen you! To welcome you back, we've unlocked a special single-digit price on our premium favorite.</p>
                    
                    <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3>Staff Highlight: Therapy .5g Preroll- Hooch Infused</h3>
                        <p><strong>The "Premium" Factor:</strong> This infused pre-roll delivers a smooth, elevated experience that sets the bar for retail quality.</p>
                        <p style="font-size: 1.25em; color: #2e7d32;"><strong>Special Welcome Price: $9.99</strong></p>
                    </div>

                    <p style="text-align: center; margin-top: 30px;">
                        <a href="https://bakedbot.ai/thrive-syracuse" style="background: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Check in at the door</a>
                    </p>
                    <p style="font-size: 0.8em; color: #666; text-align: center; margin-top: 20px;">*No coupon code needed. Just check in at the front desk to unlock your digital perks.</p>
                </div>
            `,
            communicationType: 'campaign',
        });
        console.log(`Preview A Status: ${resultA.success ? '✅ SENT' : '❌ FAILED: ' + resultA.error}`);

        // 2. Consumer Preview B (Value @ $6.99)
        console.log(`Sending Consumer Preview B ($6.99)...`);
        const resultB = await sendGenericEmail({
            to: recipient.email,
            name: recipient.name,
            orgId: THRIVE_ORG_ID,
            subject: `[PREVIEW B] Good to see you again! Syracuse's best value ($6.99) is back. 🌿`,
            htmlBody: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #2e7d32;">Welcome back to Thrive Syracuse!</h2>
                    <p>Hi ${recipient.name},</p>
                    <p>It's been a while since we've seen you! We've miss your visits, so we are bringing you Syracuse's leading value to get you back in the door.</p>
                    
                    <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3>Value Leader: Wavy Sour OG Pre-Roll 1g</h3>
                        <p><strong>Why it wins:</strong> High-quality daily driver at a market-leading price. One of the best values in the city.</p>
                        <p style="font-size: 1.25em; color: #2e7d32;"><strong>Special Welcome Price: $6.99</strong></p>
                    </div>

                    <p style="text-align: center; margin-top: 30px;">
                        <a href="https://bakedbot.ai/thrive-syracuse" style="background: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Check in at the door</a>
                    </p>
                    <p style="font-size: 0.8em; color: #666; text-align: center; margin-top: 20px;">*No coupon code needed. Just check in at the front desk to unlock your digital perks.</p>
                </div>
            `,
            communicationType: 'campaign',
        });
        console.log(`Preview B Status: ${resultB.success ? '✅ SENT' : '❌ FAILED: ' + resultB.error}`);

        // 3. Strategy Brief (Final Plan)
        console.log(`Sending FINAL Strategy Brief...`);
        const resultStrategy = await sendGenericEmail({
            to: recipient.email,
            name: recipient.name,
            orgId: THRIVE_ORG_ID,
            subject: `[STRATEGY BRIEF] Thrive Welcome Playbook Finalized Pricing & 4/20 Prep 🚀`,
            htmlBody: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #1a237e;">Finalized Strategy: Thrive Syracuse Win-Back</h2>
                    <p>Team, we have finalized the pricing targets for the "Welcome Back" activation based on real-time market scans.</p>
                    
                    <div style="background: #e8eaf6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3>Win-Back Pricing Grid</h3>
                        <ul>
                            <li><strong>Variant A (Infused)</strong>: Target <strong>$9.99</strong>. This breaks the single-digit barrier and beats the $15–$20 market average. Margin remains strong at ~69%.</li>
                            <li><strong>Variant B (Value)</strong>: Target <strong>$6.99</strong>. Market-leading volume play for 1g singles.</li>
                            <li><strong>Check-in Perk</strong>: Add an Old Pal 2-pack for <strong>$1.00</strong> upon front-desk check-in.</li>
                        </ul>
                    </div>

                    <div style="background: #fff9c4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fbc02d;">
                        <h3>🚨 4/20 Strategy Note</h3>
                        <p>We are officially <strong>reserving the $0.01 Penny Deal</strong> for the 4/20 promotion. By using the $1.00 perk now, we maintain high conversion today while keeping our "nuclear option" fresh for the holiday peak.</p>
                    </div>

                    <p><strong>Next Steps:</strong> This strategy is being saved to the Organization Profile so all agents (Smokey, Craig, Ezal) are grounded in these targets for future interactions.</p>
                </div>
            `,
            communicationType: 'strategy',
            fromName: 'BakedBot Strategy',
        });
        console.log(`Strategy Status: ${resultStrategy.success ? '✅ SENT' : '❌ FAILED: ' + resultStrategy.error}`);
    }

    console.log('\n[Script] Complete.');
}

run().catch(console.error);
