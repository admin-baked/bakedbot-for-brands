
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { type GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { Button } from '@/components/ui/button';
import { Clipboard, ThumbsUp, ThumbsDown, Share2, ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useFormState } from 'react-dom';
import { useEffect } from 'react';
import { updateProductFeedback } from '@/app/products/[id]/actions';
import { useUser } from '@/firebase/auth/use-user';

interface ProductDescriptionDisplayProps {
  productDescription: (GenerateProductDescriptionOutput & { productId?: string }) | null;
  isImagePending?: boolean;
  isDescriptionPending?: boolean;
}

const initialFeedbackState = { message: '', error: false };


export default function ProductDescriptionDisplay({ productDescription, isImagePending, isDescriptionPending }: ProductDescriptionDisplayProps) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [feedbackState, submitFeedback, isFeedbackPending] = useFormState(updateProductFeedback, initialFeedbackState);


  useEffect(() => {
    if (feedbackState.message) {
      toast({
        title: feedbackState.error ? 'Error' : 'Success',
        description: feedbackState.message,
        variant: feedbackState.error ? 'destructive' : 'default',
      });
    }
  }, [feedbackState, toast]);

  const handleCopy = () => {
    if (productDescription?.description) {
      navigator.clipboard.writeText(productDescription.description);
      toast({
        title: 'Copied!',
        description: 'Product description copied to clipboard.',
      });
    }
  };

  const handleShare = async () => {
    if (!productDescription?.imageUrl) return;

    try {
        const response = await fetch(productDescription.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${productDescription.productName || 'social-image'}.png`, { type: blob.type });

        const shareData: ShareData = {
            title: `Check out ${productDescription.productName || 'this product'}!`,
            text: productDescription.description || `AI-generated social media post for ${productDescription.productName}.`,
            files: [file],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast({
                title: 'Shared!',
                description: 'Content shared successfully.',
            });
        } else {
             await navigator.clipboard.writeText(productDescription.imageUrl);
             toast({
                title: 'Image URL Copied!',
                description: 'Sharing is not supported on this browser, so the image URL was copied to your clipboard.',
             });
        }
    } catch (error) {
        console.error('Share error:', error);
        await navigator.clipboard.writeText(productDescription.imageUrl);
        toast({
            variant: 'destructive',
            title: 'Sharing Failed',
            description: 'Could not share the image. Its URL has been copied to your clipboard instead.',
        });
    }
  };

  const handleFeedback = (feedback: 'like' | 'dislike') => {
    if (!productDescription?.productId) {
      toast({
        variant: 'destructive',
        title: 'Cannot Submit Feedback',
        description: 'Please associate this content with a product to leave feedback.',
      });
      return;
    }
    if (!user) {
         toast({
            variant: 'destructive',
            title: 'Authentication Required',
            description: 'You must be logged in to provide feedback.',
         });
         return;
    }
    const formData = new FormData();
    formData.append('productId', productDescription.productId);
    formData.append('feedbackType', feedback);
    submitFeedback(formData);
  };
  
  const isGenerating = isDescriptionPending || isImagePending;
  const hasContent = productDescription && (productDescription.description || productDescription.imageUrl);

  return (
    <Card className="flex flex-col @container">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle>{productDescription?.productName ?? 'Generated Content'}</CardTitle>
            <CardDescription>Review the AI-generated content below.</CardDescription>
        </div>
        {hasContent && (
          <div className="flex items-center gap-2">
            {productDescription.msrp && <div className="text-lg font-bold text-primary">${productDescription.msrp}</div>}
            {productDescription.imageUrl && (
                <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share content">
                    <Share2 className="h-4 w-4" />
                </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy content" disabled={!productDescription.description}>
                <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {isGenerating ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4">Content generation in progress...</p>
            </div>
        ) : hasContent ? (
          <>
            {productDescription.imageUrl && (
                 <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                 <Image
                   src={productDescription.imageUrl}
                   alt={productDescription.productName || 'Generated Image'}
                   fill
                   className="object-cover"
                   data-ai-hint="social media post"
                 />
               </div>
            )}
            {productDescription.description && (
              <p className="text-sm leading-relaxed whitespace-pre-line">{productDescription.description}</p>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4">Your generated content will appear here. <br/> Fill out the form and click a "Generate" button to start.</p>
          </div>
        )}
      </CardContent>
        {hasContent && (
         <CardFooter className="border-t pt-4">
             <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Like" onClick={() => handleFeedback('like')} disabled={isFeedbackPending || isGenerating || !productDescription?.productId || isUserLoading}>
                        <ThumbsUp className="h-4 w-4 text-green-500"/>
                    </Button>
                    <Button variant="outline" size="icon" aria-label="Dislike" onClick={() => handleFeedback('dislike')} disabled={isFeedbackPending || isGenerating || !productDescription?.productId || isUserLoading}>
                        <ThumbsDown className="h-4 w-4 text-red-500"/>
                    </Button>
                </div>
             </div>
        </CardFooter>
        )}
    </Card>
  );
}
