'use client';

/**
 * Visitor Check-In QR + Training
 *
 * Dashboard page for dispensary staff to print the in-store QR code,
 * preview the Thrive visitor check-in flow, and run launch QA.
 *
 * Access: /dashboard/loyalty-tablet-qr (dispensary role)
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  ExternalLink,
  Monitor,
  Printer,
  QrCode,
  ShieldCheck,
  Smartphone,
  TabletSmartphone,
  UserRoundCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  VISITOR_CHECKIN_FIRESTORE_CHECKS,
  VISITOR_CHECKIN_QA_CHECKLIST,
  VISITOR_CHECKIN_STAFF_TRAINING_STEPS,
} from '@/lib/checkin/visitor-checkin-training';

const FLOW_STEPS = [
  {
    icon: ShieldCheck,
    title: 'Staff checks ID',
    description: 'ID review happens at the door before the visitor check-in starts.',
  },
  {
    icon: Smartphone,
    title: 'Visitor scans or taps in',
    description: 'Use the QR code on signage or keep the tablet open on a front-door device.',
  },
  {
    icon: UserRoundCheck,
    title: 'Phone required, email optional',
    description: 'Visitors enter first name and phone. Email only appears when they want email follow-up.',
  },
  {
    icon: CheckCircle2,
    title: 'Consent stays explicit',
    description: 'SMS and email opt-ins default off, and entry never depends on marketing consent.',
  },
];

export default function LoyaltyTabletQRPage() {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [orgId, setOrgId] = useState('org_thrive_syracuse');
  const [brandSlug, setBrandSlug] = useState('thrivesyracuse');

  useEffect(() => {
    const storedOrgId = localStorage.getItem('bb_orgId') || 'org_thrive_syracuse';
    const storedBrandSlug = localStorage.getItem('bb_brandSlug') || 'thrivesyracuse';
    setOrgId(storedOrgId);
    setBrandSlug(storedBrandSlug);
  }, []);

  const tabletUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/loyalty-tablet?orgId=${orgId}`
      : `https://bakedbot.ai/loyalty-tablet?orgId=${orgId}`;

  const publicCheckinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${brandSlug}/rewards#check-in`
      : `https://bakedbot.ai/${brandSlug}/rewards#check-in`;

  const showPublicCheckinPreview =
    orgId === 'org_thrive_syracuse' || brandSlug === 'thrivesyracuse';

  useEffect(() => {
    if (!orgId) return;

    QRCode.toDataURL(tabletUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [orgId, tabletUrl]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = 'visitor-checkin-qr.png';
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrDataUrl) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Visitor Check-In QR Code</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          img { width: 300px; height: 300px; display: block; margin: 0 auto 20px; }
          h1 { font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
          p { font-size: 16px; color: #475569; margin: 4px 0; }
          .instructions { margin-top: 20px; font-size: 14px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>Visitor Check-In</h1>
        <p>Scan to check in for rewards before shopping</p>
        <img src="${qrDataUrl}" alt="Visitor Check-In QR Code" />
        <p style="font-size: 12px; color: #94a3b8;">${tabletUrl}</p>
        <div class="instructions">
          <p>Staff should check ID before customers start this flow.</p>
          <p>Phone is required. Email is optional.</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Thrive visitor check-in</Badge>
          <Badge variant="outline">Phone required</Badge>
          <Badge variant="outline">Email optional</Badge>
        </div>
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <QrCode className="h-8 w-8 text-emerald-600" />
            Visitor Check-In QR + Training
          </h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Use this page to print the in-store QR code, train front-door staff, and run the
            launch QA checklist for the new Thrive Syracuse check-in flow.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Card className="flex flex-col items-center border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Visitor Check-In QR Code"
              className="h-64 w-64 rounded-2xl bg-white shadow-lg"
            />
          ) : (
            <div className="h-64 w-64 animate-pulse rounded-2xl bg-muted" />
          )}
          <p className="mt-4 break-all px-4 text-center text-sm text-muted-foreground">
            {tabletUrl}
          </p>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How the new check-in works</CardTitle>
              <CardDescription>
                This is the front-door flow staff should expect on launch day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FLOW_STEPS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={handleDownload} disabled={!qrDataUrl} className="gap-2">
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button onClick={handlePrint} variant="outline" disabled={!qrDataUrl} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Sign
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(tabletUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" />
              Preview Tablet Flow
            </Button>
            {showPublicCheckinPreview && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open(publicCheckinUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" />
                Preview Public Check-In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Install on Tablet ── */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TabletSmartphone className="h-5 w-5 text-blue-600" />
            Install on Android Tablet
          </CardTitle>
          <CardDescription>
            Set up the check-in flow as a full-screen app on your front-counter tablet.
            Once installed it runs without browser chrome — no URL bar, no tabs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Step-by-step instructions */}
            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                <span>Open <strong>Chrome</strong> on the Android tablet and navigate to the check-in URL below (or scan the QR code above).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
                <span>Wait for the green <strong>&quot;Install App&quot;</strong> banner at the top. If it appears, tap <strong>Install</strong> and you&apos;re done.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
                <span>If no banner appears, tap the <strong>three-dot menu (⋮)</strong> in Chrome&apos;s top-right corner, then tap <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">4</span>
                <span>Tap <strong>&quot;Install&quot;</strong> in the confirmation dialog. The <strong>&quot;Check-In&quot;</strong> app icon will appear on the home screen.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">5</span>
                <span>Open the app from the home screen. It launches in <strong>full-screen kiosk mode</strong> — no URL bar, no tabs.</span>
              </li>
            </ol>

            {/* Tips panel */}
            <div className="space-y-3">
              <div className="rounded-lg border bg-white p-4 space-y-2">
                <p className="flex items-center gap-2 font-medium text-sm">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  Kiosk mode tip
                </p>
                <p className="text-xs text-muted-foreground">
                  For a true kiosk experience, enable <strong>Screen Pinning</strong> in Android Settings → Security → Screen Pinning.
                  This locks the tablet to the Check-In app and prevents customers from navigating away.
                </p>
              </div>
              <div className="rounded-lg border bg-white p-4 space-y-2">
                <p className="flex items-center gap-2 font-medium text-sm">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  Persistent install button
                </p>
                <p className="text-xs text-muted-foreground">
                  The check-in page shows a floating <strong>&quot;Install App&quot;</strong> button in the bottom-right corner whenever
                  the app is not yet installed. Tap it for step-by-step instructions right on the tablet.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(tabletUrl);
                }}
              >
                <ClipboardList className="h-4 w-4" />
                Copy Tablet URL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Staff training</CardTitle>
            <CardDescription>Use this script with the front-door team.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
              {VISITOR_CHECKIN_STAFF_TRAINING_STEPS.map((step) => (
                <li key={step}>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Tight QA checklist
            </CardTitle>
            <CardDescription>Run all four scenarios before launch and after major edits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {VISITOR_CHECKIN_QA_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-emerald-600" />
              Expected system writes
            </CardTitle>
            <CardDescription>Confirm these records after each test pass.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {VISITOR_CHECKIN_FIRESTORE_CHECKS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
