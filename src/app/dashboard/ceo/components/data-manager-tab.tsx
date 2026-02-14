import { useRef, useEffect, useState, useActionState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { importDemoData, clearAllData } from '../actions/data-actions';
import { type ActionResult } from '../actions/types';

import { SubmitButton } from './submit-button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = {
  message: '',
  error: false,
};

export default function DataManagerTab() {
  const [importState, importAction] = useActionState(importDemoData, initialState);
  const [clearState, clearAction] = useActionState(clearAllData, initialState);
  const { toast } = useToast();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);

  useEffect(() => {
    if (importState.message) {
      toast({
        title: importState.error ? 'Error' : 'Success',
        description: importState.message,
        variant: importState.error ? 'destructive' : 'default',
      });
      setIsImportOpen(false);
    }
  }, [importState, toast]);

  useEffect(() => {
    if (clearState.message) {
      toast({
        title: clearState.error ? 'Error' : 'Success',
        description: clearState.message,
        variant: clearState.error ? 'destructive' : 'default',
      });
      setIsClearOpen(false);
    }
  }, [clearState, toast]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Demo Data</CardTitle>
          <CardDescription>
            Populate your Firestore database with the complete set of demo products, locations, and reviews. This will overwrite existing data with the same IDs.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <AlertDialogTrigger asChild>
              <Button>Import Demo Data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will overwrite existing data with demo content. This cannot be undone if you have custom data with conflicting IDs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={importAction}>
                  <SubmitButton label="Confirm Import" />
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Danger Zone</AlertTitle>
        <AlertDescription>
          The actions below are irreversible and will permanently delete data from your Firestore database.
        </AlertDescription>
      </Alert>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Clear All Data</CardTitle>
          <CardDescription>
            Permanently delete all documents from the `products`, `dispensaries`, and `orders` collections. Use with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" /> Delete All Data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete all data from your database. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={clearAction}>
                  <SubmitButton label="Yes, Delete Everything" variant="destructive" />
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
