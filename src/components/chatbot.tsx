
'use client';

import { useState, useRef, useEffect, type FormEvent, useTransition, useCallback } from 'react';
import { Bot, MessageSquare, Send, X, ThumbsUp, ThumbsDown, Wand2, Sparkles, HelpCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { type Product } from '@/types/domain';
import { useStore } from '@/hooks/use-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ChatbotIcon } from './chatbot-icon';
import OnboardingFlow from './chatbot/onboarding-flow';
import ChatMessages from './chatbot/chat-messages';
import ChatProductCarousel from './chatbot/chat-product-carousel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { demoProducts } from '@/lib/demo/demo-data'; // For mock response
import { useAuth } from '@/hooks/use-auth';


type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  productSuggestions?: (Product & { reasoning: string })[];
  imageUrl?: string;
};

type OnboardingAnswers = {
  mood: string | null;
  experience: string | null;
  social: string | null;
};


const ChatWindow = ({
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
  onAddToCart,
  clearContext,
}: {
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
  onAddToCart: (product: Product) => void;
  clearContext: () => void;
}) => {
  const { chatExperience } = useStore();

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-lg shadow-2xl bg-popover border animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
      <Card className="flex h-[75vh] max-h-[700px] flex-col border-0">

        {chatExperience === 'default' && hasStartedChat && (
          <div className="border-b">
            <ChatProductCarousel products={products} onAskSmokey={onAskSmokey} isCompact={true} onFeedback={onFeedback} />
          </div>
        )}

        <div className="flex-1 min-h-0">
          {!hasStartedChat ? (
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold">Hi, I'm Smokey.</h2>
                <p className="text-muted-foreground text-sm mt-1">How can I help you?</p>
              </div>
              <div className="w-full space-y-2">
                <Button className="w-full" onClick={startOnboarding}>
                  <HelpCircle className="mr-2" /> Find product recommendations
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={startFreeChat}>
                  Just ask me a question <ChevronRight className="ml-1" />
                </Button>
              </div>
              <Collapsible className="mt-4">
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="text-xs text-muted-foreground">Discover Products</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2">
                    <ChatProductCarousel products={products} onAskSmokey={onAskSmokey} isCompact={true} onFeedback={onFeedback} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
              onAddToCart={onAddToCart}
            />
          )}
        </div>

        {hasStartedChat && !isOnboarding && (
          <CardFooter className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
              <TooltipProvider>
                {hasStartedChat && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" onClick={clearContext} disabled={isBotTyping}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Clear context</p>
                    </TooltipContent>
                  </Tooltip>
                )}
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
                placeholder={chatMode === 'image' ? "Describe a scene..." : 'Type a message...'}
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

type ChatbotProps = {
  products?: Product[];
  brandId?: string;
};

export default function Chatbot({ products = [], brandId = "" }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const { chatExperience } = useStore();
  const [chatMode, setChatMode] = useState<'chat' | 'image'>('chat');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { user } = useAuth();
  const userId = user?.uid || 'anonymous';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const clearContext = () => {
    setSessionId(null);
    setMessages([]);
    setHasStartedChat(false);
    toast({
      title: 'Context Cleared',
      description: 'Starting fresh conversation',
    });
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
        text: `Let's create some magic! ✨ Describe a scene for the brand.`,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
    }
  }

  const handleAskSmokey = useCallback(async (product: Product) => {
    // This is a placeholder for a real AI call.
    setChatMode('chat');
    setIsOnboarding(false);
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }

    const userMessage: Message = { id: Date.now(), text: `Tell me about ${product.name}.`, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);

    setIsBotTyping(true);

    setTimeout(() => {
      const botResponseText = `The ${product.name} is a fantastic choice! It's a ${product.category} known for its relaxing and euphoric effects. People often say it's great for unwinding after a long day. Would you like to add it to your cart?`;
      const botMessage: Message = {
        id: Date.now() + 1,
        text: botResponseText,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 1500);

  }, [hasStartedChat]);

  const handleOnboardingComplete = useCallback(async (answers: OnboardingAnswers) => {
    setIsOnboarding(false);
    setIsBotTyping(true);

    const userMessage: Message = { id: Date.now(), text: "I've answered the questions!", sender: 'user' };
    setMessages([userMessage]);

    // MOCK AI RESPONSE
    setTimeout(() => {
      const botMessage: Message = {
        id: Date.now() + 1,
        text: `Based on your preferences for a ${answers.mood} vibe, here are a few products I think you'll love. I've picked a variety for you to explore.`,
        sender: 'bot',
        productSuggestions: [
          { ...demoProducts[0], reasoning: "A classic choice for deep relaxation that matches the 'chill' mood you're after." },
          { ...demoProducts[2], reasoning: "This vape is perfect for a social setting, offering a happy and euphoric high." },
          { ...demoProducts[3], reasoning: "A tasty edible for a consistent and enjoyable experience, great for beginners." },
        ]
      };
      setMessages(prev => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 2000);

  }, []);

  const handleSendMessage = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isBotTyping) return;

    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);

    if (!hasStartedChat) {
      setHasStartedChat(true);
      setIsOnboarding(false);
    }

    const currentQuery = inputValue;
    setInputValue('');
    setIsBotTyping(true);

    try {
      // Call the chat API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          userId,
          sessionId,
          brandId: brandId || '10982',
          state: 'Illinois',
        }),
      });

      const data = await response.json();

      // Store session ID from response
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.ok && data.products && data.products.length > 0) {
        // Convert products to the format expected by the chatbot
        const productSuggestions = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          imageUrl: p.imageUrl,
          description: p.description,
          thcPercent: p.thcPercent,
          cbdPercent: p.cbdPercent,
          url: p.url,
          reasoning: p.reasoning || `A great ${p.category.toLowerCase()} option that matches your request.`,
        }));

        const botMessage: Message = {
          id: Date.now() + 1,
          text: data.message,
          sender: 'bot',
          productSuggestions,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        // No products found or error
        const botMessage: Message = {
          id: Date.now() + 1,
          text: data.message || "I couldn't find any products matching that description. Could you try rephrasing your request?",
          sender: 'bot',
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsBotTyping(false);
    }

  }, [inputValue, isBotTyping, hasStartedChat, brandId]);

  const handleFeedback = (productId: string, type: 'like' | 'dislike') => {
    startTransition(async () => {
      toast({
        title: 'Feedback Submitted (Demo)',
        description: `In production, your feedback for product #${productId.slice(0, 5)} would be saved.`,
      });
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
      text: `Of course! What's on your mind? You can ask me about a specific product or tell me what you're looking for.`,
      sender: 'bot'
    };
    setMessages([botMessage]);
  }
  const { addToCart, selectedRetailerId } = useStore();

  const handleAddToCart = useCallback((product: Product) => {
    // Use selected retailer or fallback to the brand's default retailer if available
    // For now, we'll use the current selectedRetailerId or a placeholder if none.
    // Ideally, the chat should be aware of the context.
    const retailerToUse = selectedRetailerId || '1';

    addToCart(product, retailerToUse);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  }, [addToCart, selectedRetailerId, toast]);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="icon" className="h-20 w-20 rounded-full shadow-lg overflow-hidden p-0 bg-transparent hover:bg-transparent" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
          {isOpen ? (
            <X className="h-8 w-8 text-primary" />
          ) : (
            <ChatbotIcon />
          )}
        </Button>
      </div>

      {isOpen && products && (
        <ChatWindow
          products={products}
          onAskSmokey={handleAskSmokey}
          onAddToCart={handleAddToCart}
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
          clearContext={clearContext}
        />
      )}
    </>
  );
}
