/**
 * Aeropay Payment Status Component
 *
 * Displays payment status and polls for transaction updates.
 * Used after Aeropay transaction is created to monitor completion.
 *
 * Flow:
 * 1. Poll /api/checkout/aeropay/status every 3 seconds
 * 2. Display pending/processing state with spinner
 * 3. Display success state when status = 'completed'
 * 4. Display error state when status = 'declined', 'voided', or 'refunded'
 * 5. Stop polling when terminal status reached
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created payment status component with 3-second polling and status display.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

export interface AeropayPaymentProps {
  /** Transaction ID from Aeropay */
  transactionId: string;

  /** Order ID */
  orderId: string;

  /** Payment amount in cents */
  amount: number;

  /** Transaction fee in cents */
  transactionFee: number;

  /** Callback when payment succeeds */
  onSuccess?: () => void;

  /** Callback when payment fails */
  onFailure?: (reason: string) => void;

  /** Max polling attempts (default: 60 = 3 minutes at 3-second intervals) */
  maxAttempts?: number;
}

type PaymentStatus = 'pending' | 'completed' | 'declined' | 'voided' | 'refunded';

export function AeropayPayment({
  transactionId,
  orderId,
  amount,
  transactionFee,
  onSuccess,
  onFailure,
  maxAttempts = 60,
}: AeropayPaymentProps) {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        logger.debug('[AEROPAY-PAYMENT] Polling transaction status', {
          transactionId,
          attempts: attempts + 1,
        });

        const response = await fetch('/api/checkout/aeropay/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check payment status');
        }

        const data = await response.json();
        const newStatus: PaymentStatus = data.status;

        logger.info('[AEROPAY-PAYMENT] Transaction status update', {
          transactionId,
          status: newStatus,
          attempts: attempts + 1,
        });

        setStatus(newStatus);
        setAttempts((prev) => prev + 1);

        // Stop polling if terminal status reached
        if (newStatus === 'completed') {
          if (intervalId) clearInterval(intervalId);
          onSuccess?.();
        } else if (newStatus === 'declined' || newStatus === 'voided' || newStatus === 'refunded') {
          if (intervalId) clearInterval(intervalId);
          onFailure?.(
            newStatus === 'declined'
              ? 'Payment was declined'
              : newStatus === 'voided'
              ? 'Payment was voided'
              : 'Payment was refunded'
          );
        }

        // Stop polling if max attempts reached
        if (attempts + 1 >= maxAttempts) {
          if (intervalId) clearInterval(intervalId);
          setError('Payment status check timed out. Please contact support.');
          onFailure?.('Polling timeout');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error('[AEROPAY-PAYMENT] Failed to poll status', { error: errorMsg });

        setError(errorMsg);
        if (intervalId) clearInterval(intervalId);
        onFailure?.(errorMsg);
      }
    };

    // Start polling immediately
    pollStatus();

    // Poll every 3 seconds
    intervalId = setInterval(pollStatus, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [transactionId, attempts, maxAttempts, onSuccess, onFailure]);

  const totalAmount = amount + transactionFee;

  return (
    <div className="space-y-4">
      {/* Pending State */}
      {status === 'pending' && !error && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Processing Payment</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait while we process your Aeropay payment...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This usually takes a few seconds
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">${(amount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Transaction Fee:</span>
                <span className="font-medium">${(transactionFee / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
                <span>Total:</span>
                <span>${(totalAmount / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Success State */}
      {status === 'completed' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900 font-semibold">Payment Successful!</AlertTitle>
          <AlertDescription className="text-green-800">
            Your payment of ${(totalAmount / 100).toFixed(2)} has been processed successfully.
            Your order is confirmed and ready for pickup.
          </AlertDescription>
        </Alert>
      )}

      {/* Declined/Failed State */}
      {(status === 'declined' || status === 'voided' || status === 'refunded') && (
        <Alert variant="destructive">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Payment {status === 'declined' ? 'Declined' : status === 'voided' ? 'Voided' : 'Refunded'}</AlertTitle>
          <AlertDescription>
            {status === 'declined' && (
              <>
                Your payment was declined. Please try a different payment method or contact your
                bank.
              </>
            )}
            {status === 'voided' && <>This payment was voided. Please start a new order.</>}
            {status === 'refunded' && <>This payment was refunded.</>}
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Retry Button (if failed) */}
      {(status === 'declined' || error) && onFailure && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
