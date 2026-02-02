'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Test Loyalty Sync Page
 * Simple page to test the loyalty sync without authentication
 * Access: http://localhost:3000/test-loyalty
 */

const ORG_ID = 'thrive_syracuse';

export default function TestLoyaltyPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setResult(null);

    try {
      console.log('Starting sync for org:', ORG_ID);

      const response = await fetch('/api/loyalty/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId: ORG_ID }),
      });

      const data = await response.json();

      console.log('Sync response:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Sync failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      const response = await fetch(`/api/loyalty/sync?orgId=${ORG_ID}`);
      const data = await response.json();

      console.log('Status:', data);

      if (response.ok) {
        alert(JSON.stringify(data.stats, null, 2));
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to check status: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Loyalty Sync Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the loyalty sync functionality without authentication
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Organization: <code className="bg-muted px-2 py-1 rounded">{ORG_ID}</code>
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            size="lg"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Run Sync'}
          </Button>

          <Button
            onClick={handleCheckStatus}
            variant="outline"
            size="lg"
          >
            Check Status
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold">Sync Failed</div>
              <div className="text-sm mt-1">{error}</div>
            </AlertDescription>
          </Alert>
        )}

        {result && result.success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="font-semibold">Sync Successful!</div>
              <div className="text-sm mt-1">
                Processed {result.result?.totalProcessed || 0} customers
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="text-green-600 mt-0.5">✓</div>
              <div>
                <div className="font-medium">Dev server running</div>
                <div className="text-sm text-muted-foreground">
                  You're viewing this page!
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="text-amber-600 mt-0.5">?</div>
              <div>
                <div className="font-medium">Brand document created</div>
                <div className="text-sm text-muted-foreground">
                  Check Firebase Console → Firestore → brands → {ORG_ID}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <a
                    href="/dev/SETUP_BRAND_MANUALLY.md"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    → Setup Guide
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="text-amber-600 mt-0.5">?</div>
              <div>
                <div className="font-medium">POS config added</div>
                <div className="text-sm text-muted-foreground">
                  Brand document must have posConfig with Alleaves credentials
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-red-600">"Organization not found"</div>
              <div className="text-muted-foreground">
                → Brand document doesn't exist in Firestore brands collection
              </div>
              <div className="text-muted-foreground">
                → Create it following <code>dev/SETUP_BRAND_MANUALLY.md</code>
              </div>
            </div>

            <div>
              <div className="font-medium text-red-600">"Alleaves POS not configured"</div>
              <div className="text-muted-foreground">
                → Brand document exists but posConfig is missing or invalid
              </div>
              <div className="text-muted-foreground">
                → Ensure posConfig.provider = "alleaves"
              </div>
            </div>

            <div>
              <div className="font-medium text-red-600">"Authentication failed"</div>
              <div className="text-muted-foreground">
                → Alleaves credentials are incorrect in posConfig
              </div>
              <div className="text-muted-foreground">
                → Check username, password, and pin
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
