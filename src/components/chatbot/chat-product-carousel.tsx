
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ThumbsUp, ThumbsDown, Leaf, Cookie, Cigarette, Wind, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { isRenderableProductImage, getCategoryIconColor } from '@/lib/utils/product-image';
import type { Product } from '@/types/domain';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  flower: Leaf,
  preroll: Cigarette,
  'pre-roll': Cigarette,
  prerolls: Cigarette,
  edible: Cookie,
  edibles: Cookie,
  vape: Wind,
  vapes: Wind,
  tincture: Droplet,
  tinctures: Droplet,
};

function getCategoryIcon(category?: string): React.ElementType {
  const key = (category ?? '').toLowerCase().replace(/[-_\s]/g, '');
  for (const [k, Icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(k.replace(/[-_]/g, ''))) return Icon;
  }
  return Leaf;
}

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
  const hasValidImage = !imageFailed && isRenderableProductImage(product.imageUrl);
  const CategoryIcon = getCategoryIcon(product.category);
  const iconColor = getCategoryIconColor(product.category);

  return (
    <div className="group relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
      {hasValidImage ? (
        <Image
          src={product.imageUrl!}
          alt={product.name}
          fill
          data-ai-hint={product.imageHint}
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/70">
          <CategoryIcon className={cn('h-14 w-14', iconColor)} />
        </div>
      )}
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
