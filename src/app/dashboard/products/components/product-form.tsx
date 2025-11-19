
'use client';

import { useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { saveProduct, type ProductFormState } from '../actions';
import type { Product } from '@/types/domain';
import { SubmitButton } from '@/app/dashboard/ceo/components/submit-button';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';

const initialState: ProductFormState = { message: '', error: false };

interface ProductFormProps {
  product?: Product | null;
}

export function ProductForm({ product }: ProductFormProps) {
  const [state, formAction] = useFormState(saveProduct, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Only show toast for general (non-field) errors.
    // Field errors are displayed inline by the form.
    if (state.message && state.error && !state.fieldErrors) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
      <form ref={formRef} action={formAction}>
        {product && <input type="hidden" name="id" value={product.id} />}
        <Card>
          <CardHeader>
            <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
            <CardDescription>
              Fill out the details below to {product ? 'update the' : 'create a new'} product in your catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" name="name" placeholder="e.g., Cosmic Caramels" defaultValue={product?.name || ''} />
                {state.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Describe the product..." defaultValue={product?.description || ''} rows={4} />
                 {state.fieldErrors?.description && <p className="text-sm text-destructive">{state.fieldErrors.description[0]}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" placeholder="e.g., Edibles" defaultValue={product?.category || ''} />
                    {state.fieldErrors?.category && <p className="text-sm text-destructive">{state.fieldErrors.category[0]}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="price">Base Price</Label>
                    <Input id="price" name="price" type="number" step="0.01" placeholder="25.00" defaultValue={product?.price || ''} />
                    {state.fieldErrors?.price && <p className="text-sm text-destructive">{state.fieldErrors.price[0]}</p>}
                </div>
            </div>
             <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://example.com/image.png" defaultValue={product?.imageUrl || ''} />
                  {state.fieldErrors?.imageUrl && <p className="text-sm text-destructive">{state.fieldErrors.imageUrl[0]}</p>}
            </div>
             <div className="space-y-2">
                  <Label htmlFor="imageHint">Image Hint (for AI)</Label>
                  <Input id="imageHint" name="imageHint" placeholder="e.g., cannabis edible" defaultValue={product?.imageHint || ''} />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost" asChild>
                <Link href="/dashboard/products">Cancel</Link>
            </Button>
            <SubmitButton label={product ? 'Save Changes' : 'Create Product'} />
          </CardFooter>
        </Card>
      </form>
  );
}
