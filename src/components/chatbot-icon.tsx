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

  // Define the default icon URL.
  const defaultIcon = 'https://storage.googleapis.com/stedi-assets/misc/smokey-icon.png';
  
  // Determine which icon to use.
  // Before hydration or on the server, we can't know the custom icon, so we use the default.
  // After hydration on the client, we can safely check for the custom icon.
  const iconToUse = isClient && _hasHydrated && customIcon ? customIcon : defaultIcon;

  // Render a placeholder on the server and before client-side hydration is complete
  if (!isClient) {
    return <Bot className="h-8 w-8" />;
  }

  // Once on the client, render the Image component with the correct URL
  return (
    <Image 
      src={iconToUse} 
      alt="Chatbot Icon" 
      fill 
      className="object-cover" 
      // Adding a key helps React differentiate between the server-rendered
      // and client-rendered element, preventing hydration errors.
      key={iconToUse}
    />
  );
}
