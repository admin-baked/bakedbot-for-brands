/**
 * Payment Selection Component
 *
 * Allows customers to choose between three payment methods:
 * 1. Dispensary Direct (default) - Pay at pickup
 * 2. Smokey Pay - Cannabis-specific payment processor (+$0.50 fee) [powered by CannPay internally]
 * 3. Stripe - Traditional payment processor (optional)
 *
 * AI-THREAD: [Dev1-Claude @ 2025-11-30] P0-PAY-CANNPAY-INTEGRATION
 * Created payment selection UI with three options.
 * Default selection is "dispensary_direct" per user requirements.
 * Smokey Pay transaction fee ($0.50) displayed clearly to customer.
 * NOTE: "CannPay" is internal integration name; customers see "Smokey Pay" branding.
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Store } from 'lucide-react';

export type PaymentMethod = 'dispensary_direct' | 'cannpay' | 'stripe';

export interface PaymentSelectionProps {
  /** Selected payment method */
  value: PaymentMethod;

  /** Callback when payment method changes */
  onChange: (method: PaymentMethod) => void;

  /** Order subtotal in cents */
  subtotal: number;

  /** Whether Stripe is enabled (optional payment method) */
  stripeEnabled?: boolean;
}

const SMOKEY_PAY_FEE_CENTS = 50; // $0.50 transaction fee (internal: cannpay)

/**
 * Format cents to dollar string
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function PaymentSelection({
  value,
  onChange,
  subtotal,
  stripeEnabled = true,
}: PaymentSelectionProps) {
  const smokeyPayTotal = subtotal + SMOKEY_PAY_FEE_CENTS;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Payment Method</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose how you'd like to pay for your order
        </p>
      </div>

      <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)}>
        {/* Option 1: Dispensary Direct (Default) */}
        <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
          <div className="flex items-start space-x-4">
            <RadioGroupItem value="dispensary_direct" id="dispensary_direct" />
            <Label
              htmlFor="dispensary_direct"
              className="flex-1 cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Store className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Pay at Pickup</span>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pay when you pick up your order at the dispensary. Cash or card accepted
                at location.
              </p>
            </Label>
          </div>
        </Card>

        {/* Option 2: Smokey Pay (Primary Online Payment) - internal: cannpay */}
        <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
          <div className="flex items-start space-x-4">
            <RadioGroupItem value="cannpay" id="cannpay" />
            <Label htmlFor="cannpay" className="flex-1 cursor-pointer space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Banknote className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Smokey Pay</span>
                  <Badge variant="outline" className="text-xs">
                    +$0.50 fee
                  </Badge>
                </div>
                <span className="font-semibold">{formatCurrency(smokeyPayTotal)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pay now with Smokey Pay, the cannabis industry's trusted payment solution.
                Secure bank-to-bank transfer.
              </p>
            </Label>
          </div>
        </Card>

        {/* Option 3: Stripe (Optional Fallback) */}
        {stripeEnabled && (
          <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
            <div className="flex items-start space-x-4">
              <RadioGroupItem value="stripe" id="stripe" />
              <Label htmlFor="stripe" className="flex-1 cursor-pointer space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">Credit/Debit Card</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay securely with your credit or debit card via Stripe.
                </p>
              </Label>
            </div>
          </Card>
        )}
      </RadioGroup>

      {/* Transaction Fee Notice */}
      {value === 'cannpay' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            <strong>Transaction Fee:</strong> A ${formatCurrency(SMOKEY_PAY_FEE_CENTS)}{' '}
            processing fee will be added to your total when paying with Smokey Pay.
          </p>
        </div>
      )}
    </div>
  );
}
