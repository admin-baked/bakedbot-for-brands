'use client';

/**
 * WalletButtons
 *
 * Renders Apple + Google Wallet save buttons for a loyalty customer.
 * Issues a short-lived pass token via /api/wallet/token, then opens the
 * appropriate pass download or Google Wallet save URL.
 *
 * Shows a "not yet configured" state when wallet credentials are absent
 * (503 from the token or pass endpoint).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, ExternalLink, Loader2 } from 'lucide-react';

interface WalletButtonsProps {
  customerId: string;
  orgId: string;
  /** Compact mode for use inside a table row or narrow card */
  compact?: boolean;
}

type WalletState = 'idle' | 'loading' | 'not_configured' | 'error';

export function WalletButtons({ customerId, orgId, compact = false }: WalletButtonsProps) {
  const [appleState, setAppleState] = useState<WalletState>('idle');
  const [googleState, setGoogleState] = useState<WalletState>('idle');

  async function getPassToken(): Promise<string | null> {
    const res = await fetch('/api/wallet/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, orgId }),
    });

    if (res.status === 503) return 'not_configured';
    if (!res.ok) return null;

    const data = await res.json();
    return data.token || null;
  }

  async function handleApple() {
    setAppleState('loading');
    try {
      const token = await getPassToken();
      if (token === 'not_configured') {
        setAppleState('not_configured');
        return;
      }
      if (!token) {
        setAppleState('error');
        return;
      }
      // Trigger pass download — browser will prompt the Wallet sheet on iOS/macOS
      const url = `/api/wallet/pass?customerId=${encodeURIComponent(customerId)}&orgId=${encodeURIComponent(orgId)}&type=apple&t=${token}`;
      window.location.href = url;
      setAppleState('idle');
    } catch {
      setAppleState('error');
    }
  }

  async function handleGoogle() {
    setGoogleState('loading');
    try {
      const token = await getPassToken();
      if (token === 'not_configured') {
        setGoogleState('not_configured');
        return;
      }
      if (!token) {
        setGoogleState('error');
        return;
      }
      // Open Google Wallet save page in a new tab
      const url = `/api/wallet/pass?customerId=${encodeURIComponent(customerId)}&orgId=${encodeURIComponent(orgId)}&type=google&t=${token}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      setGoogleState('idle');
    } catch {
      setGoogleState('error');
    }
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleApple}
          disabled={appleState === 'loading' || appleState === 'not_configured'}
          title={appleState === 'not_configured' ? 'Apple Wallet not yet configured' : 'Add to Apple Wallet'}
          className="h-7 px-2 text-xs"
        >
          {appleState === 'loading' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Smartphone className="h-3 w-3" />
          )}
          <span className="ml-1">Apple</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGoogle}
          disabled={googleState === 'loading' || googleState === 'not_configured'}
          title={googleState === 'not_configured' ? 'Google Wallet not yet configured' : 'Save to Google Wallet'}
          className="h-7 px-2 text-xs"
        >
          {googleState === 'loading' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ExternalLink className="h-3 w-3" />
          )}
          <span className="ml-1">Google</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Apple Wallet */}
      <button
        onClick={handleApple}
        disabled={appleState === 'loading' || appleState === 'not_configured'}
        aria-label="Add to Apple Wallet"
        className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        title={appleState === 'not_configured' ? 'Apple Wallet credentials coming soon' : undefined}
      >
        {appleState === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          // Apple Wallet icon (inline SVG — official badge shape)
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        )}
        <span>
          {appleState === 'not_configured'
            ? 'Apple Wallet — Coming Soon'
            : appleState === 'error'
              ? 'Try Again'
              : 'Add to Apple Wallet'}
        </span>
      </button>

      {/* Google Wallet */}
      <button
        onClick={handleGoogle}
        disabled={googleState === 'loading' || googleState === 'not_configured'}
        aria-label="Save to Google Wallet"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white text-gray-800 px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title={googleState === 'not_configured' ? 'Google Wallet credentials coming soon' : undefined}
      >
        {googleState === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          // Google Wallet 'G' color mark
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        <span>
          {googleState === 'not_configured'
            ? 'Google Wallet — Coming Soon'
            : googleState === 'error'
              ? 'Try Again'
              : 'Save to Google Wallet'}
        </span>
      </button>
    </div>
  );
}
