
'use client';

import { useState, useRef, useEffect, type FormEvent, useTransition, useCallback } from 'react';
import { useFormState } from 'react-dom';
import Image from 'next/image';
import { Bot, MessageSquare, Send, X, ShoppingCart, Minus, Plus, ThumbsUp, ThumbsDown, ChevronDown, Wand2, Sparkles, Loader2, Download, Share2, HelpCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { type Product } from '@/firebase/converters';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/hooks/use-store';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { recommendProducts, type RecommendProductsOutput } from '@/ai/ai-powered-product-recommendations';
import { getReviewSummary } from '@/app/products/[id]/actions';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createSocialMediaImage } from '@/app/dashboard/content/actions';
import { updateProductFeedback } from '@/app/products/[id]/actions';
import type { ImageFormState } from '@/app/dashboard/content/actions';
import { useToast } from '@/hooks/use-toast';
import { useMenuData } from '@/hooks/use-menu-data';
import { ChatbotIcon } from './chatbot-icon';
import { defaultChatbotIcon } from '@/lib/data';
import OnboardingFlow from './chatbot/onboarding-flow';
import ChatMessages from './chatbot/chat-messages';
import ChatProductCarousel from './chatbot/chat-product-carousel';
import { useUser } from '@/firebase/auth/use-user';
import { useCookieStore } from '@/lib/cookie-storage';


type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  productSuggestions?: (Product & { reasoning: string })[];
  imageUrl?: string;
};

const initialImageState: ImageFormState = {
    message: '',
    imageUrl: null,
    error: false,
};

type OnboardingAnswers = {
    mood: string | null;
    experience: string | null;
    social: string | null;
};


