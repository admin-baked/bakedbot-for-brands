'use client';

import { usePathname } from 'next/navigation';
import Chatbot from '@/components/chatbot';
import type { Product } from '@/types/domain';

interface GlobalChatbotProps {
  products: Product[];
}

function shouldHideGlobalChatbot(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  if (pathname.startsWith('/dashboard')) {
    return true;
  }

  // Auth pages — chatbot covers the login form and shows a broken icon
  if (pathname.startsWith('/signin') || pathname.startsWith('/login') || pathname.startsWith('/onboarding')) {
    return true;
  }

  // Tablet check-in is a kiosk flow — floating chatbot covers the PWA install button
  if (pathname.startsWith('/loyalty-tablet')) {
    return true;
  }

  return /^\/[^/]+\/rewards\/?$/.test(pathname);
}

/**
 * Root-level chatbot mount for public/platform pages.
 *
 * Dashboard routes own their own support/test surfaces, so the global fixed
 * widget must stay out of those flows to avoid duplicate floating UI.
 * Public rewards pages also have dense conversion UI, and the floating trigger
 * can cover headings and CTAs on mobile.
 */
export function GlobalChatbot({ products }: GlobalChatbotProps) {
  const pathname = usePathname();

  if (shouldHideGlobalChatbot(pathname)) {
    return null;
  }

  return <Chatbot products={products} />;
}

export default GlobalChatbot;
