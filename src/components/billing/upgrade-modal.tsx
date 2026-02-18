'use client';

import { useState } from 'react';
import { TIERS, type TierId } from '@/config/tiers';
import { upgradeSubscription } from '@/server/actions/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentTierId: TierId;
}

type Step = 'select' | 'confirm' | 'success';

const TIER_ORDER: TierId[] = ['scout', 'pro', 'growth', 'empire'];

export function UpgradeModal({ isOpen, onClose, orgId, currentTierId }: UpgradeModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedTier, setSelectedTier] = useState<TierId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    newTier: TierId;
    newAmount: number;
  } | null>(null);

  // Get tiers available for upgrade (only those higher than current)
  const currentTierIndex = TIER_ORDER.indexOf(currentTierId);
  const availableTiers = TIER_ORDER.slice(currentTierIndex + 1).filter(
    (tier) => tier !== 'scout'
  ) as TierId[];

  const newTierConfig = selectedTier ? TIERS[selectedTier] : null;
  const currentTierConfig = TIERS[currentTierId];

  // Handle tier selection
  const handleSelectTier = () => {
    if (!selectedTier) {
      setError('Please select a tier');
      return;
    }
    setStep('confirm');
    setError('');
  };

  // Handle upgrade confirmation
  const handleUpgradeConfirm = async () => {
    if (!selectedTier) return;

    setLoading(true);
    setError('');

    try {
      const result = await upgradeSubscription(orgId, selectedTier);

      if (result.success) {
        setSuccessData({
          newTier: selectedTier,
          newAmount: result.newAmount || TIERS[selectedTier].price,
        });
        setStep('success');

        // Auto-close after 4 seconds
        setTimeout(() => {
          onClose();
          setStep('select');
          setSelectedTier(null);
        }, 4000);
      } else {
        setError(result.error || 'Upgrade failed');
        setStep('confirm');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setTimeout(() => {
        setStep('select');
        setSelectedTier(null);
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
            {step === 'select' && 'Upgrade Your Plan'}
            {step === 'confirm' && 'Confirm Upgrade'}
            {step === 'success' && 'Upgrade Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a higher tier to get more features'}
            {step === 'confirm' &&
              `Upgrade to ${newTierConfig?.name} for $${newTierConfig?.price}/month`}
            {step === 'success' && 'Your subscription has been upgraded'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Plan Selection */}
        {step === 'select' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Current Plan</p>
                    <p className="text-lg font-semibold">{currentTierConfig.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Monthly Cost</p>
                    <p className="text-lg font-semibold">${currentTierConfig.price}/month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Tiers */}
            {availableTiers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Available upgrades:</p>
                <div className="grid gap-3">
                  {availableTiers.map((tier) => {
                    const cfg = TIERS[tier];
                    const priceDiff = cfg.price - currentTierConfig.price;
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
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{cfg.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Includes {cfg.allocations.emails.toLocaleString()} emails,{' '}
                                {cfg.allocations.smsCustomer} customer SMS, {cfg.allocations.competitors}{' '}
                                competitors tracked
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-emerald-600">${cfg.price}</p>
                              <p className="text-xs text-gray-600">/month</p>
                              {priceDiff > 0 && (
                                <p className="text-xs text-emerald-600 mt-1">
                                  +${priceDiff}/month
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                You are already on the highest tier available.
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSelectTier}
                disabled={!selectedTier}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Confirmation */}
        {step === 'confirm' && newTierConfig && (
          <div className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {/* Upgrade Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <p className="font-semibold">{currentTierConfig.name}</p>
                </div>
                <div className="text-2xl">→</div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Upgrade to</p>
                  <p className="font-semibold">{newTierConfig.name}</p>
                </div>
              </div>

              {/* Billing Note */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Billing Note:</span> The upgrade takes effect
                    immediately. Your next billing date remains unchanged. The difference will be
                    prorated and charged today.
                  </p>
                </CardContent>
              </Card>

              {/* Amount Summary */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Monthly Amount</span>
                    <span className="font-semibold">${newTierConfig.price}/month</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-semibold">Effective Immediately</span>
                    <span className="font-bold text-emerald-600">${newTierConfig.price}/month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('select')} disabled={loading}>
                Back
              </Button>
              <Button
                onClick={handleUpgradeConfirm}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  `Upgrade to ${newTierConfig.name}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Success */}
        {step === 'success' && successData && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Upgrade Successful!</h3>
              <p className="text-gray-600">
                Your subscription has been upgraded to {TIERS[successData.newTier].name}.
              </p>
            </div>
            <Card className="bg-gray-50">
              <CardContent className="pt-6 space-y-2">
                <div className="flex justify-between">
                  <span>New Plan</span>
                  <span className="font-semibold">{TIERS[successData.newTier].name}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">New Monthly Amount</span>
                  <span className="font-semibold text-emerald-600">${successData.newAmount}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-center">
              <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
