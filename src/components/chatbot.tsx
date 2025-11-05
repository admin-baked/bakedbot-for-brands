'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import { Bot, MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { products, type Product } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';

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
      } else if (lowerCaseInput.includes('all')) {
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
            <Button size="icon" className="h-16 w-16 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
              {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
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