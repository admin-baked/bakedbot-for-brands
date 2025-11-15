
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Location } from '@/firebase/converters';
import { useToast } from '@/hooks/use-toast';
import { useFormState, useFormStatus } from 'react-dom';
import { updateLocationAction } from '../actions';
import { Loader2 } from 'lucide-react';

interface EditLocationDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  location: Location | null;
}

const initialState = { message: '', error: false };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 animate-spin" />}
            Save changes
        </Button>
    )
}

export default function EditLocationDialog({ isOpen, setIsOpen, location }: EditLocationDialogProps) {
  const { toast } = useToast();
  const [state, formAction] = useFormState(updateLocationAction, initialState);
  
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <form action={formAction}>
            <input type="hidden" name="id" value={location?.id || ''} />
            <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
                Make changes to the "{location?.name}" location.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="edit-loc-name">Location Name</Label>
                <Input id="edit-loc-name" name="name" defaultValue={location?.name || ''} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-loc-address">Street Address</Label>
                <Input id="edit-loc-address" name="address" defaultValue={location?.address || ''} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                <Label htmlFor="edit-loc-city">City</Label>
                <Input id="edit-loc-city" name="city" defaultValue={location?.city || ''} required />
                </div>
                <div className="space-y-2">
                <Label htmlFor="edit-loc-state">State</Label>
                <Input id="edit-loc-state" name="state" defaultValue={location?.state || ''} required />
                </div>
                <div className="space-y-2">
                <Label htmlFor="edit-loc-zip">Zip Code</Label>
                <Input id="edit-loc-zip" name="zip" defaultValue={location?.zip || ''} required />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="edit-loc-phone">Phone Number</Label>
                <Input id="edit-loc-phone" name="phone" type="tel" defaultValue={location?.phone || ''} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-loc-email">Fulfillment Email</Label>
                    <Input id="edit-loc-email" name="email" type="email" defaultValue={location?.email || ''} />
                </div>
            </div>
            </div>
            <DialogFooter>
                <SubmitButton />
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
