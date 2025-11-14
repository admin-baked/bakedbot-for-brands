
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
import { useStore } from '@/hooks/use-store';
import type { Location } from '@/firebase/converters';
import { useToast } from '@/hooks/use-toast';

interface EditLocationDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  location: Location | null;
}

export default function EditLocationDialog({ isOpen, setIsOpen, location }: EditLocationDialogProps) {
  const { updateLocation } = useStore();
  const { toast } = useToast();
  
  const [formState, setFormState] = React.useState<Partial<Location>>({});

  React.useEffect(() => {
    if (isOpen && location) {
      setFormState(location);
    }
  }, [isOpen, location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = () => {
    if (!location) return;

    // Basic validation
    if (!formState.name || !formState.address || !formState.city || !formState.state || !formState.zip) {
       toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all required location fields.',
      });
      return;
    }

    updateLocation(location.id, formState);
    toast({
        title: 'Location Updated',
        description: `The "${location.name}" location was successfully updated.`,
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            Make changes to the "{location?.name}" location.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-loc-name">Location Name</Label>
            <Input id="edit-loc-name" name="name" value={formState.name || ''} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-loc-address">Street Address</Label>
            <Input id="edit-loc-address" name="address" value={formState.address || ''} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-loc-city">City</Label>
              <Input id="edit-loc-city" name="city" value={formState.city || ''} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-loc-state">State</Label>
              <Input id="edit-loc-state" name="state" value={formState.state || ''} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-loc-zip">Zip Code</Label>
              <Input id="edit-loc-zip" name="zip" value={formState.zip || ''} onChange={handleChange} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-loc-phone">Phone Number</Label>
              <Input id="edit-loc-phone" name="phone" type="tel" value={formState.phone || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-loc-email">Fulfillment Email</Label>
                <Input id="edit-loc-email" name="email" type="email" value={formState.email || ''} onChange={handleChange} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
