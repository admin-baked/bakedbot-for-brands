/**
 * Agency Partner Email Templates
 *
 * Welcome sequence + weekly intel newsletter for agency ICP.
 * All HTML is inline-styled for email client compatibility.
 */

function esc(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

const BASE_STYLE = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:0;`;
const CONTAINER = `max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);`;
const HEADER = `background:linear-gradient(135deg,#0f172a 0%,#064e3b 100%);padding:32px 40px;text-align:center;`;
const BODY = `padding:40px;color:#1e293b;line-height:1.6;`;
const FOOTER = `background:#f1f5f9;padding:24px 40px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;`;
const CTA_BTN = `display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:600;font-size:15px;margin-top:24px;`;
const H1 = `color:#ffffff;font-size:24px;font-weight:700;margin:16px 0 8px;`;
const H2 = `color:#0f172a;font-size:20px;font-weight:700;margin:0 0 16px;`;
const P = `color:#475569;font-size:15px;margin:0 0 16px;`;
const DIVIDER = `border:none;border-top:1px solid #e2e8f0;margin:32px 0;`;
const TAG = `display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:600;margin:2px;`;

export function agencyWelcomeEmail(firstName: string, agencyName: string): { subject: string; htmlBody: string; body: string } {
    const name = esc(firstName || 'there');
    const agency = esc(agencyName || 'your agency');

    const subject = `Welcome to BakedBot Agency Partners, ${firstName || 'there'} 🌿`;

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <img src="https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png" alt="BakedBot AI" height="44" style="height:44px;width:auto;">
    <p style="color:#6ee7b7;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:12px 0 0;">Agency Partner Program</p>
    <h1 style="${H1}">Welcome, ${name}.</h1>
  </div>
  <div style="${BODY}">
    <h2 style="${H2}">You're in. Here's what happens next.</h2>
    <p style="${P}">Thanks for applying on behalf of <strong>${agency}</strong>. Martez reviews every application personally — you'll hear from him within 48 hours to schedule your 30-minute onboarding call.</p>
    <p style="${P}">While you wait, here's what you're getting access to as a launch partner:</p>
    <ul style="color:#475569;font-size:15px;padding-left:20px;margin:0 0 24px;">
      <li style="margin-bottom:8px;"><strong>AI retention under your brand</strong> — BakedBot runs managed retention, competitive intel, and compliance-reviewed campaigns as part of your service stack</li>
      <li style="margin-bottom:8px;"><strong>Weekly branded KPI reports</strong> — shareable with your dispensary clients showing retention revenue and campaign performance</li>
      <li style="margin-bottom:8px;"><strong>Revenue share</strong> — earned on every client account you bring on, paid quarterly</li>
      <li style="margin-bottom:8px;"><strong>Co-sell support</strong> — we join your first two client pitches as the technical proof</li>
    </ul>
    <p style="${P}">Every Monday you'll receive our <strong>Cannabis Marketing Intel Brief</strong> — the week's most important developments in dispensary marketing, plus BakedBot feature updates, straight to your inbox.</p>
    <hr style="${DIVIDER}">
    <p style="${P}">In the meantime, explore what BakedBot is doing live at Thrive Syracuse — our first pilot dispensary.</p>
    <a href="https://bakedbot.ai/case-studies" style="${CTA_BTN}">See the Platform in Action →</a>
  </div>
  <div style="${FOOTER}">
    <p style="margin:0 0 8px;">BakedBot AI · Agency Partner Program</p>
    <p style="margin:0;">Questions? Reply to this email or reach Martez at <a href="mailto:martez@bakedbot.ai" style="color:#10b981;">martez@bakedbot.ai</a></p>
  </div>
</div>
</body></html>`;

    const body = `Welcome, ${name}.\n\nThanks for applying on behalf of ${agency}. Martez reviews every application personally — you'll hear from him within 48 hours.\n\nWhile you wait, here's what you're getting as a launch partner:\n- AI retention under your brand\n- Weekly branded KPI reports\n- Revenue share on every client you bring on\n- Co-sell support on your first two pitches\n\nEvery Monday you'll receive our Cannabis Marketing Intel Brief.\n\nSee the platform: https://bakedbot.ai/case-studies\n\nQuestions? martez@bakedbot.ai`;

    return { subject, htmlBody, body };
}

export interface NewsletterItem {
    headline: string;
    summary: string;
    url?: string;
}

export function agencyNewsletterEmail(params: {
    weekOf: string;
    featureUpdate: { title: string; description: string };
    newsItems: NewsletterItem[];
    tipOfWeek: string;
}): { subject: string; htmlBody: string; body: string } {
    const { weekOf, featureUpdate, newsItems, tipOfWeek } = params;

    const subject = `Cannabis Marketing Intel Brief — Week of ${weekOf}`;

    const newsHtml = newsItems.map(item => `
    <div style="border-left:3px solid #10b981;padding:12px 16px;margin-bottom:16px;background:#f8fafc;border-radius:0 4px 4px 0;">
      <p style="font-weight:600;color:#0f172a;margin:0 0 4px;font-size:14px;">${esc(item.headline)}</p>
      <p style="color:#475569;font-size:13px;margin:0 0 6px;">${esc(item.summary)}</p>
      ${item.url ? `<a href="${esc(item.url)}" style="color:#10b981;font-size:12px;text-decoration:none;font-weight:600;">Read more →</a>` : ''}
    </div>`).join('');

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <img src="https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png" alt="BakedBot AI" height="36" style="height:36px;width:auto;">
    <p style="color:#6ee7b7;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:10px 0 0;">Cannabis Marketing Intel Brief</p>
    <h1 style="color:#ffffff;font-size:18px;font-weight:700;margin:8px 0 0;">Week of ${esc(weekOf)}</h1>
  </div>
  <div style="${BODY}">

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:32px;">
      <p style="color:#15803d;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;">🚀 BakedBot Feature Update</p>
      <p style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 8px;">${esc(featureUpdate.title)}</p>
      <p style="color:#475569;font-size:14px;margin:0;">${esc(featureUpdate.description)}</p>
    </div>

    <h2 style="${H2}">This Week in Cannabis Marketing</h2>
    ${newsHtml}

    <hr style="${DIVIDER}">

    <div style="background:#fafafa;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="color:#0f172a;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;">💡 Agency Tip of the Week</p>
      <p style="color:#475569;font-size:14px;margin:0;">${esc(tipOfWeek)}</p>
    </div>

    <p style="${P}">Ready to bring a client onto BakedBot? Reply to this email and we'll set up a co-sell call.</p>
    <a href="https://agency.bakedbot.ai/apply" style="${CTA_BTN}">Refer a Dispensary Client →</a>
  </div>
  <div style="${FOOTER}">
    <p style="margin:0 0 8px;">BakedBot AI Agency Partner Newsletter · Sent every Monday</p>
    <p style="margin:0;">You're receiving this because you're a BakedBot agency partner or subscriber. <a href="{{unsubscribeUrl}}" style="color:#94a3b8;">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;

    const body = [
        `Cannabis Marketing Intel Brief — Week of ${weekOf}`,
        '',
        `🚀 BakedBot Feature Update: ${featureUpdate.title}`,
        featureUpdate.description,
        '',
        'This Week in Cannabis Marketing:',
        ...newsItems.map(n => `• ${n.headline}: ${n.summary}${n.url ? ` (${n.url})` : ''}`),
        '',
        `💡 Agency Tip: ${tipOfWeek}`,
        '',
        'Reply to this email to set up a co-sell call.',
    ].join('\n');

    return { subject, htmlBody, body };
}

export interface RetentionAuditNurtureParams {
    firstName?: string;
    grade: string;
    topLeak: string;
    url: string;
}

export function retentionAuditDay0Email(p: RetentionAuditNurtureParams): { subject: string; htmlBody: string; body: string } {
    const name = esc(p.firstName || 'there');
    const grade = esc(p.grade);
    const leak = esc(p.topLeak);
    const url = esc(p.url);

    const gradeColor = p.grade === 'A' ? '#15803d' : p.grade === 'B' ? '#0369a1' : p.grade === 'C' ? '#d97706' : '#dc2626';

    const subject = `Your retention audit is ready — Grade ${p.grade} (+ what to fix first)`;

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <img src="https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png" alt="BakedBot AI" height="40" style="height:40px;width:auto;">
    <p style="color:#6ee7b7;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:10px 0 0;">AI Retention Audit</p>
  </div>
  <div style="${BODY}">
    <p style="${P}">Hi ${name},</p>
    <p style="${P}">Your full retention audit for <strong>${url}</strong> is ready. Here's the headline:</p>

    <div style="text-align:center;padding:32px;background:#f8fafc;border-radius:8px;margin:24px 0;">
      <div style="font-size:72px;font-weight:900;color:${gradeColor};line-height:1;">${grade}</div>
      <p style="color:#64748b;font-size:14px;margin:8px 0 0;">Overall Retention Score</p>
    </div>

    <p style="${P}"><strong>Your #1 revenue leak:</strong><br>${leak}</p>
    <p style="${P}">We've identified the specific fixes that would have the biggest impact on your retention revenue. The full report is in your email — or book a 20-minute call with Martez and we'll walk through it together.</p>
    <a href="https://bakedbot.ai/book" style="${CTA_BTN}">Book a Free Strategy Call →</a>
    <hr style="${DIVIDER}">
    <p style="color:#94a3b8;font-size:13px;">In 3 days, I'll send you a real example of how a dispensary in a similar position fixed their top leak in 30 days.</p>
  </div>
  <div style="${FOOTER}">
    <p style="margin:0;">BakedBot AI · <a href="mailto:martez@bakedbot.ai" style="color:#10b981;">martez@bakedbot.ai</a> · <a href="{{unsubscribeUrl}}" style="color:#94a3b8;">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;

    const body = `Hi ${p.firstName || 'there'},\n\nYour retention audit for ${p.url} is ready. Grade: ${p.grade}\n\nYour #1 revenue leak: ${p.topLeak}\n\nBook a free strategy call: https://bakedbot.ai/book\n\n— Martez, BakedBot AI`;

    return { subject, htmlBody, body };
}

export function retentionAuditDay3Email(p: { firstName?: string }): { subject: string; htmlBody: string; body: string } {
    const name = esc(p.firstName || 'there');
    const subject = `How Thrive Syracuse fixed their retention leak in 30 days`;

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <img src="https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png" alt="BakedBot AI" height="40" style="height:40px;width:auto;">
  </div>
  <div style="${BODY}">
    <p style="${P}">Hi ${name},</p>
    <p style="${P}">Three days ago you ran a retention audit on your dispensary. I wanted to share what a real dispensary did after they got the same diagnosis.</p>
    <div style="border-left:3px solid #10b981;padding:16px 20px;background:#f0fdf4;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="color:#15803d;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Case Study: Thrive Cannabis Marketplace, Syracuse NY</p>
      <p style="color:#0f172a;font-size:15px;font-weight:700;margin:0 0 8px;">"Our post-visit emails were generic. Customers weren't coming back."</p>
      <p style="color:#475569;font-size:14px;margin:0;">After connecting BakedBot, Thrive's AI now sends personalized retention emails automatically — triggered by visit patterns and product preferences. Within 30 days, repeat visit rate improved measurably and their team stopped doing email manually.</p>
    </div>
    <p style="${P}">The system that did this is the same one we'd set up for you. It runs autonomously — Craig (our marketing AI) handles the campaigns, Deebo checks compliance, and Mrs. Parker handles retention nudges.</p>
    <p style="${P}">If this resonates, I'd love to show you the exact setup on a 20-minute call.</p>
    <a href="https://bakedbot.ai/book" style="${CTA_BTN}">See It in Action →</a>
  </div>
  <div style="${FOOTER}">
    <p style="margin:0;">BakedBot AI · <a href="mailto:martez@bakedbot.ai" style="color:#10b981;">martez@bakedbot.ai</a> · <a href="{{unsubscribeUrl}}" style="color:#94a3b8;">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;

    const body = `Hi ${p.firstName || 'there'},\n\nThrive Cannabis Marketplace in Syracuse NY fixed their retention leak in 30 days using BakedBot.\n\nBefore: generic post-visit emails, low repeat rate.\nAfter: AI-personalized retention campaigns running autonomously.\n\nI'd love to show you the same setup on a 20-minute call.\n\nBook here: https://bakedbot.ai/book\n\n— Martez`;

    return { subject, htmlBody, body };
}

export function retentionAuditDay7Email(p: { firstName?: string }): { subject: string; htmlBody: string; body: string } {
    const name = esc(p.firstName || 'there');
    const subject = `Still thinking about your retention audit?`;

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <img src="https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png" alt="BakedBot AI" height="40" style="height:40px;width:auto;">
  </div>
  <div style="${BODY}">
    <p style="${P}">Hi ${name},</p>
    <p style="${P}">A week ago you ran your retention audit. I want to make sure the findings didn't just sit in your inbox.</p>
    <p style="${P}">The revenue leaks we identified are real — and they compound every week you don't fix them. Most dispensaries leave <strong>$2,000–$8,000/month</strong> on the table from customers who visited once and never came back.</p>
    <p style="${P}">BakedBot fixes that automatically. No new hires. No manual campaigns. The AI runs it.</p>
    <p style="${P}">I have 20 minutes this week. Let me show you the exact system we'd put in place for your dispensary — and what you'd realistically see in 30 days.</p>
    <a href="https://bakedbot.ai/book" style="${CTA_BTN}">Book Your Strategy Call →</a>
    <hr style="${DIVIDER}">
    <p style="color:#94a3b8;font-size:13px;">Not ready yet? No problem. I'll check back in a few weeks. If you have questions, just reply to this email.</p>
  </div>
  <div style="${FOOTER}">
    <p style="margin:0;">BakedBot AI · <a href="mailto:martez@bakedbot.ai" style="color:#10b981;">martez@bakedbot.ai</a> · <a href="{{unsubscribeUrl}}" style="color:#94a3b8;">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;

    const body = `Hi ${p.firstName || 'there'},\n\nA week ago you ran your retention audit. Most dispensaries leave $2,000–$8,000/month on the table from customers who visited once and never came back.\n\nBakedBot fixes that automatically.\n\nBook a 20-minute strategy call: https://bakedbot.ai/book\n\n— Martez`;

    return { subject, htmlBody, body };
}
