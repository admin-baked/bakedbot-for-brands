'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createProductDescription } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import ProductDescriptionDisplay from './blog-post-display';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const initialState = {
  message: '',
  data: null,
  error: false,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Generate Description
    </Button>
  );
}

export default function ProductDescriptionForm() {
  const [state, formAction] = useFormState(createProductDescription, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [generatedPost, setGeneratedPost] = useState(initialState.data);

  useEffect(() => {
    if (state.message) {
      if (state.error && !state.fieldErrors) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: state.message,
        });
      }
    }
    if (!state.error && state.data) {
      setGeneratedPost(state.data);
      formRef.current?.reset();
    }
  }, [state, toast]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form action={formAction} ref={formRef}>
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Fill in the details below to generate a new product description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input id="productName" name="productName" placeholder="e.g., Cosmic Caramels" />
              {state.fieldErrors?.productName && <p className="text-sm text-destructive">{state.fieldErrors.productName[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Key Features</Label>
               <Textarea id="features" name="features" placeholder="e.g., Chewy, Full-spectrum, 10mg THC per piece" />
               {state.fieldErrors?.features && <p className="text-sm text-destructive">{state.fieldErrors.features[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input id="keywords" name="keywords" placeholder="e.g., caramel, edible, relaxing, indica" />
              {state.fieldErrors?.keywords && <p className="text-sm text-destructive">{state.fieldErrors.keywords[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandVoice">Brand Voice</Label>
              <Select name="brandVoice">
                  <SelectTrigger id="brandVoice">
                  <SelectValue placeholder="Select a brand voice" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="Playful">Playful</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Luxurious">Luxurious</SelectItem>
                  <SelectItem value="Adventurous">Adventurous</SelectItem>
                  </SelectContent>
              </Select>
              {state.fieldErrors?.brandVoice && <p className="text-sm text-destructive">{state.fieldErrors.brandVoice[0]}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </Card>
      </form>
      <ProductDescriptionDisplay productDescription={generatedPost} />
    </div>
  );
}
