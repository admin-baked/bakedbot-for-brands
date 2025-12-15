
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface LocalSearchBarProps {
    zipCode: string;
    placeholder?: string;
    initialQuery?: string;
    className?: string;
}

export function LocalSearchBar({ zipCode, placeholder = "Search products, strains...", initialQuery = "", className = "" }: LocalSearchBarProps) {
    const [query, setQuery] = useState(initialQuery);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/local/${zipCode}/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`relative max-w-md w-full ${className}`}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-white/90 border-slate-200 focus:bg-white transition-colors"
                aria-label="Search local products"
            />
        </form>
    );
}
