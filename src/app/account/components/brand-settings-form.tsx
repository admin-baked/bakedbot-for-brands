
'use client';

import { useEffect, useRef, useActionState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateBrandSettings, type BrandSettingsFormState } from '../actions';
import { type Brand } from '@/types/domain';
import { SubmitButton } from './submit-button';

const initialState: BrandSettingsFormState = {
  message: '',
  error: false,
};

interface BrandSettingsFormProps {
    brand: Brand;
}

export default function BrandSettingsForm({ brand }: BrandSettingsFormProps) {
  const [state, formAction] = useActionState(updateBrandSettings, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) {
      if (state.error && !state.fieldErrors) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
      } else if (!state.error) {
         toast({ title: 'Success!', description: state.message });
      }
    }
  }, [state, toast]);

  return (
    <Card>
      <form ref={formRef} action={formAction}>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>Update your brand's name and logo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input id="brandName" name="brandName" defaultValue={brand.name} />
            {state.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" name="logoUrl" defaultValue={brand.logoUrl || ''} placeholder="https://example.com/logo.png"/>
             {state.fieldErrors?.logoUrl && <p className="text-sm text-destructive">{state.fieldErrors.logoUrl[0]}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
