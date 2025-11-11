'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CustomerUploads() {
  // This is a placeholder component. In a real app, you would fetch the user's uploaded files.
  const uploads: any[] = []; 

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileUp /> My Uploads</CardTitle>
        <CardDescription>Receipts and COAs for your verified reviews.</CardDescription>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
            <Upload className="h-8 w-8" />
            <p className="mt-2 text-sm">No documents uploaded yet.</p>
            <Button variant="link" asChild>
                <Link href="/leave-a-review">
                    Leave a verified review
                </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Map over uploads here */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
