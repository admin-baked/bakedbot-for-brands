'use client';

/**
 * TypewriterText Component
 * Creates a Claude/ChatGPT-style streaming text effect for chat responses.
 * Renders markdown progressively so users see formatted content as it types.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TypewriterTextProps {
    text: string;
    speed?: number; // ms per character
    onComplete?: () => void;
    className?: string;
    delay?: number;
    renderMarkdown?: boolean; // Enable markdown rendering during typing
}

export function TypewriterText({ 
    text, 
    speed = 20, 
    onComplete,
    className = '',
    delay = 0,
    renderMarkdown = true
}: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    // Null safety: handle undefined/null text
    const safeText = text ?? '';

    useEffect(() => {
        // Reset when text changes
        setDisplayedText('');
        setCurrentIndex(0);
        setIsComplete(false);
        setHasStarted(false);
    }, [safeText]);

    useEffect(() => {
        // Skip if no text
        if (!safeText) {
            onComplete?.();
            return;
        }

        let timeout: NodeJS.Timeout;

        if (!hasStarted) {
            timeout = setTimeout(() => setHasStarted(true), delay);
            return () => clearTimeout(timeout);
        }

        if (currentIndex < safeText.length) {
            timeout = setTimeout(() => {
                setDisplayedText(prev => prev + safeText[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timeout);
        } else if (!isComplete && safeText.length > 0) {
            setIsComplete(true);
            onComplete?.();
        }
    }, [currentIndex, safeText, speed, onComplete, isComplete, hasStarted, delay]);

    // Markdown component configuration (same as puff-chat.tsx)
    const markdownComponents = {
        p: ({node, ...props}: any) => <div className="my-1" {...props} />,
        ul: ({node, ...props}: any) => <ul className="list-disc list-inside my-2" {...props} />,
        ol: ({node, ...props}: any) => <ol className="list-decimal list-inside my-2" {...props} />,
        li: ({node, ...props}: any) => <li className="my-1" {...props} />,
        h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
        h2: ({node, ...props}: any) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
        h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
        blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-primary/50 pl-4 italic my-2" {...props} />,
        code: ({node, ...props}: any) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props} />,
    };

    // Handle empty content case
    if (!safeText) {
        return <div className={className}></div>;
    }

    return (
        <div className={className}>
            {renderMarkdown ? (
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                    >
                        {displayedText}
                    </ReactMarkdown>
                </div>
            ) : (
                <span className="whitespace-pre-wrap">{displayedText}</span>
            )}
            {currentIndex < safeText.length && (
                <motion.span 
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5 align-middle"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
