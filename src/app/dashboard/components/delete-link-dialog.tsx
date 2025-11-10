
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
import { useStore, type NavLink } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';

interface DeleteLinkDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  link: NavLink | null;
}

export default function DeleteLinkDialog({ isOpen, setIsOpen, link }: DeleteLinkDialogProps) {
  const { removeNavLink } = useStore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!link) return;

    removeNavLink(link.href);
    toast({
      title: 'Link Removed',
      description: `The "${link.label}" link has been permanently removed.`,
    });
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the <strong>{link?.label}</strong> navigation link.
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

    