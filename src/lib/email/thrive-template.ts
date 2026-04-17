/**
 * Thrive Syracuse canonical email design system.
 *
 * Source of truth for all Thrive transactional + campaign emails.
 * Design approved 2026-04-17 — matches 4/20 campaign (3HQBxXGqhWcbbdmFOj8R).
 *
 * Colors:
 *   TEAL  #27c0dd — header bg, CTA buttons, links
 *   GOLD  #f1b200 — badge / accent pill
 *   DARK  #0d2b31 — outer background, footer, hero blocks
 *   BODY  #1a8fa3 — h2 headings in white-card sections
 */

export const THRIVE = {
    TEAL: '#27c0dd',
    GOLD: '#f1b200',
    DARK: '#0d2b31',
    BODY_HEADING: '#1a8fa3',
    CARD_BG: '#ffffff',
    LOGO_URL: 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_thrivesyracuse/logo/thrive_logo.png',
    ADDRESS: '3065 Erie Blvd E, Syracuse, NY 13224',
    PHONE: '315-207-7935',
    HOURS: 'Mon–Sat 10:30 AM–8 PM · Sun 11 AM–6 PM',
} as const;

/** Shared header block (teal bg, logo, gold badge). */
export function thriveHeader(badgeText = 'VIP Rewards'): string {
    return `
  <tr>
    <td style="background-color:${THRIVE.TEAL};padding:24px 32px 20px;text-align:center;border-radius:12px 12px 0 0;">
      <img src="${THRIVE.LOGO_URL}" alt="Thrive Cannabis Marketplace" width="160" style="display:block;margin:0 auto 12px;max-width:160px;height:auto;">
      <p style="margin:0 0 10px;font-size:12px;color:${THRIVE.DARK};letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">
        Cannabis Dispensary &middot; Syracuse, NY
      </p>
      <span style="display:inline-block;background-color:${THRIVE.GOLD};color:${THRIVE.DARK};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;font-family:Arial,sans-serif;">
        ${badgeText}
      </span>
    </td>
  </tr>`;
}

/** Shared footer block (dark bg, logo, address, unsubscribe). */
export function thriveFooter(unsubscribeUrl: string): string {
    return `
  <tr>
    <td style="background-color:${THRIVE.DARK};padding:24px 32px;text-align:center;border-radius:0 0 12px 12px;">
      <img src="${THRIVE.LOGO_URL}" alt="Thrive Cannabis Marketplace" width="100" style="display:block;margin:0 auto 10px;opacity:0.85;">
      <p style="margin:0 0 4px;font-size:12px;color:#a0d4de;font-family:Arial,sans-serif;">
        ${THRIVE.ADDRESS} &middot; ${THRIVE.PHONE}
      </p>
      <p style="margin:4px 0 0;font-size:11px;color:#5a8f9a;font-family:Arial,sans-serif;">
        ${THRIVE.HOURS}
      </p>
      <p style="margin:14px 0 0;font-size:11px;color:#5a8f9a;font-family:Arial,sans-serif;">
        You're receiving this because you opted in at Thrive.
        <a href="${unsubscribeUrl}" style="color:${THRIVE.TEAL};text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>`;
}

/** Wrap header + body rows + footer in the standard outer shell. */
export function thriveEmail(opts: {
    title: string;
    badgeText?: string;
    bodyRows: string;
    unsubscribeUrl: string;
}): string {
    const { title, badgeText, bodyRows, unsubscribeUrl } = opts;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${THRIVE.DARK};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${THRIVE.DARK};">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        ${thriveHeader(badgeText)}
        ${bodyRows}
        ${thriveFooter(unsubscribeUrl)}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Standard white-card content row. */
export function thriveCard(innerHtml: string): string {
    return `
  <tr>
    <td style="background-color:${THRIVE.CARD_BG};padding:36px 32px;">
      ${innerHtml}
    </td>
  </tr>`;
}

/** Dark hero block (used for deal callouts). */
export function thriveHero(opts: { label: string; headline: string; subline?: string }): string {
    return `
  <div style="background-color:${THRIVE.DARK};border-radius:10px;padding:22px 24px;margin:0 0 24px;text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${THRIVE.GOLD};text-transform:uppercase;letter-spacing:2px;">${opts.label}</p>
    <p style="margin:0 0 4px;font-size:36px;font-weight:900;color:#ffffff;">${opts.headline}</p>
    ${opts.subline ? `<p style="margin:0;font-size:13px;color:#a0d4de;">${opts.subline}</p>` : ''}
  </div>`;
}

/** Standard CTA button. */
export function thriveCta(opts: { label: string; url: string }): string {
    return `
  <div style="text-align:center;margin:0 0 8px;">
    <a href="${opts.url}" style="display:inline-block;background-color:${THRIVE.TEAL};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">${opts.label} &rarr;</a>
  </div>`;
}

/** Loyalty points callout block. */
export function thriveLoyaltyBlock(points: number): string {
    return `
  <div style="border:2px solid ${THRIVE.TEAL};border-radius:8px;padding:18px 22px;margin:0 0 24px;">
    <p style="margin:0;font-size:15px;color:${THRIVE.BODY_HEADING};line-height:1.6;">
      🎁 <strong>You have ${points} VIP points</strong> — keep earning with every visit!<br>
      <span style="font-size:13px;color:#6b7280;">1 point per $1 spent · 100 points = $5 off</span>
    </p>
  </div>`;
}
