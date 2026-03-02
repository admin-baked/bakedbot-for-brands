'use client';

/**
 * AI SEO Optimizer Panel
 *
 * Shows SEO score, keyword analysis, and AI optimization suggestions
 * for blog post content.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { optimizeTitleForSEOAction, generateMetaDescriptionAction } from '@/server/actions/blog';

interface AISeoOptimizerProps {
    title: string;
    excerpt: string;
    content: string;
    seoTitle: string;
    metaDescription: string;
    keywords: string[];
    onSeoTitleChange: (title: string) => void;
    onMetaDescriptionChange: (desc: string) => void;
}

interface SeoCheck {
    label: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
}

function analyzeSeo(props: AISeoOptimizerProps): SeoCheck[] {
    const checks: SeoCheck[] = [];

    // Title length
    const titleLen = props.seoTitle.length || props.title.length;
    if (titleLen >= 50 && titleLen <= 60) {
        checks.push({ label: 'SEO Title Length', status: 'pass', message: `${titleLen} chars (ideal: 50-60)` });
    } else if (titleLen > 0 && titleLen < 50) {
        checks.push({ label: 'SEO Title Length', status: 'warn', message: `${titleLen} chars — could be longer (50-60 ideal)` });
    } else if (titleLen > 60) {
        checks.push({ label: 'SEO Title Length', status: 'warn', message: `${titleLen} chars — may be truncated (50-60 ideal)` });
    } else {
        checks.push({ label: 'SEO Title', status: 'fail', message: 'Missing SEO title' });
    }

    // Meta description length
    const descLen = props.metaDescription.length;
    if (descLen >= 150 && descLen <= 160) {
        checks.push({ label: 'Meta Description', status: 'pass', message: `${descLen} chars (ideal: 150-160)` });
    } else if (descLen > 0 && descLen < 150) {
        checks.push({ label: 'Meta Description', status: 'warn', message: `${descLen} chars — could be longer (150-160 ideal)` });
    } else if (descLen > 160) {
        checks.push({ label: 'Meta Description', status: 'warn', message: `${descLen} chars — may be truncated` });
    } else {
        checks.push({ label: 'Meta Description', status: 'fail', message: 'Missing meta description' });
    }

    // Keywords
    if (props.keywords.length >= 3) {
        checks.push({ label: 'Keywords', status: 'pass', message: `${props.keywords.length} keywords set` });
    } else if (props.keywords.length > 0) {
        checks.push({ label: 'Keywords', status: 'warn', message: `Only ${props.keywords.length} keyword(s) — aim for 3-10` });
    } else {
        checks.push({ label: 'Keywords', status: 'fail', message: 'No keywords set' });
    }

    // Content length
    const wordCount = props.content.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) {
        checks.push({ label: 'Content Length', status: 'pass', message: `${wordCount} words` });
    } else if (wordCount > 100) {
        checks.push({ label: 'Content Length', status: 'warn', message: `${wordCount} words — aim for 300+` });
    } else {
        checks.push({ label: 'Content Length', status: 'fail', message: `${wordCount} words — too short for SEO` });
    }

    // Keyword in title
    if (props.keywords.length > 0 && props.title) {
        const titleLower = props.title.toLowerCase();
        const hasKeyword = props.keywords.some(k => titleLower.includes(k.toLowerCase()));
        if (hasKeyword) {
            checks.push({ label: 'Keyword in Title', status: 'pass', message: 'Primary keyword found in title' });
        } else {
            checks.push({ label: 'Keyword in Title', status: 'warn', message: 'Consider adding a keyword to the title' });
        }
    }

    // Excerpt
    if (props.excerpt.length >= 50) {
        checks.push({ label: 'Excerpt', status: 'pass', message: 'Excerpt set' });
    } else {
        checks.push({ label: 'Excerpt', status: 'warn', message: 'Add an excerpt for better SEO' });
    }

    return checks;
}

function getScore(checks: SeoCheck[]): number {
    const total = checks.length;
    if (total === 0) return 0;
    const passed = checks.filter(c => c.status === 'pass').length;
    const warned = checks.filter(c => c.status === 'warn').length;
    return Math.round(((passed + warned * 0.5) / total) * 100);
}

export function AISeoOptimizer(props: AISeoOptimizerProps) {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const checks = analyzeSeo(props);
    const score = getScore(checks);

    const handleOptimize = async () => {
        setIsOptimizing(true);
        try {
            const [optimizedTitle, optimizedDesc] = await Promise.all([
                props.keywords.length > 0
                    ? optimizeTitleForSEOAction(props.title, props.keywords)
                    : Promise.resolve(props.seoTitle),
                props.keywords.length > 0
                    ? generateMetaDescriptionAction(props.excerpt || props.title, props.keywords)
                    : Promise.resolve(props.metaDescription),
            ]);

            if (optimizedTitle) props.onSeoTitleChange(optimizedTitle);
            if (optimizedDesc) props.onMetaDescriptionChange(optimizedDesc);
        } catch {
            // Errors handled silently — existing values preserved
        } finally {
            setIsOptimizing(false);
        }
    };

    const statusIcon = (status: SeoCheck['status']) => {
        switch (status) {
            case 'pass': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
            case 'warn': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
            case 'fail': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
        }
    };

    return (
        <Card>
            <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">SEO Score</CardTitle>
                    <Badge
                        variant={score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive'}
                        className="text-xs"
                    >
                        {score}%
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
                {checks.map((check) => (
                    <div key={check.label} className="flex items-start gap-2 text-xs">
                        {statusIcon(check.status)}
                        <div>
                            <span className="font-medium">{check.label}</span>
                            <p className="text-muted-foreground">{check.message}</p>
                        </div>
                    </div>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={handleOptimize}
                    disabled={isOptimizing || props.keywords.length === 0}
                >
                    {isOptimizing ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    {isOptimizing ? 'Optimizing...' : 'AI Optimize SEO'}
                </Button>
            </CardContent>
        </Card>
    );
}
