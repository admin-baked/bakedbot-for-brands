
'use client';

import { useState, useRef, useEffect, type FormEvent, useTransition, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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
import { useAuth } from '@/hooks/use-auth';
import { useChatbotContext } from '@/contexts/chatbot-context';

import { logger } from '@/lib/logger';

const PRESET_WIDGET_RESPONSES: Record<string, { content: string }> = {
    "How does BakedBot work?": {
        content: "**Think of me as your AI workforce.** 🤖\n\nI connect brands, dispensaries, and customers to automate growth. My squad can:\n\n1.  **Sync Inventories**: Real-time menus across 40 Tons & retail partners.\n2.  **Recommend Products**: I know terpenes, effects, and lab data.\n3.  **Automate Compliance**: I audit marketing content against state laws.\n\nWant to see me in action? Try asking for a **Market Audit**."
    },
    "Explain the pricing models": {
        content: "**Simple Plans. Massive Growth.** 🚀\n\n*   **Claim Pro ($99/mo)**: Claim your page & capture organic traffic.\n*   **The Specialist ($499/mo)**: Hire one AI agent (like me, or Ezal).\n*   **The Empire ($1,499/mo)**: Full 7-agent automation suite.\n\nCheck the **Pricing** page for the deep dive!"
    },
     "Try the Product Demo": { // Button click text
        content: "**Welcome to the 40 Tons Experience!** 🌿\n\nI'm connected to the 40 Tons live inventory. Ask me anything, like:\n\n*   _\"Do you have anything for sleep?\"_\n*   _\"Show me your pre-rolls.\"_\n*   _\"What's fresh today?\"_"
    }
};

const DEMO_PRODUCTS: Product[] = [
    {
        id: '40t-1',
        name: '40 Tons - Black Market (Indica)',
        description: 'A potent indica strain enforcing relaxation. Known for its earthy tones and heavy effects.',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&w=400&q=80',
        imageHint: 'Black market cannabis flower',
        category: 'Flower',
        thcPercent: 28,
        cbdPercent: 0.5,
        strainType: 'Indica',
        brandId: '40tons'
    },
    {
        id: '40t-2',
        name: '40 Tons - Justice (Sativa)',
        description: 'Uplifting sativa dominant strain. Perfect for creativity and advocacy work.',
        price: 55,
        imageUrl: 'https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&w=400&q=80',
        imageHint: 'Justice sativa flower',
        category: 'Flower',
        thcPercent: 24,
        cbdPercent: 0.1,
        strainType: 'Sativa',
        brandId: '40tons'
    },
    {
        id: '40t-3',
        name: 'Freedom Gummies (Berry)',
        description: 'Sweet berry flavored gummies for a balanced hybrid effect. 10mg per piece.',
        price: 25,
        imageUrl: 'https://images.unsplash.com/photo-1581006198904-7a93c4ca3476?auto=format&fit=crop&w=400&q=80',
        imageHint: 'Freedom gummies berry flavor',
        category: 'Edibles',
        thcPercent: 10,  // mg
        cbdPercent: 0,
        strainType: 'Hybrid',
        brandId: '40tons'
    }
];

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
  strategy = 'fixed',
  startClassName,
  isSuperAdmin = false,
  onClose,
  handleQuickQuestion,
  setHasStartedChat,
  setIsOnboarding,
  setMessages,
  setIsBotTyping,
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
  strategy?: 'fixed' | 'absolute' | 'relative';
  startClassName?: string;
  isSuperAdmin?: boolean;
  onClose?: () => void;
  handleQuickQuestion: (text: string) => void;
  setHasStartedChat: (value: boolean) => void;
  setIsOnboarding: (value: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsBotTyping: (value: boolean) => void;
}) => {
  const { chatExperience } = useStore();
  const pathname = usePathname();

  return (
    <div data-testid="chat-window" className={cn(
      strategy === 'fixed' ? "fixed bottom-24 right-6" : strategy === 'absolute' ? "absolute bottom-24 right-6" : "relative w-full h-full shadow-sm",
      "z-50 max-w-sm rounded-lg shadow-2xl bg-popover border animate-in fade-in-50 slide-in-from-bottom-10 duration-300",
      strategy === 'relative' ? "max-w-none shadow-none border-0" : "",
      startClassName
    )}>
      <Card className="flex h-[75vh] max-h-[700px] flex-col border-0 relative">
        <div className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background/50 hover:bg-background" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

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
                <p className="text-muted-foreground text-sm mt-1">
                  {pathname === '/' ? "I'm the AI agent powering this platform. Ask me anything!" : "How can I help you?"}
                </p>
              </div>
              
              {pathname === '/' ? (
                /* Platform Demo / Homepage Zero State */
                <div className="w-full space-y-2">
                   <Button 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto py-3 px-4 border-emerald-100 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    onClick={() => {
                        handleQuickQuestion("How does BakedBot work?");
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-emerald-500" /> 
                    <span>How does BakedBot work?</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto py-3 px-4 border-emerald-100 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    onClick={() => handleQuickQuestion("What are the pricing plans?")}
                  >
                    <span className="mr-2">💰</span>
                    <span>Explain the pricing models</span>
                  </Button>

                  <Button className="w-full mt-2" onClick={startOnboarding}>
                     Try the Product Demo
                  </Button>
                </div>
              ) : (
                /* Standard Retail Zero State */
                <div className="w-full space-y-2">
                  <Button className="w-full" onClick={startOnboarding}>
                    <HelpCircle className="mr-2" /> Find product recommendations
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={startFreeChat}>
                    Just ask me a question <ChevronRight className="ml-1" />
                  </Button>
                </div>
              )}

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
                data-testid="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={chatMode === 'image' ? "Describe a scene..." : 'Type a message...'}
                className="flex-1"
                autoComplete="off"
                disabled={isBotTyping}
              />
              <Button
                data-testid="send-message"
                type="submit"
                size="icon"
                disabled={isBotTyping || inputValue.trim() === ''}
              >
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
  dispensaryId?: string; // CannMenus dispensary ID for context
  entityName?: string; // Name of current brand/dispensary for personalization
  initialOpen?: boolean;
  positionStrategy?: 'fixed' | 'absolute' | 'relative';
  className?: string; // For the trigger button container
  windowClassName?: string; // For the chat window
  isSuperAdmin?: boolean; // New prop for Super Admin mode
  // Chatbot config (from brand.chatbotConfig)
  chatbotConfig?: {
    enabled?: boolean;
    welcomeMessage?: string;
    botName?: string;
    mascotImageUrl?: string;
  };
};

export default function Chatbot({ products = [], brandId = "", dispensaryId, entityName, initialOpen = false, positionStrategy = 'fixed', className, windowClassName, isSuperAdmin = false, chatbotConfig }: ChatbotProps) {
  // If chatbot is explicitly disabled, don't render
  if (chatbotConfig?.enabled === false) return null;
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const { chatExperience } = useStore();
  const [chatMode, setChatMode] = useState<'chat' | 'image'>('chat');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const pathname = usePathname();

  // Get page context from ChatbotContext (set by individual pages)
  const pageContext = useChatbotContext();

  // Merge props with page context - props take priority, then page context
  const effectiveDispensaryId = dispensaryId || pageContext.dispensaryId;
  const effectiveBrandId = brandId || pageContext.brandId;
  const effectiveEntityName = entityName || pageContext.entityName;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { user } = useAuth();
  const userId = user?.uid || 'anonymous';


  // HIDE ON DASHBOARD
  // Moved to end of component to prevent Hook Mismatch (React Error #300)
  // if (pathname?.startsWith('/dashboard')) return null;

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

  // Listen for external open events (e.g. from Landing Page demo actions)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-smokey-widget', handleOpen);
    return () => window.removeEventListener('open-smokey-widget', handleOpen);
  }, []);

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

    // Call real API with onboarding preferences
    try {
      const query = `I'm looking for a ${answers.mood} experience, I'm ${answers.experience} with cannabis, and I'll be ${answers.social}.`;
      const payload: any = {
        query,
        userId,
        sessionId,
        brandId: effectiveDispensaryId || effectiveBrandId || undefined,
        state: 'Illinois',
        isOnboarding: true,
        products: products, // Pass products for context
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.ok && data.products && data.products.length > 0) {
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
          reasoning: p.reasoning || `Great for a ${answers.mood} experience.`,
        }));

        const botMessage: Message = {
          id: Date.now() + 1,
          text: data.message || `Based on your preferences for a ${answers.mood} vibe, here are some products I think you'll love!`,
          sender: 'bot',
          productSuggestions,
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const botMessage: Message = {
          id: Date.now() + 1,
          text: data.message || `I'd love to help you find something for a ${answers.mood} experience! What type of product are you interested in - flower, vapes, or edibles?`,
          sender: 'bot',
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      logger.error('Onboarding API error:', error instanceof Error ? error : new Error(String(error)));
      const botMessage: Message = {
        id: Date.now() + 1,
        text: `I'm having trouble connecting right now, but I'd love to help you find something for a ${answers.mood} experience! What type of product are you interested in?`,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsBotTyping(false);
    }

  }, [effectiveBrandId, effectiveDispensaryId, sessionId, userId]);

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
      // Call the chat API endpoint with context-aware brandId
      const payload: any = {
        query: currentQuery,
        userId,
        sessionId,
        brandId: effectiveDispensaryId || effectiveBrandId || undefined, // Use page context, props, or undefined
        entityName: effectiveEntityName, // Pass entity name for personalization
        state: 'Illinois',
        products: products, // Pass active products for personalization
      };

      if (isSuperAdmin) {
        payload.isSuperAdmin = true;
        payload.context = 'internal';
        // Override brandId if needed for internal context, but keeping it flexible
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      logger.error('Chat API error:', error instanceof Error ? error : new Error(String(error)));
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsBotTyping(false);
    }

  }, [inputValue, isBotTyping, hasStartedChat, brandId, sessionId, userId]);

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

  const handleQuickQuestion = (text: string) => {
      setHasStartedChat(true);
      setIsOnboarding(false);
      const userMessage: Message = { id: Date.now(), text, sender: 'user' };
      setMessages(prev => [...prev, userMessage]);
      setInputValue(''); // Clear input if it was typed
      
      // Detect Preset / Intercept Logic (Client-Side Demo Optimization)
      const demoIntercept = PRESET_WIDGET_RESPONSES[text.trim()];

      if (demoIntercept) {
          setIsBotTyping(true);
          
          // Simulate "Thinking" delay
          setTimeout(() => {
              const botMessage: Message = {
                  id: Date.now() + 1,
                  text: demoIntercept.content,
                  sender: 'bot'
              };
              setMessages(prev => [...prev, botMessage]);
              setIsBotTyping(false);
          }, 1200); // 1.2s delay for realism

          return; // EXIT EARLY
      }
                               
      // Normal API Fallback
      setIsBotTyping(true);
      
      (async () => {
        try {
            const payload: any = {
                query: text,
                userId,
                sessionId,
                brandId: effectiveDispensaryId || effectiveBrandId || undefined,
                entityName: effectiveEntityName,
                state: 'Illinois',
            };
    
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
    
            const data = await response.json();
    
            if (data.sessionId) setSessionId(data.sessionId);
    
            if (data.ok && data.products && data.products.length > 0) {
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
                    reasoning: p.reasoning
                  }));
                  setMessages(prev => [...prev, {
                      id: Date.now() + 1,
                      text: data.message,
                      sender: 'bot',
                      productSuggestions
                  }]);
            } else {
                 setMessages(prev => [...prev, {
                      id: Date.now() + 1,
                      text: data.message || "I couldn't process that request.",
                      sender: 'bot'
                 }]);
            }
        } catch (error) {
             console.error(error);
             setMessages(prev => [...prev, {
                  id: Date.now() + 1,
                  text: "Sorry, I'm having trouble connecting.",
                  sender: 'bot'
             }]);
        } finally {
            setIsBotTyping(false);
        }
      })();
  };
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
      <div className={cn(
        positionStrategy === 'fixed' ? "fixed bottom-6 right-6 z-[60]" : "absolute bottom-6 right-6 z-10",
        className
      )}>
        <Button size="icon" className="h-20 w-20 rounded-full shadow-lg overflow-hidden p-0 bg-transparent hover:bg-transparent" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
          {isOpen ? (
            <X className="h-8 w-8 text-primary" />
          ) : chatbotConfig?.mascotImageUrl ? (
            <img src={chatbotConfig.mascotImageUrl} alt={chatbotConfig.botName || 'AI Assistant'} className="h-full w-full object-cover" />
          ) : (
            <ChatbotIcon />
          )}
        </Button>
      </div>

      {isOpen && (
        <ChatWindow
          products={pathname === '/' && products.length === 0 ? DEMO_PRODUCTS : products}
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
          strategy={positionStrategy}
          startClassName={windowClassName}
          onClose={() => setIsOpen(false)}
          handleQuickQuestion={handleQuickQuestion}
          setHasStartedChat={setHasStartedChat}
          setIsOnboarding={setIsOnboarding}
          setMessages={setMessages}
          setIsBotTyping={setIsBotTyping}
        />
      )}
    </>
  );
}
