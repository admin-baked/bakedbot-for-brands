'use client';

/**
 * LoyaltyCardSection
 * Replaces PublicWalletCta on the rewards page.
 * - Phone/email lookup → shows live loyalty card with QR code
 * - "Add to Home Screen" PWA install prompt
 * - Web Push subscription for point update notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Bell, BellOff, Download, RotateCcw } from 'lucide-react';
import QRCode from 'qrcode';
import { LOYALTY_TIER_COLORS } from '@/lib/constants/loyalty';

interface LoyaltyCardSectionProps {
  orgId: string;
  brandName: string;
  brandSlug: string;
  primaryColor: string;
}

interface CustomerData {
  customerId: string;
  name: string;
  points: number;
  tier: string;
  loyaltyId: string;
}

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };


export function LoyaltyCardSection({ orgId, brandName, brandSlug, primaryColor }: LoyaltyCardSectionProps) {
  const [lookup, setLookup] = useState('');
  const lookupRef = useRef('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Capture "Add to Home Screen" prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check push permission
    if ('Notification' in window) {
      setPushGranted(Notification.permission === 'granted');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Generate QR code once on mount — URL only depends on brandSlug, never changes
  useEffect(() => {
    const rewardsUrl = `${window.location.origin}/${brandSlug}/rewards`;
    QRCode.toDataURL(rewardsUrl, { width: 140, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [brandSlug]);

  const handleLookup = useCallback(async () => {
    const val = lookupRef.current.trim();
    if (!val) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/wallet/lookup?orgId=${encodeURIComponent(orgId)}&identifier=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (!res.ok || !data.found) {
        setError("We couldn't find a loyalty account for that phone or email.");
        return;
      }
      setCustomer({
        customerId: data.customerId,
        name: data.name || 'Member',
        points: data.points ?? 0,
        tier: data.tier ?? 'Silver',
        loyaltyId: data.loyaltyId || data.customerId,
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  };

  const handlePushSubscribe = async () => {
    if (!customer || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.customerId, orgId, subscription: sub.toJSON() }),
      });

      setPushGranted(true);
    } catch {
      // user denied or error
    } finally {
      setPushLoading(false);
    }
  };

  const tierColor = customer ? (LOYALTY_TIER_COLORS[customer.tier] || primaryColor) : primaryColor;

  return (
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8">
          <Smartphone className="w-10 h-10 mx-auto mb-3" style={{ color: primaryColor }} />
          <h2 className="text-2xl font-bold mb-2">Your Digital Loyalty Card</h2>
          <p className="text-muted-foreground text-sm">
            Look up your account to see your card — then add it to your home screen for quick access.
          </p>
        </div>

        {!customer ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Input
                placeholder="Phone number or email"
                value={lookup}
                onChange={e => { setLookup(e.target.value); lookupRef.current = e.target.value; }}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                className="text-center"
              />
              <Button
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                onClick={handleLookup}
                disabled={loading || !lookup.trim()}
              >
                {loading ? 'Looking up…' : 'Find My Card'}
              </Button>
              {error && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <p className="text-xs text-muted-foreground">
                    Not enrolled yet?{' '}
                    <span style={{ color: primaryColor }}>Sign up in-store to start earning points.</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Loyalty Card */}
            <div
              className="rounded-2xl p-6 text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}bb 100%)` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm opacity-80">{brandName}</p>
                  <p className="text-xs opacity-60">Loyalty Rewards</p>
                </div>
                <Badge
                  className="text-xs font-bold px-3 py-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: tierColor, borderColor: tierColor, border: '1.5px solid' }}
                >
                  {customer.tier.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-extrabold leading-none">{customer.points.toLocaleString()}</p>
                  <p className="text-xs opacity-70 mt-1 tracking-widest">POINTS</p>
                  <p className="text-base font-semibold mt-3">{customer.name}</p>
                  <p className="text-xs opacity-60">ID: {customer.loyaltyId}</p>
                </div>
                {qrDataUrl && (
                  <div className="bg-white rounded-lg p-1.5">
                    <img src={qrDataUrl} alt="Loyalty QR" width={90} height={90} />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {(() => {
              const showInstall = !isInstalled && !!installPrompt;
              const showInstalledState = isInstalled;
              const hasInstallSlot = showInstall || showInstalledState;
              return (
                <div className={`grid gap-3 ${hasInstallSlot ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showInstall && (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-sm"
                      onClick={handleInstall}
                    >
                      <Download className="w-4 h-4" />
                      Add to Home Screen
                    </Button>
                  )}
                  {showInstalledState && (
                    <Button variant="outline" className="flex items-center gap-2 text-sm" disabled>
                      <Download className="w-4 h-4" />
                      Added to Home Screen
                    </Button>
                  )}
                  {!pushGranted ? (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-sm"
                      onClick={handlePushSubscribe}
                      disabled={pushLoading}
                    >
                      <Bell className="w-4 h-4" />
                      {pushLoading ? 'Enabling…' : 'Point Alerts'}
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex items-center gap-2 text-sm" disabled>
                      <BellOff className="w-4 h-4" />
                      Alerts On
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Look up different account */}
            <button
              onClick={() => { setCustomer(null); setLookup(''); setError(''); }}
              className="flex items-center gap-1 text-xs text-muted-foreground mx-auto mt-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" /> Look up a different account
            </button>

            <p className="text-center text-xs text-muted-foreground mt-2">
              Powered by BakedBot AI
            </p>
          </div>
        )}
      </div>

    </section>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
