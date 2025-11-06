
'use client';

import { useState, useRef, useEffect, type FormEvent, useTransition, useActionState } from 'react';
import Image from 'next/image';
import { Bot, MessageSquare, Send, X, ShoppingCart, Minus, Plus, ThumbsUp, ThumbsDown, ChevronDown, Wand2, Sparkles, Loader2, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { products, type Product } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import type { CartItem } from '@/lib/types';
import { useStore } from '@/hooks/use-store';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { recommendProducts, type RecommendProductsOutput } from '@/ai/ai-powered-product-recommendations';
import { summarizeReviews } from '@/ai/flows/summarize-reviews';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { createSocialMediaImage } from '@/app/dashboard/content/actions';
import type { ImageFormState } from '@/app/dashboard/content/actions';
import { useToast } from '@/hooks/use-toast';
import { updateProductFeedback } from '@/lib/actions';


type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  productSuggestions?: Product[];
  imageUrl?: string;
};

const initialImageState: ImageFormState = {
    message: '',
    imageUrl: null,
    error: false,
};

type OnboardingStep = 'mood' | 'experience' | 'social' | 'completed';
type OnboardingAnswers = {
    mood: string | null;
    experience: string | null;
    social: string | null;
};

const moods = [ "Relax / Chill", "Sleep / Calm", "Creative Flow", "Social / Talkative", "Pain Relief", "Focus / Productivity", "Energy / Motivation", ];

const OnboardingFlow = ({ onComplete }: { onComplete: (answers: OnboardingAnswers) => void }) => {
    const [step, setStep] = useState<OnboardingStep>('mood');
    const [answers, setAnswers] = useState<OnboardingAnswers>({ mood: null, experience: null, social: null });

    const selectAnswer = (type: keyof OnboardingAnswers, value: string) => {
        const newAnswers = { ...answers, [type]: value };
        setAnswers(newAnswers);

        if (type === 'mood') {
            setStep('experience');
        } else if (type === 'experience') {
            setStep('social');
        } else if (type === 'social') {
            setStep('completed');
            onComplete(newAnswers);
        }
    };

    return (
        <div className="p-4 text-center h-full flex flex-col justify-center">
            {step === 'mood' && (
                <>
                    <h2 className="text-lg font-semibold">Welcome to your virtual budtender 🌿</h2>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">How would you like to feel today?</p>
                    <div className="grid grid-cols-2 gap-2">
                        {moods.map(mood => (
                            <Button key={mood} variant="outline" onClick={() => selectAnswer('mood', mood)}>{mood}</Button>
                        ))}
                    </div>
                </>
            )}
            {step === 'experience' && (
                 <>
                    <h2 className="text-lg font-semibold">Nice choice! 🌈</h2>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">How experienced are you with cannabis?</p>
                    <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" onClick={() => selectAnswer('experience', 'Beginner')}>Beginner</Button>
                        <Button variant="outline" onClick={() => selectAnswer('experience', 'Occasional')}>Occasional</Button>
                        <Button variant="outline" onClick={() => selectAnswer('experience', 'Regular')}>Regular</Button>
                    </div>
                </>
            )}
             {step === 'social' && (
                 <>
                    <h2 className="text-lg font-semibold">One last thing! 👯‍♂️</h2>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">Are you planning to enjoy this solo or with others?</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => selectAnswer('social', 'Solo')}>Solo</Button>
                        <Button variant="outline" onClick={() => selectAnswer('social', 'With Friends')}>With Friends</Button>
                    </div>
                </>
            )}
        </div>
    );
};


