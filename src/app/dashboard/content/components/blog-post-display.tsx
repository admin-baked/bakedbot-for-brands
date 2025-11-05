
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { Button } from '@/components/ui/button';
import { Clipboard, ThumbsUp, ThumbsDown, RotateCw, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ProductDescriptionDisplayProps {
  productDescription: GenerateProductDescriptionOutput | null;
}

export default function ProductDescriptionDisplay({ productDescription }: ProductDescriptionDisplayProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (productDescription?.description) {
      navigator.clipboard.writeText(productDescription.description);
      toast({
        title: 'Copied!',
        description: 'Product description copied to clipboard.',
      });
    }
  };

  return (
    <Card className="flex flex-col @container">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle>{productDescription?.productName ?? 'Generated Description'}</CardTitle>
            <CardDescription>Review the AI-generated content below.</CardDescription>
        </div>
        {productDescription && (
          <div className="flex items-center gap-2">
            {productDescription.msrp && <div className="text-lg font-bold text-primary">${productDescription.msrp}</div>}
            <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy content">
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
                   alt={productDescription.productName}
                   fill
                   className="object-cover"
                   data-ai-hint="product package"
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
            <p className="mt-4">Your generated product description will appear here. <br/> Fill out the form and click "Generate Description" to start.</p>
          </div>
        )}
      </CardContent>
        {productDescription && (
         <CardContent className="border-t pt-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Like"><ThumbsUp className="h-4 w-4 text-green-500"/></Button>
                    <Button variant="outline" size="icon" aria-label="Dislike"><ThumbsDown className="h-4 w-4 text-red-500"/></Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Regenerate"><RotateCw className="h-4 w-4"/></Button>
                </div>
             </div>
        </CardContent>
        )}
    </Card>
  );
}
