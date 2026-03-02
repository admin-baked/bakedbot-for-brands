/**
 * NY Dispensary Outreach Email Templates
 *
 * Professional outreach emails from Martez, Founder of BakedBot AI.
 * Each template targets a different angle based on the lead magnet funnel.
 *
 * Templates are designed to be personalized with dispensary-specific data
 * from Ezal competitive intelligence when available.
 */

export interface OutreachEmailData {
    dispensaryName: string;
    contactName?: string;
    city?: string;
    state?: string;
    posSystem?: string;
    competitorCount?: number;
    nearestCompetitor?: string;
    leadMagnetUrl?: string;
}

export interface OutreachEmail {
    id: string;
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    angle: string;
}

const FOOTER = `
<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
  <p style="margin: 0; color: #475569; font-size: 14px;">
    <strong>Martez</strong><br/>
    Founder, BakedBot AI<br/>
    <a href="mailto:martez@bakedbot.ai" style="color: #059669;">martez@bakedbot.ai</a>
  </p>
  <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">
    BakedBot AI — The Agentic Commerce OS for Cannabis
  </p>
</div>`;

const WRAPPER_START = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6;">`;

const WRAPPER_END = `${FOOTER}</div>`;

export function generateOutreachEmails(data: OutreachEmailData): OutreachEmail[] {
    const name = data.contactName || 'there';
    const dispensary = data.dispensaryName;
    const city = data.city || 'your area';

    return [
        // Template 1: Free Competitive Report (highest converting)
        {
            id: 'competitive-report',
            name: 'Free Competitive Report Offer',
            angle: 'Value-first: free competitive intelligence',
            subject: `${dispensary} — your competitors changed prices this week`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>I built an AI that tracks every dispensary menu in ${city} in real time — pricing, new products, promotions, the works.</p>

<p>I pulled a <strong>free competitive landscape report</strong> for ${dispensary}. It shows:</p>

<ul style="color: #334155;">
  <li>How your pricing compares to ${data.competitorCount || '5+'} nearby dispensaries</li>
  <li>Categories where you may be leaving margin on the table</li>
  <li>New products your competitors added recently</li>
</ul>

<p>No strings attached — I just want to show you what our tool does.</p>

<p><a href="https://bakedbot.ai/ny/competitive-report" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Get Your Free Report</a></p>

<p>Takes 30 seconds to request. Happy to walk you through it on a quick call if you prefer.</p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

I built an AI that tracks every dispensary menu in ${city} in real time — pricing, new products, promotions.

I pulled a free competitive landscape report for ${dispensary}. It shows how your pricing compares to ${data.competitorCount || '5+'} nearby dispensaries, categories where you may be leaving margin, and new products competitors added recently.

No strings attached — get your free report at: https://bakedbot.ai/ny/competitive-report

Takes 30 seconds. Happy to walk you through it on a quick call.

Martez
Founder, BakedBot AI
martez@bakedbot.ai`,
        },

        // Template 2: Founding Partner Program (exclusivity/urgency)
        {
            id: 'founding-partner',
            name: 'Founding Partner Invite',
            angle: 'Exclusivity: limited spots, early-mover advantage',
            subject: `Invitation: ${dispensary} — NY Founding Partner Program`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>We&apos;re selecting <strong>10 New York dispensaries</strong> as founding partners for BakedBot AI — an AI-powered operations platform built specifically for cannabis retail.</p>

<p>What founding partners get:</p>

<ul style="color: #334155;">
  <li><strong>50% off</strong> for the first 60 days</li>
  <li><strong>30% off</strong> for the next 6 months</li>
  <li>Direct line to our engineering team</li>
  <li>Your feedback shapes the product roadmap</li>
</ul>

<p>In exchange, we ask for a case study and honest testimonial after your pilot.</p>

<p>We&apos;re already live with dispensaries in Syracuse. Spots are limited — I&apos;d love to have ${dispensary} in the cohort.</p>

<p><a href="https://bakedbot.ai/ny/founding-partner" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Apply for Your Spot</a></p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

We're selecting 10 New York dispensaries as founding partners for BakedBot AI — an AI-powered operations platform for cannabis retail.

Founding partners get 50% off for 60 days, 30% off for 6 months, direct engineering access, and product roadmap influence. In exchange: a case study + testimonial.

We're already live in Syracuse. Spots are limited.

Apply: https://bakedbot.ai/ny/founding-partner

Martez
Founder, BakedBot AI`,
        },

        // Template 3: CAURD Grant angle (NYC equity operators)
        {
            id: 'caurd-grant',
            name: 'CAURD Tech Grant Guide',
            angle: 'Budget: use your $30K OCM tech grant',
            subject: `${dispensary} — use your OCM tech grant for AI-powered operations`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>Did you know the OCM&apos;s CAURD grant program allocates <strong>up to $30,000 per dispensary</strong> for technology upgrades?</p>

<p>I put together a free guide: <strong>"How to Use Your $30K for AI-Powered Growth"</strong> — it covers:</p>

<ul style="color: #334155;">
  <li>Which tech expenses qualify (POS, compliance, marketing automation)</li>
  <li>Step-by-step application walkthrough</li>
  <li>How BakedBot fits as a grant-eligible platform</li>
</ul>

<p>We can even help you write the tech portion of your application. No charge.</p>

<p><a href="https://bakedbot.ai/ny/caurd-grant" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Download the Free Guide</a></p>

<p>Happy to jump on a quick call to discuss how this applies to ${dispensary}.</p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

Did you know the OCM's CAURD grant program allocates up to $30,000 per dispensary for technology?

I put together a free guide covering which expenses qualify, the application process, and how BakedBot fits as grant-eligible tech. We'll even help write the tech portion of your application — no charge.

Download: https://bakedbot.ai/ny/caurd-grant

Happy to discuss how this applies to ${dispensary}.

Martez
Founder, BakedBot AI`,
        },

        // Template 4: ROI Calculator hook
        {
            id: 'roi-calculator',
            name: 'ROI Calculator Challenge',
            angle: 'Data-driven: show them the money',
            subject: `Quick question for ${dispensary}`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>Quick question: do you know how much revenue ${dispensary} is leaving on the table from unoptimized pricing alone?</p>

<p>I built a <strong>free ROI calculator</strong> that takes your daily customer count and average ticket, and shows you exactly what AI-powered operations could add to your bottom line.</p>

<p>Most dispensaries we&apos;ve analyzed see a <strong>4-8x return</strong> on the platform cost — mainly from dynamic pricing optimization and budtender upsell improvements.</p>

<p><a href="https://bakedbot.ai/ny/roi-calculator" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Calculate Your ROI</a></p>

<p>Takes 60 seconds. No login required.</p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

Quick question: do you know how much revenue ${dispensary} is leaving on the table from unoptimized pricing?

I built a free ROI calculator — enter your daily customers and average ticket to see exactly what AI operations could add to your bottom line.

Most dispensaries see 4-8x return on platform cost.

Calculate yours: https://bakedbot.ai/ny/roi-calculator

Takes 60 seconds, no login required.

Martez
Founder, BakedBot AI`,
        },

        // Template 5: Price War Report (awareness/curiosity)
        {
            id: 'price-war',
            name: 'Syracuse Price War Intel',
            angle: 'Curiosity: market intelligence they can\'t get elsewhere',
            subject: `The ${city} dispensary price war — where does ${dispensary} stand?`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>I&apos;ve been tracking pricing across every dispensary in ${city} — and the competitive landscape is getting intense.</p>

<p>A few things jumped out:</p>

<ul style="color: #334155;">
  <li>Concentrate pricing has a <strong>43% spread</strong> between the cheapest and most expensive dispensary</li>
  <li>Flower pricing is clustering tighter — the race to the bottom is real</li>
  <li>Edibles and pre-rolls still have room for premium positioning</li>
</ul>

<p>I published the full breakdown as a <strong>free market intelligence report</strong>. No email gate — just useful data.</p>

<p><a href="https://bakedbot.ai/ny/price-war" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View the Price War Report</a></p>

<p>If you want this kind of intel delivered daily for your specific market, that&apos;s exactly what BakedBot does. Happy to chat.</p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

I've been tracking pricing across every dispensary in ${city}. The competitive landscape is intense.

Key findings: concentrate pricing has a 43% spread, flower is racing to the bottom, and edibles/pre-rolls still have premium positioning room.

Full breakdown (no email gate): https://bakedbot.ai/ny/price-war

If you want daily intel for your specific market, that's what BakedBot does. Happy to chat.

Martez
Founder, BakedBot AI`,
        },

        // Template 6: POS Integration angle (for Alleaves users)
        {
            id: 'pos-integration',
            name: 'POS Integration Pitch',
            angle: 'Zero-friction: already compatible with their POS',
            subject: `${dispensary} + BakedBot — zero-setup integration`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>I noticed ${dispensary} is running ${data.posSystem || 'a cannabis POS system'}. Good news — BakedBot integrates directly with ${data.posSystem || 'most major POS systems'}, which means you can be up and running in under an hour.</p>

<p>What you get on day one:</p>

<ul style="color: #334155;">
  <li><strong>AI Budtender</strong> — trained on your actual menu, not generic cannabis data</li>
  <li><strong>Competitive Intel</strong> — daily pricing comparisons across your market</li>
  <li><strong>Marketing Automation</strong> — SMS + email campaigns that write themselves</li>
  <li><strong>Compliance Monitor</strong> — NY OCM rules enforced automatically</li>
</ul>

<p>No data migration. No staff retraining. Your POS data flows in and the AI starts working immediately.</p>

<p><a href="https://bakedbot.ai/ny/founding-partner" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Your Free Pilot</a></p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

${dispensary} runs ${data.posSystem || 'a cannabis POS'} — BakedBot integrates directly, so you're up in under an hour.

Day one: AI Budtender trained on your menu, daily competitive pricing intel, automated marketing campaigns, and NY OCM compliance monitoring.

No data migration. No retraining. Your POS data flows in and the AI starts immediately.

Start free: https://bakedbot.ai/ny/founding-partner

Martez
Founder, BakedBot AI`,
        },

        // Template 7: Loyalty Program angle (OCM just approved)
        {
            id: 'loyalty-program',
            name: 'OCM Loyalty Program Launch',
            angle: 'Timeliness: OCM just approved loyalty programs',
            subject: `${dispensary} — NY just approved loyalty programs. Ready to launch?`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>Big news: the OCM just approved loyalty programs for NY dispensaries. Every operator in the state is scrambling to launch one.</p>

<p>BakedBot comes with a <strong>compliant loyalty engine built in</strong>:</p>

<ul style="color: #334155;">
  <li>Points-based rewards that follow OCM&apos;s neutral language requirements</li>
  <li>Automatic compliance checks (no medical claims, no "buy more" language)</li>
  <li>Integrates with Alpine IQ if you&apos;re already using it</li>
  <li>Automated birthday rewards, win-back campaigns, VIP tiers</li>
</ul>

<p>If you haven&apos;t launched a loyalty program yet, we can get you live in days — not weeks.</p>

<p><a href="https://bakedbot.ai/ny/founding-partner" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Launch Your Loyalty Program</a></p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

The OCM just approved loyalty programs for NY dispensaries. BakedBot has a compliant loyalty engine built in — points-based rewards with OCM-compliant language, automatic compliance checks, Alpine IQ integration, and automated birthday/win-back campaigns.

We can get you live in days, not weeks.

Get started: https://bakedbot.ai/ny/founding-partner

Martez
Founder, BakedBot AI`,
        },

        // Template 8: Behind the Glass Demo
        {
            id: 'behind-glass-demo',
            name: 'Behind the Glass Demo Invite',
            angle: 'Show don\'t tell: live demo with their own data',
            subject: `15 min to show ${dispensary} something you haven't seen before`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>I&apos;d like to show you something no other cannabis tech company can do.</p>

<p>In a 15-minute screen share, I&apos;ll pull up ${dispensary}&apos;s competitive landscape — <strong>live, with your real data</strong> — and walk you through:</p>

<ul style="color: #334155;">
  <li>Your pricing position vs. every dispensary within 10 miles</li>
  <li>Which of your products are overpriced (and which are underpriced)</li>
  <li>A sample marketing campaign our AI would generate for your brand</li>
  <li>How our AI budtender recommends products based on your actual menu</li>
</ul>

<p>No slides. No pitch deck. Just your data, our AI, 15 minutes.</p>

<p>Worth a look?</p>

<p><a href="https://bakedbot.ai/meet" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Book 15 Minutes</a></p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

I'd like to show you something no other cannabis tech company can do.

In 15 minutes, I'll pull up ${dispensary}'s competitive landscape — live, with your real data. Your pricing vs. every nearby dispensary, which products are over/underpriced, a sample AI-generated campaign, and our AI budtender in action on your menu.

No slides. No pitch deck. Just your data, our AI, 15 minutes.

Book a slot: https://bakedbot.ai/meet

Martez
Founder, BakedBot AI`,
        },

        // Template 9: Social Proof / Thrive case study
        {
            id: 'social-proof',
            name: 'Thrive Syracuse Case Study',
            angle: 'Social proof: real NY dispensary already using it',
            subject: `How a Syracuse dispensary is using AI to outprice competitors`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>Thrive Syracuse — a dispensary right here in NY — has been using BakedBot AI for competitive intelligence, marketing automation, and dynamic pricing.</p>

<p>A few results worth noting:</p>

<ul style="color: #334155;">
  <li>Daily competitive pricing updates across 8+ Syracuse dispensaries</li>
  <li>Automated SMS + email campaigns (compliant with NY OCM rules)</li>
  <li>AI budtender trained on their full Alleaves menu</li>
  <li>Zero additional staff time — the AI handles the work</li>
</ul>

<p>I&apos;m looking for 9 more NY dispensaries to join the founding cohort. ${dispensary} would be a great fit.</p>

<p>Would you be open to a quick conversation about what this could look like for your operation?</p>

<p><a href="https://bakedbot.ai/ny/founding-partner" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Learn More</a></p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

Thrive Syracuse — a dispensary right here in NY — uses BakedBot AI for competitive intelligence, marketing automation, and dynamic pricing.

Results: daily competitive pricing across 8+ dispensaries, automated compliant campaigns, AI budtender trained on their menu, zero additional staff time.

I'm looking for 9 more NY dispensaries. ${dispensary} would be a great fit.

Open to a quick conversation?

Learn more: https://bakedbot.ai/ny/founding-partner

Martez
Founder, BakedBot AI`,
        },

        // Template 10: Direct/Personal
        {
            id: 'direct-personal',
            name: 'Direct Personal Outreach',
            angle: 'Personal: founder-to-owner connection',
            subject: `${name === 'there' ? dispensary : name} — quick intro from a fellow cannabis founder`,
            htmlBody: `${WRAPPER_START}
<p>Hi ${name},</p>

<p>I&apos;m Martez, founder of BakedBot AI. I&apos;ll keep this short.</p>

<p>I built an AI platform that handles the stuff dispensary owners hate dealing with — competitor tracking, marketing campaigns, compliance monitoring, and staff training.</p>

<p>It&apos;s not another POS. It <strong>sits on top</strong> of whatever POS you&apos;re already running and makes it smarter.</p>

<p>We&apos;re already live in NY with Thrive Syracuse, and I&apos;m looking for a small group of dispensaries to partner with as we expand across the state.</p>

<p>If any of this sounds useful for ${dispensary}, I&apos;d love to connect — even just a 10-minute call to see if there&apos;s a fit.</p>

<p>Either way, I appreciate you reading this.</p>
${WRAPPER_END}`,
            textBody: `Hi ${name},

I'm Martez, founder of BakedBot AI. I'll keep this short.

I built an AI platform that handles competitor tracking, marketing campaigns, compliance monitoring, and staff training. It sits on top of whatever POS you're already running.

We're live in NY with Thrive Syracuse, and I'm looking for a small group of dispensaries to partner with statewide.

If this sounds useful for ${dispensary}, I'd love a 10-minute call.

Either way, appreciate you reading this.

Martez
Founder, BakedBot AI
martez@bakedbot.ai`,
        },
    ];
}
