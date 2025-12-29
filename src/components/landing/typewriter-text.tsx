'use client';

/**
 * TypewriterText Component
 * Creates a Claude/ChatGPT-style streaming text effect for chat responses.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
    text: string;
    speed?: number; // ms per character
    onComplete?: () => void;
    className?: string;
}

export function TypewriterText({ 
    text, 
    speed = 20, 
    onComplete,
    className = '' 
}: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Reset when text changes
        setDisplayedText('');
        setCurrentIndex(0);
        setIsComplete(false);
    }, [text]);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timeout);
        } else if (!isComplete && text.length > 0) {
            setIsComplete(true);
            onComplete?.();
        }
    }, [currentIndex, text, speed, onComplete, isComplete]);

    return (
        <div className={className}>
            <span className="whitespace-pre-wrap">{displayedText}</span>
            {currentIndex < text.length && (
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
