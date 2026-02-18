'use client';

import { useState, useEffect } from 'react';
import { TIERS, type TierId } from '@/config/tiers';
import { createSubscription } from '@/server/actions/subscription';
import { validatePromoCode } from '@/server/actions/promos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  defaultTier?: TierId;
}

type Step = 'plan' | 'payment' | 'success';
type PaidTier = Exclude<TierId, 'scout'>;

interface PaymentFormData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  cardNumber: string;
  cardExp: string;
  cardCvv: string;
}

export function CheckoutModal({ isOpen, onClose, orgId, defaultTier }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('plan');
  const [selectedTier, setSelectedTier] = useState<PaidTier>((defaultTier || 'pro') as PaidTier);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoValid, setPromoValid] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState('');

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    cardExp: '',
    cardCvv: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    subscriptionId: string;
    amount: number;
    promoApplied?: { code: string; discount: string };
  } | null>(null);

  const tierConfig = TIERS[selectedTier];
  const amount = tierConfig.price;

  // Validate promo code on blur
  const handlePromoBlur = async () => {
    if (!promoCode) {
      setPromoValid(false);
      setPromoError('');
      setPromoDiscount('');
      return;
    }

    const result = await validatePromoCode(promoCode, selectedTier, orgId);
    if (result.valid && result.promo) {
      setPromoValid(true);
      setPromoError('');
      if (result.promo.type === 'free_months') {
        setPromoDiscount(`${result.promo.value} months free`);
      } else if (result.promo.type === 'percent_off') {
        setPromoDiscount(`${result.promo.value}% off`);
      }
    } else {
      setPromoValid(false);
      setPromoError(result.error || 'Invalid promo code');
      setPromoDiscount('');
    }
  };

  // Handle plan selection → payment
  const handleContinueToPayment = () => {
    setStep('payment');
    setError('');
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate payment form
      if (
        !paymentData.firstName ||
        !paymentData.lastName ||
        !paymentData.address ||
        !paymentData.city ||
        !paymentData.state ||
        !paymentData.zip ||
        !paymentData.cardNumber ||
        !paymentData.cardExp ||
        !paymentData.cardCvv
      ) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // TODO: Integrate with Accept.js to tokenize card
      // For now, we'll use a placeholder opaqueData
      // In production, load Accept.js from NEXT_PUBLIC_AUTHNET_ENV
      const opaqueData = {
        dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
        dataValue: 'placeholder', // Will be replaced by Accept.js
      };

      const result = await createSubscription({
        orgId,
        tierId: selectedTier,
        opaqueData,
        billTo: {
          firstName: paymentData.firstName,
          lastName: paymentData.lastName,
          address: paymentData.address,
          city: paymentData.city,
          state: paymentData.state,
          zip: paymentData.zip,
        },
        promoCode: promoCode || undefined,
      });

      if (result.success) {
        setSuccessData({
          subscriptionId: result.subscriptionId!,
          amount: result.amount!,
          promoApplied: result.promoApplied,
        });
        setStep('success');

        // Auto-close after 4 seconds
        setTimeout(() => {
          onClose();
          setStep('plan');
        }, 4000);
      } else {
        setError(result.error || 'Subscription creation failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setTimeout(() => {
        setStep('plan');
        setPromoCode('');
        setPromoError('');
        setPromoValid(false);
        setPromoDiscount('');
        setError('');
        setSuccessData(null);
      }, 200);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'plan' && 'Select Your Plan'}
            {step === 'payment' && 'Billing Information'}
            {step === 'success' && 'Subscription Activated'}
          </DialogTitle>
          <DialogDescription>
            {step === 'plan' && 'Choose the plan that fits your needs'}
            {step === 'payment' && 'Enter your billing details'}
            {step === 'success' && 'Your subscription is now active'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Plan Selection */}
        {step === 'plan' && (
          <div className="space-y-6">
            {/* Tier Cards */}
            <div className="grid grid-cols-2 gap-4">
              {(['pro', 'growth', 'empire'] as const).map((tier) => {
                const cfg = TIERS[tier];
                return (
                  <Card
                    key={tier}
                    className={`cursor-pointer transition ${
                      selectedTier === tier
                        ? 'ring-2 ring-emerald-500 border-emerald-500'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedTier(tier)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{cfg.name}</CardTitle>
                      <CardDescription>${cfg.price}/month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1">
                        <li>• {cfg.allocations.emails.toLocaleString()} emails</li>
                        <li>• {cfg.allocations.smsCustomer} customer SMS</li>
                        <li>• {cfg.allocations.competitors} competitors</li>
                        <li>• {cfg.allocations.playbooks} playbooks</li>
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              <Label htmlFor="promo">Promo Code (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="promo"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  onBlur={handlePromoBlur}
                />
              </div>
              {promoError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {promoError}
                </div>
              )}
              {promoDiscount && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  {promoDiscount}
                </div>
              )}
            </div>

            {/* Summary */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Tier</span>
                    <span className="font-medium">{tierConfig.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Cost</span>
                    <span className="font-medium">${tierConfig.price}</span>
                  </div>
                  {promoDiscount && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Promo</span>
                      <span>{promoDiscount}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleContinueToPayment} className="bg-emerald-600 hover:bg-emerald-700">
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Payment */}
        {step === 'payment' && (
          <form onSubmit={handlePaymentSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {/* Billing Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Billing Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={paymentData.firstName}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={paymentData.lastName}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={paymentData.address}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, address: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={paymentData.city}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, city: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    maxLength={2}
                    placeholder="CA"
                    value={paymentData.state}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, state: e.target.value.toUpperCase() })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={paymentData.zip}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, zip: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Card Information</h3>
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={paymentData.cardNumber}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, cardNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardExp">Expiration (MM/YY)</Label>
                  <Input
                    id="cardExp"
                    placeholder="12/25"
                    value={paymentData.cardExp}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, cardExp: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cardCvv">CVV</Label>
                  <Input
                    id="cardCvv"
                    placeholder="123"
                    maxLength={4}
                    value={paymentData.cardCvv}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, cardCvv: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Plan</span>
                    <span className="font-medium">{tierConfig.name}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">${tierConfig.price}/mo</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('plan')} disabled={loading}>
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Subscribe'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 'success' && successData && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{tierConfig.name} Activated</h3>
              <p className="text-gray-600">
                Your subscription is now active. Playbooks and features are being set up.
              </p>
            </div>
            <Card className="bg-gray-50">
              <CardContent className="pt-6 space-y-2">
                <div className="flex justify-between">
                  <span>Billing Amount</span>
                  <span className="font-medium">${successData.amount}/month</span>
                </div>
                {successData.promoApplied && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{successData.promoApplied.code}</span>
                    <span>{successData.promoApplied.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600 pt-2 border-t">
                  <span>Subscription ID</span>
                  <span className="font-mono text-xs">{successData.subscriptionId}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-center">
              <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
