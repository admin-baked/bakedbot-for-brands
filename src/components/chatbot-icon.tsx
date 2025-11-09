
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
  const defaultIcon = 'https://storage.googleapis.com/stedi-assets/misc/smokey-icon-1.png';
  
  // Determine which icon to use. Before hydration, always use the default.
  const iconToUse = isClient && _hasHydrated && customIcon ? customIcon : defaultIcon;

  // By always rendering an <Image> component, we ensure the server and client
  // HTML structure are identical, preventing a hydration mismatch error.
  // The `src` will update reactively after hydration without changing the component type.
  return (
    <Image 
      src={iconToUse} 
      alt="Chatbot Icon" 
      fill 
      className="object-cover"
    />
  );
}
