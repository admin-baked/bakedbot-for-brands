/**
 * Thrive Syracuse — COGS Data Reminder Playbook Email
 * 
 * Sends a professional reminder to owners about missing cost data (44% of products).
 * Explains WHY this matters and HOW to fix it in Alleaves.
 * 
 * Usage:
 *   node scratch/send-cogs-reminder.cjs              # Test to martez@bakedbot.ai
 *   node scratch/send-cogs-reminder.cjs --live        # Send to all recipients
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !match[1].startsWith('#')) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    }
}

let ses;
function getSesClient() {
    if (!ses) {
        ses = new SESClient({
            region: 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || '',
            },
        });
    }
    return ses;
}

const FROM_EMAIL = 'hello@bakedbot.ai';
const FROM_NAME = 'BakedBot Strategy';

const RECIPIENTS = {
    owners: [
        { email: 'halysaleis@gmail.com', name: 'Ade Adeyemi' },
        { email: 'adggiles@aol.com', name: 'Archie Giles' },
    ],
    internal: [
        { email: 'martez@bakedbot.ai', name: 'Martez' },
        { email: 'jack@bakedbot.ai', name: 'Jack' },
    ],
};

const isLive = process.argv.includes('--live');

function buildEmailHtml(recipientName) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:40px 48px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">⚠️ Inventory Data Gap Detected</h1>
<p style="margin:8px 0 0;color:#e0e0e0;font-size:14px;">Thrive Syracuse — 44% of products missing wholesale cost</p>
</td>
</tr>
</table>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:40px 48px;">
<p style="margin:0 0 20px;font-size:16px;color:#333;line-height:1.6;">Hi ${recipientName},</p>

<p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6;">
We completed a full inventory audit of Thrive Syracuse's Alleaves catalog. Here's what we found:
</p>

<!-- Stats Box -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border-radius:8px;border-left:4px solid #0f3460;margin:0 0 24px;">
<tr><td style="padding:20px 24px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="33%" style="text-align:center;padding:8px 0;">
<div style="font-size:28px;font-weight:700;color:#0f3460;">56%</div>
<div style="font-size:12px;color:#666;margin-top:4px;">COGS Coverage</div>
</td>
<td width="33%" style="text-align:center;padding:8px 0;border-left:1px solid #dde;">
<div style="font-size:28px;font-weight:700;color:#e74c3c;">44%</div>
<div style="font-size:12px;color:#666;margin-top:4px;">Missing Cost Data</div>
</td>
<td width="33%" style="text-align:center;padding:8px 0;border-left:1px solid #dde;">
<div style="font-size:28px;font-weight:700;color:#27ae60;">$110K</div>
<div style="font-size:12px;color:#666;margin-top:4px;">Inventory at Cost</div>
</td>
</tr>
</table>
</td></tr>
</table>

<!-- Why It Matters -->
<h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">Why This Matters</h2>
<p style="margin:0 0 8px;font-size:14px;color:#444;line-height:1.7;">
Without wholesale cost data in Alleaves, your business is flying blind on critical metrics:
</p>
<ul style="margin:0 0 24px;padding-left:20px;">
<li style="font-size:14px;color:#444;line-height:2.0;">
<strong style="color:#1a1a2e;">Profitability is invisible.</strong> We can't tell which products are making money vs. losing money. Right now, margin calculations for 44% of your catalog are <em>guesses</em>.
</li>
<li style="font-size:14px;color:#444;line-height:2.0;">
<strong style="color:#1a1a2e;">Tax compliance risk.</strong> NY cannabis tax (based on wholesale cost) requires accurate COGS. Without it, you may be overpaying or underpaying excise tax.
</li>
<li style="font-size:14px;color:#444;line-height:2.0;">
<strong style="color:#1a1a2e;">Reorder decisions are blind.</strong> BakedBot can't recommend smart restocking when we don't know your margin per product.
</li>
<li style="font-size:14px;color:#444;line-height:2.0;">
<strong style="color:#1a1a2e;">Investor/bank readiness.</strong> If you ever need a loan or investor report, accurate inventory valuation at cost is required.
</li>
</ul>

<!-- Categories Affected -->
<h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">Categories Most Affected</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
<tr style="background:#f0f2ff;">
<td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1a1a2e;border-bottom:1px solid #dde;">Category</td>
<td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1a1a2e;border-bottom:1px solid #dde;">Products Missing Cost</td>
<td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1a1a2e;border-bottom:1px solid #dde;">Impact</td>
</tr>
<tr>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">Vapes</td>
<td style="padding:10px 16px;font-size:13px;color:#e74c3c;font-weight:600;border-bottom:1px solid #eee;">69%</td>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">132 in stock, unknown margin</td>
</tr>
<tr>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">Tinctures</td>
<td style="padding:10px 16px;font-size:13px;color:#e74c3c;font-weight:600;border-bottom:1px solid #eee;">100%</td>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">13 in stock, zero cost data</td>
</tr>
<tr>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">Beverages</td>
<td style="padding:10px 16px;font-size:13px;color:#e74c3c;font-weight:600;border-bottom:1px solid #eee;">85%</td>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">6 in stock, unknown margin</td>
</tr>
<tr>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">Flower</td>
<td style="padding:10px 16px;font-size:13px;color:#f39c12;font-weight:600;border-bottom:1px solid #eee;">34%</td>
<td style="padding:10px 16px;font-size:13px;color:#444;border-bottom:1px solid #eee;">182 in stock, biggest dollar impact</td>
</tr>
<tr>
<td style="padding:10px 16px;font-size:13px;color:#444;">Concentrates</td>
<td style="padding:10px 16px;font-size:13px;color:#f39c12;font-weight:600;">50%</td>
<td style="padding:10px 16px;font-size:13px;color:#444;">14 in stock, unknown margin</td>
</tr>
</table>

<!-- How To Fix -->
<h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">How to Fix It (5 minutes in Alleaves)</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fff4;border-radius:8px;border-left:4px solid #27ae60;margin:0 0 24px;">
<tr><td style="padding:20px 24px;">
<ol style="margin:0;padding-left:20px;">
<li style="font-size:14px;color:#444;line-height:2.2;">
<strong>Log into Alleaves</strong> → Inventory → Products
</li>
<li style="font-size:14px;color:#444;line-height:2.2;">
<strong>For each active product</strong>, find the "Cost" or "Wholesale Cost" field
</li>
<li style="font-size:14px;color:#444;line-height:2.2;">
<strong>Enter the unit cost</strong> (what you paid per unit to the grower/brand)
</li>
<li style="font-size:14px;color:#444;line-height:2.2;">
<strong>Save</strong> — BakedBot will auto-sync within 24 hours
</li>
</ol>
<p style="margin:12px 0 0;font-size:13px;color:#666;line-height:1.5;">
💡 <strong>Pro tip:</strong> Start with Flower and Vapes — they have the highest dollar impact. Even entering costs for your top 20 products by volume would dramatically improve your profitability dashboard.
</p>
</td></tr>
</table>

<!-- CTA -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:8px 0 24px;">
<a href="https://app.alleaves.com" style="display:inline-block;background:#0f3460;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Open Alleaves → Enter Cost Data</a>
</td>
</tr>
</table>

<!-- Footer note -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9e7;border-radius:8px;margin:0 0 20px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0;font-size:13px;color:#7d6608;line-height:1.5;">
📊 <strong>What happens after you add costs:</strong> BakedBot will automatically recalculate your true margins, update your profitability dashboard, and enable smart pricing recommendations. You'll go from 56% → 95%+ COGS coverage.
</p>
</td></tr>
</table>

<p style="margin:0 0 8px;font-size:14px;color:#444;line-height:1.6;">
Happy to walk you through it — just reply to this email or schedule a quick call.
</p>

<p style="margin:24px 0 0;font-size:15px;color:#333;">
Best,<br>
<strong>Martez & the BakedBot Team</strong>
</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background:#f4f4f7;padding:24px 48px;text-align:center;">
<p style="margin:0;font-size:12px;color:#999;">
BakedBot Strategy · Automated inventory intelligence for cannabis dispensaries<br>
<a href="mailto:strategy@bakedbot.ai" style="color:#666;">strategy@bakedbot.ai</a> · <a href="https://bakedbot.ai" style="color:#666;">bakedbot.ai</a>
</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildTextBody(recipientName) {
    return `INVENTORY DATA GAP DETECTED — Thrive Syracuse

Hi ${recipientName},

We completed a full inventory audit of Thrive Syracuse's Alleaves catalog.

KEY FINDINGS:
- 56% COGS coverage (up from 36% after our sync)
- 44% of products still missing wholesale cost data
- $110K inventory at cost (with estimates), $53K verified

WHY THIS MATTERS:
1. PROFITABILITY IS INVISIBLE — We can't tell which products make money vs. lose money for 44% of your catalog.
2. TAX COMPLIANCE RISK — NY cannabis tax requires accurate wholesale cost. You may be over/underpaying.
3. REORDER DECISIONS ARE BLIND — BakedBot can't recommend smart restocking without margin data.
4. INVESTOR READINESS — Accurate inventory valuation at cost is required for loans/investors.

CATEGORIES MOST AFFECTED:
- Vapes: 69% missing cost (132 in stock)
- Tinctures: 100% missing cost (13 in stock)
- Beverages: 85% missing cost (6 in stock)
- Flower: 34% missing cost (182 in stock — biggest dollar impact)

HOW TO FIX (5 minutes in Alleaves):
1. Log into Alleaves → Inventory → Products
2. For each active product, find the "Cost" or "Wholesale Cost" field
3. Enter the unit cost (what you paid per unit)
4. Save — BakedBot auto-syncs within 24 hours

Start with Flower and Vapes — highest dollar impact.

After adding costs, BakedBot will automatically recalculate true margins, update your profitability dashboard, and enable smart pricing recommendations (56% → 95%+ coverage).

Happy to walk you through it — just reply to this email.

Best,
Martez & the BakedBot Team

---
BakedBot Strategy · strategy@bakedbot.ai · bakedbot.ai`;
}

async function sendEmail(to, toName) {
    const command = new SendEmailCommand({
        Source: `${FROM_NAME} <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
            Subject: { Data: '⚠️ Action Needed: 44% of Thrive Products Missing Wholesale Cost Data' },
            Body: {
                Html: { Data: buildEmailHtml(toName), Charset: 'UTF-8' },
                Text: { Data: buildTextBody(toName), Charset: 'UTF-8' },
            },
        },
        ReplyToAddresses: ['martez@bakedbot.ai'],
    });

    const result = await getSesClient().send(command);
    return result.MessageId;
}

async function main() {
    console.log('📧 Thrive Syracuse — COGS Reminder Playbook Email');
    console.log('=================================================\n');

    if (isLive) {
        console.log('🔴 LIVE MODE — Sending to all recipients\n');
        const all = [...RECIPIENTS.owners, ...RECIPIENTS.internal];
        for (const r of all) {
            try {
                const msgId = await sendEmail(r.email, r.name);
                console.log(`  ✅ Sent to ${r.name} <${r.email}> (MessageId: ${msgId})`);
            } catch (err) {
                console.error(`  ❌ Failed for ${r.name} <${r.email}>: ${err.message}`);
            }
        }
    } else {
        console.log('🧪 TEST MODE — Sending to martez@bakedbot.ai only');
        console.log('   Use --live flag to send to all recipients\n');
        try {
            const msgId = await sendEmail('martez@bakedbot.ai', 'Martez');
            console.log(`  ✅ Test sent! (MessageId: ${msgId})`);
            console.log('\n📬 Check martez@bakedbot.ai for the email.');
            console.log('   Once vetted, run: node scratch/send-cogs-reminder.cjs --live');
        } catch (err) {
            console.error(`  ❌ Failed: ${err.message}`);
        }
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });