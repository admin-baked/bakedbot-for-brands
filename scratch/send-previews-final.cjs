const Mailjet = require('node-mailjet');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const MJ_API_KEY = process.env.MAILJET_API_KEY;
const MJ_SECRET_KEY = process.env.MAILJET_SECRET_KEY;

if (!MJ_API_KEY || !MJ_SECRET_KEY) {
  console.error('Missing Mailjet credentials in .env.local');
  process.exit(1);
}

const mailjet = Mailjet.apiConnect(MJ_API_KEY, MJ_SECRET_KEY);

const recipients = [
  { email: 'adeyemideta@gmail.com', name: 'Ade' },
  { email: 'adggiles@aol.com', name: 'Archie' },
  { email: 'jack@bakedbot.ai', name: 'Jack' },
  { email: 'martez@bakedbot.ai', name: 'Martez' }
];

async function sendEmail(recipient, version) {
  const isA = version === 'A';
  const product = isA 
    ? { name: 'Therapy .5g Preroll- Hooch Infused', price: '$11.30', rationale: 'Premium/High-Margin (73%)' }
    : { name: 'Wavy Sour OG Pre-Roll 1g', price: '$7.91', rationale: 'Value Leader/Loss-Leader (62%)' };

  const subject = isA 
    ? `[PREVIEW A] Welcome back, ${recipient.name}! A premium treat awaits... 🌿`
    : `[PREVIEW B] Good to see you again! Syracuse's best value is back. 🌿`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #2e7d32;">Welcome back to Thrive Syracuse!</h2>
      <p>Hi ${recipient.name},</p>
      <p>It's been a while since we've seen you! We've been missing your visits and wanted to welcome you back with a look at our current favorite selection.</p>
      
      <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3>${isA ? 'Staff Highlight' : 'Value Leader'}: ${product.name}</h3>
        <p>${isA ? '<strong>The "Premium" Factor:</strong> This infused pre-roll delivers a smooth, elevated experience that sets the bar for retail quality.' : '<strong>Why it wins:</strong> High-quality daily driver at a market-leading price. One of the best values in the city.'}</p>
        <p style="font-size: 1.2em; color: #2e7d32;"><strong>Price: ${product.price}</strong></p>
      </div>

      <p><strong>Rationale:</strong> ${product.rationale}. Focus on "Check-in at the door" (no discount code needed).</p>

      <p style="text-align: center; margin-top: 30px;">
        <a href="https://bakedbot.ai/thrive-syracuse" style="background: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Check in at the door</a>
      </p>
      <p style="font-size: 0.8em; color: #666; text-align: center; margin-top: 20px;">*No coupon code needed. Just check in at the front desk to unlock your digital perks.</p>
    </div>
  `;

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: { Email: 'hello@bakedbot.ai', Name: 'BakedBot Strategy' },
        To: [{ Email: recipient.email, Name: recipient.name }],
        Subject: subject,
        HTMLPart: htmlBody
      }
    ]
  });
}

async function run() {
  for (const recipient of recipients) {
    console.log(`Sending previews to ${recipient.email}...`);
    try {
      await sendEmail(recipient, 'A');
      await sendEmail(recipient, 'B');
      console.log(`Successfully sent A and B to ${recipient.email}`);
    } catch (err) {
      console.error(`Failed to send to ${recipient.email}:`, err.message);
    }
  }
}

run();
