import { getPublicContentById } from '@/server/actions/creative-content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { QRScanTracker } from '@/components/creative/qr-scan-tracker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Instagram,
    Linkedin,
    Twitter,
    Facebook,
    Share2,
    Eye,
    Calendar,
    Hash
} from 'lucide-react';
import type { SocialPlatform } from '@/types/creative-content';

// Force dynamic rendering for real-time view tracking
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Platform icons mapping
const PLATFORM_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
    instagram: Instagram,
    linkedin: Linkedin,
    twitter: Twitter,
    facebook: Facebook,
    tiktok: ({ className }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
    ),
};

// Platform colors
const PLATFORM_COLORS: Record<SocialPlatform, string> = {
    instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
    tiktok: 'bg-gradient-to-br from-black to-cyan-400',
    linkedin: 'bg-gradient-to-br from-blue-600 to-blue-800',
    twitter: 'bg-gradient-to-br from-blue-400 to-blue-600',
    facebook: 'bg-gradient-to-br from-blue-500 to-blue-700',
};

export async function generateMetadata({
    params
}: {
    params: Promise<{ contentId: string }>
}): Promise<Metadata> {
    const { contentId } = await params;
    const content = await getPublicContentById(contentId);

    if (!content) {
        return {
            title: 'Content Not Found | BakedBot',
            description: 'This content is not available or has been removed.',
        };
    }

    // Extract first 160 chars of caption for description
    const description = content.caption.slice(0, 160) + (content.caption.length > 160 ? '...' : '');

    return {
        title: `${content.platform.charAt(0).toUpperCase() + content.platform.slice(1)} Post | BakedBot Creative`,
        description,
        openGraph: {
            title: `BakedBot Creative - ${content.platform}`,
            description,
            images: content.mediaUrls[0] ? [content.mediaUrls[0]] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `BakedBot Creative - ${content.platform}`,
            description,
            images: content.mediaUrls[0] ? [content.mediaUrls[0]] : [],
        },
    };
}

export default async function CreativeContentLandingPage({
    params
}: {
    params: Promise<{ contentId: string }>
}) {
    const { contentId } = await params;
    const content = await getPublicContentById(contentId);

    if (!content) {
        notFound();
    }

    const PlatformIcon = PLATFORM_ICONS[content.platform];
    const platformColor = PLATFORM_COLORS[content.platform];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <PageViewTracker
                pageType="creative"
                pageId={contentId}
                pageSlug={`creative-${content.platform}`}
            />
            <QRScanTracker contentId={contentId} />

            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg bg-white/90">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
                            BB
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900">BakedBot Creative</h1>
                            <p className="text-xs text-slate-500">AI-Powered Content Platform</p>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={`${platformColor} text-white border-0`}
                    >
                        <PlatformIcon className="h-3 w-3 mr-1" />
                        {content.platform}
                    </Badge>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Left: Media Preview */}
                    <div>
                        <Card className="overflow-hidden shadow-xl">
                            <CardContent className="p-0">
                                {content.mediaUrls[0] && (
                                    <div className="relative aspect-square bg-slate-900">
                                        <img
                                            src={content.mediaUrls[0]}
                                            alt={`${content.platform} content preview`}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Platform-specific frame overlay */}
                                        {content.platform === 'instagram' && (
                                            <div className="absolute top-4 left-4 right-4">
                                                <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                                                    <span className="text-white font-semibold text-sm">
                                                        BakedBot Creative
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* QR Stats */}
                        {content.qrStats && (
                            <Card className="mt-4">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Eye className="h-4 w-4" />
                                            <span className="text-sm font-medium">QR Scans</span>
                                        </div>
                                        <span className="text-2xl font-bold text-green-600">
                                            {content.qrStats.scans.toLocaleString()}
                                        </span>
                                    </div>
                                    {content.qrStats.lastScanned && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            Last scanned: {new Date(content.qrStats.lastScanned).toLocaleDateString()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right: Caption & Details */}
                    <div className="space-y-6">
                        {/* Caption */}
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="text-lg font-bold text-slate-900 mb-3">Caption</h2>
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {content.caption}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Hashtags */}
                        {content.hashtags && content.hashtags.length > 0 && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Hash className="h-4 w-4 text-slate-500" />
                                        <h2 className="text-lg font-bold text-slate-900">Hashtags</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {content.hashtags.map((tag, index) => (
                                            <Badge
                                                key={index}
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Content Info */}
                        <Card>
                            <CardContent className="p-6 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Status</span>
                                    <Badge variant="outline" className="capitalize">
                                        {content.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Generated By</span>
                                    <Badge variant="outline" className="capitalize">
                                        {content.generatedBy.replace('-', ' ')}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Created</span>
                                    <div className="flex items-center gap-1 text-slate-700">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(content.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Share Buttons */}
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="text-lg font-bold text-slate-900 mb-3">Share</h2>
                                <div className="space-y-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            if (navigator.share) {
                                                navigator.share({
                                                    title: 'Check out this content from BakedBot',
                                                    text: content.caption.slice(0, 100),
                                                    url: window.location.href,
                                                });
                                            }
                                        }}
                                    >
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share this content
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                        }}
                                    >
                                        Copy link
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* CTA */}
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                            <CardContent className="p-6 text-center">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">
                                    Create Your Own AI-Powered Content
                                </h3>
                                <p className="text-sm text-slate-600 mb-4">
                                    BakedBot helps cannabis brands create compliant, engaging social media content with AI.
                                </p>
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    asChild
                                >
                                    <a href="/get-started">Get Started Free</a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-16">
                <div className="max-w-5xl mx-auto px-4 py-8 text-center text-sm text-slate-500">
                    <p>
                        Powered by{' '}
                        <a
                            href="https://bakedbot.ai"
                            className="text-green-600 hover:text-green-700 font-medium"
                        >
                            BakedBot AI
                        </a>
                        {' '}— The Agentic Commerce OS for Cannabis
                    </p>
                </div>
            </footer>
        </div>
    );
}
