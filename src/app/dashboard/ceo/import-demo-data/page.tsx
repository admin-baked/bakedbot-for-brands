'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import { importDemoData, clearDemoData } from './actions';

type ImportResult = {
  success: boolean;
  message: string;
  productCount?: number;
  reviewCount?: number;
};

export default function ImportDemoDataPage() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);
    const res = await importDemoData();
    setResult(res);
    setIsImporting(false);
  };
  
  const handleClear = async () => {
    if (window.confirm('Are you sure you want to delete all demo products and reviews from Firestore? This cannot be undone.')) {
        setIsClearing(true);
        setResult(null);
        const res = await clearDemoData();
        setResult(res);
        setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
          <p className="text-muted-foreground">
              Seed or clear product and review data in your Firestore database.
          </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed Firestore Database</CardTitle>
          <CardDescription>
            Click the button below to import the 9 demo products and 10 demo reviews from `/src/lib/data.ts` into your live Firestore database. This will overwrite any existing products or reviews with the same IDs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleImport} disabled={isImporting || isClearing}>
            {isImporting ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2" />}
            Import Demo Data
          </Button>
           <Button onClick={handleClear} variant="destructive" disabled={isImporting || isClearing}>
            {isClearing ? <Loader2 className="mr-2 animate-spin" /> : <Database className="mr-2" />}
            Clear All Demo Data
          </Button>
        </CardContent>

        {result && (
          <CardContent>
            <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                {result.success ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <XCircle className="h-6 w-6 text-red-600" />}
                <div className="flex-1">
                  <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.success ? 'Import Successful' : 'Operation Result'}
                  </h3>
                  <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message}
                  </p>
                  {result.productCount !== undefined && (
                     <p className="text-sm text-green-700">Products Imported: {result.productCount}</p>
                  )}
                   {result.reviewCount !== undefined && (
                     <p className="text-sm text-green-700">Reviews Imported: {result.reviewCount}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
