'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import { Bot, MessageSquare, Send, X, ShoppingCart, Minus, Plus, Home, Tag, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { products, type Product } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useStore } from '@/hooks/use-store';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  productSuggestions?: Product[];
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm Smokey, your AI budtender. How can I help you find the perfect product today? Try asking 'show me some edibles'.", sender: 'bot' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const { chatbotMode, cart, addToCart, removeFromCart, updateQuantity } = useStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);


  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isBotTyping) return;

    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsBotTyping(true);

    setTimeout(() => {
      let botResponseText = "I'm sorry, I didn't quite understand. Can you rephrase? You can ask me for product recommendations like 'show me some edibles'.";
      let productSuggestions;

      const lowerCaseInput = inputValue.toLowerCase();
      
      const categories = [...new Set(products.map(p => p.category))];
      const foundCategory = categories.find(cat => lowerCaseInput.includes(cat.toLowerCase()));

      if (foundCategory) {
        botResponseText = `Here are some ${foundCategory.toLowerCase()} you might like:`;
        productSuggestions = products.filter(p => p.category === foundCategory);
        setActiveCategory(foundCategory);
      } else if (lowerCaseInput.includes('all')) {
         botResponseText = "Here are all our products:";
         productSuggestions = products;
         setActiveCategory('All');
      }

      const botMessage: Message = { id: Date.now() + 1, text: botResponseText, sender: 'bot', productSuggestions: productSuggestions ? [] : undefined };
      setMessages((prev) => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 1200);
  };

  const handleAskSmokey = (product: Product) => {
    const userMessage: Message = { id: Date.now(), text: `Tell me about ${product.name}`, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    
    setIsBotTyping(true);
    setTimeout(() => {
      const botMessage: Message = {
        id: Date.now() + 1,
        text: `${product.description} Is there anything else you would like to know about ${product.name}?`,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 1200);
  };
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const categories = ['All', ...new Set(products.map((p) => p.category))];
  const filteredProducts = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

  if (chatbotMode === 'simple') {
    return (
        <>
          <div className="fixed bottom-6 right-6 z-50">
            <Button size="icon" className="h-16 w-16 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
              {isOpen ? <X className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
            </Button>
          </div>
    
          {isOpen && (
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
                            <p className="text-sm">{message.text}</p>
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
          )}
        </>
      );
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="icon" className="relative h-16 w-16 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
          {isOpen ? <X className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
          {totalItems > 0 && chatbotMode === 'checkout' && !isOpen && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {totalItems}
            </span>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-md rounded-lg shadow-2xl bg-card border animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
          <Card className="flex h-[80vh] max-h-[750px] flex-col border-0">
            <CardHeader className="flex-row items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Chat</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 border-primary text-primary hover:bg-primary/10">
                        Checkout Now
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {totalItems}
                        </span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Home className="h-5 w-5" />
                    </Button>
                </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-semibold tracking-widest text-muted-foreground">TODAY'S DEALS</h3>
                  <div className="mt-1 h-px w-16 bg-primary mx-auto"></div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-center space-x-2 pb-2">
                      {categories.map((category) => (
                        <Button
                          key={category}
                          variant={activeCategory === category ? 'default' : 'outline'}
                          size="sm"
                          className="rounded-full px-4 h-8"
                          onClick={() => setActiveCategory(category)}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                </div>
                <Carousel
                  opts={{
                    align: "start",
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {filteredProducts.map(p => {
                      const cartItem = cart.find(item => item.id === p.id);
                      const originalPrice = p.price * 1.3; // Simulate a discount
                      const discount = 27; // Simulate a discount
                      return (
                         <CarouselItem key={p.id} className="basis-[33%] pl-2">
                            <Card className="overflow-hidden group h-full flex flex-col">
                                <CardHeader className="p-0 relative">
                                    <div className="relative h-24 w-full">
                                        <Image src={p.imageUrl} alt={p.name} fill className="object-cover" data-ai-hint={p.imageHint} sizes="33vw" />
                                    </div>
                                    <div className="absolute top-1 left-1 bg-background/80 text-foreground text-[10px] font-semibold p-0.5 rounded-sm flex items-center gap-0.5">
                                        <Tag className="h-2.5 w-2.5"/> {discount}% OFF
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-semibold text-xs truncate group-hover:text-primary">{p.name}</h4>
                                        <p className="text-xs text-muted-foreground">{p.category}</p>
                                    </div>
                                    <div className="mt-1">
                                        <p className="text-sm font-bold">${p.price.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground line-through ml-1">${originalPrice.toFixed(2)}</span></p>
                                        <Button className="w-full mt-1.5 h-7 text-xs" onClick={() => handleAskSmokey(p)}>
                                            Ask Smokey
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                      )
                    })}
                  </CarouselContent>
                   <CarouselPrevious className="-left-4" />
                  <CarouselNext className="-right-4" />
                </Carousel>

                <div className="space-y-4 mt-6">
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
                        <p className="text-sm">{message.text}</p>
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
            
            <CardFooter className="p-2 border-t bg-background">
              <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-white rounded-full px-4"
                  autoComplete="off"
                  disabled={isBotTyping}
                />
                <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={isBotTyping || inputValue.trim() === ''}>
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </CardFooter>
            <div className="text-center text-xs text-muted-foreground py-2 border-t">Powered by Smokey AI</div>
          </Card>
        </div>
      )}
    </>
  );
}
