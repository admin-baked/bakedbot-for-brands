
'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { DescriptionFormState, ImageFormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Loader2, Upload, Wand2, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import type { Product } from '@/lib/types';
import { defaultChatbotIcon } from '@/lib/data';


interface SubmitButtonProps {
  formAction: (payload: FormData) => void;
  type: 'description' | 'image';
}

function SubmitButton({ formAction, type }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" formAction={formAction} disabled={pending} className="w-full sm:w-auto" variant={type === 'description' ? 'default' : 'outline'}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (type === 'description' ? <FileText className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />)}
      {type === 'description' ? 'Generate Description' : 'Generate Image'}
    </Button>
  );
}

interface ProductDescriptionFormProps {
    onContentUpdate: (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => void;
    descriptionFormAction: (payload: FormData) => void;
    imageFormAction: (payload: FormData) => void;
    descriptionState: DescriptionFormState;
    imageState: ImageFormState;
    products: Product[] | null;
    areProductsLoading: boolean;
}

export default function ProductDescriptionForm({ onContentUpdate, descriptionFormAction, imageFormAction, descriptionState, imageState, products, areProductsLoading }: ProductDescriptionFormProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [localGeneratedContent, setLocalGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  const [packagingImage, setPackagingImage] = useState<string>('');
  
  // Effect for handling description generation results
  useEffect(() => {
    if (descriptionState.message) {
      if (descriptionState.error) {
        if(!descriptionState.fieldErrors) { // Show toast only for general errors
          toast({ variant: 'destructive', title: 'Error', description: descriptionState.message });
        }
      } else if (descriptionState.data) {
        const newContent = { 
            ...descriptionState.data,
            imageUrl: descriptionState.data.imageUrl || localGeneratedContent?.imageUrl || '',
            productId: selectedProductId 
        } as GenerateProductDescriptionOutput & { productId?: string };
        setLocalGeneratedContent(newContent);
        onContentUpdate(newContent);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptionState]);

  // Effect for handling image generation results
  useEffect(() => {
    if (imageState.message) {
      toast({
        variant: imageState.error ? 'destructive' : 'default',
        title: imageState.error ? 'Image Generation Error' : 'Success',
        description: imageState.message,
      });
    }
    if (!imageState.error && imageState.imageUrl) {
        const productName = formRef.current?.productName.value || localGeneratedContent?.productName || 'Generated Image';
        const newContent = {
            ...(localGeneratedContent ?? { productName: '', description: '' }),
            productName: productName,
            imageUrl: imageState.imageUrl,
            productId: selectedProductId
        } as GenerateProductDescriptionOutput & { productId?: string };
        setLocalGeneratedContent(newContent);
        onContentUpdate(newContent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageState]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setPackagingImage(dataUri);
        // Also update the display immediately
        const newContent = {
            ...(localGeneratedContent ?? { productName: '', description: '' }),
            productName: formRef.current?.productName.value || localGeneratedContent?.productName || 'Packaging Preview',
            imageUrl: dataUri,
            productId: selectedProductId
        } as GenerateProductDescriptionOutput & { productId?: string };
        setLocalGeneratedContent(newContent);
        onContentUpdate(newContent);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <form ref={formRef}>
        <CardHeader>
          <CardTitle>Product Content Generator</CardTitle>
          <CardDescription>Fill in the details below to generate content. The same details will be used for both image and text generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <input type="hidden" name="logoDataUri" value={defaultChatbotIcon} />
           <input type="hidden" name="imageUrl" value={packagingImage || ''} />
           
          <div className="space-y-2">
            <Label htmlFor="product-select">Select a Product (Optional)</Label>
            <Select name="productId" value={selectedProductId || "none"} onValueChange={(value) => setSelectedProductId(value === 'none' ? '' : value)} disabled={areProductsLoading}>
                <SelectTrigger id="product-select">
                    <SelectValue placeholder={areProductsLoading ? "Loading products..." : "Select a product to associate feedback"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {products?.map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Associating a product enables the like/dislike feedback buttons on the display card.</p>
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
                        <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                    </Label>
                </div>
            </div>
        </CardContent>
         <CardFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={(e) => { e.preventDefault(); descriptionFormAction(new FormData(formRef.current!)); }}>
                <FileText className="mr-2 h-4 w-4" /> Generate Description
            </Button>
            <Button onClick={(e) => { e.preventDefault(); imageFormAction(new FormData(formRef.current!)); }} variant="outline">
                <Wand2 className="mr-2 h-4 w-4" /> Generate Image
            </Button>
         </CardFooter>
      </form>
    </Card>
  );
}
