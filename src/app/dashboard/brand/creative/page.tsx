'use client';

/**
 * Creative Command Center
 *
 * Modern 3-column glassmorphism layout for content creation and management.
 * Features Craig (Marketer), Nano Banana (Visual Artist), and Deebo (Compliance).
 */

import { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstagramGrid, InstagramPost } from '@/components/brand/creative/instagram-grid';
import { TikTokPreview, TikTokPost } from '@/components/brand/creative/tiktok-preview';
import { LinkedInPreview, LinkedInPost } from '@/components/brand/creative/linkedin-preview';
import { ContentQueue, ContentItem } from '@/components/brand/creative/content-queue';
import { CompliancePanel } from '@/components/brand/creative/compliance-panel';
import { WorkflowLifecycle } from '@/components/brand/creative/workflow-lifecycle';
import { ActivityLog } from '@/components/brand/creative/activity-log';
import { AgentSquadPanel } from '@/components/brand/creative/agent-squad-panel';
import { ContentCanvas } from '@/components/brand/creative/content-canvas';
import { CarouselGenerator } from '@/components/brand/creative/carousel-generator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    LayoutGrid,
    Video,
    Linkedin,
    ImageIcon,
    RefreshCw,
    Sparkles,
    FolderOpen,
    ChevronRight,
    FileImage,
    FileVideo,
    Folder,
} from 'lucide-react';
import { useCreativeContent } from '@/hooks/use-creative-content';
import { useBrandId } from '@/hooks/use-brand-id';
import type { CreativeContent, SocialPlatform, ContentStatus } from '@/types/creative-content';
import { InboxCTABanner } from '@/components/inbox/inbox-cta-banner';

// --- Transform Functions ---

function toInstagramPost(content: CreativeContent): InstagramPost {
    return {
        id: content.id,
        imageUrl: content.thumbnailUrl || content.mediaUrls[0] || '',
        likes: 0,
        comments: 0,
        isDraft: content.status === 'draft' || content.status === 'pending',
        complianceStatus:
            content.complianceStatus === 'active'
                ? 'active'
                : content.complianceStatus === 'warning'
                ? 'warning'
                : 'review_needed',
    };
}

function toTikTokPost(content: CreativeContent): TikTokPost {
    return {
        id: content.id,
        thumbnailUrl: content.thumbnailUrl || content.mediaUrls[0] || '',
        caption: content.caption,
        audioName: (content as any).audioName || 'Original Sound',
        complianceStatus:
            content.complianceStatus === 'active'
                ? 'active'
                : content.complianceStatus === 'warning'
                ? 'warning'
                : 'review_needed',
    };
}

function toLinkedInPost(content: CreativeContent): LinkedInPost {
    return {
        id: content.id,
        authorName: (content as any).authorName || 'Your Brand',
        authorTitle: (content as any).authorTitle || 'Cannabis Brand',
        content: content.caption,
        mediaType: content.mediaType === 'carousel' ? 'carousel' : 'image',
        mediaUrl: content.thumbnailUrl || content.mediaUrls[0] || '',
        complianceStatus:
            content.complianceStatus === 'active'
                ? 'active'
                : content.complianceStatus === 'warning'
                ? 'warning'
                : 'review_needed',
    };
}

function toContentItem(content: CreativeContent): ContentItem {
    const scheduledDate = content.scheduledAt
        ? new Date(content.scheduledAt).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          })
        : 'Next available slot';

    return {
        id: content.id,
        type: content.platform as 'instagram' | 'tiktok' | 'linkedin',
        thumbnailUrl: content.thumbnailUrl || content.mediaUrls[0] || '',
        caption: content.caption,
        status:
            content.status === 'revision'
                ? 'revision'
                : content.status === 'approved' || content.status === 'scheduled'
                ? 'approved'
                : 'pending',
        scheduledDate,
        // Include QR data if available
        qrDataUrl: content.qrDataUrl,
        qrSvg: content.qrSvg,
        contentUrl: content.contentUrl,
        qrStats: content.qrStats,
        // Pass full content object for QR component
        fullContent: content,
    };
}

// --- Demo Data ---

const DEMO_IG_POSTS: InstagramPost[] = [
    {
        id: '1',
        imageUrl: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=400&q=80',
        likes: 124,
        comments: 12,
    },
    {
        id: '2',
        imageUrl: 'https://images.unsplash.com/photo-1575218823251-f9d243b6f720?w=400&q=80',
        likes: 89,
        comments: 5,
    },
    {
        id: '3',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=400&q=80',
        likes: 210,
        comments: 45,
    },
    {
        id: 'g1',
        imageUrl: 'https://images.unsplash.com/photo-1536752016503-490515174092?w=400&q=80',
        likes: 0,
        comments: 0,
        isDraft: true,
        complianceStatus: 'active',
    },
    {
        id: 'g2',
        imageUrl: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400&q=80',
        likes: 0,
        comments: 0,
        isDraft: true,
        complianceStatus: 'warning',
    },
];

