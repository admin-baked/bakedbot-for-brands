'use client';

import { usePathname } from 'next/navigation';
import Chatbot from '@/components/chatbot';
import type { Product } from '@/types/domain';

interface GlobalChatbotProps {
  products: Product[];
}

/**
 * Root-level chatbot mount for public/platform pages.
 *
 * Dashboard routes own their own support/test surfaces, so the global fixed
 * widget must stay out of those flows to avoid duplicate floating UI.
 */
export function GlobalChatbot({ products }: GlobalChatbotProps) {
  const pathname = usePathname();

  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  return <Chatbot products={products} />;
}

export default GlobalChatbot;
