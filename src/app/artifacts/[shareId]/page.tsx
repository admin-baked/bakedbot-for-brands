import { getSharedArtifact } from '@/server/actions/artifacts';
import { ArtifactRenderer } from '@/components/artifacts/artifact-renderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Eye, Calendar, User, Share2, Copy } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Artifact, getArtifactIcon, getArtifactLabel } from '@/types/artifact';
import { formatDistanceToNow } from 'date-fns';
import * as LucideIcons from 'lucide-react';
import { CopyButton } from './copy-button';

interface Props {
    params: Promise<{ shareId: string }>;
}

export default async function SharedArtifactPage({ params }: Props) {
    const { shareId } = await params;
    const sharedArtifact = await getSharedArtifact(shareId);
    
    if (!sharedArtifact) {
        notFound();
    }

    const iconName = getArtifactIcon(sharedArtifact.type as any);
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.File;
    const label = getArtifactLabel(sharedArtifact.type as any);

    // Construct artifact for renderer
    const artifact: Artifact = {
        id: sharedArtifact.id,
        type: sharedArtifact.type as any,
        title: sharedArtifact.title,
        content: sharedArtifact.content,
        metadata: sharedArtifact.metadata,
        createdAt: sharedArtifact.createdAt,
        updatedAt: sharedArtifact.createdAt,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back to BakedBot</span>
                    </Link>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {sharedArtifact.views} views
                        </span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <Card className="shadow-lg">
                    <CardHeader className="border-b">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    {sharedArtifact.title}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {sharedArtifact.ownerName}
                                    </span>
                                    <span>•</span>
                                    <span>{label}</span>
                                    {sharedArtifact.createdAt && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDistanceToNow(sharedArtifact.createdAt, { addSuffix: true })}
                                            </span>
                                        </>
                                    )}
                                </CardDescription>
                            </div>
                            <CopyButton content={sharedArtifact.content} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ArtifactRenderer artifact={artifact} />
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                        Powered by <span className="font-semibold text-primary">BakedBot AI</span>
                    </p>
                    <Link href="/dashboard">
                        <Button variant="outline" className="gap-2">
                            <Share2 className="h-4 w-4" />
                            Create Your Own Artifacts
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}
