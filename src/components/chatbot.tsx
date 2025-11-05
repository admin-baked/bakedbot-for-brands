
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import { Bot, MessageSquare, Send, X, ShoppingCart, Minus, Plus, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';
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

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  productSuggestions?: Product[];
};

const ProductCarousel = ({ onAskSmokey, isCompact }: { onAskSmokey: (product: Product) => void, isCompact: boolean }) => (
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
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white">
                            <ThumbsUp className="h-4 w-4 text-green-400" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white">
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

const ChatMessages = ({ messages, isBotTyping, messagesEndRef }: { messages: Message[], isBotTyping: boolean, messagesEndRef: React.RefObject<HTMLDivElement>}) => (
    <ScrollArea className="flex-1 border-t">
        <CardContent className="p-4">
        <div className="space-y-4">
            {messages.map((message) => (
            <div key={message.id} className={cn("flex items-end gap-3", message.sender === 'user' && 'justify-end')}>
                {message.sender === 'bot' && (
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot />
                    </AvatarFallback>
                </Avatar>
                )}
                <div className={cn("max-w-[85%] rounded-lg px-3 py-2", message.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none')}>
                {message.text && (
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                )}
                {message.productSuggestions && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
                    {message.productSuggestions.slice(0, 3).map(p => (
                        <div key={p.id} className="flex-shrink-0 w-48 flex items-center gap-2 rounded-md border bg-background p-2 text-foreground">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                                <Image src={p.imageUrl} alt={p.name} data-ai-hint={p.imageHint} fill className="object-cover"/>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-semibold truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground">${p.price.toFixed(2)}</p>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0"><ThumbsUp className="h-4 w-4 text-green-500" /></Button>
                                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0"><ThumbsDown className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        </div>
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
                    <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:-0.3s]"></span>
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:-0.15s]"></span>
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50"></span>
                    </div>
                </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        </CardContent>
    </ScrollArea>
);

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
}) => {
  return (
    <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-lg shadow-2xl bg-card border animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
      <Card className="flex h-[75vh] max-h-[700px] flex-col border-0">
          {chatExperience === 'default' && <ProductCarousel onAskSmokey={onAskSmokey} isCompact={hasStartedChat} />}

          {chatExperience === 'classic' && !hasStartedChat && (
          <CardHeader>
              <CardTitle>Smokey AI</CardTitle>
              <CardDescription>Ask me anything about our products.</CardDescription>
          </CardHeader>
          )}
        
        <ChatMessages messages={messages} isBotTyping={isBotTyping} messagesEndRef={messagesEndRef} />
      
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            autoComplete="off"
            disabled={isBotTyping}
          />
          <Button type="submit" size="icon" disabled={isBotTyping || inputValue.trim() === ''}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
      </Card>
    </div>
  );
}


export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
     { id: 1, text: "Hello! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!", sender: 'bot' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatbotIcon, chatExperience } = useStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);
  
  const handleAskSmokey = (product: Product) => {
    const userMessage: Message = { id: Date.now(), text: `Tell me about the ${product.name}`, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }

    setIsBotTyping(true);
    setTimeout(() => {
      const botMessage: Message = { 
        id: Date.now() + 1, 
        text: `Of course! The ${product.name} is a fantastic choice. ${product.description} This is great for anyone looking for a relaxing and euphoric experience. Does this sound like a good fit, or would you like to know more?`, 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 1200);
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isBotTyping) return;

    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }

    setInputValue('');
    setIsBotTyping(true);

    setTimeout(() => {
      let botResponseText = "I'm sorry, I didn't quite understand. Can you rephrase? You can ask me for product recommendations like 'show me some edibles'.";
      let productSuggestions: Product[] | undefined;

      const lowerCaseInput = inputValue.toLowerCase();
      
      const categories = ['All', ...new Set(products.map(p => p.category))];
      const foundCategory = categories.find(cat => cat !== 'All' && lowerCaseInput.includes(cat.toLowerCase()));

      if (foundCategory) {
        botResponseText = `You might like these ${foundCategory.toLowerCase()}:`;
        productSuggestions = products.filter(p => p.category === foundCategory);
      } else if (lowerCaseInput.includes('all') || lowerCaseInput.includes('everything') || lowerCaseInput.includes('products')) {
         botResponseText = "Here are all our products:";
         productSuggestions = products;
      }

      const botMessage: Message = { id: Date.now() + 1, text: botResponseText, sender: 'bot', productSuggestions };
      setMessages((prev) => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 1200);
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
            />
          )}
        </>
      );
}

    
