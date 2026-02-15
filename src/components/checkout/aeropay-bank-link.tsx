/**
 * Aeropay Bank Link Component
 *
 * Embeds Aerosync widget in iframe for one-time bank account linking.
 * Used during Aeropay checkout when customer needs to link their bank account.
 *
 * Flow:
 * 1. Display iframe with Aerosync widget URL from /api/checkout/aeropay/authorize
 * 2. Customer completes bank linking in Aerosync widget
 * 3. Widget posts message to parent window with aggregatorAccountId
 * 4. Component calls /api/checkout/aeropay/link-bank to complete linking
 * 5. After success, triggers transaction creation and redirects to payment status
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created bank linking component with iframe embed and postMessage handling.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { logger } from '@/lib/logger';

export interface AeropayBankLinkProps {
  /** Aerosync widget URL from /api/checkout/aeropay/authorize */
  aerosyncUrl: string;

  /** Aeropay user ID */
  aeropayUserId: string;

  /** BakedBot user ID (Firebase Auth UID) */
  userId: string;

  /** Order ID for transaction creation */
  orderId: string;

  /** Order amount in cents */
  amount: number;

  /** Organization ID (optional) */
  organizationId?: string;

  /** Callback when bank linking completes successfully */
  onLinkComplete?: (bankAccountId: string) => void;

  /** Callback when error occurs */
  onError?: (error: string) => void;
}

interface AerosyncMessage {
  type: 'aerosync_complete' | 'aerosync_error' | 'aerosync_cancel';
  aggregatorAccountId?: string;
  error?: string;
}

export function AeropayBankLink({
  aerosyncUrl,
  aeropayUserId,
  userId,
  orderId,
  amount,
  organizationId,
  onLinkComplete,
  onError,
}: AeropayBankLinkProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'linking' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for postMessage from Aerosync iframe
    const handleMessage = async (event: MessageEvent) => {
      // Security: Verify message origin (should be from Aeropay domain)
      if (!event.origin.includes('aero.inc') && !event.origin.includes('localhost')) {
        logger.warn('[AEROPAY-BANK-LINK] Ignored message from untrusted origin', {
          origin: event.origin,
        });
        return;
      }

      const message: AerosyncMessage = event.data;

      logger.info('[AEROPAY-BANK-LINK] Received message from Aerosync', {
        type: message.type,
      });

      // Handle different message types
      switch (message.type) {
        case 'aerosync_complete':
          if (!message.aggregatorAccountId) {
            setStatus('error');
            setErrorMessage('Bank linking failed: Missing account ID');
            onError?.('Missing aggregatorAccountId from Aerosync widget');
            return;
          }

          setStatus('linking');

          try {
            // Call backend to complete bank linking
            const response = await fetch('/api/checkout/aeropay/link-bank', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                aeropayUserId,
                aggregatorAccountId: message.aggregatorAccountId,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to link bank account');
            }

            const data = await response.json();

            logger.info('[AEROPAY-BANK-LINK] Bank account linked successfully', {
              bankAccountId: data.bankAccountId,
              bankName: data.bankAccount.bankName,
              last4: data.bankAccount.last4,
            });

            setStatus('success');
            onLinkComplete?.(data.bankAccountId);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            logger.error('[AEROPAY-BANK-LINK] Failed to link bank account', {
              error: errorMsg,
            });

            setStatus('error');
            setErrorMessage(errorMsg);
            onError?.(errorMsg);
          }
          break;

        case 'aerosync_error':
          setStatus('error');
          setErrorMessage(message.error || 'Bank linking failed');
          onError?.(message.error || 'Bank linking failed');
          break;

        case 'aerosync_cancel':
          setStatus('error');
          setErrorMessage('Bank linking cancelled');
          onError?.('Customer cancelled bank linking');
          break;

        default:
          logger.warn('[AEROPAY-BANK-LINK] Unknown message type', { type: message.type });
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Mark as ready when iframe loads
    setStatus('ready');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [aeropayUserId, userId, orderId, amount, organizationId, onLinkComplete, onError]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Link Your Bank Account
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secured by Aeropay
          </Badge>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your bank account securely to complete your payment. This is a one-time setup.
        </p>
      </div>

      {/* Status Messages */}
      {status === 'linking' && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Completing bank account setup... Please wait.
          </AlertDescription>
        </Alert>
      )}

      {status === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Bank account linked successfully! Creating your payment...
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Aerosync Widget Iframe */}
      {(status === 'loading' || status === 'ready') && (
        <Card className="p-0 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={aerosyncUrl}
            title="Aeropay Bank Linking"
            className="w-full h-[600px] border-0"
            allow="payment"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </Card>
      )}

      {/* Privacy & Security Notice */}
      <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground space-y-2">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">Your security is our priority</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Your bank credentials are never shared with BakedBot</li>
              <li>Aeropay uses bank-level encryption (256-bit SSL)</li>
              <li>Your bank account is linked for future purchases</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
