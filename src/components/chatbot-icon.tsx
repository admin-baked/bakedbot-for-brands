
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { defaultChatbotIcon } from '@/lib/data';
import { useStore } from '@/hooks/use-store';

export function ChatbotIcon() {
  // In a real scenario, you might get a custom icon URL from the user's settings.
  // We simulate this by checking the store, but ensuring a fallback.
  const { theme } = useStore(); // Using a property from store to simulate a custom source.
  
  // A hypothetical custom icon URL that might come from user settings.
  const customIconUrl = undefined; 

  const [iconSrc, setIconSrc] = useState(customIconUrl || defaultChatbotIcon);

  return (
    <Image 
      src={iconSrc} 
      alt="Chatbot Icon" 
      fill 
      className="object-cover"
      onError={() => setIconSrc(defaultChatbotIcon)}
      unoptimized
    />
  );
}
