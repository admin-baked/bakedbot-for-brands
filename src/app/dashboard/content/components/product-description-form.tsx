
'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { DescriptionFormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Loader2, Upload, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import type { Product } from '@/firebase/converters';
import { defaultChatbotIcon } from '@/lib/data';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant='default'>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
      Generate Description
    </Button>
  );
}

interface ProductDescriptionFormProps {
    onContentUpdate: (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => void;
    formAction: (payload: FormData) => void;
    state: DescriptionFormState;
    products: Product[] | null;
    areProductsLoading: boolean;
}

export default function ProductDescriptionForm({ onContentUpdate, formAction, state, products, areProductsLoading }: ProductDescriptionFormProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [packagingImage, setPackagingImage] = useState<string>('');
  
  // Effect for handling description generation results
  useEffect(() => {
    if (state.message) {
      if (state.error) {
        if(!state.fieldErrors) { // Show toast only for general errors
          toast({ variant: 'destructive', title: 'Error', description: state.message });
        }
      } else if (state.data) {
        const newContent = { 
            ...state.data,
            imageUrl: state.data.imageUrl || packagingImage || '',
            productId: state.data.productId || selectedProductId 
        } as GenerateProductDescriptionOutput & { productId?: string };
        onContentUpdate(newContent);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setPackagingImage(dataUri);
        // Also update the display immediately
        onContentUpdate({
          productName: formRef.current?.productName.value || 'Packaging Preview',
          description: '',
          imageUrl: dataUri,
          productId: selectedProductId,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductSelect = (value: string) => {
    const productId = value === 'none' ? '' : value;
    setSelectedProductId(productId);
    const product = products?.find(p => p.id === productId);
    if (product && formRef.current) {
      (formRef.current.elements.namedItem('productName') as HTMLInputElement).value = product.name;
      (formRef.current.elements.namedItem('msrp') as HTMLInputElement).value = product.price.toFixed(2);
      (formRef.current.elements.namedItem('features') as HTMLTextAreaElement).value = product.description;
       setPackagingImage(product.imageUrl);
       onContentUpdate({ 
           productName: product.name, 
           description: '', 
           imageUrl: product.imageUrl,
           productId: product.id
        });
    } else if (productId === '') {
        if (formRef.current) {
            (formRef.current.elements.namedItem('productName') as HTMLInputElement).value = '';
            (formRef.current.elements.namedItem('msrp') as HTMLInputElement).value = '';
            (formRef.current.elements.namedItem('features') as HTMLTextAreaElement).value = '';
        }
        setPackagingImage('');
        onContentUpdate(null);
    }
  };

  return (
    <Card>
      <form ref={formRef} action={formAction}>
        <CardHeader>
          <CardTitle>Product Description</CardTitle>
          <CardDescription>Generate a compelling product description using AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <input type="hidden" name="logoDataUri" value={defaultChatbotIcon} />
           <input type="hidden" name="imageUrl" value={packagingImage || ''} />
           
          <div className="space-y-2">
            <Label htmlFor="product-select">Select a Product (Optional)</Label>
            <Select name="productId" value={selectedProductId || "none"} onValueChange={handleProductSelect} disabled={areProductsLoading}>
                <SelectTrigger id="product-select">
                    <SelectValue placeholder={areProductsLoading ? "Loading products..." : "Select a product to pre-fill & link"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {products?.map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Pre-fills the form and enables feedback on the generated content.</p>
          </div>

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
             <Textarea id="features" name="features" placeholder="e.g., Chewy, Full-spectrum, 10mg THC per piece." />
             {state.fieldErrors?.features && <p className="text-sm text-destructive">{state.fieldErrors.features[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <Input id="keywords" name="keywords" placeholder="e.g., caramel, edible, relaxing, indica" />
            {state.fieldErrors?.keywords && <p className="text-sm text-destructive">{state.fieldErrors.keywords[0]}</p>}
          </div>
           <div className="space-y-2">
                <Label>Product Packaging (Optional)</Label>
                <div className="flex items-center justify-center w-full">
                    <Label htmlFor="dropzone-file-desc" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                            {packagingImage ? (
                                <p className="font-semibold text-sm text-primary">Image selected</p>
                            ) : (
                                 <>
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">Provides visual context for the AI</p>
                                 </>
                            )}
                        </div>
                        <Input id="dropzone-file-desc" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                    </Label>
                </div>
            </div>
        </CardContent>
         <CardFooter>
            <SubmitButton />
         </CardFooter>
      </form>
    </Card>
  );
}
