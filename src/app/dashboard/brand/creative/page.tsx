'use client';

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstagramGrid, InstagramPost } from '@/components/brand/creative/instagram-grid';
import { TikTokPreview, TikTokPost } from '@/components/brand/creative/tiktok-preview';
import { LinkedInPreview, LinkedInPost } from '@/components/brand/creative/linkedin-preview';
import { ContentQueue, ContentItem } from '@/components/brand/creative/content-queue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, LayoutGrid, Video, Linkedin, RefreshCw, Plus, Loader2, ImageIcon, Wand2 } from 'lucide-react';
import { CarouselGenerator } from '@/components/brand/creative/carousel-generator';
import { useCreativeContent } from '@/hooks/use-creative-content';
import { useBrandId } from '@/hooks/use-brand-id';
import type { CreativeContent, SocialPlatform } from '@/types/creative-content';

// --- Transform Functions (Convert CreativeContent to component-specific types) ---

function toInstagramPost(content: CreativeContent): InstagramPost {
    return {
        id: content.id,
        imageUrl: content.thumbnailUrl || content.mediaUrls[0] || '',
        likes: 0, // Live posts would have real data
        comments: 0,
        isDraft: content.status === 'draft' || content.status === 'pending',
        complianceStatus: content.complianceStatus === 'active' ? 'active' :
            content.complianceStatus === 'warning' ? 'warning' : 'review_needed'
    };
}

function toTikTokPost(content: CreativeContent): TikTokPost {
    return {
        id: content.id,
        thumbnailUrl: content.thumbnailUrl || content.mediaUrls[0] || '',
        caption: content.caption,
        audioName: (content as any).audioName || 'Original Sound',
        complianceStatus: content.complianceStatus === 'active' ? 'active' :
            content.complianceStatus === 'warning' ? 'warning' : 'review_needed'
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
        complianceStatus: content.complianceStatus === 'active' ? 'active' :
            content.complianceStatus === 'warning' ? 'warning' : 'review_needed'
    };
}

function toContentItem(content: CreativeContent): ContentItem {
    const scheduledDate = content.scheduledAt
        ? new Date(content.scheduledAt).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
        : 'Next available slot';

    return {
        id: content.id,
        type: content.platform as 'instagram' | 'tiktok' | 'linkedin',
        thumbnailUrl: content.thumbnailUrl || content.mediaUrls[0] || '',
        caption: content.caption,
        status: content.status === 'revision' ? 'revision' :
            content.status === 'approved' ? 'approved' : 'pending',
        scheduledDate
    };
}

// --- Demo/Mock Data (used when no tenant data available) ---

