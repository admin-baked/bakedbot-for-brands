/**
 * Smokey Pay Widget Component
 *
 * Customer-Facing: Displays as "Smokey Pay"
 * Internal Implementation: Integrates CannPay RemotePay JavaScript widget for payment processing
 *
 * Flow:
 * 1. Component receives intent_id from backend authorization
 * 2. Loads CannPay widget script from CDN (internal)
 * 3. Initializes widget with intent_id
 * 4. Widget handles payment UI and processing
 * 5. JavaScript callback receives payment result
 * 6. Component calls onSuccess/onError/onCancel callbacks
 *
 * AI-THREAD: [Dev1-Claude @ 2025-11-30] P0-PAY-CANNPAY-INTEGRATION
 * Created CannPay widget wrapper based on RemotePay Integration Guide v1.4.0-dev.
 * Uses dynamic script loading to inject widget from CDN.
 * Handles success, error, and cancel callbacks.
 * NOTE: "CannPay" is internal integration; customers see "Smokey Pay" branding.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface CannPayWidgetProps {
  /** Intent ID from CannPay authorize endpoint */
  intentId: string;

  /** Widget URL (sandbox or live) */
  widgetUrl: string;

  /** Callback when payment succeeds */
  onSuccess: (result: CannPaySuccessResult) => void;

  /** Callback when payment fails */
  onError: (error: CannPayErrorResult) => void;

  /** Callback when user cancels payment */
  onCancel: () => void;
}

export interface CannPaySuccessResult {
  status: 'Success' | 'Settled';
  transactionNumber: string;
  amount: number;
  tipAmount?: number;
  deliveryFee?: number;
  intentId: string;
}

export interface CannPayErrorResult {
  status: 'Failed' | 'Voided';
  message?: string;
  intentId: string;
}

// Extend window interface for CannPay global functions
declare global {
  interface Window {
    CannPay?: {
      init: (config: {
        intent_id: string;
        onSuccess: (result: any) => void;
        onError: (error: any) => void;
        onCancel: () => void;
      }) => void;
    };
  }
}

export function CannPayWidget({
  intentId,
  widgetUrl,
  onSuccess,
  onError,
  onCancel,
}: CannPayWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Only load script once
    if (scriptLoadedRef.current) {
      initializeWidget();
      return;
    }

    // Load CannPay widget script from CDN
    const script = document.createElement('script');
    script.src = `${widgetUrl}/widget.js`;
    script.async = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
      setIsLoading(false);
      initializeWidget();
    };

    script.onerror = () => {
      setLoadError('Failed to load payment widget. Please try again.');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [intentId, widgetUrl]);

  function initializeWidget() {
    if (!window.CannPay) {
      setLoadError('Payment widget not available. Please refresh the page.');
      return;
    }

    try {
      window.CannPay.init({
        intent_id: intentId,
        onSuccess: (result: any) => {
          onSuccess({
            status: result.status,
            transactionNumber: result.transaction_number,
            amount: result.amount,
            tipAmount: result.tip_amount,
            deliveryFee: result.delivery_fee,
            intentId: result.intent_id,
          });
        },
        onError: (error: any) => {
          onError({
            status: error.status,
            message: error.message || 'Payment failed',
            intentId: error.intent_id || intentId,
          });
        },
        onCancel: () => {
          onCancel();
        },
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Failed to initialize payment widget'
      );
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-900 font-semibold mb-2">Payment Error</p>
        <p className="text-sm text-red-700 text-center">{loadError}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border border-gray-200 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading payment widget...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="cannpay-widget-container"
      className="min-h-[400px] border border-gray-200 rounded-lg overflow-hidden"
    >
      {/* CannPay widget will be injected here */}
    </div>
  );
}
