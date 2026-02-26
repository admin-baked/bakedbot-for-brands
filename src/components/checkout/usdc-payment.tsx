'use client';

/**
 * USDC Payment Component
 *
 * Customer-facing checkout step for USDC payment.
 * Shows:
 * - QR code to scan and pay
 * - Copyable wallet address
 * - USDC amount
 * - 30-minute countdown timer
 * - Polling confirmation (checks every 5s)
 * - Success animation on confirmation
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Clock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface USDCPaymentProps {
  orderId: string;
  orgId: string;
  onConfirmed: () => void;
  onError?: (error: string) => void;
}

interface PaymentIntent {
  walletAddress: string;
  amountUsdc: number;
  qrCodeDataUrl: string;
  expiresAt: string;
  intentId: string;
}

const POLL_INTERVAL_MS = 5_000;

export function USDCPayment({ orderId, orgId, onConfirmed, onError }: USDCPaymentProps) {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'confirmed' | 'expired' | 'error'>(
    'loading',
  );
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // seconds

  // Create payment intent on mount
  useEffect(() => {
    async function createIntent() {
      try {
        const res = await fetch('/api/checkout/usdc/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, orgId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to create payment intent');
        }

        const data: PaymentIntent = await res.json();
        setIntent(data);
        setStatus('pending');

        // Compute time left from expiresAt
        const expiry = new Date(data.expiresAt).getTime();
        setTimeLeft(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
      } catch (err) {
        setStatus('error');
        onError?.(String(err));
      }
    }

    createIntent();
  }, [orderId, orgId, onError]);

  // Countdown timer
  useEffect(() => {
    if (status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Poll for confirmation
  const pollStatus = useCallback(async () => {
    if (status !== 'pending') return;

    try {
      const res = await fetch(`/api/checkout/usdc/status?orderId=${orderId}`);
      if (!res.ok) return;

      const data = await res.json();

      if (data.status === 'confirmed') {
        setStatus('confirmed');
        onConfirmed();
      } else if (data.status === 'expired') {
        setStatus('expired');
      }
    } catch {
      // non-fatal, keep polling
    }
  }, [orderId, status, onConfirmed]);

  useEffect(() => {
    if (status !== 'pending') return;

    const poll = setInterval(pollStatus, POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [pollStatus, status]);

  const handleCopyAddress = async () => {
    if (!intent?.walletAddress) return;
    await navigator.clipboard.writeText(intent.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Loading
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Generating payment address...</p>
      </div>
    );
  }

  // Error
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium">Unable to create USDC payment</p>
        <p className="text-sm text-muted-foreground">Please choose a different payment method.</p>
      </div>
    );
  }

  // Confirmed
  if (status === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <p className="text-xl font-bold">Payment Confirmed!</p>
        <p className="text-sm text-muted-foreground">
          Your USDC payment was received. Your order is now confirmed.
        </p>
      </div>
    );
  }

  // Expired
  if (status === 'expired') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Clock className="h-12 w-12 text-amber-500" />
        <p className="font-medium">Payment window expired</p>
        <p className="text-sm text-muted-foreground">
          The 30-minute payment window has passed. Please restart checkout.
        </p>
      </div>
    );
  }

  // Pending — show QR + address
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Pay with USDC</h3>
          <p className="text-sm text-muted-foreground">
            Send exactly <strong>${intent?.amountUsdc.toFixed(2)} USDC</strong> on Base network
          </p>
        </div>
        <div className="flex items-center gap-1 text-amber-600 text-sm font-mono">
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Amount badge */}
      <div className="flex items-center gap-2">
        <Badge className="text-base px-4 py-1">
          ${intent?.amountUsdc.toFixed(2)} USDC
        </Badge>
        <span className="text-xs text-muted-foreground">= ${intent?.amountUsdc.toFixed(2)} USD</span>
      </div>

      {/* QR Code */}
      {intent?.qrCodeDataUrl && (
        <div className="flex justify-center">
          <div className="border rounded-xl p-3 bg-white">
            <img
              src={intent.qrCodeDataUrl}
              alt="USDC payment QR code"
              className="w-52 h-52"
            />
          </div>
        </div>
      )}

      {/* Wallet address */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">WALLET ADDRESS (Base Network)</p>
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <code className="text-xs flex-1 break-all font-mono text-foreground">
            {intent?.walletAddress}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-8 w-8 p-0"
            onClick={handleCopyAddress}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p>1. Open your crypto wallet (Coinbase, MetaMask, etc.)</p>
        <p>2. Select <strong>USDC on Base</strong> network (chain ID 8453)</p>
        <p>3. Scan QR code or paste the address above</p>
        <p>4. Enter amount: <strong>${intent?.amountUsdc.toFixed(2)} USDC</strong></p>
        <p>5. Confirm — your order updates automatically</p>
      </div>

      {/* Basescan link */}
      {intent?.walletAddress && (
        <Button variant="ghost" size="sm" className="text-xs gap-1 w-full" asChild>
          <a
            href={`https://basescan.org/address/${intent.walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            Track on Basescan
          </a>
        </Button>
      )}

      {/* Polling indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Checking for payment every 5 seconds...
      </div>
    </div>
  );
}
