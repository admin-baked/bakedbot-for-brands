'use client';

/**
 * PublicWalletCta
 *
 * Customer-facing "Save to Wallet" section on the public rewards page.
 * Customer enters their phone or email → we look them up in the loyalty program →
 * issue a short-lived pass token → trigger Apple or Google Wallet save.
 *
 * No session required — pass token is issued via the lookup endpoint.
 */

import { useState } from 'react';
import { Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PublicWalletCtaProps {
  orgId: string;
  brandName: string;
  primaryColor: string;
}

type Step = 'prompt' | 'loading' | 'found' | 'not_found' | 'not_configured' | 'error';

interface CustomerMatch {
  customerId: string;
  customerName: string;
  points: number;
  tier: string;
}

export function PublicWalletCta({ orgId, brandName, primaryColor }: PublicWalletCtaProps) {
  const [step, setStep] = useState<Step>('prompt');
  const [identifier, setIdentifier] = useState('');
  const [customer, setCustomer] = useState<CustomerMatch | null>(null);
  const [savingType, setSavingType] = useState<'apple' | 'google' | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setStep('loading');

    try {
      const res = await fetch('/api/wallet/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), orgId }),
      });

      if (res.status === 404) {
        setStep('not_found');
        return;
      }
      if (res.status === 503) {
        setStep('not_configured');
        return;
      }
      if (!res.ok) {
        setStep('error');
        return;
      }

      const data = await res.json();
      setCustomer(data.customer);
      setStep('found');
    } catch {
      setStep('error');
    }
  }

  async function handleSave(type: 'apple' | 'google') {
    if (!customer) return;
    setSavingType(type);

    try {
      // Get a pass token
      const tokenRes = await fetch('/api/wallet/lookup-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.customerId, orgId }),
      });

      if (!tokenRes.ok) {
        setSavingType(null);
        return;
      }

      const { token } = await tokenRes.json();
      const url = `/api/wallet/pass?customerId=${encodeURIComponent(customer.customerId)}&orgId=${encodeURIComponent(orgId)}&type=${type}&t=${token}`;

      if (type === 'apple') {
        window.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setSavingType(null);
    }
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto text-center">
          {/* Mascot + heading */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img
                src="/assets/agents/smokey-main.png"
                alt="Smokey"
                className="h-20 w-20 rounded-full object-cover border-4"
                style={{ borderColor: primaryColor }}
              />
              <span className="absolute -bottom-1 -right-1 text-xl" aria-hidden>🍃</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Save Your Loyalty Card</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Keep your {brandName} points in your Apple or Google Wallet.
            They update automatically after every visit — no app needed.
          </p>

          {step === 'prompt' && (
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="Phone or email address"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="flex-1"
                autoComplete="email tel"
              />
              <Button type="submit" style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
                Look Me Up
              </Button>
            </form>
          )}

          {step === 'loading' && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Looking up your loyalty account…</span>
            </div>
          )}

          {step === 'found' && customer && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-5 text-white text-left relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #1A1A1A 100%)` }}
              >
                {/* Card preview */}
                <div className="flex items-center justify-between mb-4">
                  <img
                    src="/assets/agents/smokey-main.png"
                    alt="Smokey"
                    className="h-10 w-10 rounded-full border-2 border-white/30 object-cover"
                  />
                  <span className="text-xs font-medium opacity-70 uppercase tracking-widest">
                    {brandName}
                  </span>
                </div>
                <div className="mb-1">
                  <p className="text-xs opacity-70 uppercase tracking-wider">Points</p>
                  <p className="text-3xl font-bold">{customer.points.toLocaleString()}</p>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs opacity-70 uppercase tracking-wider">Member</p>
                    <p className="font-medium">{customer.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-70 uppercase tracking-wider">Tier</p>
                    <p className="font-bold uppercase">{customer.tier}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => handleSave('apple')}
                  disabled={savingType === 'apple'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white px-5 py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {savingType === 'apple' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  )}
                  Add to Apple Wallet
                </button>

                <button
                  onClick={() => handleSave('google')}
                  disabled={savingType === 'google'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-gray-800 px-5 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingType === 'google' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Save to Google Wallet
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Your points will sync automatically after every visit.
              </p>
            </div>
          )}

          {step === 'not_found' && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                We couldn&apos;t find a loyalty account for that phone or email.
              </p>
              <Button variant="outline" onClick={() => { setStep('prompt'); setIdentifier(''); }}>
                Try Again
              </Button>
              <p className="text-xs text-muted-foreground">
                Not enrolled yet? Sign up in-store to start earning points.
              </p>
            </div>
          )}

          {step === 'not_configured' && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="font-medium text-foreground">Wallet passes launching soon!</p>
              <p className="text-sm">
                We&apos;re setting up {brandName}&apos;s wallet program. Check back shortly.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">Something went wrong. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => setStep('prompt')}>
                Retry
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Powered by BakedBot AI</span>
          </div>
        </div>
      </div>
    </section>
  );
}
