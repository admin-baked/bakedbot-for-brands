/**
 * Apple Wallet Pass Service
 *
 * Generates signed .pkpass files for loyalty cards using passkit-generator.
 * Also handles APNs push notifications to trigger live pass updates.
 *
 * Required secrets (all optional — gracefully stubs when absent):
 *   APPLE_WALLET_CERT          P12 certificate, base64 encoded
 *   APPLE_WALLET_CERT_PASSWORD P12 password
 *   APPLE_WALLET_TEAM_ID       Apple Developer Team ID (e.g. "ABCD123456")
 *   APPLE_WALLET_PASS_TYPE_ID  e.g. "pass.ai.bakedbot.loyalty"
 *   APPLE_WALLET_WWDR_CERT     Apple WWDR intermediate cert, base64 encoded
 *
 * Setup steps (once credentials are available):
 *   1. Apple Developer account → Certificates → Pass Type IDs → create "pass.ai.bakedbot.loyalty"
 *   2. Download the Pass Certificate (.p12), export from Keychain with password
 *   3. base64-encode both certs and store in GCP Secret Manager
 *   4. Update apphosting.yaml versions from @1 to the real version
 */

import { logger } from '@/lib/logger';
import type { WalletPassData, AppleDeviceRegistration } from './types';

// ==========================================
// Config check
// ==========================================

export function isAppleConfigured(): boolean {
  return !!(
    process.env.APPLE_WALLET_CERT &&
    process.env.APPLE_WALLET_CERT_PASSWORD &&
    process.env.APPLE_WALLET_TEAM_ID &&
    process.env.APPLE_WALLET_PASS_TYPE_ID &&
    process.env.APPLE_WALLET_WWDR_CERT &&
    !process.env.APPLE_WALLET_CERT.startsWith('PLACEHOLDER')
  );
}

// ==========================================
// Pass generation
// ==========================================

/**
 * Generate a signed .pkpass Buffer for the given customer.
 * Throws if Apple credentials are not configured.
 */
export async function generateApplePass(data: WalletPassData): Promise<Buffer> {
  if (!isAppleConfigured()) {
    throw new Error('Apple Wallet credentials not configured');
  }

  // Dynamic import keeps passkit-generator out of the module graph until needed
  const { PKPass } = await import('passkit-generator');

  const certBuffer = Buffer.from(process.env.APPLE_WALLET_CERT!, 'base64');
  const wwdrBuffer = Buffer.from(process.env.APPLE_WALLET_WWDR_CERT!, 'base64');
  const passTypeId = process.env.APPLE_WALLET_PASS_TYPE_ID!;
  const teamId = process.env.APPLE_WALLET_TEAM_ID!;

  // Fetch logo and mascot images for embedding in the pass bundle
  const [logoBuffer, mascotBuffer] = await Promise.all([
    fetchImageBuffer(data.logoUrl),
    fetchImageBuffer(data.mascotUrl),
  ]);

  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

  const pass = new PKPass(
    {
      // Pass images — Apple requires @2x and @3x but we provide @1x minimum
      'logo.png': logoBuffer,
      'thumbnail.png': mascotBuffer,
      'icon.png': mascotBuffer,
    },
    {
      wwdr: wwdrBuffer,
      signerCert: certBuffer,
      signerKey: certBuffer,
      signerKeyPassphrase: process.env.APPLE_WALLET_CERT_PASSWORD!,
    },
    {
      // Pass metadata (OverridablePassProps — excludes pass-type fields)
      description: `${data.brandName} Loyalty Card`,
      passTypeIdentifier: passTypeId,
      serialNumber: data.serialNumber,
      teamIdentifier: teamId,
      organizationName: data.brandName,

      // Barcode — QR code encoding the BakedBot customerId
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: data.loyaltyId,
          messageEncoding: 'iso-8859-1',
          altText: `ID: ${data.loyaltyId}`,
        },
      ],

      // Colors from Thrive brand guide
      backgroundColor: data.brandColor,
      foregroundColor: '#FFFFFF',
      labelColor: hexToRgbString(lightenHex(data.brandColor, 0.6)),

      // Web service for live updates
      webServiceURL: `${appBaseUrl}/api/wallet`,
      authenticationToken: generatePassAuthToken(data.serialNumber),

      ...(data.expiresAt && {
        expirationDate: data.expiresAt.toISOString(),
      }),
    }
  );

  // Set pass type to storeCard and populate fields via the v3 setter API
  pass.type = 'storeCard';

  pass.primaryFields.push({
    key: 'points',
    label: 'POINTS',
    value: data.points.toLocaleString(),
    changeMessage: 'Your points updated to %@',
  });

  pass.secondaryFields.push(
    { key: 'tier', label: 'TIER', value: data.tier.toUpperCase() },
    { key: 'member', label: 'MEMBER', value: data.customerName }
  );

  pass.auxiliaryFields.push({
    key: 'tagline',
    label: '',
    value: 'Powered by BakedBot AI',
  });

  pass.backFields.push(
    {
      key: 'info',
      label: 'About Your Card',
      value: `Present this card at checkout to earn and redeem points at ${data.brandName}. Points are managed by BakedBot AI.`,
    },
    { key: 'loyalty_id', label: 'Loyalty ID', value: data.loyaltyId }
  );

  const buffer = await pass.getAsBuffer();
  logger.info('[AppleWallet] Pass generated', {
    customerId: data.customerId,
    serialNumber: data.serialNumber,
    points: data.points,
  });

  return buffer;
}

