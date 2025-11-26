'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/home.module.css';
import { Sparkles } from 'lucide-react';

export function HeroInput() {
    const [input, setInput] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Redirect to dashboard with query
        router.push(`/dashboard/tasks?q=${encodeURIComponent(input)}`);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.heroInputWrapper}>
            <input
                type="text"
                className={styles.heroInput}
                placeholder="Ask BakedBot to research competitors, email dispensaries..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className={styles.btnPrimary} style={{ padding: '8px 16px', fontSize: '12px' }}>
                <Sparkles size={14} />
                Start Task
            </button>
        </form>
    );
}
