
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
import { useStore, type Location } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';

interface DeleteLocationDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  location: Location | null;
}

export default function DeleteLocationDialog({ isOpen, setIsOpen, location }: DeleteLocationDialogProps) {
  const { removeLocation } = useStore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!location) return;

    removeLocation(location.id);
    toast({
      title: 'Location Removed',
      description: `The "${location.name}" location has been permanently removed.`,
    });
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the <strong>{location?.name}</strong> location.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
