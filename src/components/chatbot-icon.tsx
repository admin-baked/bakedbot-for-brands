'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Bot } from 'lucide-react';
import { useStore } from '@/hooks/use-store';

export function ChatbotIcon() {
  const { chatbotIcon: customIcon, _hasHydrated } = useStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect will only run on the client, after the component has mounted.
    setIsClient(true);
  }, []);

  // On the server, or before the client has mounted, render a placeholder.
  // This prevents any hydration mismatch.
  if (!isClient || !_hasHydrated) {
    return <Bot className="h-8 w-8" />;
  }
  
  // Define the default icon URL.
  const defaultIcon = 'https://storage.googleapis.com/stedi-assets/misc/smokey-icon.png';
  
  // Determine which icon to use now that we are safely on the client.
  const iconToUse = customIcon || defaultIcon;

  // Now, render the Image component with the correct URL.
  return (
    <Image 
      src={iconToUse} 
      alt="Chatbot Icon" 
      fill 
      className="object-cover"
    />
  );
}