const DEMO_IG_POSTS: InstagramPost[] = [
    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=400&q=80', likes: 124, comments: 12 },
    { id: '2', imageUrl: 'https://images.unsplash.com/photo-1575218823251-f9d243b6f720?w=400&q=80', likes: 89, comments: 5 },
    { id: '3', imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=400&q=80', likes: 210, comments: 45 },
    { id: 'g1', imageUrl: 'https://images.unsplash.com/photo-1536752016503-490515174092?w=400&q=80', likes: 0, comments: 0, isDraft: true, complianceStatus: 'active' },
    { id: 'g2', imageUrl: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400&q=80', likes: 0, comments: 0, isDraft: true, complianceStatus: 'warning' },
];

const DEMO_TIKTOK_POST: TikTokPost = {
    id: 'tt1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1621644827806-c43a0e6789f2?w=400&q=80',
    caption: 'Why top-shelf rosin hits different 🍯💨 #dispensarylife #educate',
    audioName: 'Lofi Chill - Original Sound',
    complianceStatus: 'active'
};

const DEMO_LINKEDIN_POST: LinkedInPost = {
    id: 'li1',
    authorName: 'BakedBot AI',
    authorTitle: 'Generative AI for Commerce',
    content: 'The future of retail isn\'t just omni-channel, it\'s omni-present. 🚀\n\nOur latest data shows that AI-driven product recommendations increase average cart size by 24% in brick-and-mortar locations.\n\n#RetailTech #CannabisIndustry #AI',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    complianceStatus: 'active'
};

const DEMO_QUEUE_ITEMS: ContentItem[] = [
    {
        id: 'q1',
        type: 'instagram',
        thumbnailUrl: 'https://images.unsplash.com/photo-1536752016503-490515174092?w=400&q=80',
        caption: 'Friday vibes at the shop! 🌿 Buy one, get one 50% off all edibles. #weekend',
        status: 'pending',
        scheduledDate: 'Fri, Oct 24 @ 4:20 PM'
    },
    {
        id: 'q2',
        type: 'tiktok',
        thumbnailUrl: 'https://images.unsplash.com/photo-1621644827806-c43a0e6789f2?w=400&q=80',
        caption: 'Why top-shelf rosin hits different 🍯💨 #dispensarylife #educate',
        status: 'pending',
        scheduledDate: 'Fri, Oct 24 @ 6:00 PM'
    },
    {
        id: 'q3',
        type: 'linkedin',
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        caption: 'The future of retail is here. #Business #Growth',
        status: 'pending',
        scheduledDate: 'Mon, Oct 27 @ 9:00 AM'
    }
];

export default function CreativeCommandCenterPage() {
    const { brandId, loading: brandLoading } = useBrandId();
    const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');

    // Generate dialog state
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [generatePrompt, setGeneratePrompt] = useState('');
    const [generateStyle, setGenerateStyle] = useState<'professional' | 'playful' | 'educational' | 'hype'>('professional');
    const [includeHashtags, setIncludeHashtags] = useState(true);

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
        isApproving
    } = useCreativeContent({
        realtime: true
    });

    // Only show demo data when brand is not connected
    // Empty content with a valid brand should show empty state, not demo
    const useDemo = !brandId;
    const isLoading = brandLoading || contentLoading;

    // Transform content for display
    const queueItems = useDemo
        ? DEMO_QUEUE_ITEMS
        : content.filter(c => ['pending', 'draft'].includes(c.status)).map(toContentItem);

    const instagramPosts = useDemo
        ? DEMO_IG_POSTS
        : content.filter(c => c.platform === 'instagram').map(toInstagramPost);

    // Get featured posts for TikTok and LinkedIn previews
    const featuredTikTok = useDemo
        ? DEMO_TIKTOK_POST
        : content.find(c => c.platform === 'tiktok')
            ? toTikTokPost(content.find(c => c.platform === 'tiktok')!)
            : DEMO_TIKTOK_POST;

    const featuredLinkedIn = useDemo
        ? DEMO_LINKEDIN_POST
        : content.find(c => c.platform === 'linkedin')
            ? toLinkedInPost(content.find(c => c.platform === 'linkedin')!)
            : DEMO_LINKEDIN_POST;

    // Handlers
    const handleApprove = useCallback(async (id: string) => {
        if (useDemo) {
            // Demo mode - just filter from state
            return;
        }
        await approve(id);
    }, [useDemo, approve]);

    const handleRevise = useCallback(async (id: string, note: string) => {
        if (useDemo) {
            // Demo mode - just filter from state
            return;
        }
        await revise(id, note);
    }, [useDemo, revise]);

    const handleEditCaption = useCallback(async (id: string, newCaption: string) => {
        if (useDemo) {
            return;
        }
        await editCaption(id, newCaption);
    }, [useDemo, editCaption]);

    const handleGenerate = useCallback(async () => {
        if (!generatePrompt.trim()) return;

        await generate({
            platform: selectedPlatform,
            prompt: generatePrompt,
            style: generateStyle,
            includeHashtags
        });

        // Reset and close dialog on success
        setGeneratePrompt('');
        setShowGenerateDialog(false);
    }, [generate, selectedPlatform, generatePrompt, generateStyle, includeHashtags]);

    const openGenerateDialog = useCallback(() => {
        setShowGenerateDialog(true);
    }, []);

    const handlePostSelect = useCallback((post: InstagramPost) => {
        // Could open detail modal here
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Creative Command Center</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your brand's voice across the metaverse.
                    </p>
                    {useDemo && (
                        <p className="text-xs text-amber-600 mt-1">
                            Demo mode - Connect your brand to see real content
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {/* Generate Dialog */}
                    <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                        <DialogTrigger asChild>
                            <Button
                                variant="default"
                                size="sm"
                                disabled={isGenerating || useDemo}
                                className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Wand2 className="w-4 h-4" />
                                )}
                                Create Content
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                    Generate with Agent Craig
                                </DialogTitle>
                                <DialogDescription>
                                    Describe the content you want to create. Craig will generate the caption and image.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="platform">Platform</Label>
                                    <Select
                                        value={selectedPlatform}
                                        onValueChange={(v) => setSelectedPlatform(v as SocialPlatform)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select platform" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="instagram">Instagram</SelectItem>
                                            <SelectItem value="tiktok">TikTok</SelectItem>
                                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prompt">What do you want to post about?</Label>
                                    <Textarea
                                        id="prompt"
                                        placeholder="E.g., 'Promote our new Delta-8 gummies with a weekend vibe' or 'Educational post about CBD benefits for sleep'"
                                        value={generatePrompt}
                                        onChange={(e) => setGeneratePrompt(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="style">Tone/Style</Label>
                                        <Select
                                            value={generateStyle}
                                            onValueChange={(v) => setGenerateStyle(v as typeof generateStyle)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="professional">Professional</SelectItem>
                                                <SelectItem value="playful">Playful</SelectItem>
                                                <SelectItem value="educational">Educational</SelectItem>
                                                <SelectItem value="hype">Hype/Promo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="hashtags">Include Hashtags</Label>
                                        <Select
                                            value={includeHashtags ? 'yes' : 'no'}
                                            onValueChange={(v) => setIncludeHashtags(v === 'yes')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!generatePrompt.trim() || isGenerating}
                                    className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Generate
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Refresh Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={refresh}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/20">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                            {isGenerating ? 'Craig is generating...' :
                             isApproving ? 'Processing...' :
                             'Agent Craig ready'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Visual Storyboard (Left Column) */}
                <div className="xl:col-span-8 space-y-6">
                    <Tabs
                        defaultValue="instagram"
                        className="w-full"
                        onValueChange={(v) => setSelectedPlatform(v as SocialPlatform)}
                    >
                        <TabsList className="grid w-full grid-cols-4 max-w-[650px] mb-6">
                            <TabsTrigger value="instagram" className="gap-2">
                                <LayoutGrid className="w-4 h-4" /> Instagram
                            </TabsTrigger>
                            <TabsTrigger value="tiktok" className="gap-2">
                                <Video className="w-4 h-4" /> TikTok
                            </TabsTrigger>
                            <TabsTrigger value="linkedin" className="gap-2">
                                <Linkedin className="w-4 h-4" /> LinkedIn
                            </TabsTrigger>
                            <TabsTrigger value="carousel" className="gap-2">
                                <ImageIcon className="w-4 h-4" /> Hero Carousel
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="instagram" className="mt-0">
                            <div className="flex flex-col items-center">
                                <div className="text-center mb-6 max-w-md mx-auto">
                                    <h3 className="font-semibold text-lg">The Grid</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Preview how your feed looks with upcoming "Ghost Posts".
                                    </p>
                                </div>
                                <InstagramGrid
                                    posts={instagramPosts}
                                    onSelect={handlePostSelect}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="tiktok" className="mt-0">
                            <div className="flex flex-col items-center">
                                <div className="text-center mb-6 max-w-md mx-auto">
                                    <h3 className="font-semibold text-lg">TikTok Studio</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Check safe zones and audio alignment.
                                    </p>
                                </div>
                                <TikTokPreview post={featuredTikTok} />
                            </div>
                        </TabsContent>

                        <TabsContent value="linkedin" className="mt-0">
                            <div className="flex flex-col items-center">
                                <div className="text-center mb-6 max-w-md mx-auto">
                                    <h3 className="font-semibold text-lg">Professional Network</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Ensure thought leadership compliance.
                                    </p>
                                </div>
                                <LinkedInPreview post={featuredLinkedIn} />
                            </div>
                        </TabsContent>

                        <TabsContent value="carousel" className="mt-0">
                            <div className="flex flex-col items-center">
                                <div className="text-center mb-6 max-w-md mx-auto">
                                    <h3 className="font-semibold text-lg">Homepage Carousel Generator</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Create AI-generated hero slides for your brand menu homepage.
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

                {/* Approval Queue (Right Column) */}
                <div className="xl:col-span-4">
                    <div className="sticky top-8">
                        <ContentQueue
                            items={queueItems}
                            onApprove={handleApprove}
                            onRevise={handleRevise}
                            onEditCaption={handleEditCaption}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
