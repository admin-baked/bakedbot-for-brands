'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { initiateAdvanceAction, checkAdvanceDepositAction } from '@/server/actions/greenledger';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { GreenLedgerOffer, GreenLedgerAdvance, OfferTier } from '@/types/greenledger';

interface Props {
  offer: GreenLedgerOffer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select-tier' | 'send-usdc' | 'confirmed';

export default function FundAdvanceFlow({ offer, open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('select-tier');
  const [selectedTier, setSelectedTier] = useState<OfferTier | null>(null);
  const [advance, setAdvance] = useState<GreenLedgerAdvance | null>(null);
  const [initiating, setInitiating] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // Auto-poll every 10s once we're on the send-usdc step
  useEffect(() => {
    if (step === 'send-usdc' && advance) {
      pollRef.current = setInterval(() => {
        void checkDeposit();
      }, 10_000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, advance]);

  const handleSelectTier = async (tier: OfferTier) => {
    setSelectedTier(tier);
    setInitiating(true);
    try {
      const result = await initiateAdvanceAction({ offerId: offer.id, tierId: tier.id });
      if (!result.success || !result.data) throw new Error(result.error);
      setAdvance(result.data);
      setStep('send-usdc');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setInitiating(false);
    }
  };

  const checkDeposit = async () => {
    if (!advance) return;
    setChecking(true);
    try {
      const result = await checkAdvanceDepositAction(advance.id);
      if (result.activated) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep('confirmed');
        router.refresh();
      }
    } finally {
      setChecking(false);
    }
  };

  const copyAddress = (addr: string) => {
    void navigator.clipboard.writeText(addr);
    toast.success('Address copied');
  };

  const reset = () => {
    setStep('select-tier');
    setSelectedTier(null);
    setAdvance(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'confirmed' ? 'Advance Active!' : `Fund ${offer.brandName}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'select-tier' && 'Select a tier to activate your discount.'}
            {step === 'send-usdc' && 'Send USDC to the escrow address below.'}
            {step === 'confirmed' && 'Your discount is now active on all orders.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {(['select-tier', 'send-usdc', 'confirmed'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : i < (['select-tier', 'send-usdc', 'confirmed'] as Step[]).indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select tier */}
        {step === 'select-tier' && (
          <div className="space-y-3">
            {offer.tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => handleSelectTier(tier)}
                disabled={initiating}
                className="w-full border rounded-lg p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      ${tier.minDepositUsd.toLocaleString()} deposit
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {tier.durationDays ? `Valid for ${tier.durationDays} days` : 'No expiration'}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary text-base font-bold px-3 py-1">
                    {(tier.discountBps / 100).toFixed(0)}% off
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Savings on ${tier.minDepositUsd.toLocaleString()} of orders:{' '}
                  <span className="text-green-600 font-medium">
                    ${((tier.minDepositUsd * tier.discountBps) / 10000 / (1 - tier.discountBps / 10000)).toFixed(2)}
                  </span>
                </p>
              </button>
            ))}
            {initiating && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating escrow wallet...
              </div>
            )}
          </div>
        )}

        {/* Step 2: Send USDC */}
        {step === 'send-usdc' && advance && selectedTier && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold font-mono">
                {selectedTier.minDepositUsd.toLocaleString()}.00
              </p>
              <p className="text-sm text-muted-foreground">USDC on Base (chain 8453)</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Send to this escrow address:</p>
              <div className="flex items-center gap-2 bg-muted rounded p-3">
                <code className="text-xs flex-1 break-all">{advance.escrowWalletAddress}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyAddress(advance.escrowWalletAddress)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This wallet is dedicated to your {offer.brandName} advance. Funds are fully
                refundable.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {checking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking for deposit...
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Waiting for USDC — checking every 10 seconds
                </>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => void checkDeposit()}>
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "I've sent it — check now"
              )}
            </Button>

            <a
              href={`https://basescan.org/address/${advance.escrowWalletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View on Basescan
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Step 3: Confirmed */}
        {step === 'confirmed' && (
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {selectedTier ? (selectedTier.discountBps / 100).toFixed(0) : ''}% discount is live
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Savings will automatically apply to every {offer.brandName} order at settlement.
                Money Mike will alert you when your balance gets low.
              </p>
            </div>
            <Button onClick={reset} className="w-full">
              Go to My Advances
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
