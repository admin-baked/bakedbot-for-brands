
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { getSafeProductImageUrl, isRenderableProductImage } from '@/lib/utils/product-image';
import type { Product } from '@/types/domain';

const ChatProductCard = ({
  product,
  onAskSmokey,
  onFeedback,
}: {
  product: Product;
  onAskSmokey: (product: Product) => void;
  onFeedback: (productId: string, type: 'like' | 'dislike') => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasValidProductImage = !imageFailed && isRenderableProductImage(product.imageUrl);
  // Falls back to Smokey mascot when no valid product image is available
  const src = hasValidProductImage ? product.imageUrl! : getSafeProductImageUrl(undefined);

  return (
    <div className="group relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
      <Image
        src={src}
        alt={product.name}
        fill
        data-ai-hint={product.imageHint}
        className={cn(
          hasValidProductImage
            ? 'object-cover'
            : 'object-contain p-3 opacity-80'
        )}
        onError={() => setImageFailed(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white" onClick={() => onFeedback(product.id, 'like')}>
          <ThumbsUp className="h-4 w-4 text-green-400" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white" onClick={() => onFeedback(product.id, 'dislike')}>
          <ThumbsDown className="h-4 w-4 text-red-400" />
        </Button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2">
        <p className="text-xs font-bold text-white truncate">{product.name}</p>
        <Button size="sm" variant="secondary" className="mt-1 h-7 w-full text-xs" onClick={() => onAskSmokey(product)}>
          Ask Smokey
        </Button>
      </div>
    </div>
  );
};

const ChatProductCarousel = ({ products, onAskSmokey, isCompact, onFeedback }: { products: Product[], onAskSmokey: (product: Product) => void, isCompact: boolean, onFeedback: (productId: string, type: 'like' | 'dislike') => void }) => {
  if (products.length === 0) return null;

  return (
    <>
      {!isCompact && (
        <CardHeader>
            <CardTitle>Discover Products</CardTitle>
            <CardDescription>Browse our products and ask me anything.</CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn("p-4", isCompact ? "py-2" : "pt-0")}>
        <Carousel opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {products.map((product) => (
              <CarouselItem key={product.id} className={cn("pl-2", isCompact ? "basis-[58%] sm:basis-[40%]" : "basis-1/2")}>
                <ChatProductCard product={product} onAskSmokey={onAskSmokey} onFeedback={onFeedback} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </CardContent>
    </>
  );
};

export default ChatProductCarousel;
