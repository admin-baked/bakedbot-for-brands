'use client';

/**
 * Upgrade Modal Component
 *
 * Shows pricing and features for upgrading from free frontend to paid full-stack.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Check,
  Zap,
  Database,
  Rocket,
  Shield,
  Code2,
  CloudIcon,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { convertToFullStack, checkConversionEligibility, getConversionPricing } from '../convert-actions';
import type { BackendFeature } from '@/server/services/vibe-backend-generator';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  userId: string;
  orgId?: string;
  onSuccess?: (deploymentUrl?: string) => void;
}

export function UpgradeModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  userId,
  orgId,
  onSuccess,
}: UpgradeModalProps) {
  const [converting, setConverting] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<BackendFeature[]>([
    'products',
    'cart',
    'orders',
  ]);
  const [includeAuth, setIncludeAuth] = useState(true);
  const [includePOS, setIncludePOS] = useState(!!orgId);
  const [deployImmediately, setDeployImmediately] = useState(true);
  const [eligibility, setEligibility] = useState<any>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const { toast } = useToast();
  const pricing = getConversionPricing();

  // Check eligibility when modal opens
  useState(() => {
    if (open && !eligibility) {
      checkEligibility();
    }
  });

  async function checkEligibility() {
    setCheckingEligibility(true);
    try {
      const result = await checkConversionEligibility(projectId, userId);
      setEligibility(result);

      if (!result.eligible) {
        toast({
          title: 'Upgrade Required',
          description: result.reason || 'Please upgrade your plan to access full-stack features',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check eligibility',
        variant: 'destructive',
      });
    } finally {
      setCheckingEligibility(false);
    }
  }

  const handleConvert = async () => {
    setConverting(true);
    try {
      const result = await convertToFullStack({
        projectId,
        userId,
        orgId,
        features: selectedFeatures,
        includeAuth,
        includePOS,
        deployImmediately,
      });

      if (result.success) {
        toast({
          title: 'Conversion Complete!',
          description: result.deploymentUrl
            ? `Your full-stack app is live at ${result.deploymentUrl}`
            : 'Backend generated successfully. Download the updated project.',
        });

        onSuccess?.(result.deploymentUrl);
        onOpenChange(false);
      } else {
        toast({
          title: 'Conversion Failed',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong during conversion',
        variant: 'destructive',
      });
    } finally {
      setConverting(false);
    }
  };

  const featureOptions: Array<{ value: BackendFeature; label: string; description: string }> = [
    { value: 'products', label: 'Product Catalog', description: 'Firestore product database with search' },
    { value: 'cart', label: 'Shopping Cart', description: 'Real-time cart management' },
    { value: 'orders', label: 'Order Management', description: 'Order processing and tracking' },
    { value: 'customers', label: 'Customer Accounts', description: 'User profiles and history' },
    { value: 'reviews', label: 'Product Reviews', description: 'Customer ratings and reviews' },
    { value: 'search', label: 'Advanced Search', description: 'Full-text search with filters' },
    { value: 'loyalty', label: 'Loyalty Program', description: 'Points and rewards system' },
    { value: 'analytics', label: 'Analytics', description: 'Usage tracking and insights' },
    { value: 'admin', label: 'Admin Dashboard', description: 'Management interface' },
  ];

  const toggleFeature = (feature: BackendFeature) => {
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== feature));
    } else {
      setSelectedFeatures([...selectedFeatures, feature]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-primary" />
            <DialogTitle>Upgrade to Full-Stack</DialogTitle>
          </div>
          <DialogDescription>
            Add a complete backend to "{projectName}" with Firestore, API routes, and one-click deployment.
          </DialogDescription>
        </DialogHeader>

        {checkingEligibility ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !eligibility?.eligible ? (
          /* Not Eligible - Show Upgrade CTA */
          <div className="space-y-6 py-4">
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Full-Stack Features Require a Paid Plan</h3>
              <p className="text-muted-foreground mb-6">
                Upgrade to Growth or Empire to unlock backend generation, POS integration, and deployment.
              </p>
              <Button size="lg" asChild>
                <a href="/pricing" target="_blank" className="gap-2">
                  View Pricing
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Feature Preview */}
            <div className="space-y-3">
              <h4 className="font-semibold">What You'll Get:</h4>
              {pricing.growth.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Eligible - Show Conversion Options */
          <div className="space-y-6 py-4">
            {/* Features Selection */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Backend Features
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {featureOptions.map((feature) => (
                  <div
                    key={feature.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFeatures.includes(feature.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleFeature(feature.value)}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedFeatures.includes(feature.value)}
                        onCheckedChange={() => toggleFeature(feature.value)}
                      />
                      <div>
                        <p className="font-medium text-sm">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Advanced Options
              </h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auth"
                  checked={includeAuth}
                  onCheckedChange={(checked) => setIncludeAuth(!!checked)}
                />
                <Label htmlFor="auth" className="cursor-pointer">
                  <span className="font-medium">Include Authentication</span>
                  <p className="text-xs text-muted-foreground">Firebase Auth with email/password and Google sign-in</p>
                </Label>
              </div>

              {orgId && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pos"
                    checked={includePOS}
                    onCheckedChange={(checked) => setIncludePOS(!!checked)}
                  />
                  <Label htmlFor="pos" className="cursor-pointer">
                    <span className="font-medium">Connect to POS</span>
                    <p className="text-xs text-muted-foreground">Import real product data from Alleaves</p>
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deploy"
                  checked={deployImmediately}
                  onCheckedChange={(checked) => setDeployImmediately(!!checked)}
                />
                <Label htmlFor="deploy" className="cursor-pointer">
                  <span className="font-medium">Deploy Immediately</span>
                  <p className="text-xs text-muted-foreground">One-click deploy to Firebase (*.bakedbot.ai)</p>
                </Label>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">Full-Stack Conversion</h3>
                  <p className="text-sm text-muted-foreground">One-time setup fee</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{typeof pricing.growth.price === 'string' ? pricing.growth.price : `$${pricing.growth.price}`}</div>
                  {typeof pricing.growth.price === 'number' && (
                    <p className="text-sm text-muted-foreground">{pricing.growth.period}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleConvert}
                disabled={converting || selectedFeatures.length === 0}
                className="w-full gap-2"
                size="lg"
              >
                {converting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {deployImmediately ? 'Generating & Deploying...' : 'Generating Backend...'}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    {deployImmediately ? 'Generate & Deploy' : 'Generate Backend'}
                  </>
                )}
              </Button>
            </div>

            {/* What Happens Next */}
            <div className="text-sm text-muted-foreground space-y-2">
              <h4 className="font-semibold text-foreground">What happens next:</h4>
              <ol className="space-y-1 list-decimal list-inside">
                <li>AI generates Firestore schemas and API routes for selected features</li>
                {includePOS && <li>Real product data imported from your POS</li>}
                {includeAuth && <li>Firebase Auth setup with security rules</li>}
                {deployImmediately && <li>Project deployed to Firebase App Hosting</li>}
                <li>You receive updated code with deployment instructions</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
