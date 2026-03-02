'use client';

/**
 * Comparison Table Component
 *
 * Renders structured comparison data as a responsive table with
 * pros/cons, ratings, and "Best For" badges. Used on posts with
 * contentType === 'comparison'.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, ThumbsDown, ExternalLink, Award } from 'lucide-react';
import type { BlogComparisonData, BlogComparisonEntry } from '@/types/blog';

interface ComparisonTableProps {
    data: BlogComparisonData;
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                />
            ))}
            <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
        </div>
    );
}

function CompetitorCard({ entry, rank }: { entry: BlogComparisonEntry; rank: number }) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {entry.logo ? (
                            <img
                                src={entry.logo}
                                alt={entry.name}
                                className="w-10 h-10 rounded-lg object-contain bg-muted p-1"
                                width={40}
                                height={40}
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {rank}
                            </div>
                        )}
                        <div>
                            <CardTitle className="text-lg">{entry.name}</CardTitle>
                            {entry.pricing && (
                                <span className="text-sm text-muted-foreground">{entry.pricing}</span>
                            )}
                        </div>
                    </div>
                    {rank === 1 && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Award className="w-3 h-3 mr-1" />
                            Top Pick
                        </Badge>
                    )}
                </div>
                <StarRating rating={entry.rating} />
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Best For */}
                <div>
                    <Badge variant="outline" className="text-xs">
                        Best for: {entry.bestFor}
                    </Badge>
                </div>

                {/* Pros */}
                <div>
                    <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Pros
                    </h4>
                    <ul className="space-y-1">
                        {entry.pros.map((pro, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">+</span>
                                {pro}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Cons */}
                <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Cons
                    </h4>
                    <ul className="space-y-1">
                        {entry.cons.map((con, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">-</span>
                                {con}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Link */}
                {entry.url && (
                    <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                        Visit website <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </CardContent>
        </Card>
    );
}

export function ComparisonTable({ data }: ComparisonTableProps) {
    const sorted = [...data.competitors].sort((a, b) => b.rating - a.rating);

    return (
        <div className="space-y-8">
            {/* Summary Table (desktop) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold sticky left-0 bg-background">Platform</th>
                            <th className="text-center py-3 px-4 font-semibold">Rating</th>
                            <th className="text-center py-3 px-4 font-semibold">Best For</th>
                            <th className="text-center py-3 px-4 font-semibold">Pricing</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((entry, i) => (
                            <tr key={entry.name} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                <td className="py-3 px-4 sticky left-0 bg-background">
                                    <div className="flex items-center gap-2">
                                        {i === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                                        <span className="font-medium">{entry.name}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <div className="flex justify-center">
                                        <StarRating rating={entry.rating} />
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-center text-sm text-muted-foreground">{entry.bestFor}</td>
                                <td className="py-3 px-4 text-center text-sm">{entry.pricing || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Detail Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sorted.map((entry, i) => (
                    <CompetitorCard key={entry.name} entry={entry} rank={i + 1} />
                ))}
            </div>

            {/* Methodology */}
            {data.methodology && (
                <div className="text-sm text-muted-foreground border-t pt-4 mt-4">
                    <strong>Methodology:</strong> {data.methodology}
                </div>
            )}

            {/* Last Verified */}
            {data.lastVerified && (
                <div className="text-xs text-muted-foreground">
                    Last verified: {new Date(data.lastVerified).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            )}

            {/* Verdict */}
            {data.verdict && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-bold mb-2">Our Honest Take</h3>
                        <p className="text-muted-foreground">{data.verdict}</p>
                    </CardContent>
                </Card>
            )}

            {/* JSON-LD Product schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(
                        sorted.map(entry => ({
                            '@context': 'https://schema.org',
                            '@type': 'Product',
                            name: entry.name,
                            ...(entry.url && { url: entry.url }),
                            aggregateRating: {
                                '@type': 'AggregateRating',
                                ratingValue: entry.rating,
                                bestRating: 5,
                                worstRating: 1,
                            },
                        }))
                    ),
                }}
            />
        </div>
    );
}
