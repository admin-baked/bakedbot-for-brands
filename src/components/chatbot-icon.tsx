
'use client';

import Image from 'next/image';
import { useStore } from '@/hooks/use-store';
import { defaultChatbotIcon } from '@/lib/data';


export function ChatbotIcon() {
  const { chatbotIcon: customIcon, _hasHydrated } = useStore();

  // On the server or before hydration, always use the default icon.
  // After hydration, use the custom icon if it exists, otherwise fall back to default.
  const iconToUse = _hasHydrated && customIcon ? customIcon : defaultChatbotIcon;

  return (
    <Image 
      src={iconToUse} 
      alt="Chatbot Icon" 
      fill 
      className="object-cover"
    />
  );
}
