'use client';

import { useActionState, useFormStatus } from 'react-dom';
import { createProductDescription } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import ProductDescriptionDisplay from './blog-post-display';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Loader2, Upload } from 'lucide-react';
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
  const [state, formAction] = useActionState(createProductDescription, initialState);
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
    <div className="grid grid-cols-1 gap-8 @container lg:grid-cols-2">
      <div className="flex flex-col gap-8">
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
              <div className="grid grid-cols-1 gap-6 @[25rem]:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="msrp">MSRP</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="msrp" name="msrp" placeholder="25.00" className="pl-8" />
                  </div>
                  {state.fieldErrors?.msrp && <p className="text-sm text-destructive">{state.fieldErrors.msrp[0]}</p>}
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
            </CardContent>
          </Card>
        </form>

        <Card>
            <CardHeader>
                <CardTitle>Product Image</CardTitle>
                <CardDescription>Upload product packaging or generate a new image with AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-center w-full">
                    <Label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                        </div>
                        <Input id="dropzone-file" type="file" className="hidden" />
                    </Label>
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" className="w-full sm:w-auto">Generate Image</Button>
            </CardFooter>
        </Card>
        
        <div className="lg:hidden">
            <SubmitButton />
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <ProductDescriptionDisplay productDescription={generatedPost} />
        <div className="hidden lg:block">
          <SubmitButton />
        </div>
      </div>
    </div>
  );
}
