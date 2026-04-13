import { sendGenericEmail } from '../src/lib/email/dispatcher';
import { logger } from '../src/lib/logger';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const recipients = [
  { email: 'adeyemideta@gmail.com', name: 'Ade' },
  { email: 'adggiles@aol.com', name: 'Archie' },
  { email: 'jack@bakedbot.ai', name: 'Jack' },
  { email: 'martez@bakedbot.ai', name: 'Martez' }
];

const orgId = 'org_thrive_syracuse';

async function sendPreviews() {
  console.log('--- Sending Previews ---');

  for (const recipient of recipients) {
    // Version A: Therapy Infused
    const emailA = {
      to: recipient.email,
      name: recipient.name,
      orgId: orgId,
      communicationType: 'welcome' as const,
      subject: `[PREVIEW A] Welcome back, ${recipient.name}! A premium treat awaits... 🌿`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #2e7d32;">Welcome back to Thrive Syracuse!</h2>
          <p>Hi ${recipient.name},</p>
          <p>It's been a while since we've seen you! We've been missing your visits and wanted to welcome you back with a look at our current favorite treat.</p>
          
          <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Staff Highlight: Therapy .5g Preroll - Hooch Infused</h3>
            <p><strong>The "Wow" Factor:</strong> This infused pre-roll deliver a smooth, elevated experience that sets the bar for premium flower in Syracuse.</p>
            <p style="font-size: 1.2em; color: #2e7d32;"><strong>Price: $11.30</strong></p>
          </div>

          <p><strong>Rationale (Internal only):</strong> Recommended for this wave because of its very high <strong>73% margin</strong> and the premium "infused" branding which acts as a strong re-engagement hook.</p>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://bakedbot.ai/thrive-syracuse" style="background: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Check in at the door</a>
          </p>
          <p style="font-size: 0.8em; color: #666; text-align: center; margin-top: 20px;">*No coupon code needed. Just check in at the front desk to unlock your digital perks.</p>
        </div>
      `,
      textBody: `Hi ${recipient.name}, welcome back to Thrive! Check out the Therapy .5g Infused Preroll ($11.30). Rationale: 73% margin. Check in at the door!`,
      agentName: 'craig'
    };

    // Version B: Wavy Sour OG
    const emailB = {
      to: recipient.email,
      name: recipient.name,
      orgId: orgId,
      communicationType: 'welcome' as const,
      subject: `[PREVIEW B] Good to see you again! Syracuse's best value is back. 🌿`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #2e7d32;">Thrive Syracuse: Member Update</h2>
          <p>Hi ${recipient.name},</p>
          <p>Welcome back to the family! We wanted to make sure you saw our latest value winner before it's gone.</p>
          
          <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Value Leader: Wavy Sour OG Pre-Roll (1g)</h3>
            <p><strong>Why it wins:</strong> At just $7.91, this is arguably the best bang-for-your-buck pre-roll in the city right now. High-quality daily driver at a market-leading price.</p>
            <p style="font-size: 1.2em; color: #2e7d32;"><strong>Price: $7.91</strong></p>
          </div>

          <p><strong>Rationale (Internal only):</strong> Recommended as a "Loss Leader" feel. Sub-$10 retail is rare in NY and creates a high-velocity "Reason to visit". (62% margin).</p>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://bakedbot.ai/thrive-syracuse" style="background: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Check in at the door</a>
          </p>
          <p style="font-size: 0.8em; color: #666; text-align: center; margin-top: 20px;">*No coupon code needed. Just check in at the front desk to unlock your digital perks.</p>
        </div>
      `,
      textBody: `Hi ${recipient.name}, welcome back to Thrive! Check out the Wavy Sour OG 1g ($7.91). Rationale: Market leader price, 62% margin. Check in at the door!`,
      agentName: 'craig'
    };

    console.log(`Sending previews to ${recipient.email}...`);
    const resA = await sendGenericEmail(emailA);
    const resB = await sendGenericEmail(emailB);
    
    console.log(`Results for ${recipient.email}: A(${resA.success ? 'OK' : 'FAIL'}), B(${resB.success ? 'OK' : 'FAIL'})`);
    if (resA.error) console.error('Error A:', resA.error);
    if (resB.error) console.error('Error B:', resB.error);
  }

  console.log('--- All Previews Sent ---');
}

sendPreviews().catch(console.error);
