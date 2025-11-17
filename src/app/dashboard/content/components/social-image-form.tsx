
'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ImageFormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Wand2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { defaultChatbotIcon } from '@/lib/data';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant="outline">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
      Generate Image
    </Button>
  );
}

interface SocialImageFormProps {
    onContentUpdate: (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => void;
    formAction: (payload: FormData) => void;
    state: ImageFormState;
}

export default function SocialImageForm({ onContentUpdate, formAction, state }: SocialImageFormProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [packagingImage, setPackagingImage] = useState<string>('');

  useEffect(() => {
    if (state.message) {
      toast({
        variant: state.error ? 'destructive' : 'default',
        title: state.error ? 'Image Generation Error' : 'Success',
        description: state.message,
      });
    }
    if (!state.error && state.imageUrl) {
        onContentUpdate({
            productName: formRef.current?.productName.value || 'Generated Image',
            description: '',
            imageUrl: state.imageUrl,
        });
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
        onContentUpdate({
          productName: formRef.current?.productName.value || 'Packaging Preview',
          description: '',
          imageUrl: dataUri,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <form ref={formRef} action={formAction}>
        <CardHeader>
          <CardTitle>Social Media Image</CardTitle>
          <CardDescription>Generate a viral-ready image for your social media feed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <input type="hidden" name="logoDataUri" value={defaultChatbotIcon} />
           <input type="hidden" name="imageUrl" value={packagingImage || ''} />
           
            <div className="space-y-2">
                <Label htmlFor="socialProductName">Product/Post Title</Label>
                <Input id="socialProductName" name="productName" placeholder="e.g., ✨ Cosmic Caramels ✨" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="socialBrandVoice">Brand Voice</Label>
                <Select name="brandVoice">
                    <SelectTrigger id="socialBrandVoice">
                        <SelectValue placeholder="Select a brand voice" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Playful">Playful</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Luxurious">Luxurious</SelectItem>
                        <SelectItem value="Adventurous">Adventurous</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="socialFeatures">Visual Prompt</Label>
                <Textarea id="socialFeatures" name="features" placeholder="A detailed description of the image you want to create. E.g., 'A vibrant, otherworldly photo of a caramel edible floating in space, surrounded by sparkling stars and a nebula.'" />
            </div>

            <div className="space-y-2">
                <Label>Reference Packaging (Optional)</Label>
                <div className="flex items-center justify-center w-full">
                    <Label htmlFor="dropzone-file-img" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                            {packagingImage ? (
                                <p className="font-semibold text-sm text-primary">Image selected</p>
                            ) : (
                                 <>
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">The AI will use this as style inspiration</p>
                                 </>
                            )}
                        </div>
                        <Input id="dropzone-file-img" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
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
