'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Edit } from "lucide-react";
import Link from "next/link";

type PageStatus = 'live' | 'draft' | 'review';

type ManagedPage = {
    id: string;
    name: string;
    url: string;
    status: PageStatus;
    type: 'brand' | 'dispensary';
    views: number;
};

// Mock data - would normally come from props or API
const MOCK_PAGES: ManagedPage[] = [
    { id: '1', name: 'Chicago Flagship', url: '/dispensaries/il/chicago/flagship', status: 'live', type: 'dispensary', views: 1240 },
    { id: '2', name: 'Summer Promo Landing', url: '/brands/wyld/summer-promo', status: 'draft', type: 'brand', views: 0 },
];

export function ManagedPagesList({
    userRole
}: {
    userRole: 'brand' | 'dispensary'
}) {
    // Filter pages based on role (in a real app this would be server-side or API filtered)
    const pages = MOCK_PAGES.filter(p => p.type === userRole || userRole === 'brand'); // Brand admins might see all

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Your Pages</CardTitle>
                    <CardDescription>Manage your public facing SEO pages</CardDescription>
                </div>
                <Button size="sm">Create New Page</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pages.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                            No pages found. Create one to get started.
                        </div>
                    ) : (
                        pages.map((page) => (
                            <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{page.name}</span>
                                        <Badge variant={page.status === 'live' ? 'default' : 'secondary'} className="text-xs uppercase">
                                            {page.status}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <span className="truncate max-w-[200px]">{page.url}</span>
                                        <span>•</span>
                                        <span>{page.views.toLocaleString()} views</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" asChild>
                                        <Link href={page.url} target="_blank">
                                            <ExternalLink className="h-4 w-4" />
                                            <span className="sr-only">View</span>
                                        </Link>
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
