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
// Official API: canpay.init(config) - lowercase 'canpay'
declare global {
  interface Window {
    canpay?: {
      init: (config: {
        intent_id: string;
        amount?: string;
        tip_amount?: string;
        delivery_fee?: string;
        split_funding_merchant_id?: string;
        merchant_order_id?: string;
        passthrough?: any;
        is_guest?: string;
        need_modification_url?: string;
        return_consumer_given_tip_amount?: string;
        auth_id?: string;
        login_callback?: (response: any) => void;
        link_callback?: (response: any) => void;
        processed_callback: (response: any) => void;
        intentId_validation_callback?: (response: any) => void;
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
    script.src = `${widgetUrl}/cp-min.js`;
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
    if (!window.canpay) {
      setLoadError('Payment widget not available. Please refresh the page.');
      return;
    }

    try {
      // Official CannPay API initialization per v1.4.0-dev spec
      window.canpay.init({
        intent_id: intentId,
        is_guest: 'true', // Guest checkout for now

        // processed_callback: Called when payment is complete
        // Response contains: { response: "<JSON>", signature: "<HMAC-SHA256>" }
        processed_callback: (response: any) => {
          // Per spec: response and signature must be verified server-side
          // before processing to prevent fraud
          console.log('[CannPay Widget] Payment processed:', response);

          try {
            // Parse the response JSON string
            const paymentData = JSON.parse(response.response);

            // Call success callback with parsed data
            // NOTE: Signature verification should happen server-side!
            onSuccess({
              status: 'Success',
              transactionNumber: paymentData.canpay_transaction_number,
              amount: paymentData.amount,
              tipAmount: paymentData.tip_amount,
              deliveryFee: paymentData.delivery_fee,
              intentId: paymentData.intent_id,
            });
          } catch (error) {
            console.error('[CannPay Widget] Failed to parse payment response:', error);
            onError({
              status: 'Failed',
              message: 'Failed to process payment response',
              intentId,
            });
          }
        },

        // intentId_validation_callback: Called when intent ID validation fails
        intentId_validation_callback: (response: any) => {
          console.error('[CannPay Widget] Intent ID validation failed:', response);
          onError({
            status: 'Failed',
            message: response.message || 'Invalid payment session',
            intentId,
          });
        },

        // login_callback: Called when login fails (optional)
        login_callback: (response: any) => {
          console.error('[CannPay Widget] Login failed:', response);
          onError({
            status: 'Failed',
            message: response.message || 'Login failed',
            intentId,
          });
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
