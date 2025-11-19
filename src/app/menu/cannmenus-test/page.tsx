'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// IMPORTANT: Replace this with your actual Cloud Functions base URL after deployment.
const CLOUD_FUNCTIONS_BASE_URL = 'https://us-central1-studio-567050101-bc6e8.cloudfunctions.net';

export default function CannMenusTestPage() {
  const [brandSearch, setBrandSearch] = useState('Jeeter');
  const [retailerSearch, setRetailerSearch] = useState('chicago');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (endpoint: 'brands' | 'retailers', query: string) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    const url = `${CLOUD_FUNCTIONS_BASE_URL}/${endpoint}?search=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>CannMenus API Proxy Test Page</CardTitle>
          <CardDescription>
            Use this page to test the Cloud Function proxies for the CannMenus API. The base URL is currently set to: 
            <code className="p-1 bg-muted rounded-sm text-xs mx-1">{CLOUD_FUNCTIONS_BASE_URL}</code>. 
            Remember to replace the placeholder if your deployment URL is different.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="brand-search">Brand Search</Label>
              <Input
                id="brand-search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => handleFetch('brands', brandSearch)} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Fetch Brands
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="retailer-search">Retailer Search</Label>
              <Input
                id="retailer-search"
                value={retailerSearch}
                onChange={(e) => setRetailerSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => handleFetch('retailers', retailerSearch)} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Fetch Retailers
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {(results || error) && (
        <div className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="text-xs whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-foreground overflow-auto max-h-96">
                        {error ? `Error: ${error}` : JSON.stringify(results, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
