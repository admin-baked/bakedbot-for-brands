'use client';

/**
 * Author Selector Component
 *
 * Dropdown to select blog author from platform author profiles.
 */

import { useState, useEffect } from 'react';
import { getAuthorProfiles } from '@/server/actions/blog-authors';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { User } from 'lucide-react';
import type { BlogAuthor, BlogAuthorProfile } from '@/types/blog';

interface AuthorSelectorProps {
    currentAuthor: BlogAuthor;
    authorSlug?: string;
    onAuthorChange: (author: BlogAuthor, slug?: string) => void;
}

export function AuthorSelector({ currentAuthor, authorSlug, onAuthorChange }: AuthorSelectorProps) {
    const [authors, setAuthors] = useState<BlogAuthorProfile[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getAuthorProfiles()
            .then((profiles) => {
                setAuthors(profiles);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    const handleChange = (slug: string) => {
        if (slug === '__custom__') {
            onAuthorChange(currentAuthor, undefined);
            return;
        }

        const profile = authors.find(a => a.slug === slug);
        if (profile) {
            onAuthorChange(
                {
                    id: profile.userId,
                    name: profile.name,
                    role: profile.title,
                    avatar: profile.headshot,
                },
                profile.slug
            );
        }
    };

    if (!loaded) return null;

    return (
        <div>
            <Label className="text-sm flex items-center gap-1 mb-2">
                <User className="w-3 h-3" />
                Author
            </Label>
            <Select
                value={authorSlug || '__custom__'}
                onValueChange={handleChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                    {authors.map((author) => (
                        <SelectItem key={author.slug} value={author.slug}>
                            <div className="flex items-center gap-2">
                                {author.headshot ? (
                                    <img
                                        src={author.headshot}
                                        alt={author.name}
                                        className="w-5 h-5 rounded-full"
                                    />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                                        {author.name[0]}
                                    </div>
                                )}
                                <span>{author.name}</span>
                                <span className="text-xs text-muted-foreground">{author.title}</span>
                            </div>
                        </SelectItem>
                    ))}
                    <SelectItem value="__custom__">
                        <span className="text-muted-foreground">Custom author</span>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
