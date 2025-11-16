
'use client';

import Image from 'next/image';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/domain';

const ChatProductCarousel = ({ products, onAskSmokey, isCompact, onFeedback }: { products: Product[], onAskSmokey: (product: Product) => void, isCompact: boolean, onFeedback: (productId: string, type: 'like' | 'dislike') => void }) => (
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
            {products.map((p, index) => (
              <CarouselItem key={index} className={cn("pl-2", isCompact ? "basis-1/3" : "basis-1/2")}>
                <div className="group relative w-full h-full rounded-lg overflow-hidden border">
                    <Image src={p.imageUrl} alt={p.name} width={200} height={200} data-ai-hint={p.imageHint} className="object-cover w-full h-full aspect-square" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white" onClick={() => onFeedback(p.id, 'like')}>
                            <ThumbsUp className="h-4 w-4 text-green-400" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white" onClick={() => onFeedback(p.id, 'dislike')}>
                            <ThumbsDown className="h-4 w-4 text-red-400" />
                        </Button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-xs font-bold text-white truncate">{p.name}</p>
                        <Button size="sm" variant="secondary" className="w-full h-7 mt-1 text-xs" onClick={() => onAskSmokey(p)}>
                            Ask Smokey
                        </Button>
                    </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </CardContent>
    </>
);

export default ChatProductCarousel;

    