const ProductCarousel = ({ onAskSmokey, isCompact, onFeedback }: { onAskSmokey: (product: Product) => void, isCompact: boolean, onFeedback: (productId: string, type: 'like' | 'dislike') => void }) => (
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

const ExpandableProductCard = ({ product, onAskSmokey, isExpanded, onExpand, onFeedback }: { product: Product, onAskSmokey: (p: Product) => void, isExpanded: boolean, onExpand: (p: Product) => void, onFeedback: (productId: string, type: 'like' | 'dislike') => void }) => {
    const handleFeedbackClick = (e: React.MouseEvent, type: 'like' | 'dislike') => {
        e.stopPropagation();
        onFeedback(product.id, type);
    };
    
    if (isExpanded) {
        return (
            <div className="flex-shrink-0 w-48 flex flex-col gap-2 rounded-md border bg-background p-2 text-foreground cursor-pointer" onClick={() => onExpand(product)}>
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-md">
                    <Image src={product.imageUrl} alt={product.name} data-ai-hint={product.imageHint} fill className="object-cover"/>
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">${product.price.toFixed(2)}</p>
                </div>
                <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7 flex-1" onClick={(e) => handleFeedbackClick(e, 'like')}><ThumbsUp className="h-4 w-4 text-green-500" /></Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 flex-1" onClick={(e) => handleFeedbackClick(e, 'dislike')}><ThumbsDown className="h-4 w-4 text-red-500" /></Button>
                </div>
                 <Button size="sm" className="w-full h-8" onClick={(e) => { e.stopPropagation(); onAskSmokey(product); }}>Ask Smokey</Button>
            </div>
        )
    }

    return (
        <div className="flex-shrink-0 w-48 flex items-center gap-2 rounded-md border bg-background p-2 text-foreground cursor-pointer hover:bg-muted" onClick={() => onExpand(product)}>
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                <Image src={product.imageUrl} alt={product.name} data-ai-hint={product.imageHint} fill className="object-cover"/>
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
            </div>
            <div className="flex flex-col gap-1">
                <Button variant="outline" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => handleFeedbackClick(e, 'like')}><ThumbsUp className="h-3 w-3 text-green-500" /></Button>
                <Button variant="outline" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => handleFeedbackClick(e, 'dislike')}><ThumbsDown className="h-3 w-3 text-red-500" /></Button>
            </div>
        </div>
    )
};


