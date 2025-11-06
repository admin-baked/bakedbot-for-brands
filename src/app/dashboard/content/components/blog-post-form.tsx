'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createProductDescription, createSocialMediaImage } from '../actions';
import type { DescriptionFormState, ImageFormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductDescriptionDisplay from './blog-post-display';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Loader2, Upload, Wand2, FileText, Package } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { useStore } from '@/hooks/use-store';
import { products } from '@/lib/data';

const initialDescriptionState: DescriptionFormState = {
  message: '',
  data: null,
  error: false,
  fieldErrors: {},
};

const initialImageState: ImageFormState = {
  message: '',
  imageUrl: null,
  error: false,
};

function SubmitButton({ action, type }: { action: (formData: FormData) => void, type: 'description' | 'image' }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" formAction={action} disabled={pending} className="w-full sm:w-auto" variant={type === 'description' ? 'default' : 'outline'}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (type === 'description' ? <FileText className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />)}
      {type === 'description' ? 'Generate Description' : 'Generate Image'}
    </Button>
  );
}

export default function ProductDescriptionForm() {
  const [descriptionState, descriptionFormAction, isDescriptionPending] = useActionState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction, isImagePending] = useActionState(createSocialMediaImage, initialImageState);
  
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  const { chatbotIcon, isDemoMode } = useStore();
  const logoToUse = isDemoMode ? "https://bakedbot.ai/wp-content/uploads/2024/03/Bakedbot-2024-horizontal-logo-PNG-transparent.png" : chatbotIcon;


  useEffect(() => {
    if (descriptionState.message && !isDescriptionPending) {
      if (descriptionState.error && !descriptionState.fieldErrors) {
        toast({ variant: 'destructive', title: 'Error', description: descriptionState.message });
      }
    }
    if (!descriptionState.error && descriptionState.data) {
        setGeneratedContent(prev => ({...(prev ?? {}), ...descriptionState.data, productId: selectedProductId } as GenerateProductDescriptionOutput & { productId?: string }));
    }
  }, [descriptionState, isDescriptionPending, toast, selectedProductId]);

  useEffect(() => {
    if (imageState.message && !isImagePending) {
      toast({
        variant: imageState.error ? 'destructive' : 'default',
        title: imageState.error ? 'Image Generation Error' : 'Success',
        description: imageState.message,
      });
    }
    if (!imageState.error && imageState.imageUrl) {
        setGeneratedContent(prev => ({
            ...(prev ?? { productName: '', description: '' }),
            productName: prev?.productName || formRef.current?.productName.value || 'Generated Image',
            imageUrl: imageState.imageUrl,
            productId: selectedProductId
        } as GenerateProductDescriptionOutput & { productId?: string }));
    }
  }, [imageState, isImagePending, toast, selectedProductId]);
  
  const handleRegenerate = (type: 'description' | 'image') => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    
    // Add hidden values to the FormData for the actions
    if (logoToUse) {
        formData.append('logoDataUri', logoToUse);
    }
     if (generatedContent?.imageUrl) {
        formData.append('imageUrl', generatedContent.imageUrl);
    }
    formData.append('productId', selectedProductId);

    if (type === 'image') {
        imageFormAction(formData);
    } else {
        descriptionFormAction(formData);
    }
  };
  
  const handleFormAction = (e: React.MouseEvent<HTMLButtonElement>, type: 'description' | 'image') => {
      e.preventDefault();
      if (formRef.current) {
        const formData = new FormData(formRef.current);
        if (type === 'description') {
            descriptionFormAction(formData);
        } else {
            imageFormAction(formData);
        }
      }
  }

  return (
    <div className="grid grid-cols-1 gap-8 @container">
      <div className="flex flex-col gap-8">
        <Card>
          <form ref={formRef}>
            <CardHeader>
              <CardTitle>Product Content Generator</CardTitle>
              <CardDescription>Fill in the details below to generate content. The same details will be used for both image and text generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <input type="hidden" name="logoDataUri" value={logoToUse || ''} />
               <input type="hidden" name="imageUrl" value={generatedContent?.imageUrl || ''} />
               
              <div className="space-y-2">
                <Label htmlFor="product-select">Select a Product (Optional)</Label>
                <Select name="productId" value={selectedProductId || "none"} onValueChange={(value) => setSelectedProductId(value === 'none' ? '' : value)}>
                    <SelectTrigger id="product-select">
                        <SelectValue placeholder="Select a product to associate feedback" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Associating a product enables the like/dislike feedback buttons.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input id="productName" name="productName" placeholder="e.g., Cosmic Caramels" />
                {descriptionState.fieldErrors?.productName && <p className="text-sm text-destructive">{descriptionState.fieldErrors.productName[0]}</p>}
              </div>
              <div className="grid grid-cols-1 gap-6 @[25rem]:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="msrp">MSRP</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="msrp" name="msrp" placeholder="25.00" className="pl-8" />
                  </div>
                  {descriptionState.fieldErrors?.msrp && <p className="text-sm text-destructive">{descriptionState.fieldErrors.msrp[0]}</p>}
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
                  {descriptionState.fieldErrors?.brandVoice && <p className="text-sm text-destructive">{descriptionState.fieldErrors.brandVoice[0]}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Key Features / Prompt</Label>
                 <Textarea id="features" name="features" placeholder="e.g., Chewy, Full-spectrum, 10mg THC per piece. Use these details to guide both text and image generation." />
                 {descriptionState.fieldErrors?.features && <p className="text-sm text-destructive">{descriptionState.fieldErrors.features[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input id="keywords" name="keywords" placeholder="e.g., caramel, edible, relaxing, indica" />
                {descriptionState.fieldErrors?.keywords && <p className="text-sm text-destructive">{descriptionState.fieldErrors.keywords[0]}</p>}
              </div>
               <div className="space-y-2">
                    <Label>Product Packaging</Label>
                    <div className="flex items-center justify-center w-full">
                        <Label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">SVG, PNG, JPG (Optional, to guide image generation)</p>
                            </div>
                            <Input id="dropzone-file" type="file" className="hidden" />
                        </Label>
                    </div>
                </div>
            </CardContent>
             <CardFooter className="flex-col sm:flex-row gap-2">
                <SubmitButton action={descriptionFormAction} type="description" />
                <SubmitButton action={imageFormAction} type="image" />
             </CardFooter>
          </form>
        </Card>
        <ProductDescriptionDisplay 
            productDescription={generatedContent}
            onRegenerate={handleRegenerate}
            isImagePending={isImagePending}
            isDescriptionPending={isDescriptionPending}
        />
      </div>
    </div>
  );
}
