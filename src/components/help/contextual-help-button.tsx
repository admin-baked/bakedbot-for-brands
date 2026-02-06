'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

export default function ContextualHelpButton({
  articleUrl,
  label = 'How do I...',
  variant = 'link',
}: {
  articleUrl: string;
  label?: string;
  variant?: 'link' | 'button' | 'icon';
}) {
  if (variant === 'icon') {
    return (
      <Link
        href={articleUrl}
        target="_blank"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition"
        title={label}
      >
        <HelpCircle className="w-5 h-5 text-gray-500" />
      </Link>
    );
  }

  if (variant === 'button') {
    return (
      <Link
        href={articleUrl}
        target="_blank"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
      >
        <HelpCircle className="w-4 h-4" />
        {label}
      </Link>
    );
  }

  // Default: link variant
  return (
    <Link
      href={articleUrl}
      target="_blank"
      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
    >
      <HelpCircle className="w-4 h-4" />
      {label}
    </Link>
  );
}
