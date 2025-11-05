'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import { Bot, MessageSquare, Send, X, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { products, type Product } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import type { CartItem } from '@/lib/types';
import { useStore } from '@/hooks/use-store';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  productSuggestions?: Product[];
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
     { id: 1, text: "Hello! I'm Smokey, your AI budtender. I can help you with product recommendations or checkout. What can I get for you today?", sender: 'bot' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('All');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatbotMode } = useStore();

  const categories = ['All', ...new Set(products.map(p => p.category))];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);
  
  const handleAskSmokey = (product: Product) => {
    setIsBotTyping(true);
    const botMessage: Message = { 
      id: Date.now() + 1, 
      text: `Of course! Here's a little about the ${product.name}: ${product.description} Does this sound like a good fit, or would you like to know more?`, 
      sender: 'bot' 
    };
    setMessages(prev => [...prev, botMessage]);
    setIsBotTyping(false);
  };


  const handleSendMessage = (e: FormEvent, message?: string) => {
    if (e) e.preventDefault();
    const textToSend = message || inputValue;
    if (textToSend.trim() === '' || isBotTyping) return;

    const userMessage: Message = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    if (!message) {
      setInputValue('');
    }
    setIsBotTyping(true);

    setTimeout(() => {
      let botResponseText = "I'm sorry, I didn't quite understand. Can you rephrase? You can ask me for product recommendations like 'show me some edibles'.";
      let productSuggestions;

      const lowerCaseInput = textToSend.toLowerCase();
      
      const foundCategory = categories.find(cat => cat !== 'All' && lowerCaseInput.includes(cat.toLowerCase()));

      if (foundCategory) {
        botResponseText = `Here are some ${foundCategory.toLowerCase()} you might like:`;
        productSuggestions = products.filter(p => p.category === foundCategory);
        setCurrentCategory(foundCategory);
      } else if (lowerCaseInput.includes('all') || lowerCaseInput.includes('everything') || lowerCaseInput.includes('products')) {
         botResponseText = "Here are all our products:";
         productSuggestions = products;
         setCurrentCategory('All');
      }

      const botMessage: Message = { id: Date.now() + 1, text: botResponseText, sender: 'bot', productSuggestions };
      setMessages((prev) => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 1200);
  };

  const handleCategoryClick = (category: string) => {
    setCurrentCategory(category);
    handleSendMessage(new Event('submit') as any as FormEvent, `Show me ${category}`);
  };

    const CheckoutAssistant = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeProducts, setActiveProducts] = useState(products);

    useEffect(() => {
      if (currentCategory === 'All') {
        setActiveProducts(products);
      } else {
        setActiveProducts(products.filter(p => p.category === currentCategory));
      }
    }, [currentCategory]);

    const addToCart = (product: Product) => {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { ...product, quantity: 1 }];
      });
    };

    const updateQuantity = (productId: string, quantity: number) => {
      setCart(prev => {
        if (quantity === 0) {
          return prev.filter(item => item.id !== productId);
        }
        return prev.map(item => item.id === productId ? { ...item, quantity } : item);
      });
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

    return (
      <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-lg shadow-2xl bg-card border animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
        <Card className="flex h-[75vh] max-h-[700px] flex-col border-0">
          <CardHeader className='pb-2'>
            <div className="flex items-center justify-between">
              <div className='flex items-center gap-2'>
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground"><Bot /></AvatarFallback>
                </Avatar>
                <CardTitle>Today's Deals</CardTitle>
              </div>
              <Badge variant="secondary">🔥 20% OFF</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-2 p-4 pt-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {categories.map(category => (
                <Button key={category} size="sm" variant={currentCategory === category ? 'default' : 'outline'} onClick={() => setCurrentCategory(category)} className="rounded-full px-3 h-7 text-xs">
                  {category}
                </Button>
              ))}
            </div>
            <ScrollArea className="flex-1 -mx-4">
              <div className="px-4 grid grid-cols-1 gap-2">
                {activeProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-2 rounded-md border bg-background p-2 text-foreground">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                      <Image src={p.imageUrl} alt={p.name} data-ai-hint={p.imageHint} fill className="object-cover"/>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm text-primary font-bold">${(p.price * 0.8).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground line-through">${p.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button size="sm" className='text-xs h-8' onClick={() => handleAskSmokey(p)}>Ask Smokey</Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-2 border-t">
            {totalItems > 0 ? (
                <div className='w-full'>
                    <ScrollArea className='h-24'>
                    <div className='space-y-2 pr-4'>
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate pr-2">{item.name}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                                <span>{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3"/></Button>
                            </div>
                        </div>
                    ))}
                    </div>
                    </ScrollArea>
                    <Button className="w-full mt-2">
                        Checkout ({totalItems} {totalItems > 1 ? 'items' : 'item'}) - ${totalPrice}
                    </Button>
                </div>
            ) : (
                <div className='text-center text-sm text-muted-foreground w-full py-4'>
                    Your cart is empty. Add some deals!
                </div>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const SimpleChat = () => (
    <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-lg shadow-2xl bg-card border animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
      <Card className="flex h-[70vh] max-h-[700px] flex-col border-0">
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot />
              </AvatarFallback>
            </Avatar>
            <CardTitle>Smokey, AI Budtender</CardTitle>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
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
                  <div className={cn("max-w-[80%] rounded-lg px-3 py-2", message.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none')}>
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />') }} />
                    {message.productSuggestions && (
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {message.productSuggestions.slice(0, 3).map(p => (
                          <div key={p.id} className="flex items-center gap-2 rounded-md border bg-background p-2 text-foreground">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                              <Image src={p.imageUrl} alt={p.name} data-ai-hint={p.imageHint} fill className="object-cover"/>
                            </div>
                            <div className="w-full">
                                <p className="text-xs font-semibold">{p.name}</p>
                                <p className="text-xs text-muted-foreground">${p.price.toFixed(2)}</p>
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
    
    return (
        <>
          <div className="fixed bottom-6 right-6 z-50">
            <Button size="icon" className="h-16 w-16 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
              {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
            </Button>
          </div>
    
          {isOpen && (chatbotMode === 'checkout' ? <CheckoutAssistant /> : <SimpleChat />)}
        </>
      );
}