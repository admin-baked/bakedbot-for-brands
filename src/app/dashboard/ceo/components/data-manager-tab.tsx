'use client';

import { useFormState } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { importDemoData, clearAllData, type ActionResult } from '../actions';
import { SubmitButton } from './submit-button';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Trash2 } from 'lucide-react';

const initialState: ActionResult = {
  message: '',
  error: false,
};

export default function DataManagerTab() {
  const [importState, importAction] = useFormState(importDemoData, initialState);
  const [clearState, clearAction] = useFormState(clearAllData, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (importState.message) {
      toast({
        title: importState.error ? 'Error' : 'Success',
        description: importState.message,
        variant: importState.error ? 'destructive' : 'default',
      });
    }
  }, [importState, toast]);

  useEffect(() => {
    if (clearState.message) {
      toast({
        title: clearState.error ? 'Error' : 'Success',
        description: clearState.message,
        variant: clearState.error ? 'destructive' : 'default',
      });
    }
  }, [clearState, toast]);

  return (
    <div className="grid gap-6">
      <Card>
        <form action={importAction}>
          <CardHeader>
            <CardTitle>Import Demo Data</CardTitle>
            <CardDescription>
              Populate your Firestore database with the complete set of demo products, locations, and reviews. This will overwrite existing data with the same IDs.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <SubmitButton label="Import Demo Data" />
          </CardFooter>
        </form>
      </Card>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Danger Zone</AlertTitle>
        <AlertDescription>
          The actions below are irreversible and will permanently delete data from your Firestore database.
        </AlertDescription>
      </Alert>

      <Card className="border-destructive">
         <form action={clearAction}>
          <CardHeader>
            <CardTitle>Clear All Data</CardTitle>
            <CardDescription>
              Permanently delete all documents from the `products`, `dispensaries`, and `orders` collections. Use with extreme caution.
            </CardDescription>
          </CardHeader>
          <CardFooter>
             <SubmitButton label="Delete All Data" variant="destructive" icon={Trash2} />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
