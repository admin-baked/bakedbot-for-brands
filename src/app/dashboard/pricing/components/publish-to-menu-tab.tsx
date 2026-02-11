'use client';

/**
 * Publish to Menu Tab Component
 *
 * Allows dispensaries to apply dynamic pricing directly to their public menu
 * at bakedbot.ai/{orgSlug}, making price changes visible to customers in real-time.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { publishPricesToMenu, revertAllPricesOnMenu } from '@/app/actions/dynamic-pricing';
import { useDispensaryId } from '@/hooks/use-dispensary-id';

interface PublishResult {
  productsUpdated: number;
  totalSavings: number;
  errors?: string[];
}

export function PublishToMenuTab() {
  const { dispensaryId } = useDispensaryId();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!dispensaryId) {
      setError('Organization ID not found');
      return;
    }

    setIsPublishing(true);
    setError(null);
    setPublishResult(null);

    try {
      const result = await publishPricesToMenu(dispensaryId);

      if (!result.success) {
        setError(result.error || 'Failed to publish prices');
      } else {
        setPublishResult({
          productsUpdated: result.productsUpdated || 0,
          totalSavings: result.totalSavings || 0,
          errors: result.errors,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish prices');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRevert = async () => {
    if (!dispensaryId) {
      setError('Organization ID not found');
      return;
    }

    if (!confirm('Are you sure you want to revert all products to their original prices? This will remove all dynamic pricing from your menu.')) {
      return;
    }

    setIsReverting(true);
    setError(null);
    setPublishResult(null);

    try {
      const result = await revertAllPricesOnMenu(dispensaryId);

      if (!result.success) {
        setError(result.error || 'Failed to revert prices');
      } else {
        setPublishResult({
          productsUpdated: result.productsReverted || 0,
          totalSavings: 0,
          errors: undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert prices');
    } finally {
      setIsReverting(false);
    }
  };

  // Construct menu URL (assumes Thrive Syracuse or similar slug-based routing)
  // TODO: Fetch actual slug from organization config
  const menuUrl = dispensaryId === 'org_thrive_syracuse'
    ? 'https://bakedbot.ai/thrivesyracuse'
    : `https://bakedbot.ai/${dispensaryId}`;

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          Publish your dynamic pricing rules directly to your live menu. Customers will see updated prices
          immediately when visiting your menu at{' '}
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            {menuUrl.replace('https://', '')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      {/* Main Publish Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Publish to Public Menu
          </CardTitle>
          <CardDescription>
            Apply all active pricing rules to your public menu. This will update product prices in real-time
            for customers visiting your menu page.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Success Result */}
          {publishResult && !error && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <div className="font-semibold mb-2">Successfully Published!</div>
                <div className="space-y-1 text-sm">
                  <div>✓ {publishResult.productsUpdated} products updated</div>
                  {publishResult.totalSavings > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Total customer savings: ${publishResult.totalSavings.toFixed(2)}
                    </div>
                  )}
                </div>
                {publishResult.errors && publishResult.errors.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs cursor-pointer text-orange-700">
                      {publishResult.errors.length} warnings
                    </summary>
                    <ul className="mt-2 text-xs space-y-1 text-orange-800">
                      {publishResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {publishResult.errors.length > 5 && (
                        <li>... and {publishResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
            <div className="font-semibold text-blue-900">What happens when you publish?</div>
            <ul className="space-y-1 text-blue-800">
              <li>✓ All active pricing rules are evaluated for each product</li>
              <li>✓ Products matching rule conditions get updated prices</li>
              <li>✓ Original prices are preserved for easy reverting</li>
              <li>✓ Discount badges appear next to updated prices</li>
              <li>✓ Changes are visible immediately on your public menu</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            onClick={handlePublish}
            disabled={isPublishing || isReverting}
            className="gap-2"
            size="lg"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Publish to Menu
              </>
            )}
          </Button>

          <Button
            onClick={handleRevert}
            disabled={isPublishing || isReverting}
            variant="outline"
            className="gap-2"
            size="lg"
          >
            {isReverting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reverting...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Revert All Prices
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Additional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publishing Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <Badge variant="outline" className="mb-2">Timing</Badge>
            <p className="text-muted-foreground">
              Publish during off-peak hours (9am-11am or 2pm-4pm) to minimize customer confusion
              from price changes during active shopping sessions.
            </p>
          </div>

          <div>
            <Badge variant="outline" className="mb-2">Testing</Badge>
            <p className="text-muted-foreground">
              Always preview your rules in the Analytics tab before publishing. Review which products
              will be affected and by how much.
            </p>
          </div>

          <div>
            <Badge variant="outline" className="mb-2">Reverting</Badge>
            <p className="text-muted-foreground">
              If you need to quickly remove dynamic pricing (e.g., rule malfunction), use &quot;Revert All Prices&quot;
              to instantly restore original prices. This is safe and can be done at any time.
            </p>
          </div>

          <div>
            <Badge variant="outline" className="mb-2">Alleaves Sync</Badge>
            <p className="text-muted-foreground">
              BakedBot menu prices are separate from your POS prices. To sync pricing rules to your POS system,
              use the &quot;Sync to POS&quot; button on individual rules in the Active Rules tab.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