const ChatMessages = ({ messages, isBotTyping, messagesEndRef, onAskSmokey, className, onFeedback }: { messages: Message[], isBotTyping: boolean, messagesEndRef: React.RefObject<HTMLDivElement>, onAskSmokey: (p: Product) => void, className?: string, onFeedback: (productId: string, type: 'like' | 'dislike') => void}) => {
    const { toast } = useToast();
    const [expandedProduct, setExpandedProduct] = useState<Product | null>(null);

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
                        "max-w-[85%] rounded-lg px-3 py-2", 
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
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                            {message.productSuggestions.slice(0, 3).map(p => (
                                <ExpandableProductCard 
                                    key={p.id}
                                    product={p}
                                    onAskSmokey={onAskSmokey}
                                    isExpanded={expandedProduct?.id === p.id}
                                    onExpand={setExpandedProduct}
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

const ChatWindow = ({
  chatExperience,
  onAskSmokey,
  hasStartedChat,
  messages,
  isBotTyping,
  messagesEndRef,
  handleSendMessage,
  inputValue,
  setInputValue,
  onMagicImageClick,
  chatMode,
  onFeedback,
  onOnboardingComplete
}: {
  chatExperience: 'default' | 'classic';
  onAskSmokey: (product: Product) => void;
  hasStartedChat: boolean;
  messages: Message[];
  isBotTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleSendMessage: (e: FormEvent) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  onMagicImageClick: () => void;
  chatMode: 'chat' | 'image';
  onFeedback: (productId: string, type: 'like' | 'dislike') => void;
  onOnboardingComplete: (answers: OnboardingAnswers) => void;
}) => {
  return (
    <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-lg shadow-2xl bg-card border animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
      <Card className="flex h-[75vh] max-h-[700px] flex-col border-0">
        
        {hasStartedChat ? (
             <>
                {chatExperience === 'default' && <ProductCarousel onAskSmokey={onAskSmokey} isCompact={true} onFeedback={onFeedback} />}
                <div className="flex-1 min-h-0 border-t">
                    <ChatMessages
                        messages={messages}
                        isBotTyping={isBotTyping}
                        messagesEndRef={messagesEndRef}
                        onAskSmokey={onAskSmokey}
                        className="h-full"
                        onFeedback={onFeedback}
                    />
                </div>
             </>
        ) : (
            <OnboardingFlow onComplete={onOnboardingComplete} />
        )}
      
      {hasStartedChat && (
        <CardFooter className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" onClick={onMagicImageClick} disabled={isBotTyping}>
                                <Wand2 className={cn("h-5 w-5", chatMode === 'image' ? "text-primary" : "")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Generate a brand image</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={chatMode === 'image' ? "What do you love about the brand?" : 'Type a message...'}
                className="flex-1"
                autoComplete="off"
                disabled={isBotTyping}
            />
            <Button type="submit" size="icon" disabled={isBotTyping || inputValue.trim() === ''}>
                {chatMode === 'image' ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
            </form>
        </CardFooter>
      )}
      </Card>
    </div>
  );
}


export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const { chatbotIcon: customIcon, isDemoMode, chatExperience, welcomeMessage, brandImageGenerations, lastBrandImageGeneration, recordBrandImageGeneration } = useStore();
  const [chatMode, setChatMode] = useState<'chat' | 'image'>('chat');
  const [isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatbotIcon = isDemoMode
    ? "https://bakedbot.ai/wp-content/uploads/2024/03/Bakedbot-2024-vertical-logo-PNG-transparent.png"
    : customIcon;


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);
  
  useEffect(() => {
    // Reset hasStartedChat state when the chatbot is closed
    if (!isOpen) {
        setHasStartedChat(false);
        setMessages([]); // Clear messages when closing
    }
  }, [isOpen]);
  
  const handleMagicImageClick = () => {
    const newChatMode = chatMode === 'image' ? 'chat' : 'image';
    setChatMode(newChatMode);

    if (!hasStartedChat) {
        setHasStartedChat(true);
    }
    
    if (newChatMode === 'image') {
        const botMessage: Message = { 
            id: Date.now(), 
            text: `Let's create some magic! ✨ What do you love about the brand?`, 
            sender: 'bot' 
          };
        setMessages(prev => [...prev, botMessage]);
    }
  }

  const handleAskSmokey = async (product: Product) => {
    setChatMode('chat');
    const userMessage: Message = { id: Date.now(), text: `Tell me what people are saying about the ${product.name}.`, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
  
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }
  
    setIsBotTyping(true);
  
    try {
      const summaryResult = await summarizeReviews({ productId: product.id, productName: product.name });
      
      let botResponseText = `Here's what people are saying about **${product.name}**:\n\n`;
      botResponseText += `${summaryResult.summary}\n\n`;
  
      if (summaryResult.pros && summaryResult.pros.length > 0) {
        botResponseText += `**Pros:**\n${summaryResult.pros.map(p => `- ${p}`).join('\n')}\n\n`;
      }
      if (summaryResult.cons && summaryResult.cons.length > 0) {
        botResponseText += `**Cons:**\n${summaryResult.cons.map(c => `- ${c}`).join('\n')}\n\n`;
      }
      botResponseText += `Want to read more? [See all reviews](#)\n\nDoes this sound like a good fit, or would you like to know more?`;
  
      const botMessage: Message = { 
        id: Date.now() + 1, 
        text: botResponseText, 
        sender: 'bot',
        productSuggestions: [product] // Suggest the product we just talked about
      };
      setMessages(prev => [...prev, botMessage]);
  
    } catch (error) {
      console.error("Failed to get review summary:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: `I'm sorry, I couldn't fetch the review summary for ${product.name} right now. It is great for anyone looking for a relaxing and euphoric experience, though!`,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleOnboardingComplete = async (answers: OnboardingAnswers) => {
    setHasStartedChat(true);
    setIsBotTyping(true);
    setMessages([]); // Clear onboarding UI

    const query = `I want to feel ${answers.mood}. I'm a ${answers.experience} user and I'll be ${answers.social === 'Solo' ? 'by myself' : 'with friends'}.`;
    
    // Create a pseudo user message to show in the history
    const userMessage: Message = { id: Date.now(), text: "I've answered the questions!", sender: 'user' };
    setMessages([userMessage]);

    const availableProducts = JSON.stringify(products.map(p => ({ id: p.id, name: p.name, description: p.description, category: p.category, price: p.price })));
    
    try {
        const result: RecommendProductsOutput = await recommendProducts({
            query: query,
            availableProducts: availableProducts,
        });

        const botMessage: Message = {
            id: Date.now() + 1,
            text: result.overallReasoning || "Here are some recommendations based on your preferences:",
            sender: 'bot',
            productSuggestions: result.products.map(p => products.find(prod => prod.id === p.productId)).filter(Boolean) as Product[],
        };
        setMessages(prev => [...prev, botMessage]);

    } catch (error) {
        console.error("Failed to get recommendations after onboarding:", error);
        const errorMessage: Message = {
            id: Date.now() + 1,
            text: "I'm sorry, I'm having a little trouble finding recommendations right now. Feel free to ask me about a specific product!",
            sender: 'bot',
        };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsBotTyping(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isBotTyping) return;
  
    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
  
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }
  
    const currentInput = inputValue;
    setInputValue('');
    setIsBotTyping(true);

    if (chatMode === 'image') {
        if (!chatbotIcon) {
            const errorMessage: Message = {
                id: Date.now() + 1,
                text: "I can't generate a watermarked image without a brand logo. Please upload one in the Settings page on the dashboard.",
                sender: 'bot',
              };
              setMessages((prev) => [...prev, errorMessage]);
              setIsBotTyping(false);
              return;
        }

        const formData = new FormData();
        formData.append('productName', 'Brand Image');
        formData.append('features', currentInput); 
        formData.append('brandVoice', 'Creative');
        formData.append('logoDataUri', chatbotIcon);
        
        const result = await createSocialMediaImage(initialImageState, formData);

        if (result.error || !result.imageUrl) {
            const errorMessage: Message = {
                id: Date.now() + 1,
                text: `I had trouble creating that image. ${result.message}`,
                sender: 'bot',
              };
              setMessages((prev) => [...prev, errorMessage]);
        } else {
            const imageMessage: Message = {
                id: Date.now() + 1,
                text: "Here's the magic I came up with! ✨ What do you think?",
                sender: 'bot',
                imageUrl: result.imageUrl
            }
            setMessages((prev) => [...prev, imageMessage]);
        }
        setIsBotTyping(false);
        setChatMode('chat'); // Reset to chat mode after generation
        return;
    }
  
    try {
      const availableProducts = JSON.stringify(products.map(p => ({ id: p.id, name: p.name, description: p.description, category: p.category, price: p.price })));
      
      const result: RecommendProductsOutput = await recommendProducts({
        query: currentInput,
        availableProducts: availableProducts,
      });
  
      let botResponseText = result.overallReasoning || "Here are some recommendations based on your query:";
      
      const recommendedProductDetails = result.products.map(recommendedProd => {
        const fullProduct = products.find(p => p.id === recommendedProd.productId);
        return fullProduct ? { ...fullProduct, reasoning: recommendedProd.reasoning } : null;
      }).filter((p): p is Product & { reasoning: string } => p !== null);


      // Add reasoning to the main message if there's only one product
      if (recommendedProductDetails.length === 1 && recommendedProductDetails[0].reasoning) {
        botResponseText += `\n\n**${recommendedProductDetails[0].name}**: ${recommendedProductDetails[0].reasoning}`;
      }
  
      const botMessage: Message = {
        id: Date.now() + 1,
        text: botResponseText,
        sender: 'bot',
        productSuggestions: recommendedProductDetails.length > 0 ? recommendedProductDetails : undefined,
      };
  
      setMessages((prev) => [...prev, botMessage]);
  
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having a little trouble thinking right now. Please try again in a moment.",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleFeedback = (productId: string, type: 'like' | 'dislike') => {
    startTransition(async () => {
        const result = await updateProductFeedback(productId, type);
        if (result.success) {
            toast({
                title: 'Feedback Submitted!',
                description: `Thanks for letting us know you ${type}d the product.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: result.message,
            });
        }
    });
  };
  

    return (
        <>
          <div className="fixed bottom-6 right-6 z-50">
             <Button size="icon" className="h-16 w-16 rounded-full shadow-lg overflow-hidden" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
              {isOpen ? (
                <X className="h-8 w-8" />
              ) : chatbotIcon ? (
                <Image src={chatbotIcon} alt="Chatbot Icon" layout="fill" className="object-cover" />
              ) : (
                <Bot className="h-8 w-8" />
              )}
            </Button>
          </div>
    
          {isOpen && (
            <ChatWindow 
              chatExperience={chatExperience}
              onAskSmokey={handleAskSmokey}
              hasStartedChat={hasStartedChat}
              messages={messages}
              isBotTyping={isBotTyping}
              messagesEndRef={messagesEndRef}
              handleSendMessage={handleSendMessage}
              inputValue={inputValue}
              setInputValue={setInputValue}
              onMagicImageClick={handleMagicImageClick}
              chatMode={chatMode}
              onFeedback={handleFeedback}
              onOnboardingComplete={handleOnboardingComplete}
            />
          )}
        </>
      );
}

    

    