// ==========================================
// APNs push — triggers Apple to fetch updated pass
// ==========================================

/**
 * Send APNs pushes to all registered devices for a customer.
 * Apple calls /api/wallet/passes/:passTypeId/:serialNumber in response.
 *
 * Per Apple spec the payload is empty ({}) — Apple ignores content,
 * it just uses the push as a trigger to fetch the updated pass.
 */
export async function pushAppleUpdate(
  registrations: AppleDeviceRegistration[],
  serialNumber: string
): Promise<number> {
  if (!isAppleConfigured() || registrations.length === 0) {
    return 0;
  }

  // Apple Wallet uses the same P12 cert for APNs push in passkit
  // The push is sent to gateway.push.apple.com:2195 (production) using HTTP/2
  // We use the node `apn` package pattern via dynamic import
  let sent = 0;

  try {
    const { default: apn } = await import('@parse/node-apn' as string) as { default: any };

    const provider = new apn.Provider({
      cert: Buffer.from(process.env.APPLE_WALLET_CERT!, 'base64'),
      key: Buffer.from(process.env.APPLE_WALLET_CERT!, 'base64'),
      passphrase: process.env.APPLE_WALLET_CERT_PASSWORD!,
      production: true,
    });

    await Promise.all(
      registrations.map(async reg => {
        try {
          const note = new apn.Notification();
          note.payload = {};
          note.topic = process.env.APPLE_WALLET_PASS_TYPE_ID!;

          await provider.send(note, reg.pushToken);
          sent++;

          logger.debug('[AppleWallet] APNs push sent', {
            serialNumber,
            deviceLibraryId: reg.deviceLibraryId,
          });
        } catch (err) {
          logger.warn('[AppleWallet] APNs push failed for device', {
            deviceLibraryId: reg.deviceLibraryId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })
    );

    provider.shutdown();
  } catch (err) {
    logger.error('[AppleWallet] APNs provider failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info('[AppleWallet] APNs pushes sent', { serialNumber, sent, total: registrations.length });
  return sent;
}

// ==========================================
// Helpers
// ==========================================

async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('/')) {
    // Relative path — resolve against app base URL
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
    url = `${base}${url}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Generate a deterministic auth token from the serial number for Apple's webServiceURL auth */
function generatePassAuthToken(serialNumber: string): string {
  // In production this should be an HMAC of serialNumber + secret
  // For now use a fixed-prefix token so Apple can validate it against /api/wallet/register
  return `bb_${serialNumber.replace(/-/g, '')}`;
}

/** Convert hex color to CSS rgb() string for Apple's color format */
function hexToRgbString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r},${g},${b})`;
}

/** Lighten a hex color by a factor (0-1) for label contrast */
function lightenHex(hex: string, factor: number): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * factor));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * factor));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
