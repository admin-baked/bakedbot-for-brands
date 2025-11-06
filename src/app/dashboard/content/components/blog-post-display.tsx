
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { Button } from '@/components/ui/button';
import { Clipboard, ThumbsUp, ThumbsDown, RotateCw, Image as ImageIcon, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useTransition } from 'react';
import { updateProductFeedback } from '@/lib/actions';

interface ProductDescriptionDisplayProps {
  productDescription: (GenerateProductDescriptionOutput & { productId?: string }) | null;
  onRegenerate: (type: 'description' | 'image') => void;
  isImagePending: boolean;
  isDescriptionPending: boolean;
}

export default function ProductDescriptionDisplay({ productDescription, onRegenerate, isImagePending, isDescriptionPending }: ProductDescriptionDisplayProps) {
  const { toast } = useToast();
  const [isFeedbackPending, startFeedbackTransition] = useTransition();

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
             // Fallback for browsers that don't support sharing files
             await navigator.clipboard.writeText(productDescription.imageUrl);
             toast({
                title: 'Image URL Copied!',
                description: 'Sharing is not supported on this browser, so the image URL was copied to your clipboard.',
             });
        }
    } catch (error) {
        console.error('Share error:', error);
        // Fallback for any other error
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
        description: 'Please generate content for a specific product first.',
      });
      return;
    }
    startFeedbackTransition(async () => {
      const result = await updateProductFeedback(productDescription.productId!, feedback);
      if (result.success) {
        toast({
          title: 'Feedback Submitted!',
          description: 'Thank you for your feedback.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  };

  return (
    <Card className="flex flex-col @container">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle>{productDescription?.productName ?? 'Generated Content'}</CardTitle>
            <CardDescription>Review the AI-generated content below.</CardDescription>
        </div>
        {productDescription && (
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
        {productDescription ? (
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
            {!productDescription.imageUrl && !productDescription.description && (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center text-muted-foreground">
                    <p>Content generation in progress...</p>
                </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4">Your generated content will appear here. <br/> Fill out the form and click a "Generate" button to start.</p>
          </div>
        )}
      </CardContent>
        {productDescription && (
         <CardContent className="border-t pt-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Like" onClick={() => handleFeedback('like')} disabled={isFeedbackPending}><ThumbsUp className="h-4 w-4 text-green-500"/></Button>
                    <Button variant="outline" size="icon" aria-label="Dislike" onClick={() => handleFeedback('dislike')} disabled={isFeedbackPending}><ThumbsDown className="h-4 w-4 text-red-500"/></Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Regenerate Description" onClick={() => onRegenerate('description')} disabled={isDescriptionPending || isImagePending}><RotateCw className="h-4 w-4"/></Button>
                </div>
             </div>
        </CardContent>
        )}
    </Card>
  );
}
