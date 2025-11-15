
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Bot, Share2, ThumbsDown, ThumbsUp, ChevronDown, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Product } from '@/firebase/converters';
import { useToast } from '@/hooks/use-toast';

type Message = {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    productSuggestions?: (Product & { reasoning: string })[];
    imageUrl?: string;
};

const ExpandableProductCard = ({ product, onAskSmokey, isExpanded, onExpand, onFeedback }: { product: Product & { reasoning: string }, onAskSmokey: (p: Product) => void, isExpanded: boolean, onExpand: (p: Product & { reasoning: string }) => void, onFeedback: (productId: string, type: 'like' | 'dislike') => void }) => {
    const handleFeedbackClick = (e: React.MouseEvent, type: 'like' | 'dislike') => {
        e.stopPropagation();
        onFeedback(product.id, type);
    };
    
    if (isExpanded) {
        return (
            <div className="w-full rounded-md border bg-background p-2 text-foreground cursor-pointer" onClick={() => onExpand(product)}>
                <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                        <Image src={product.imageUrl} alt={product.name} data-ai-hint={product.imageHint} fill className="object-cover"/>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">${product.price.toFixed(2)}</p>
                        <div className="flex gap-1 mt-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => handleFeedbackClick(e, 'like')}><ThumbsUp className="h-3 w-3 text-green-500" /></Button>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => handleFeedbackClick(e, 'dislike')}><ThumbsDown className="h-3 w-3 text-red-500" /></Button>
                        </div>
                    </div>
                </div>
                 <p className="text-xs text-muted-foreground mt-2 p-1">{product.reasoning}</p>
                 <Button size="sm" className="w-full h-8 mt-1" onClick={(e) => { e.stopPropagation(); onAskSmokey(product); }}>Ask Smokey</Button>
            </div>
        )
    }

    return (
        <div className="w-full flex items-center gap-2 rounded-md border bg-background p-2 text-foreground cursor-pointer hover:bg-muted" onClick={() => onExpand(product)}>
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                <Image src={product.imageUrl} alt={product.name} data-ai-hint={product.imageHint} fill className="object-cover"/>
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
            </div>
             <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
    )
};


const ChatMessages = ({ messages, isBotTyping, messagesEndRef, onAskSmokey, className, onFeedback }: { messages: Message[], isBotTyping: boolean, messagesEndRef: React.RefObject<HTMLDivElement>, onAskSmokey: (p: Product) => void, className?: string, onFeedback: (productId: string, type: 'like' | 'dislike') => void}) => {
    const { toast } = useToast();
    const [expandedProduct, setExpandedProduct] = useState<(Product & { reasoning: string }) | null>(null);

    const handleShare = async (message: Message) => {
        if (!message.imageUrl) return;
    
        try {
            const response = await fetch(message.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `brand-image.png`, { type: blob.type });
    
            const shareData: ShareData = {
                title: `Check out this AI-generated brand image!`,
                text: message.text || `Created with BakedBot AI`,
                files: [file],
            };
    
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                 await navigator.clipboard.writeText(message.imageUrl);
                 toast({
                    title: 'Image URL Copied!',
                    description: 'Sharing is not supported, so the image URL was copied to your clipboard.',
                 });
            }
        } catch (error) {
            await navigator.clipboard.writeText(message.imageUrl);
            toast({
                variant: 'destructive',
                title: 'Sharing Failed',
                description: 'Could not share the image. Its URL has been copied to your clipboard instead.',
            });
        }
    };

    const handleExpand = (product: Product & { reasoning: string }) => {
        if (expandedProduct?.id === product.id) {
            setExpandedProduct(null);
        } else {
            setExpandedProduct(product);
        }
    }


    return (
        <ScrollArea className={className}>
            <div className="space-y-4 p-4">
                {messages.map((message) => (
                <div key={message.id} className={cn("flex items-start gap-3", message.sender === 'user' ? 'justify-end' : '')}>
                    {message.sender === 'bot' && (
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot />
                        </AvatarFallback>
                    </Avatar>
                    )}
                    <div className={cn(
                        "flex flex-col gap-2 max-w-[85%] rounded-lg px-3 py-2", 
                        message.sender === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-br-none' 
                            : 'bg-muted rounded-bl-none'
                    )}>
                    {message.text && (
                      <p className="text-sm whitespace-pre-line">{message.text}</p>
                    )}
                    {message.imageUrl && (
                        <div className="mt-2 space-y-2">
                            <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-lg border">
                                <Image src={message.imageUrl} alt="Generated brand image" fill className="object-cover" data-ai-hint="brand social media" />
                            </div>
                            <Button size="sm" variant="outline" className="w-full" onClick={() => handleShare(message)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share Image
                            </Button>
                        </div>
                    )}
                    {message.productSuggestions && (
                        <div className="mt-2 flex flex-col gap-2">
                            {message.productSuggestions.slice(0, 3).map(p => (
                                <ExpandableProductCard 
                                    key={p.id}
                                    product={p}
                                    onAskSmokey={onAskSmokey}
                                    isExpanded={expandedProduct?.id === p.id}
                                    onExpand={handleExpand}
                                    onFeedback={onFeedback}
                                />
                            ))}
                        </div>
                    )}
                    </div>
                    {message.sender === 'user' && (
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    )}
                </div>
                ))}
                {isBotTyping && (
                    <div className="flex items-end gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                <Bot />
                            </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 rounded-bl-none">
                            <div className="flex items-center justify-center gap-1.5 h-5">
                                <Sparkles className="h-4 w-4 animate-wiggle text-primary [animation-delay:-0.4s]" />
                                <Sparkles className="h-4 w-4 animate-wiggle text-foreground [animation-delay:-0.2s]" />
                                <Sparkles className="h-4 w-4 animate-wiggle text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
)};

export default ChatMessages;
