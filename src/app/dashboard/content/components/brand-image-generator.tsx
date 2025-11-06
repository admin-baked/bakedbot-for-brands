'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wand2, Loader2, Sparkles, Download, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/use-store';
import Image from 'next/image';
import { createSocialMediaImage } from '../actions';
import type { ImageFormState } from '../actions';

const initialImageState: ImageFormState = {
  message: '',
  imageUrl: null,
  error: false,
};

export default function BrandImageGenerator({ onImageGenerated }: { onImageGenerated: (imageUrl: string | null) => void; }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { chatbotIcon, brandImageGenerations, lastBrandImageGeneration, recordBrandImageGeneration } = useStore();

  const canGenerate = () => {
    if (!lastBrandImageGeneration) return true;
    const today = new Date().toDateString();
    const lastGenerationDate = new Date(lastBrandImageGeneration).toDateString();
    return today !== lastGenerationDate || brandImageGenerations < 3;
  };

  const remainingGenerations = () => {
    if (!lastBrandImageGeneration) return 3;
    const today = new Date().toDateString();
    const lastGenerationDate = new Date(lastBrandImageGeneration).toDateString();
    if (today !== lastGenerationDate) return 3;
    return 3 - brandImageGenerations;
  }

  const handleGenerateClick = async () => {
    if (!prompt) {
      toast({
        variant: 'destructive',
        title: 'Prompt is empty',
        description: 'Please tell us what you love about the brand.',
      });
      return;
    }

    if (!chatbotIcon) {
        toast({
            variant: 'destructive',
            title: 'Brand Logo Missing',
            description: 'Please upload a brand logo in the settings page first.',
        });
        return;
    }

    if (!canGenerate()) {
        toast({
            variant: 'destructive',
            title: 'Daily Limit Reached',
            description: 'You have used all your generations for today. Please try again tomorrow.',
        });
        return;
    }

    setGeneratedImage(null);
    onImageGenerated(null);


    const formData = new FormData();
    formData.append('productName', 'Brand Image');
    // We use the 'features' field to pass the freeform prompt
    formData.append('features', prompt); 
    formData.append('brandVoice', 'Creative');
    formData.append('logoDataUri', chatbotIcon);

    startTransition(async () => {
      const result = await createSocialMediaImage(initialImageState, formData);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Image Generation Failed',
          description: result.message,
        });
        onImageGenerated(null);
      } else if (result.imageUrl) {
        setGeneratedImage(result.imageUrl);
        onImageGenerated(result.imageUrl);
        recordBrandImageGeneration();
        toast({
          title: 'Image Generated!',
          description: 'Your new brand image is ready.',
        });
      }
    });
  };

  const handleDownload = () => {
    if (generatedImage) {
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `brand-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Magic Brand Image</CardTitle>
                    <CardDescription>Instantly generate unique, shareable images for your brand.</CardDescription>
                </div>
                 <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-10 w-10 shrink-0">
                                        <Wand2 className="h-5 w-5 text-primary" />
                                    </Button>
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Generate an image for your favorite brand</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create a Magic Brand Image</DialogTitle>
                            <DialogDescription>
                                Tell us what you love about the brand, and our AI will generate a unique image. 
                                You have {remainingGenerations()} generation{remainingGenerations() !== 1 ? 's' : ''} left today.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Textarea
                                id="brand-prompt"
                                placeholder="e.g., 'A vibrant and natural feel, focused on wellness and community.'"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="col-span-3"
                                rows={4}
                            />
                            {generatedImage ? (
                                <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                                    <Image src={generatedImage} alt="Generated brand image" fill className="object-cover" data-ai-hint="brand social media" />
                                </div>
                            ) : isPending ? (
                                <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed bg-muted/50">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center">
                                    <Sparkles className="h-10 w-10 text-muted-foreground/50" />
                                    <p className="mt-4 text-sm text-muted-foreground">Your generated image will appear here.</p>
                                </div>
                            )}

                             {!chatbotIcon && (
                                <div className="flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700">
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                    <span>Please upload a brand logo in Settings to use the watermark feature.</span>
                                </div>
                             )}

                        </div>
                        <DialogFooter className='gap-2 sm:gap-0'>
                            {generatedImage && (
                                 <Button variant="outline" onClick={handleDownload}>
                                    <Download className="mr-2" /> Download
                                </Button>
                            )}
                            <Button onClick={handleGenerateClick} disabled={isPending || !canGenerate() || !chatbotIcon}>
                                {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                Generate Image
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex h-full min-h-[150px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-6 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">Click the magic wand to begin generating a unique image that captures your brand's essence.</p>
            </div>
        </CardContent>
    </Card>
  );
}