const DEMO_TIKTOK_POST: TikTokPost = {
    id: 'tt1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1621644827806-c43a0e6789f2?w=400&q=80',
    caption: 'Why top-shelf rosin hits different #dispensarylife #educate',
    audioName: 'Lofi Chill - Original Sound',
    complianceStatus: 'active',
};

const DEMO_LINKEDIN_POST: LinkedInPost = {
    id: 'li1',
    authorName: 'BakedBot AI',
    authorTitle: 'Generative AI for Commerce',
    content:
        "The future of retail isn't just omni-channel, it's omni-present.\n\nOur latest data shows that AI-driven product recommendations increase average cart size by 24% in brick-and-mortar locations.\n\n#RetailTech #CannabisIndustry #AI",
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    complianceStatus: 'active',
};

const DEMO_QUEUE_ITEMS: ContentItem[] = [
    {
        id: 'q1',
        type: 'instagram',
        thumbnailUrl: 'https://images.unsplash.com/photo-1536752016503-490515174092?w=400&q=80',
        caption: 'Friday vibes at the shop! Buy one, get one 50% off all edibles. #weekend',
        status: 'pending',
        scheduledDate: 'Fri, Oct 24 @ 4:20 PM',
    },
    {
        id: 'q2',
        type: 'tiktok',
        thumbnailUrl: 'https://images.unsplash.com/photo-1621644827806-c43a0e6789f2?w=400&q=80',
        caption: 'Why top-shelf rosin hits different #dispensarylife #educate',
        status: 'pending',
        scheduledDate: 'Fri, Oct 24 @ 6:00 PM',
    },
];

// Demo compliance issues
const DEMO_COMPLIANCE_ISSUES = [
    {
        id: 'c1',
        flaggedText: 'Feel the force of relaxation.',
        reason: 'Implied Health Claim',
        suggestion: 'Experience our premium selection.',
        severity: 'error' as const,
    },
    {
        id: 'c2',
        flaggedText: 'Cures anxiety and stress',
        reason: 'Medical Claim (Prohibited)',
        suggestion: 'May promote calmness for adults 21+',
        severity: 'error' as const,
    },
];

// Asset tree structure for sidebar
const ASSET_TREE = [
    {
        id: 'brand-assets',
        name: 'Brand Assets',
        type: 'folder' as const,
        children: [
            { id: 'logo-primary', name: 'logo-primary.png', type: 'image' as const },
            { id: 'logo-secondary', name: 'logo-secondary.svg', type: 'image' as const },
            { id: 'brand-colors', name: 'brand-colors.json', type: 'file' as const },
        ],
    },
    {
        id: 'product-photos',
        name: 'Product Photos',
        type: 'folder' as const,
        children: [
            { id: 'gummies-hero', name: 'gummies-hero.jpg', type: 'image' as const },
            { id: 'vape-lineup', name: 'vape-lineup.png', type: 'image' as const },
            { id: 'flower-macro', name: 'flower-macro.jpg', type: 'image' as const },
        ],
    },
    {
        id: 'videos',
        name: 'Videos',
        type: 'folder' as const,
        children: [
            { id: 'promo-30s', name: 'promo-30s.mp4', type: 'video' as const },
            { id: 'behind-scenes', name: 'behind-scenes.mp4', type: 'video' as const },
        ],
    },
];

