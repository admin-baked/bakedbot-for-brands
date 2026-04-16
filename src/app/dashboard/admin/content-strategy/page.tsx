/**
 * Admin — YouTube Content Strategy
 *
 * Displays the full YouTube SEO strategy for BakedBot onboarding videos.
 * Stored in Firestore: system_config/youtube_strategy
 * Protected by AdminLayout → requireSuperUser()
 */

import { getAdminFirestore } from '@/firebase/admin';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VideoStrategy {
    id: string;
    scriptFile: string;
    stepId: string;
    title: string;
    description: string;
    tags: string[];
}

interface Playlist {
    id: string;
    title: string;
    description: string;
    videos: string[];
}

interface ContentGap {
    title: string;
    rationale: string;
    format: string;
}

interface YouTubeStrategy {
    channelName: string;
    channelDescription: string;
    channelKeywords: string[];
    playlists: Playlist[];
    videos: VideoStrategy[];
    contentGaps: ContentGap[];
}

async function getStrategy(): Promise<YouTubeStrategy | null> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('system_config').doc('youtube_strategy').get();
        if (!snap.exists) return null;
        return snap.data() as YouTubeStrategy;
    } catch {
        return null;
    }
}

export default async function ContentStrategyPage() {
    const strategy = await getStrategy();

    if (!strategy) {
        return (
            <div className="p-8">
                <p className="text-muted-foreground">Strategy not found. Run <code>node tmp/save-youtube-strategy.mjs</code> to seed it.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">YouTube SEO Strategy</h1>
                <p className="text-muted-foreground mt-1">
                    Titles, descriptions, tags, and playlists for all 10 BakedBot onboarding videos.
                    Use these when uploading to YouTube Studio.
                </p>
            </div>

            {/* Channel Setup */}
            <Card>
                <CardHeader>
                    <CardTitle>Channel: {strategy.channelName}</CardTitle>
                    <CardDescription>Channel description and keywords for YouTube Studio → Customization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm font-medium mb-1 text-muted-foreground uppercase tracking-wide">About Description</p>
                        <p className="text-sm whitespace-pre-wrap bg-muted rounded-md p-3">{strategy.channelDescription}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">Channel Keywords</p>
                        <div className="flex flex-wrap gap-2">
                            {strategy.channelKeywords.map(kw => (
                                <Badge key={kw} variant="secondary">{kw}</Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Playlists */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Playlists</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {strategy.playlists.map(pl => (
                        <Card key={pl.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">{pl.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-3">{pl.description}</p>
                                <p className="text-xs text-muted-foreground">
                                    Videos: {pl.videos.map(v => `#${v}`).join(', ')}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Video Strategies */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Video Metadata ({strategy.videos.length} videos)</h2>
                <div className="space-y-4">
                    {strategy.videos.map(video => (
                        <Card key={video.id}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Badge variant="outline" className="mb-2 font-mono">#{video.id}</Badge>
                                        <CardTitle className="text-base leading-snug">{video.title}</CardTitle>
                                        <CardDescription className="mt-1">{video.scriptFile}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Description */}
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                                    <pre className="text-xs whitespace-pre-wrap bg-muted rounded-md p-3 font-sans leading-relaxed overflow-auto max-h-48">
                                        {video.description}
                                    </pre>
                                </div>
                                {/* Tags */}
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                        {video.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Content Gaps */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Content Gap Opportunities</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    High-value videos to produce that address search queries not yet owned by BakedBot.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                    {strategy.contentGaps.map((gap, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm leading-snug">{gap.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-2">{gap.rationale}</p>
                                <Badge variant="outline" className="text-xs">{gap.format}</Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Option 3 Pipeline */}
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="text-base">Option 3: Free Video Pipeline</CardTitle>
                    <CardDescription>SadTalker (HuggingFace) + ElevenLabs voice clone — $0/month</CardDescription>
                </CardHeader>
                <CardContent>
                    <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                        <li>Record a <strong>5-second neutral face video</strong> (Martez looking at camera, good lighting)</li>
                        <li>Go to <strong>HuggingFace Spaces → SadTalker</strong> — upload face video + audio file</li>
                        <li>Generate ElevenLabs voice clone audio for each script (free tier: 10k chars/mo)</li>
                        <li>SadTalker renders avatar speaking — download .mp4</li>
                        <li>Add screen recording overlay in CapCut or DaVinci Resolve (free)</li>
                        <li>Upload to YouTube with the SEO metadata above</li>
                    </ol>
                    <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-xs font-mono text-muted-foreground">
                            ElevenLabs free: 10,000 chars/mo · Script ~01 brand-guide = ~1,800 chars · ~5 videos/mo free
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
