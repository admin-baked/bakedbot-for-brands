
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { saveProduct, type ProductFormState } from '../actions';
import type { Product } from '@/types/domain';
import { SubmitButton } from '@/components/dashboard/ceo/components/submit-button';
import Link from 'next/link';

const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Product name must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  category: z.string().min(2, 'Category is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  imageUrl: z.string().url('Please enter a valid image URL.'),
  imageHint: z.string().optional(),
});

type ProductFormValues = z.infer<typeof ProductSchema>;

interface ProductFormProps {
  product?: Product | null;
}

const initialState: ProductFormState = { message: '', error: false };

export function ProductForm({ product }: ProductFormProps) {
  const [state, formAction] = useFormState(saveProduct, initialState);
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product || {
      name: '',
      description: '',
      category: '',
      price: 0,
      imageUrl: '',
      imageHint: '',
    },
  });

  useEffect(() => {
    if (state.message && state.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Form {...form}>
      <form action={formAction}>
        {product && <input type="hidden" name="id" value={product.id} />}
        <Card>
          <CardHeader>
            <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
            <CardDescription>
              Fill out the details below to {product ? 'update the' : 'create a new'} product in your catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cosmic Caramels" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the product..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Edibles" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Base Price</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="25.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost" asChild>
                <Link href="/dashboard/products">Cancel</Link>
            </Button>
            <SubmitButton label={product ? 'Save Changes' : 'Create Product'} />
          </CardFooter>
        </Card>
      </form>
    </Form>
  </change>
  <change>
    <file>src/app/dashboard/products/new/page.tsx</file>
    <content><![CDATA[
import { ProductForm } from "../components/product-form";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl">
        <ProductForm />
    </div>
  );
}