export default function CreativeCommandCenterPage() {
    const { brandId, loading: brandLoading } = useBrandId();
    const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');
    const [currentWorkflowStatus, setCurrentWorkflowStatus] = useState<ContentStatus>('pending');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | undefined>();
    const [generatedCaption, setGeneratedCaption] = useState<string | undefined>();

    // Fetch real content via hook
    const {
        content,
        loading: contentLoading,
        error,
        approve,
        revise,
        editCaption,
        generate,
        refresh,
        isGenerating,
        isApproving,
    } = useCreativeContent({
        realtime: true,
    });

    const useDemo = !brandId;
    const isLoading = brandLoading || contentLoading;

    // Transform content for display
    const queueItems = useDemo
        ? DEMO_QUEUE_ITEMS
        : content.filter((c) => ['pending', 'draft'].includes(c.status)).map(toContentItem);

    const instagramPosts = useDemo
        ? DEMO_IG_POSTS
        : content.filter((c) => c.platform === 'instagram').map(toInstagramPost);

    const featuredTikTok = useDemo
        ? DEMO_TIKTOK_POST
        : content.find((c) => c.platform === 'tiktok')
        ? toTikTokPost(content.find((c) => c.platform === 'tiktok')!)
        : DEMO_TIKTOK_POST;

    const featuredLinkedIn = useDemo
        ? DEMO_LINKEDIN_POST
        : content.find((c) => c.platform === 'linkedin')
        ? toLinkedInPost(content.find((c) => c.platform === 'linkedin')!)
        : DEMO_LINKEDIN_POST;

    // Calculate compliance score based on current content
    const complianceScore = useMemo(() => {
        if (useDemo) return 85;
        const compliantCount = content.filter((c) => c.complianceStatus === 'active').length;
        return content.length > 0 ? Math.round((compliantCount / content.length) * 100) : 100;
    }, [content, useDemo]);

    // Handlers
    const handleApprove = useCallback(
        async (id: string) => {
            if (useDemo) return;
            await approve(id);
        },
        [useDemo, approve]
    );

    const handleRevise = useCallback(
        async (id: string, note: string) => {
            if (useDemo) return;
            await revise(id, note);
        },
        [useDemo, revise]
    );

    const handleEditCaption = useCallback(
        async (id: string, newCaption: string) => {
            if (useDemo) return;
            await editCaption(id, newCaption);
        },
        [useDemo, editCaption]
    );

    const handleGenerate = useCallback(
        async (prompt: string, options: { platform: SocialPlatform; style: string; mediaType: string }) => {
            if (useDemo) {
                // Demo mode - simulate generation
                setGeneratedImageUrl(
                    'https://images.unsplash.com/photo-1536752016503-490515174092?w=600&q=80'
                );
                setGeneratedCaption(
                    `${prompt}\n\nExperience premium quality at its finest. Visit our dispensary today! #cannabis #premium #dispensary`
                );
                return;
            }

            await generate({
                platform: options.platform,
                prompt,
                style: options.style as any,
                includeHashtags: true,
            });
        },
        [useDemo, generate]
    );

    const handleWorkflowApprove = useCallback(() => {
        setCurrentWorkflowStatus('approved');
    }, []);

    const handleWorkflowSchedule = useCallback(() => {
        setCurrentWorkflowStatus('scheduled');
    }, []);

    const handlePostSelect = useCallback((post: InstagramPost) => {
        // Could open detail modal here
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                Creative Command Center
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Manage your brand&apos;s voice across the metaverse.
                            </p>
                            {useDemo && (
                                <Badge
                                    variant="outline"
                                    className="mt-2 text-xs bg-amber-500/10 text-amber-400 border-amber-500/30"
                                >
                                    Demo Mode - Connect your brand to see real content
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={refresh}
                                disabled={isLoading}
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                                />
                            </Button>
                            <Badge
                                variant="outline"
                                className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 text-purple-400"
                            >
                                <Sparkles className="w-3 h-3 mr-1" />
                                {isGenerating
                                    ? 'Generating...'
                                    : isApproving
                                    ? 'Processing...'
                                    : 'Agents Ready'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="max-w-[1800px] mx-auto px-4 md:px-6 pt-4">
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm">
                        {error}
                    </div>
                </div>
            )}

            {/* Inbox CTA Banner */}
            <div className="max-w-[1800px] mx-auto px-4 md:px-6 pt-4">
                <InboxCTABanner variant="creative" />
            </div>

            {/* Main 3-Column Layout */}
            <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
                    {/* Column 1: Assets & Agents (3 cols) */}
                    <div className="xl:col-span-3 flex flex-col gap-6 overflow-y-auto pb-6 no-scrollbar">
                        {/* Asset Browser */}
                        <div className="glass-card glass-card-hover rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Creative Assets</span>
                            </div>
                            <ScrollArea className="h-[200px]">
                                <div className="space-y-1">
                                    {ASSET_TREE.map((folder) => (
                                        <div key={folder.id}>
                                            <div className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 cursor-pointer">
                                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                                <Folder className="w-4 h-4 text-amber-400" />
                                                <span className="text-sm">{folder.name}</span>
                                            </div>
                                            {folder.children && (
                                                <div className="ml-5 space-y-1">
                                                    {folder.children.map((child) => (
                                                        <div
                                                            key={child.id}
                                                            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary/50 cursor-pointer"
                                                        >
                                                            {child.type === 'image' ? (
                                                                <FileImage className="w-3.5 h-3.5 text-blue-400" />
                                                            ) : child.type === 'video' ? (
                                                                <FileVideo className="w-3.5 h-3.5 text-purple-400" />
                                                            ) : (
                                                                <FileImage className="w-3.5 h-3.5 text-slate-400" />
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {child.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Agent Squad */}
                        <AgentSquadPanel />

                        {/* Content Queue (Mobile visible, desktop in column 3) */}
                        <div className="xl:hidden">
                            <ContentQueue
                                items={queueItems}
                                onApprove={handleApprove}
                                onRevise={handleRevise}
                                onEditCaption={handleEditCaption}
                            />
                        </div>
                    </div>

                    {/* Column 2: Content Engine (5 cols) */}
                    <div className="xl:col-span-5 flex flex-col gap-6 overflow-y-auto pb-6 no-scrollbar">
                        {/* Content Canvas */}
                        <ContentCanvas
                            onGenerate={handleGenerate}
                            isGenerating={isGenerating}
                            generatedImageUrl={generatedImageUrl}
                            generatedCaption={generatedCaption}
                        />

                        {/* Platform Previews */}
                        <Tabs
                            defaultValue="instagram"
                            className="w-full"
                            onValueChange={(v) => setSelectedPlatform(v as SocialPlatform)}
                        >
                            <TabsList className="grid w-full grid-cols-4 mb-4">
                                <TabsTrigger value="instagram" className="gap-2 text-xs">
                                    <LayoutGrid className="w-3 h-3" /> Grid
                                </TabsTrigger>
                                <TabsTrigger value="tiktok" className="gap-2 text-xs">
                                    <Video className="w-3 h-3" /> TikTok
                                </TabsTrigger>
                                <TabsTrigger value="linkedin" className="gap-2 text-xs">
                                    <Linkedin className="w-3 h-3" /> LinkedIn
                                </TabsTrigger>
                                <TabsTrigger value="carousel" className="gap-2 text-xs">
                                    <ImageIcon className="w-3 h-3" /> Carousel
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="instagram" className="mt-0">
                                <div className="glass-card glass-card-hover rounded-xl p-4">
                                    <div className="text-center mb-4">
                                        <h3 className="font-semibold text-sm">The Grid</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Preview upcoming Ghost Posts
                                        </p>
                                    </div>
                                    <InstagramGrid
                                        posts={instagramPosts}
                                        onSelect={handlePostSelect}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="tiktok" className="mt-0">
                                <div className="glass-card glass-card-hover rounded-xl p-4">
                                    <div className="text-center mb-4">
                                        <h3 className="font-semibold text-sm">TikTok Studio</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Safe zones & audio alignment
                                        </p>
                                    </div>
                                    <div className="flex justify-center">
                                        <TikTokPreview post={featuredTikTok} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="linkedin" className="mt-0">
                                <div className="glass-card glass-card-hover rounded-xl p-4">
                                    <div className="text-center mb-4">
                                        <h3 className="font-semibold text-sm">
                                            Professional Network
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Thought leadership compliance
                                        </p>
                                    </div>
                                    <div className="flex justify-center">
                                        <LinkedInPreview post={featuredLinkedIn} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="carousel" className="mt-0">
                                <div className="glass-card glass-card-hover rounded-xl p-4">
                                    <div className="text-center mb-4">
                                        <h3 className="font-semibold text-sm">
                                            Homepage Carousel Generator
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            AI-generated hero slides
                                        </p>
                                    </div>
                                    <CarouselGenerator
                                        brandId={brandId || ''}
                                        brandName="Your Brand"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Column 3: Compliance & Workflow (4 cols) */}
                    <div className="xl:col-span-4 flex flex-col gap-6 overflow-y-auto pb-6 no-scrollbar">
                        {/* Compliance Panel */}
                        <CompliancePanel
                            score={complianceScore}
                            status={complianceScore >= 95 ? 'active' : complianceScore >= 70 ? 'warning' : 'review_needed'}
                            issues={useDemo ? DEMO_COMPLIANCE_ISSUES : []}
                            onApplyFixes={() => {
                                // Apply compliance fixes
                            }}
                        />

                        {/* Workflow Lifecycle */}
                        <WorkflowLifecycle
                            currentStatus={currentWorkflowStatus}
                            onApprove={handleWorkflowApprove}
                            onSchedule={handleWorkflowSchedule}
                            agentName="Craig"
                        />

                        {/* Content Queue (Desktop) */}
                        <div className="hidden xl:block">
                            <ContentQueue
                                items={queueItems}
                                onApprove={handleApprove}
                                onRevise={handleRevise}
                                onEditCaption={handleEditCaption}
                            />
                        </div>

                        {/* Activity Log */}
                        <ActivityLog maxHeight="280px" />
                    </div>
                </div>
            </div>
        </div>
    );
}
