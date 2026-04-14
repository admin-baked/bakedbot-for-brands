// scratch/send-test.ts
const fs = require('fs');
const path = require('path');
const Mailjet = require('node-mailjet');

// Load credentials from .env.local manually for the script
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envLocal.split('\n').forEach(line => {
    const [key, ...parts] = line.split('=');
    if (key && parts.length > 0) {
        env[key.trim()] = parts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const mailjet = new Mailjet.Client({
    apiKey: env.MAILJET_API_KEY || '',
    apiSecret: env.MAILJET_SECRET_KEY || ''
});

async function sendEmail(opts) {
    return mailjet
        .post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: 'hello@bakedbot.ai',
                        Name: opts.fromName
                    },
                    To: [
                        {
                            Email: opts.to,
                            Name: opts.to
                        }
                    ],
                    Subject: opts.subject,
                    TextPart: opts.text,
                    HTMLPart: opts.html
                }
            ]
        });
}

function buildTemplate(displayName) {
    const brandUrl = 'https://bakedbot.ai/ecstaticedibles';
    const logoUrl = 'https://storage.googleapis.com/bakedbot-global-assets/ecstatic-logo.png';
    const primaryColor = '#e11d48';

    const subject = '🍪 Welcome to the Ecstatic Family! (Something special is coming...)';
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Ecstatic Edibles</title>
</head>
<body style="margin:0;padding:0;background:#fff5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#4a0416;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 12px;background:#fff5f7;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(225,29,72,0.1);">
                    <tr>
                        <td style="padding:40px;text-align:center;background:linear-gradient(135deg,#e11d48 0%,#be123c 100%);">
                            <img src="${logoUrl}" alt="Ecstatic Edibles" width="120" style="margin-bottom:20px;filter:brightness(0) invert(1);">
                            <h1 style="margin:0;font-size:32px;color:#ffffff;letter-spacing:-0.02em;">Welcome, Honey! 🍪</h1>
                            <p style="margin:12px 0 0;font-size:16px;color:rgba(255,255,255,0.9);font-weight:500;">From Los Angeles with Love • Founded by Melanie Comarcho</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:48px 40px;">
                            <p style="margin:0 0 20px;font-size:20px;line-height:1.5;font-weight:600;">Hi ${displayName},</p>
                            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                                We are so thrilled to have you in our inner circle! Founded by actress and comedianne <strong>Melanie Comarcho</strong>, Ecstatic Edibles is all about bringing pure joy and premium flavor to your day—straight from the heart of LA.
                            </p>
                            
                            <div style="background:#fff1f2;border-radius:16px;padding:24px;margin-bottom:32px;border:1px dashed #f43f5e;">
                                <h3 style="margin:0 0 12px;font-size:18px;color:#e11d48;">🔥 4/20 Countdown is ON!</h3>
                                <p style="margin:0;font-size:15px;line-height:1.6;color:#831843;">
                                    As a new member of the Ecstatic family, you'll be the first to know when our <strong>4/20 Mystery Drop</strong> goes live. Trust us, you don't want to miss what we have baking in the oven.
                                </p>
                            </div>

                            <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
                                Until then, why not browse what's coming soon? From our signature <strong>Snickerdoodle Bites</strong> to our <strong>Cheesecake Bliss Gummies</strong>, we're redefining the edible experience.
                            </p>

                            <table cellpadding="0" cellspacing="0" style="margin:32px 0">
                                <tr><td style="background:#e11d48;border-radius:12px;padding:16px 32px">
                                    <a href="${brandUrl}" style="color:#fff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                                        Browse the Collection →
                                    </a>
                                </td></tr>
                            </table>

                            <hr style="border:none;border-top:1px solid #fee2e2;margin:40px 0;">

                            <p style="margin:0;font-size:15px;line-height:1.6;color:#9d174d;font-style:italic;">
                                Stay sweet,<br>
                                <strong style="font-size:18px;color:#e11d48;">Melanie & The Ecstatic Team 💜</strong><br>
                                <span style="font-size:13px;color:#be185d;">Los Angeles, CA</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
    const textBody = `
Hi ${displayName},

Welcome to the Ecstatic Edibles family! 🍪

You've just unlocked early access to the most anticipated drops in the edible world.
Founded by actress and comedianne Melanie Comarcho.

🔥 4/20 COUNTDOWN IS ON!
As a new member, you'll be the first to know when our 4/20 Mystery Drop goes live. Trust us, you don't want to miss what we have baking.

Browse the collection: ${brandUrl}

Stay sweet,
Melanie & The Ecstatic Team 💜
    `.trim();
    return { subject, html: htmlBody, text: textBody };
}

async function run() {
    const recipients = [
        { email: 'martez@bakedbot.ai', firstName: 'Martez' },
        { email: 'keith@mrinfluencecoach.com', firstName: 'Keith' }
    ];

    for (const person of recipients) {
        console.log(`Sending to ${person.email}...`);
        const template = buildTemplate(person.firstName);
        try {
            await sendEmail({
                to: person.email,
                fromName: 'Ecstatic Edibles',
                ...template
            });
            console.log(`✅ Sent to ${person.email}`);
        } catch (err) {
            console.error(`❌ Failed ${person.email}: ${err.message}`);
        }
    }
}

run();
