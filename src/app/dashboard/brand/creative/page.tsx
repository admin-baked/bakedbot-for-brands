'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstagramGrid, InstagramPost } from '@/components/brand/creative/instagram-grid';
import { TikTokPreview, TikTokPost } from '@/components/brand/creative/tiktok-preview';
import { LinkedInPreview, LinkedInPost } from '@/components/brand/creative/linkedin-preview';
import { ContentQueue, ContentItem } from '@/components/brand/creative/content-queue';
import { Sparkles, LayoutGrid, Video, Linkedin } from 'lucide-react';

// --- Mock Data ---

const MOCK_IG_POSTS: InstagramPost[] = [
    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=400&q=80', likes: 124, comments: 12 },
    { id: '2', imageUrl: 'https://images.unsplash.com/photo-1575218823251-f9d243b6f720?w=400&q=80', likes: 89, comments: 5 },
    { id: '3', imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=400&q=80', likes: 210, comments: 45 },
    // Ghosts
    { id: 'g1', imageUrl: 'https://images.unsplash.com/photo-1536752016503-490515174092?w=400&q=80', likes: 0, comments: 0, isDraft: true, complianceStatus: 'active' },
    { id: 'g2', imageUrl: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400&q=80', likes: 0, comments: 0, isDraft: true, complianceStatus: 'warning' },
];

const MOCK_TIKTOK_POST: TikTokPost = {
    id: 'tt1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1621644827806-c43a0e6789f2?w=400&q=80',
    caption: 'Why top-shelf rosin hits different 🍯💨 #dispensarylife #educate',
    audioName: 'Lofi Chill - Original Sound',
    complianceStatus: 'active'
};

const MOCK_LINKEDIN_POST: LinkedInPost = {
    id: 'li1',
    authorName: 'BakedBot AI',
    authorTitle: 'Generative AI for Commerce',
    content: 'The future of retail isn\'t just omni-channel, it\'s omni-present. 🚀\n\nOur latest data shows that AI-driven product recommendations increase average cart size by 24% in brick-and-mortar locations.\n\n#RetailTech #CannabisIndustry #AI',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    complianceStatus: 'active'
};

const MOCK_QUEUE_ITEMS: ContentItem[] = [
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
    const [queue, setQueue] = useState(MOCK_QUEUE_ITEMS);

    const handleApprove = (id: string) => {
        console.log('Approved:', id);
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    const handleRevise = (id: string, note: string) => {
        console.log('Revision requested:', id, note);
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Creative Command Center</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your brand's voice across the metaverse.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/20">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                        Agent Craig is generating content...
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Visual Storyboard (Left Column) */}
                <div className="xl:col-span-8 space-y-6">
                    <Tabs defaultValue="instagram" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 max-w-[500px] mb-6">
                            <TabsTrigger value="instagram" className="gap-2">
                                <LayoutGrid className="w-4 h-4" /> Instagram
                            </TabsTrigger>
                            <TabsTrigger value="tiktok" className="gap-2">
                                <Video className="w-4 h-4" /> TikTok
                            </TabsTrigger>
                            <TabsTrigger value="linkedin" className="gap-2">
                                <Linkedin className="w-4 h-4" /> LinkedIn
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
                                    posts={MOCK_IG_POSTS} 
                                    onSelect={(post) => console.log('Selected:', post.id)} 
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
                                <TikTokPreview post={MOCK_TIKTOK_POST} />
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
                                <LinkedInPreview post={MOCK_LINKEDIN_POST} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Approval Queue (Right Column) */}
                <div className="xl:col-span-4">
                     <div className="sticky top-8">
                        <ContentQueue 
                            items={queue} 
                            onApprove={handleApprove} 
                            onRevise={handleRevise} 
                        />
                     </div>
                </div>
            </div>
        </div>
    );
}