const ChatWindow = ({
  chatExperience,
  products,
  onAskSmokey,
  hasStartedChat,
  startOnboarding,
  startFreeChat,
  isOnboarding,
  onOnboardingComplete,
  messages,
  isBotTyping,
  messagesEndRef,
  handleSendMessage,
  inputValue,
  setInputValue,
  onMagicImageClick,
  chatMode,
  onFeedback,
}: {
  chatExperience: 'default' | 'classic';
  products: Product[];
  onAskSmokey: (product: Product) => void;
  hasStartedChat: boolean;
  startOnboarding: () => void;
  startFreeChat: () => void;
  isOnboarding: boolean;
  onOnboardingComplete: (answers: OnboardingAnswers) => void;
  messages: Message[];
  isBotTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleSendMessage: (e: FormEvent) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  onMagicImageClick: () => void;
  chatMode: 'chat' | 'image';
  onFeedback: (productId: string, type: 'like' | 'dislike') => void;
}) => {
  return (
    <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-lg shadow-2xl bg-card border animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
      <Card className="flex h-[75vh] max-h-[700px] flex-col border-0">
        
        {chatExperience === 'default' && (
          <div className={cn(hasStartedChat && "border-b")}>
            <ChatProductCarousel products={products} onAskSmokey={onAskSmokey} isCompact={hasStartedChat} onFeedback={onFeedback} />
          </div>
        )}
        
        <div className="flex-1 min-h-0">
            {!hasStartedChat ? (
                <div className="p-4 text-center h-full flex flex-col justify-center items-center">
                    <h2 className="text-lg font-semibold">Welcome to your virtual budtender 🌿</h2>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">How can I help you find your bliss?</p>
                    <div className="w-full space-y-2">
                       <Button className="w-full" onClick={startOnboarding}>
                            <HelpCircle className="mr-2" /> Find product recommendations
                       </Button>
                       <Button variant="ghost" className="w-full text-muted-foreground" onClick={startFreeChat}>
                            Just ask me a question <ChevronRight className="ml-1" />
                       </Button>
                    </div>
                </div>
            ) : isOnboarding ? (
                <OnboardingFlow onComplete={onOnboardingComplete} />
            ) : (
                <ChatMessages
                    messages={messages}
                    isBotTyping={isBotTyping}
                    messagesEndRef={messagesEndRef}
                    onAskSmokey={onAskSmokey}
                    className="h-full"
                    onFeedback={onFeedback}
                />
            )}
        </div>
      
        {hasStartedChat && !isOnboarding && (
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
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const { chatExperience } = useCookieStore();
  const [chatMode, setChatMode] = useState<'chat' | 'image'>('chat');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { products, isDemo } = useMenuData();
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setUserProfile(idTokenResult.claims);
      });
    }
  }, [user]);

  const brandId = userProfile?.brandId || 'default';


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);
  
  useEffect(() => {
    if (!isOpen) {
        setHasStartedChat(false);
        setIsOnboarding(false);
        setMessages([]);
    }
  }, [isOpen]);
  
  const handleMagicImageClick = () => {
    const newChatMode = chatMode === 'image' ? 'chat' : 'image';
    setChatMode(newChatMode);

    if (!hasStartedChat) {
        setHasStartedChat(true);
        setIsOnboarding(false);
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

  const handleAskSmokey = useCallback(async (product: Product) => {
    setChatMode('chat');
    setIsOnboarding(false);
    if (!hasStartedChat) {
        setHasStartedChat(true);
    }

    const userMessage: Message = { id: Date.now(), text: `Tell me what people are saying about the ${product.name}.`, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
  
    setIsBotTyping(true);
  
    try {
      const summaryResult = await getReviewSummary({ productId: product.id });
      
      if (!summaryResult) {
          throw new Error('Summary result was null.');
      }

      let botResponseText = `Here's what people are saying about **${product.name}**:\n\n`;
      botResponseText += `${summaryResult.summary}\n\n`;
  
      if (summaryResult.pros && summaryResult.pros.length > 0) {
        botResponseText += `**Pros:**\n${summaryResult.pros.map(p => `- ${p}`).join('\n')}\n\n`;
      }
      if (summaryResult.cons && summaryResult.cons.length > 0) {
        botResponseText += `**Cons:**\n${summaryResult.cons.map(c => `- ${c}`).join('\n')}\n\n`;
      }
      botResponseText += `Does this sound like a good fit, or would you like to know more?`;
  
      const botMessage: Message = { 
        id: Date.now() + 1, 
        text: botResponseText, 
        sender: 'bot'
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
  }, [hasStartedChat]);

  const handleOnboardingComplete = useCallback(async (answers: OnboardingAnswers) => {
    setIsOnboarding(false);
    setIsBotTyping(true);

    const query = `I want to feel ${answers.mood}. I'm a ${answers.experience} user and I'll be ${answers.social === 'Solo' ? 'by myself' : 'with friends'}.`;
    
    const userMessage: Message = { id: Date.now(), text: "I've answered the questions!", sender: 'user' };
    setMessages([userMessage]);

    if (!products) {
        const errorMessage: Message = {
            id: Date.now() + 1,
            text: "I'm sorry, I can't see the product list right now. Please try again in a moment.",
            sender: 'bot',
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsBotTyping(false);
        return;
    }

    try {
        const result: RecommendProductsOutput = await recommendProducts({
            query: query,
            brandId: brandId
        });
        
        const recommendedProductDetails = result.products.map(recommendedProd => {
            const fullProduct = products.find(p => p.id === recommendedProd.productId);
            return fullProduct ? { ...fullProduct, reasoning: recommendedProd.reasoning } : null;
        }).filter((p): p is Product & { reasoning: string } => p !== null);

        const botMessage: Message = {
            id: Date.now() + 1,
            text: result.overallReasoning || "Here are some recommendations based on your preferences:",
            sender: 'bot',
            productSuggestions: recommendedProductDetails.length > 0 ? recommendedProductDetails : undefined,
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
  }, [products, brandId]);

  const handleSendMessage = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isBotTyping) return;
  
    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
  
    if (!hasStartedChat) {
      setHasStartedChat(true);
      setIsOnboarding(false);
    }
  
    const currentInput = inputValue;
    setInputValue('');
    setIsBotTyping(true);

    if (chatMode === 'image') {
        const logoDataUri = defaultChatbotIcon;
        
        const formData = new FormData();
        formData.append('productName', 'Brand Image');
        formData.append('features', currentInput); 
        formData.append('brandVoice', 'Creative');
        formData.append('logoDataUri', logoDataUri);
        
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
        setChatMode('chat');
        return;
    }
  
    if (!products) {
        const errorMessage: Message = {
            id: Date.now() + 1,
            text: "I'm sorry, I can't see the product list right now. Please try again in a moment.",
            sender: 'bot',
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsBotTyping(false);
        return;
    }
    
    try {
      const result: RecommendProductsOutput = await recommendProducts({
        query: currentInput,
        brandId: brandId,
      });
        
      const recommendedProductDetails = result.products.map(recommendedProd => {
        const fullProduct = products.find(p => p.id === recommendedProd.productId);
        return fullProduct ? { ...fullProduct, reasoning: recommendedProd.reasoning } : null;
      }).filter((p): p is Product & { reasoning: string } => p !== null);

      const botMessage: Message = {
        id: Date.now() + 1,
        text: result.overallReasoning || "Here are some recommendations based on your query:",
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
  }, [inputValue, isBotTyping, hasStartedChat, chatMode, products, brandId]);

  const handleFeedback = (productId: string, type: 'like' | 'dislike') => {
    startTransition(async () => {
        const formData = new FormData();
        formData.append('productId', productId);
        formData.append('feedbackType', type);
        const result = await updateProductFeedback(null as any, formData);
        if (!result.error) {
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
  
  const startOnboarding = () => {
    setHasStartedChat(true);
    setIsOnboarding(true);
  };

  const startFreeChat = () => {
    setHasStartedChat(true);
    setIsOnboarding(false);
    const botMessage: Message = { 
      id: Date.now(), 
      text: `Of course! What's on your mind? You can ask me about specific products or tell me what you're looking for.`, 
      sender: 'bot' 
    };
    setMessages([botMessage]);
  }
    return (
        <>
          <div className="fixed bottom-6 right-6 z-50">
             <Button size="icon" className="h-16 w-16 rounded-full shadow-lg overflow-hidden p-0" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
              {isOpen ? (
                <X className="h-8 w-8" />
              ) : (
                <ChatbotIcon />
              )}
            </Button>
          </div>
    
          {isOpen && products && (
            <ChatWindow
              products={products}
              chatExperience={chatExperience}
              onAskSmokey={handleAskSmokey}
              hasStartedChat={hasStartedChat}
              startOnboarding={startOnboarding}
              startFreeChat={startFreeChat}
              isOnboarding={isOnboarding}
              onOnboardingComplete={handleOnboardingComplete}
              messages={messages}
              isBotTyping={isBotTyping}
              messagesEndRef={messagesEndRef}
              handleSendMessage={handleSendMessage}
              inputValue={inputValue}
              setInputValue={setInputValue}
              onMagicImageClick={handleMagicImageClick}
              chatMode={chatMode}
              onFeedback={handleFeedback}
            />
          )}
        </>
      );
}
