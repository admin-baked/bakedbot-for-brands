import { ECSTATIC_CUSTOMER_SENDER_NAME } from './sender-branding';

/**
 * Ecstatic Edibles canonical email design system.
 *
 * Source of truth for all Ecstatic transactional + campaign emails.
 * Design approved 2026-04-18.
 *
 * Colors:
 *   RED   #e11d48 — header gradient, CTA buttons, links
 *   GOLD  #f1b200 — badge / accent pill
 *   DARK  #4a0416 — footer background, body text heading
 *   BG    #fff5f7 — outer page background
 */

export const ECSTATIC = {
    DISPLAY_NAME: ECSTATIC_CUSTOMER_SENDER_NAME,
    RED: '#e11d48',
    RED_DARK: '#be123c',
    GOLD: '#f1b200',
    DARK: '#4a0416',
    PAGE_BG: '#fff5f7',
    CARD_BG: '#ffffff',
    FOOTER_TEXT: '#f0a0b0',
    FOOTER_MUTED: '#c07080',
    LOGO_URL: 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_ecstatic_edibles/logo/ecstatic_logo.png',
    LOCATION: 'Cannabis Edibles &middot; Los Angeles, CA',
    FOUNDER: 'Founded by Melanie Comarcho',
    MENU_URL: 'https://ecstaticedibles.com',
    UNSUBSCRIBE_URL: 'https://ecstaticedibles.com/unsubscribe',
} as const;

/** Shared header block (red gradient, logo, gold badge). */
export function ecstaticHeader(badgeText = 'VIP Member'): string {
    return `
  <tr>
    <td style="background:linear-gradient(135deg,${ECSTATIC.RED} 0%,${ECSTATIC.RED_DARK} 100%);padding:32px;text-align:center;border-radius:12px 12px 0 0;">
      <img src="${ECSTATIC.LOGO_URL}" alt="${ECSTATIC.DISPLAY_NAME}" width="180" style="display:block;margin:0 auto 12px;max-width:180px;height:auto;">
      <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.85);letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">${ECSTATIC.LOCATION}</p>
      <span style="display:inline-block;background-color:${ECSTATIC.GOLD};color:${ECSTATIC.DARK};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;font-family:Arial,sans-serif;">
        ${badgeText}
      </span>
    </td>
  </tr>`;
}

/** Shared footer block. */
export function ecstaticFooter(unsubscribeUrl: string = ECSTATIC.UNSUBSCRIBE_URL): string {
    return `
  <tr>
    <td style="background-color:${ECSTATIC.DARK};padding:24px 32px;text-align:center;border-radius:0 0 12px 12px;">
      <img src="${ECSTATIC.LOGO_URL}" alt="${ECSTATIC.DISPLAY_NAME}" width="100" style="display:block;margin:0 auto 10px;opacity:0.85;">
      <p style="margin:0 0 4px;font-size:12px;color:${ECSTATIC.FOOTER_TEXT};font-family:Arial,sans-serif;">Ecstatic Edibles &middot; Los Angeles, CA</p>
      <p style="margin:0 0 14px;font-size:11px;color:${ECSTATIC.FOOTER_MUTED};font-family:Arial,sans-serif;">${ECSTATIC.FOUNDER}</p>
      <p style="margin:0;font-size:11px;color:${ECSTATIC.FOOTER_MUTED};font-family:Arial,sans-serif;">
        You're receiving this because you connected with ${ECSTATIC.DISPLAY_NAME}.
        <a href="${unsubscribeUrl}" style="color:${ECSTATIC.RED};text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>`;
}

/** Wrap header + body rows + footer in the standard outer shell. */
export function ecstaticEmail(opts: {
    title: string;
    badgeText?: string;
    bodyRows: string;
    unsubscribeUrl?: string;
}): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:${ECSTATIC.PAGE_BG};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${ECSTATIC.PAGE_BG};padding:24px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        ${ecstaticHeader(opts.badgeText)}
        ${opts.bodyRows}
        ${ecstaticFooter(opts.unsubscribeUrl)}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Standard white-card content row. */
export function ecstaticCard(innerHtml: string): string {
    return `
  <tr>
    <td style="background-color:${ECSTATIC.CARD_BG};padding:36px 32px;">
      ${innerHtml}
    </td>
  </tr>`;
}

/** CTA button. */
export function ecstaticCta(opts: { label: string; url: string }): string {
    return `<div style="text-align:center;margin-top:24px;">
  <a href="${opts.url}" style="display:inline-block;background-color:${ECSTATIC.RED};color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;">${opts.label}</a>
</div>`;
}

/** Pre-built wake-up email body for POS-synced customers. */
export function ecstaticWakeupEmail(firstName?: string): string {
    const name = firstName || 'there';
    return ecstaticEmail({
        title: `Hey ${name} — you're already part of Ecstatic Edibles`,
        bodyRows: ecstaticCard(`
      <h2 style="color:${ECSTATIC.RED};font-size:22px;font-family:Arial,sans-serif;margin:0 0 16px;">
        Hey ${name} — you're already part of Ecstatic Edibles.
      </h2>
      <p style="color:#333333;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;margin:0 0 16px;">
        We noticed you've connected with us before, and we just wanted to say — we remember you, and we appreciate it.
      </p>
      <p style="color:#333333;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;margin:0 0 12px;">
        Going forward, here's what you can expect from us:
      </p>
      <ul style="color:#333333;font-size:15px;line-height:1.9;font-family:Arial,sans-serif;margin:0 0 20px;padding-left:20px;">
        <li>The occasional deal or new product drop — no noise, just the good stuff</li>
        <li>Early access to limited edition flavors</li>
        <li>Recommendations based on what you actually like</li>
      </ul>
      <p style="color:#333333;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;margin:0 0 28px;">
        That's it. Nothing pushy. You can reply to this email anytime, or find us at a dispensary near you.
      </p>
      ${ecstaticCta({ label: "Shop Ecstatic Edibles →", url: ECSTATIC.MENU_URL })}
    `),
    });
}
