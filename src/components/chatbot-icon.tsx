
'use client';

import Image from 'next/image';
import { defaultChatbotIcon } from '@/lib/data';

export function ChatbotIcon() {
  // Always use the reliable, directly imported default icon.
  return (
    <Image 
      src={defaultChatbotIcon} 
      alt="Chatbot Icon" 
      fill 
      className="object-cover"
    />
  );
}
