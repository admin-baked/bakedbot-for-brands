'use client';

import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    language: string;
    value: string;
    className?: string;
}

export function CodeBlock({ language, value, className }: CodeBlockProps) {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
        if (!value) return;
        
        try {
            await navigator.clipboard.writeText(value);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
        }
    };

    // Clean up language label
    const formattedLanguage = language ? language.replace('language-', '') : 'text';

    return (
        <div className={cn("relative my-4 rounded-lg overflow-hidden border bg-zinc-950 text-zinc-50", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Terminal className="h-3 w-3" />
                    <span className="font-mono">{formattedLanguage}</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                    onClick={copyToClipboard}
                    title="Copy code"
                >
                    {isCopied ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                        <Copy className="h-3 w-3" />
                    )}
                </Button>
            </div>

            {/* Code Content */}
            <div className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
                 <pre>
                    <code className={cn("language-" + formattedLanguage)}>
                        {value}
                    </code>
                </pre>
            </div>
        </div>
    );
}
