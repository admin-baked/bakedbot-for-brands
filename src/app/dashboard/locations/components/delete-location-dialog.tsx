
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Location } from '@/firebase/converters';
import { useToast } from '@/hooks/use-toast';
import { useFormState } from 'react-dom';
import { removeLocationAction } from '../actions';

interface DeleteLocationDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  location: Location | null;
}

const initialState = { message: '', error: false };

export default function DeleteLocationDialog({ isOpen, setIsOpen, location }: DeleteLocationDialogProps) {
  const { toast } = useToast();
  const [state, formAction] = useFormState(removeLocationAction, initialState);

  React.useEffect(() => {
    if (state.message) {
        toast({
            title: state.error ? 'Error' : 'Success',
            description: state.message,
            variant: state.error ? 'destructive' : 'default',
        });
        if (!state.error) {
            setIsOpen(false);
        }
    }
  }, [state, toast, setIsOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <form action={formAction}>
            <input type="hidden" name="id" value={location?.id || ''} />
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the <strong>{location?.name}</strong> location from Firestore.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
